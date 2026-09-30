export interface ReleaseBedRequest {
  assetId: string;
  assignmentId: string;
  userId: string;
  userName: string;
}

export interface ReleaseBedResult {
  outcome: 'released' | 'reconciled' | 'already-returned';
  assetId: string;
  assignmentId: string;
  personId: string;
}

export interface BedReleasePlan {
  result: ReleaseBedResult;
  assignmentPatch: Record<string, unknown> | null;
  assetPatch: Record<string, unknown> | null;
}

export function planBedRelease(
  bed: Record<string, unknown>,
  assignment: Record<string, unknown>,
  request: ReleaseBedRequest,
  timestamp: unknown,
): BedReleasePlan {
  for (const id of [request.assetId, request.assignmentId, request.userId]) {
    if (typeof id !== 'string' || !id.trim() || id.includes('/')) {
      throw new Error('La cama, la asignación o el usuario no tienen un identificador válido.');
    }
  }
  if (assignment.assetId !== request.assetId) {
    throw new Error('La asignación seleccionada no pertenece a esta cama. Actualice la ficha.');
  }
  const personId = assignment.personId;
  if (typeof personId !== 'string' || !personId.trim()) {
    throw new Error('La asignación no tiene un identificador de persona válido. Revise el registro.');
  }

  const result: ReleaseBedResult = {
    outcome: 'released',
    assetId: request.assetId,
    assignmentId: request.assignmentId,
    personId,
  };
  const currentAssignmentId = bed.currentAssignmentId;
  const assignedPersonId = bed.assignedPersonId;
  const clearOccupancy = {
    currentAssignmentId: null,
    assignedPersonId: null,
    updatedAt: timestamp,
  };

  if (assignment.status === 'returned') {
    if (currentAssignmentId === request.assignmentId) {
      if (assignedPersonId && assignedPersonId !== personId) {
        throw new Error('La cama y la asignación contienen personas diferentes. No se modificó el registro.');
      }
      return {
        result: { ...result, outcome: 'reconciled' },
        assignmentPatch: null,
        assetPatch: clearOccupancy,
      };
    }
    if (!currentAssignmentId && assignedPersonId === personId) {
      throw new Error('La asignación ya finalizó, pero la cama tiene un vínculo incompleto. Revise su historial antes de corregirlo.');
    }
    return {
      result: { ...result, outcome: 'already-returned' },
      assignmentPatch: null,
      assetPatch: null,
    };
  }

  if (assignment.status !== 'active') {
    throw new Error('El estado de esta asignación no permite liberarla.');
  }
  if (currentAssignmentId && currentAssignmentId !== request.assignmentId) {
    throw new Error('La cama ya está vinculada a otra asignación. Actualice la ficha antes de continuar.');
  }
  if (assignedPersonId && assignedPersonId !== personId) {
    throw new Error('La cama está vinculada a otra persona. No se realizó ningún cambio.');
  }

  return {
    result,
    assignmentPatch: {
      status: 'returned',
      endDate: timestamp,
      releasedBy: request.userId,
      releasedByName: request.userName || request.userId,
      updatedAt: timestamp,
    },
    assetPatch: clearOccupancy,
  };
}

export function bedReleaseErrorMessage(error: unknown): string {
  const value = error && typeof error === 'object'
    ? error as { code?: string; message?: string }
    : {};
  const code = String(value.code || '').replace(/^firestore\//, '');
  if (code === 'permission-denied') {
    return 'No se guardó la liberación: su cuenta no tiene permiso para actualizar la cama y su asignación. El administrador debe revisar los permisos del rol.';
  }
  if (code === 'unauthenticated') {
    return 'Su sesión no está autenticada. Inicie sesión de nuevo antes de liberar la cama.';
  }
  if (code === 'unavailable') {
    return 'No se pudo confirmar el guardado. Compruebe la conexión y actualice la ficha antes de reintentar.';
  }
  if (code === 'aborted') {
    return 'Otro proceso modificó esta cama. Actualice la ficha y vuelva a intentarlo.';
  }
  return value.message || 'No se pudo liberar la cama. Revise la conexión y el registro de errores.';
}
