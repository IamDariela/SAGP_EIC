import { 
  collection, 
  addDoc, 
  getDocs, 
  onSnapshot, 
  doc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  Timestamp,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { planBedRelease } from './bedRelease';
import type { ReleaseBedRequest, ReleaseBedResult } from './bedRelease';

// Types for internal storage
type StorageCollection = 'assets' | 'locations' | 'people' | 'assignments' | 'maintenance' | 'movements' | 'audit_logs' | 'user_profiles' | 'notifications' | 'projects' | 'aportes' | 'courses' | 'drivers';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const rawMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: rawMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(rawMsg);
}

const IS_DEMO_KEY = 'sig_eic_is_demo';
const DATA_KEY_PREFIX = 'sig_eic_data_';

export async function logAction(
  data: Omit<import('../types').AuditLog, 'id'>
) {
  return await storage.addDocument('audit_logs', data);
}

export const isDemoMode = () => {
  return localStorage.getItem(IS_DEMO_KEY) === 'true';
};

export const setDemoMode = (enabled: boolean) => {
  try {
    if (enabled) {
      localStorage.setItem(IS_DEMO_KEY, 'true');
    } else {
      localStorage.removeItem(IS_DEMO_KEY);
    }
  } catch (e) {
    console.warn('LocalStorage is blocked. Changes will be temporary.', e);
    // Fallback for session-only mode if needed, but for now we'll just alert in the UI if possible
  }
};

const checkStorageAvailable = () => {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

export const storageAvailable = checkStorageAvailable();

// Local storage helpers
const getLocalData = (collectionName: StorageCollection): any[] => {
  const data = localStorage.getItem(DATA_KEY_PREFIX + collectionName);
  return data ? JSON.parse(data) : [];
};

const saveLocalData = (collectionName: StorageCollection, data: any[]) => {
  localStorage.setItem(DATA_KEY_PREFIX + collectionName, JSON.stringify(data));
};

const generateId = () => Math.random().toString(36).substring(2, 15);

// Unified Storage API
export const storage = {
  async getCollection<T>(collectionName: StorageCollection): Promise<T[]> {
    if (isDemoMode()) {
      const data = getLocalData(collectionName);
      // Data migration/cleaning for audit_logs
      if (collectionName === 'audit_logs') {
        return data.map(log => ({
          ...log,
          // If assetId was mistakenly saved as an object, extract the ID
          assetId: typeof log.assetId === 'object' && log.assetId !== null ? (log.assetId as any).id : log.assetId
        })) as T[];
      }
      return data as T[];
    }
    try {
      const snap = await getDocs(collection(db, collectionName));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, collectionName);
      return []; // Should not be reached
    }
  },

  subscribe(collectionName: StorageCollection, callback: (data: any[]) => void, errorCallback?: (error: any) => void) {
    if (isDemoMode()) {
      const getData = () => {
        const data = getLocalData(collectionName);
        if (collectionName === 'audit_logs') {
          return data.map(log => ({
            ...log,
            assetId: typeof log.assetId === 'object' && log.assetId !== null ? (log.assetId as any).id : log.assetId
          }));
        }
        return data;
      };

      callback(getData());
      
      const listener = (e: StorageEvent) => {
        if (e.key === DATA_KEY_PREFIX + collectionName) {
          callback(getData());
        }
      };
      window.addEventListener('storage', listener);
      return () => window.removeEventListener('storage', listener);
    }
    
    return onSnapshot(collection(db, collectionName), (snap) => {
      callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error(`Error subscribing to ${collectionName}:`, error);
      if (errorCallback) {
        errorCallback(error);
      }
    });
  },

  async addDocument(collectionName: StorageCollection, data: any) {
    if (isDemoMode()) {
      const current = getLocalData(collectionName);
      const newDoc = { 
        ...data, 
        id: generateId(),
        createdAt: { seconds: Math.floor(Date.now() / 1000) },
        updatedAt: { seconds: Math.floor(Date.now() / 1000) }
      };
      saveLocalData(collectionName, [...current, newDoc]);
      // Trigger local storage event manually since it only triggers for other windows
      window.dispatchEvent(new StorageEvent('storage', { 
        key: DATA_KEY_PREFIX + collectionName,
        newValue: JSON.stringify([...current, newDoc])
      }));
      return newDoc;
    }
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { id: docRef.id, ...data };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, collectionName);
    }
  },

  async setDocument(collectionName: StorageCollection, id: string, data: any) {
    if (isDemoMode()) {
      const current = getLocalData(collectionName);
      const newDoc = { 
        ...data, 
        id,
        createdAt: { seconds: Math.floor(Date.now() / 1000) },
        updatedAt: { seconds: Math.floor(Date.now() / 1000) }
      };
      saveLocalData(collectionName, [...current.filter(d => d.id !== id), newDoc]);
      window.dispatchEvent(new StorageEvent('storage', { 
        key: DATA_KEY_PREFIX + collectionName,
        newValue: JSON.stringify([...current.filter(d => d.id !== id), newDoc])
      }));
      return;
    }
    try {
      await setDoc(doc(db, collectionName, id), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${id}`);
    }
  },

  async updateDocument(collectionName: StorageCollection, id: string, data: any) {
    if (isDemoMode()) {
      const current = getLocalData(collectionName);
      const updated = current.map(doc => 
        doc.id === id ? { ...doc, ...data, updatedAt: { seconds: Math.floor(Date.now() / 1000) } } : doc
      );
      saveLocalData(collectionName, updated);
      window.dispatchEvent(new StorageEvent('storage', { 
        key: DATA_KEY_PREFIX + collectionName,
        newValue: JSON.stringify(updated)
      }));
      return;
    }
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${id}`);
    }
  },

  async releaseBedAssignment(request: ReleaseBedRequest): Promise<ReleaseBedResult> {
    if (isDemoMode()) {
      const beds = getLocalData('assets');
      const assignments = getLocalData('assignments');
      const bedIndex = beds.findIndex((item: any) => item.id === request.assetId);
      const assignmentIndex = assignments.findIndex((item: any) => item.id === request.assignmentId);
      if (bedIndex < 0) throw new Error('No se encontró la cama en los datos guardados.');
      if (assignmentIndex < 0) throw new Error('No se encontró la asignación en los datos guardados.');

      const plan = planBedRelease(beds[bedIndex], assignments[assignmentIndex], request, {
        seconds: Math.floor(Date.now() / 1000),
        nanoseconds: 0,
      });
      if (!plan.assetPatch && !plan.assignmentPatch) return plan.result;

      const nextBeds = beds.map((bed: any, index: number) => index === bedIndex
        ? { ...bed, ...plan.assetPatch } : bed);
      const nextAssignments = assignments.map((assignment: any, index: number) => index === assignmentIndex
        ? { ...assignment, ...plan.assignmentPatch } : assignment);

      try {
        if (plan.assignmentPatch) saveLocalData('assignments', nextAssignments);
        if (plan.assetPatch) saveLocalData('assets', nextBeds);
      } catch (error) {
        let rollbackFailed = false;
        try { if (plan.assignmentPatch) saveLocalData('assignments', assignments); }
        catch { rollbackFailed = true; }
        try { if (plan.assetPatch) saveLocalData('assets', beds); }
        catch { rollbackFailed = true; }
        if (rollbackFailed) {
          throw new Error('Falló el almacenamiento local y no se pudo restaurar por completo. Revise cama y asignación antes de reintentar.');
        }
        throw error;
      }
      return plan.result;
    }

    const bedRef = doc(db, 'assets', request.assetId);
    const assignmentRef = doc(db, 'assignments', request.assignmentId);
    return runTransaction(db, async (transaction) => {
      const bedSnapshot = await transaction.get(bedRef);
      const assignmentSnapshot = await transaction.get(assignmentRef);
      if (!bedSnapshot.exists()) throw new Error('La cama seleccionada ya no existe.');
      if (!assignmentSnapshot.exists()) throw new Error('La asignación seleccionada ya no existe.');

      const plan = planBedRelease(
        bedSnapshot.data(), assignmentSnapshot.data(), request, serverTimestamp(),
      );
      if (plan.assignmentPatch) transaction.update(assignmentRef, plan.assignmentPatch);
      if (plan.assetPatch) transaction.update(bedRef, plan.assetPatch);
      return plan.result;
    });
  },

  async deleteDocument(collectionName: StorageCollection, id: string) {
    if (isDemoMode()) {
      const current = getLocalData(collectionName);
      const filtered = current.filter(doc => doc.id !== id);
      saveLocalData(collectionName, filtered);
      window.dispatchEvent(new StorageEvent('storage', { 
        key: DATA_KEY_PREFIX + collectionName,
        newValue: JSON.stringify(filtered)
      }));
      return;
    }
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
    }
  }
};

// Initial Demo Data Seeding
export const initializeDemoData = () => {
  if (!isDemoMode()) return;
  
  const existingLocations = getLocalData('locations');
  if (existingLocations.length > 0) {
    let modified = false;
    const updated = existingLocations.map((loc: any) => {
      if (loc.name === 'Dormitorio de Mujeres') {
        modified = true;
        return { ...loc, name: 'Dormitorio de Damas' };
      }
      return loc;
    });

    if (!updated.some((l: any) => l.name.toLowerCase() === 'generador')) {
      updated.push({ id: 'loc-gen', name: 'Generador', building: 'EIC', area: 'Primera Planta', floor: 1, type: 'Servicios' });
      modified = true;
    }

    if (!updated.some((l: any) => l.name.toLowerCase().includes('extensión del departamento académico') || l.name.toLowerCase().includes('extension del departamento academico'))) {
      updated.push({ id: 'loc-ext-da', name: 'Extensión del Departamento Académico', building: 'EIC', area: 'Segunda Planta', floor: 2, type: 'Oficina' });
      modified = true;
    }

    if (modified) {
      saveLocalData('locations', updated);
    }
    return;
  }

  const locations = [
    { id: 'loc-1', name: 'Aula 101', building: 'Edificio A', area: 'Académica', type: 'Aula' },
    { id: 'loc-2', name: 'Aula 102', building: 'Edificio A', area: 'Académica', type: 'Aula' },
    { id: 'loc-3', name: 'Laboratorio Balística', building: 'Edificio B', area: 'Investigación', type: 'Laboratorio' },
    { id: 'loc-4', name: 'Laboratorio Dactiloscopia', building: 'Edificio B', area: 'Investigación', type: 'Laboratorio' },
    { id: 'loc-5', name: 'Ciudadela', building: 'Sector Norte', area: 'Operaciones', type: 'Especializado' },
    { id: 'loc-6', name: 'Polígono Virtual', building: 'Sede Principal', area: 'Entrenamiento', type: 'Especializado' },
    { id: 'loc-7', name: 'Comedor Central', building: 'Edificio Servicios', area: 'Bienestar', type: 'Comedor' },
    { id: 'loc-8', name: 'Dormitorios Oficiales', building: 'Edificio C', area: 'Alojamiento', type: 'Dormitorio' },
    { id: 'loc-9', name: 'Área de Vehículos', building: 'Patio Central', area: 'Logística', type: 'Estacionamiento' },
    { id: 'loc-10', name: 'Armamento (Sótano)', building: 'Sótano 1', area: 'Seguridad', type: 'Almacén' },
    { id: 'loc-11', name: 'Oficina Administrativa', building: 'Edificio A', area: 'Administración', type: 'Oficina' },
    { id: 'loc-gen', name: 'Generador', building: 'EIC', area: 'Primera Planta', floor: 1, type: 'Servicios' },
    // EIC Second Floor Locations (Mapped from Floor Plan)
    { id: 'loc-ext-da', name: 'Extensión del Departamento Académico', building: 'EIC', area: 'Segunda Planta', floor: 2, type: 'Oficina' },
    { id: 'loc-sig', name: 'Sistema Integrado de Gestión', building: 'EIC', area: 'Segunda Planta', floor: 2, type: 'Oficina', offices: ['SIG 1', 'SIG 2'] },
    { id: 'loc-rh', name: 'Recursos Humanos', building: 'EIC', area: 'Segunda Planta', floor: 2, type: 'Oficina', offices: ['RH 1', 'RH 2'] },
    { id: 'loc-ga', name: 'Gestión Académica', building: 'EIC', area: 'Segunda Planta', floor: 2, type: 'Oficina', offices: ['GA 1', 'GA 2'] },
    { id: 'loc-gc', name: 'Gestión Curricular', building: 'EIC', area: 'Segunda Planta', floor: 2, type: 'Oficina', offices: ['GC 1', 'GC 2'] },
    { id: 'loc-gt', name: 'Gestión Tecnológica', building: 'EIC', area: 'Segunda Planta', floor: 2, type: 'Oficina', offices: ['GT 1', 'GT 2'] },
    { id: 'loc-sala', name: 'Sala de Reuniones', building: 'EIC', area: 'Segunda Planta', floor: 2, type: 'Sala' },
    { id: 'loc-dir', name: 'Dirección', building: 'EIC', area: 'Segunda Planta', floor: 2, type: 'Oficina', offices: ['Dirección Gral', 'Sub-dirección Gral'] },
    { id: 'loc-coc', name: 'Cocineta', building: 'EIC', area: 'Segunda Planta', floor: 2, type: 'Servicios' },
    { id: 'loc-bh', name: 'Baños de hombres', building: 'EIC', area: 'Segunda Planta', floor: 2, type: 'Baño' },
    { id: 'loc-bm', name: 'Baños de mujeres', building: 'EIC', area: 'Segunda Planta', floor: 2, type: 'Baño' },
    { id: 'loc-sub', name: 'Subdirector', building: 'EIC', area: 'Segunda Planta', floor: 2, type: 'Oficina' },
    { id: 'loc-ae', name: 'Administración Estudiantil', building: 'EIC', area: 'Segunda Planta', floor: 2, type: 'Oficina' },
    { id: 'loc-da', name: 'Departamento Académico', building: 'EIC', area: 'Segunda Planta', floor: 2, type: 'Oficina' },
  ];

  const people = [
    { id: 'p-1', name: 'Comisario Juan Pérez', identification: '0801-1990-12345', department: 'Investigación' },
    { id: 'p-2', name: 'Inspector María Rodríguez', identification: '0501-1985-54321', department: 'Académica' },
    { id: 'p-3', name: 'Subinspector Carlos López', identification: '0101-1992-98765', department: 'Seguridad' },
    { id: 'p-4', name: 'Oficial Ana García', identification: '1501-1995-11223', department: 'Logística' },
  ];

  const userProfiles = [
    {
      id: 'demo-user',
      uid: 'demo-user',
      email: 'demo@sig-eic.gov',
      name: 'Administrador Demo',
      role: 'admin',
      status: 'active',
      createdAt: { seconds: Math.floor(Date.now() / 1000) - 86400 * 30 },
    },
    {
      id: 'demo-user-2',
      uid: 'demo-user-2',
      email: 'gestor@sig-eic.gov',
      name: 'Inspector Gestor',
      role: 'inventory_manager',
      status: 'active',
      createdAt: { seconds: Math.floor(Date.now() / 1000) - 86400 * 15 },
    },
    {
      id: 'demo-user-3',
      uid: 'demo-user-3',
      email: 'viewer@sig-eic.gov',
      name: 'Consultor de Pruebas',
      role: 'viewer',
      status: 'inactive',
      createdAt: { seconds: Math.floor(Date.now() / 1000) - 86400 * 5 },
    }
  ];

  const assets = [
    // Mobiliario
    { 
      id: 'a-1', 
      code: 'EIC-MOB-1001', 
      name: 'Escritorio Metálico', 
      category: 'Mobiliario', 
      brand: 'Steelcase', 
      model: 'Classic', 
      locationId: 'loc-11', 
      status: 'good', 
      type: 'general' 
    },
    { 
      id: 'a-2', 
      code: 'EIC-MOB-1002', 
      name: 'Silla Ergonómica', 
      category: 'Mobiliario', 
      brand: 'Herman Miller', 
      model: 'Aeron', 
      locationId: 'loc-11', 
      status: 'good', 
      type: 'general' 
    },
    { 
      id: 'a-3', 
      code: 'EIC-MOB-1003', 
      name: 'Pizarra Blanca', 
      category: 'Mobiliario', 
      brand: '3M', 
      model: 'Pro', 
      locationId: 'loc-1', 
      status: 'bad', 
      type: 'general' 
    },
    // Informática
    { 
      id: 'a-4', 
      code: 'EIC-IT-2001', 
      name: 'Laptop Administrativa', 
      category: 'Informática', 
      brand: 'Dell', 
      model: 'Latitude', 
      locationId: 'loc-11', 
      status: 'good', 
      type: 'general' 
    },
    // Armas
    { 
      id: 'a-5', 
      code: 'EIC-ARM-3001', 
      name: 'Pistola Glock 17', 
      category: 'Armas', 
      brand: 'Glock', 
      model: '17', 
      serial: 'G17-987654', 
      locationId: 'loc-10', 
      status: 'good', 
      type: 'weapon', 
      details: { caliber: '9mm', weaponType: 'Pistola' } 
    },
    { 
      id: 'a-6', 
      code: 'EIC-ARM-3002', 
      name: 'Pistola Glock 17', 
      category: 'Armas', 
      brand: 'Glock', 
      model: '17', 
      serial: 'G17-123456', 
      locationId: 'loc-10', 
      status: 'good', 
      type: 'weapon', 
      details: { caliber: '9mm', weaponType: 'Pistola' } 
    },
    // Vehículos
    { 
      id: 'a-7', 
      code: 'EIC-VEH-4001', 
      name: 'Patrulla Toyota Hilux', 
      category: 'Vehículos', 
      brand: 'Toyota', 
      model: 'Hilux', 
      serial: 'CHASS-HILUX-001', 
      locationId: 'loc-9', 
      status: 'good', 
      type: 'vehicle', 
      details: { plate: 'P-BC-123', vin: 'VIN-HILUX-001', year: 2024, mileage: 12500 } 
    },
  ];

  const assignments = [
    {
      id: 'as-1',
      assetId: 'a-5',
      personId: 'p-1',
      startDate: { seconds: Math.floor(Date.now() / 1000) - 86400 * 5 },
      status: 'active',
      userId: 'demo-user',
    }
  ];
  
  // Link assignment to asset
  (assets[4] as any).currentAssignmentId = 'as-1';
  (assets[4] as any).assignedPersonId = 'p-1';
  (assets[5] as any).assignedPersonId = 'p-2';
  (assets[6] as any).assignedPersonId = 'p-1';
  (assets[3] as any).assignedPersonId = 'p-3';

  saveLocalData('locations', locations);
  saveLocalData('people', people);
  saveLocalData('assets', assets);
  saveLocalData('assignments', assignments);
  saveLocalData('user_profiles', userProfiles);
  saveLocalData('maintenance', []);
  saveLocalData('movements', []);
};
