import { useState, useEffect, useMemo, useRef } from 'react';
import { storage, logAction } from '../lib/storage';
import { bedReleaseErrorMessage } from '../lib/bedRelease';
import { Asset, Location, Person, Assignment, MaintenanceRecord, Course } from '../types';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { 
  Building2, 
  MapPin, 
  User, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  LogOut, 
  Save, 
  Plus, 
  Grid, 
  Info, 
  Clock, 
  ChevronRight, 
  Camera, 
  Wrench, 
  CheckCircle2, 
  Edit3,
  BedDouble,
  Layers,
  Sparkles,
  Loader2,
  GraduationCap
} from 'lucide-react';
import { formatDateTime, cn } from '../lib/utils';
import { 
  DORMITORY_NAMES, 
  DormitoryName, 
  ensureDormitoryLocations, 
  mapBedsToTemplateSlots, 
  isSerialUnique, 
  seedDormitoryBedsIfEmpty, 
  LiteraPair 
} from '../lib/dormitoryService';
import { ensureDefaultCourses } from '../lib/courseService';

const SELECTED_DORM_STORAGE_KEY = 'sage_selected_dormitory_id';

// Layout definition: 6 Rows with 5 Columns (Columns 1-2 = Left, Column 3 = Center/Aisle, Columns 4-5 = Right)
const TEMPLATE_ROWS = [
  { row: 1, slots: [1, 2, null, 14, 15] },
  { row: 2, slots: [3, 4, null, 16, 17] },
  { row: 3, slots: [5, 6, null, 18, 19] },
  { row: 4, slots: [7, 8, null, 20, 21] },
  { row: 5, slots: [9, 10, null, 22, 23] },
  { row: 6, slots: [11, 12, 13, 24, 25] }, // Bottom row with center litera (slot 13)
];

export default function Dormitories() {
  const { profile } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected Dormitory ID (persisted across sessions)
  const [selectedDormId, setSelectedDormId] = useState<string>(() => {
    return localStorage.getItem(SELECTED_DORM_STORAGE_KEY) || '';
  });

  // Selected Bed for Detail Modal
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);

  // Bed explicitly chosen for Assignment
  const [assigningBed, setAssigningBed] = useState<Asset | null>(null);

  // Slot selected for configuring a new litera
  const [configuringSlotIndex, setConfiguringSlotIndex] = useState<number | null>(null);

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
  const [isRepairModalOpen, setIsRepairModalOpen] = useState(false);
  const [isAddBunkModalOpen, setIsAddBunkModalOpen] = useState(false);
  const [isEditSerialModalOpen, setIsEditSerialModalOpen] = useState(false);

  // Form States
  const [assignForm, setAssignForm] = useState({
    identification: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    courseId: '',
    observations: ''
  });
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [courseError, setCourseError] = useState<string | null>(null);
  const [assignSubmitError, setAssignSubmitError] = useState<string | null>(null);

  const [transferForm, setTransferForm] = useState({
    targetBedId: '',
    reason: ''
  });

  const [damageForm, setDamageForm] = useState({
    reason: '',
    damageType: 'Estructura Litera',
    photoBase64: ''
  });

  const [repairForm, setRepairForm] = useState({
    workDone: '',
    photoBase64: ''
  });

  const [addBunkForm, setAddBunkForm] = useState({
    bunkNumber: '',
    upperSerial: '',
    lowerSerial: ''
  });

  const [editSerialForm, setEditSerialForm] = useState({
    serial: '',
    code: '',
    name: ''
  });

  // 1. Subscribe to storage collections
  useEffect(() => {
    setLoading(true);
    let isMounted = true;

    const unsubLocs = storage.subscribe('locations', async (data) => {
      const locList = data as Location[];
      const allDorms = await ensureDormitoryLocations(locList);
      if (isMounted) {
        setLocations(allDorms);
        // Default to Dormitorio de Caballeros 4 or the first dormitory
        if (!selectedDormId) {
          const dorm4 = allDorms.find(d => d.name === 'Dormitorio de Caballeros 4');
          const first = dorm4 || allDorms.find(d => DORMITORY_NAMES.includes(d.name as any)) || allDorms[0];
          if (first) {
            setSelectedDormId(first.id);
            localStorage.setItem(SELECTED_DORM_STORAGE_KEY, first.id);
          }
        }
      }
    });

    const unsubAssets = storage.subscribe('assets', (data) => {
      if (isMounted) setAssets(data as Asset[]);
    });

    const unsubPeople = storage.subscribe('people', (data) => {
      if (isMounted) setPeople(data as Person[]);
    });

    const unsubAssigns = storage.subscribe('assignments', (data) => {
      if (isMounted) setAssignments(data as Assignment[]);
    });

    const unsubMaint = storage.subscribe('maintenance', (data) => {
      if (isMounted) {
        setMaintenance(data as MaintenanceRecord[]);
        setLoading(false);
      }
    });

    const unsubCourses = storage.subscribe('courses', async (data) => {
      const courseList = data as Course[];
      if (isMounted) {
        setCourses(courseList);
      }
      if (courseList.length === 0) {
        const seeded = await ensureDefaultCourses(courseList);
        if (isMounted) setCourses(seeded);
      }
    });

    return () => {
      isMounted = false;
      unsubLocs();
      unsubAssets();
      unsubPeople();
      unsubAssigns();
      unsubMaint();
      unsubCourses();
    };
  }, []);

  // 2. Filter the 6 standard dormitory locations in fixed order
  const dormitoryLocations = useMemo(() => {
    const list: Location[] = [];
    for (const name of DORMITORY_NAMES) {
      const found = locations.find(l => l.name === name);
      if (found) list.push(found);
    }
    return list;
  }, [locations]);

  // Selected Dormitory Object
  const selectedDorm = useMemo(() => {
    return dormitoryLocations.find(d => d.id === selectedDormId) || dormitoryLocations[0] || null;
  }, [dormitoryLocations, selectedDormId]);

  // Save selected dormitory ID on change
  const handleSelectDorm = (dormId: string) => {
    setSelectedDormId(dormId);
    setSelectedBedId(null);
    setAssigningBed(null);
    localStorage.setItem(SELECTED_DORM_STORAGE_KEY, dormId);
  };

  // Auto-seed dormitory beds if selected dormitory has 0 beds
  useEffect(() => {
    if (selectedDorm && !loading) {
      const dormBeds = assets.filter(a => a.locationId === selectedDorm.id);
      if (dormBeds.length === 0) {
        seedDormitoryBedsIfEmpty(selectedDorm.id, selectedDorm.name, assets).catch(console.error);
      }
    }
  }, [selectedDorm, assets, loading]);

  // Beds in Current Dormitory
  const currentDormBeds = useMemo(() => {
    if (!selectedDorm) return [];
    return assets.filter(a => a.locationId === selectedDorm.id && (a.category?.toLowerCase().includes('cama') || a.category?.toLowerCase().includes('litera') || a.category?.toLowerCase().includes('mobiliario')));
  }, [assets, selectedDorm]);

  // Map beds into the 25 template slots (slots 1 to 25)
  const slotMap = useMemo(() => {
    return mapBedsToTemplateSlots(currentDormBeds);
  }, [currentDormBeds]);

  // Selected Bed Object
  const selectedBed = useMemo(() => {
    if (!selectedBedId) return null;
    return assets.find(b => b.id === selectedBedId) || null;
  }, [assets, selectedBedId]);

  // Active Assignment for selected bed
  const activeAssignment = useMemo(() => {
    if (!selectedBedId) return null;
    return assignments.find(a => a.assetId === selectedBedId && a.status === 'active') || null;
  }, [assignments, selectedBedId]);

  // Active Occupant (Person) for selected bed
  const activeOccupant = useMemo(() => {
    if (!activeAssignment) return null;
    return people.find(p => p.id === activeAssignment.personId) || null;
  }, [people, activeAssignment]);

  // Maintenance history for selected bed
  const bedMaintenanceHistory = useMemo(() => {
    if (!selectedBedId) return [];
    return maintenance.filter(m => m.assetId === selectedBedId).sort((a, b) => (b.startDate?.seconds || 0) - (a.startDate?.seconds || 0));
  }, [maintenance, selectedBedId]);

  // Assignment history for selected bed
  const bedAssignmentHistory = useMemo(() => {
    if (!selectedBedId) return [];
    return assignments.filter(a => a.assetId === selectedBedId).sort((a, b) => (b.startDate?.seconds || 0) - (a.startDate?.seconds || 0));
  }, [assignments, selectedBedId]);

  // Permissions check
  const isSupervisorOrAbove = profile?.role === 'admin' || profile?.role === 'inventory_manager' || profile?.role === 'supervisor';
  const isAdminOrManager = profile?.role === 'admin' || profile?.role === 'inventory_manager';

  // Statistics calculation
  const dormStats = useMemo(() => {
    const total = currentDormBeds.length;
    const damaged = currentDormBeds.filter(b => b.status === 'bad' || b.status === 'maintenance').length;
    const assigned = currentDormBeds.filter(b => {
      const isDamaged = b.status === 'bad' || b.status === 'maintenance';
      if (isDamaged) return false;
      return assignments.some(a => a.assetId === b.id && a.status === 'active');
    }).length;
    const free = total - damaged - assigned;
    const usable = total - damaged;
    const occupancyRate = usable > 0 ? Math.round((assigned / usable) * 100) : 0;

    return { total, free, assigned, damaged, usable, occupancyRate };
  }, [currentDormBeds, assignments]);

  // Automatic search for 13-digit identification in people registry
  const matchedPersonResult = useMemo(() => {
    const raw = assignForm.identification.trim();
    if (raw.length !== 13 || !/^[0-9]{13}$/.test(raw)) {
      return { status: 'incomplete' as const, person: null, error: null };
    }

    // Compare raw 13 digits against cleaned identification of registered people
    const matches = people.filter(p => {
      const cleanP = (p.identification || '').replace(/\D/g, '');
      return cleanP === raw;
    });

    if (matches.length === 1) {
      return { status: 'found' as const, person: matches[0], error: null };
    }
    if (matches.length > 1) {
      return { 
        status: 'duplicate' as const, 
        person: null, 
        error: 'Error: Se encontraron múltiples personas registradas con esta identidad. Contacte al administrador.' 
      };
    }
    return { 
      status: 'not_found' as const, 
      person: null, 
      error: 'Identidad no registrada. Registre primero a la persona.' 
    };
  }, [assignForm.identification, people]);

  // Identification input change handler
  const handleIdentityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAssignSubmitError(null);
    // Reject non-numeric characters
    if (val && !/^[0-9]*$/.test(val)) {
      setIdentityError('Solo se admiten dígitos del 0 al 9 sin letras, espacios, puntos ni guiones.');
      return;
    }
    // Reject length > 13
    if (val.length > 13) {
      setIdentityError('El número de identidad debe tener como máximo 13 dígitos.');
      return;
    }
    setIdentityError(null);
    setAssignForm(prev => ({ ...prev, identification: val }));
  };

  // Identification paste handler
  const handleIdentityPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').trim();
    setAssignSubmitError(null);
    if (!/^[0-9]+$/.test(pasted)) {
      e.preventDefault();
      setIdentityError('El texto pegado contiene caracteres inválidos. Solo se admiten dígitos del 0 al 9.');
      return;
    }
    if (pasted.length > 13) {
      e.preventDefault();
      setIdentityError('El texto pegado excede el límite de 13 dígitos numéricos.');
      return;
    }
  };

  // Visual State determination for a Bed
  const getBedVisualState = (bed: Asset | null) => {
    if (!bed) {
      return {
        colorClass: 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed',
        statusText: 'No Registrada',
        statusKey: 'empty',
        isInteractive: false
      };
    }

    const isDamaged = bed.status === 'bad' || bed.status === 'maintenance';
    if (isDamaged) {
      return {
        colorClass: 'bg-[#9ca3af] hover:bg-[#6b7280] text-slate-900 border border-slate-500/30 shadow-sm',
        statusText: bed.status === 'maintenance' ? 'En Mantenimiento' : 'Dañado / Fuera de Servicio',
        statusKey: 'damaged',
        isInteractive: true
      };
    }

    const isAssigned = assignments.some(a => a.assetId === bed.id && a.status === 'active');
    if (isAssigned) {
      return {
        colorClass: 'bg-[#f87171] hover:bg-[#ef4444] text-white border border-rose-600/30 shadow-sm',
        statusText: 'Asignada / Ocupada',
        statusKey: 'assigned',
        isInteractive: true
      };
    }

    return {
      colorClass: 'bg-[#4ade80] hover:bg-[#22c55e] text-slate-900 border border-emerald-600/30 shadow-sm',
      statusText: 'Libre / Disponible',
      statusKey: 'free',
      isInteractive: true
    };
  };

  // Helper to open Assign modal cleanly
  const handleOpenAssignModal = (bed: Asset) => {
    setAssigningBed(bed);
    setSelectedBedId(null); // Close the detail modal
    setAssignForm({
      identification: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      courseId: '',
      observations: ''
    });
    setIdentityError(null);
    setCourseError(null);
    setAssignSubmitError(null);
    setIsAssignModalOpen(true);
  };

  // ----------------------------------------------------
  // ACTION HANDLERS
  // ----------------------------------------------------

  // 1. Assign Bed (with fixed bed-specific check and selectable course)
  const handleAssignBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !assigningBed || !profile) return;

    if (!isSupervisorOrAbove) {
      setAssignSubmitError('Acceso denegado: Su rol no tiene permisos para realizar asignaciones.');
      return;
    }

    const cleanId = assignForm.identification.trim();
    if (!/^[0-9]{13}$/.test(cleanId)) {
      setIdentityError('El número de identidad debe tener exactamente 13 dígitos numéricos.');
      return;
    }

    if (matchedPersonResult.status !== 'found' || !matchedPersonResult.person) {
      setAssignSubmitError(matchedPersonResult.error || 'Debe ingresar una identidad válida y registrada.');
      return;
    }

    if (!assignForm.courseId) {
      setCourseError('Seleccione un curso');
      setAssignSubmitError('Debe seleccionar un curso de la lista para completar la asignación.');
      return;
    }

    const selectedCourse = courses.find(c => c.id === assignForm.courseId);
    if (!selectedCourse) {
      setCourseError('Curso no registrado');
      setAssignSubmitError('El curso seleccionado no se encuentra en el catálogo registrado.');
      return;
    }

    const assignedPerson = matchedPersonResult.person;

    // Fresh lookup of target bed
    const freshBed = assets.find(b => b.id === assigningBed.id);
    if (!freshBed || freshBed.status === 'bad' || freshBed.status === 'maintenance') {
      setAssignSubmitError('Error: La cama seleccionada está dañada o en mantenimiento y no puede ser asignada.');
      return;
    }

    const isBedOccupied = assignments.some(a => a.assetId === assigningBed.id && a.status === 'active');
    if (isBedOccupied) {
      setAssignSubmitError('Error de consistencia: Esta cama ya tiene una asignación activa.');
      return;
    }

    // Check if person already has an active BED assignment (excluding weapon / vehicle assignments!)
    const isBedAsset = (asset: Asset | undefined) => {
      if (!asset) return false;
      const cat = (asset.category || '').toLowerCase();
      const name = (asset.name || '').toLowerCase();
      return cat.includes('cama') || cat.includes('litera') || cat.includes('mobiliario') || name.includes('cama') || name.includes('litera') || Boolean(asset.details?.bunkId);
    };

    const existingPersonBedAssignment = assignments.find(a => {
      if (a.personId !== assignedPerson.id || a.status !== 'active') return false;
      const assignedAsset = assets.find(b => b.id === a.assetId);
      return isBedAsset(assignedAsset);
    });

    if (existingPersonBedAssignment) {
      const otherBed = assets.find(b => b.id === existingPersonBedAssignment.assetId);
      setAssignSubmitError(`Error de validación: ${assignedPerson.name} ya tiene una cama activa asignada (${otherBed?.serial || otherBed?.code || 'Código'}). Una persona no puede tener dos camas simultáneamente.`);
      return;
    }

    setIsSubmitting(true);
    setAssignSubmitError(null);
    setCourseError(null);
    setIdentityError(null);

    try {
      const nowSecs = Math.floor(Date.now() / 1000);
      const startDateObj = assignForm.startDate ? new Date(assignForm.startDate + 'T00:00:00') : new Date();
      const validStartSecs = !isNaN(startDateObj.getTime()) ? Math.floor(startDateObj.getTime() / 1000) : nowSecs;

      const safeUserId = profile.uid || profile.id || 'admin_user';
      const safeUserName = profile.name || 'Administrador';

      // 1. Explicitly build assignment record with only valid fields
      const assignmentData: Record<string, any> = {
        assetId: assigningBed.id,
        personId: assignedPerson.id,
        startDate: { seconds: validStartSecs },
        status: 'active',
        userId: safeUserId,
        observations: assignForm.observations?.trim() || 'Asignación regular de dormitorio',
        courseId: selectedCourse.id,
        courseName: selectedCourse.name,
        course: selectedCourse.name
      };

      // Only include endDate if explicitly provided and valid
      if (assignForm.endDate && assignForm.endDate.trim() !== '') {
        const endDateObj = new Date(assignForm.endDate.trim() + 'T23:59:59');
        if (!isNaN(endDateObj.getTime())) {
          assignmentData.endDate = { seconds: Math.floor(endDateObj.getTime() / 1000) };
        }
      }

      // Save assignment
      const newAssignment = await storage.addDocument('assignments', assignmentData);
      const newAssignId = newAssignment && (newAssignment as any).id ? (newAssignment as any).id : null;

      // 2. Update asset details (guaranteed valid structured object)
      await storage.updateDocument('assets', assigningBed.id, {
        currentAssignmentId: newAssignId,
        assignedPersonId: assignedPerson.id,
        details: {
          ...(freshBed.details || {}),
          courseId: selectedCourse.id,
          courseName: selectedCourse.name,
          course: selectedCourse.name
        }
      });

      // 3. Log to audit trail
      await logAction({
        assetId: assigningBed.id,
        assetName: freshBed.name || 'Cama',
        assetCode: freshBed.code || freshBed.serial || 'EIC-CAM',
        operation: 'assign',
        changes: [
          { field: 'assignedPersonId', oldValue: null, newValue: assignedPerson.id },
          { field: 'serial', oldValue: freshBed.serial || '', newValue: freshBed.serial || '' },
          { field: 'courseId', oldValue: freshBed.details?.courseId || null, newValue: selectedCourse.id },
          { field: 'courseName', oldValue: freshBed.details?.courseName || freshBed.details?.course || null, newValue: selectedCourse.name }
        ],
        observations: `Asignación a: ${assignedPerson.name} (DNI: ${assignedPerson.identification}). Curso: ${selectedCourse.name}.${assignForm.observations?.trim() ? ' Obs: ' + assignForm.observations.trim() : ''}`,
        userId: safeUserId,
        userName: safeUserName,
        timestamp: { seconds: nowSecs }
      });

      setIsAssignModalOpen(false);
      setAssigningBed(null);
      setAssignForm({
        identification: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        courseId: '',
        observations: ''
      });
      setIdentityError(null);
      setCourseError(null);
      setAssignSubmitError(null);
      alert('Cama asignada correctamente.');
    } catch (error: any) {
      console.error('[AssignBed] Error técnico al asignar cama ID:', assigningBed.id, error);
      let cleanMsg = 'No se pudo guardar la asignación. Verifique los datos e intente nuevamente.';
      if (error instanceof Error && error.message) {
        const raw = error.message.trim();
        if (raw.startsWith('{') && raw.includes('"error"')) {
          try {
            const parsed = JSON.parse(raw);
            cleanMsg = parsed.error || cleanMsg;
          } catch {
            cleanMsg = raw;
          }
        } else {
          cleanMsg = raw;
        }
      }
      setAssignSubmitError(cleanMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Transfer Bed
  const handleTransferBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !selectedBedId || !activeAssignment || !transferForm.targetBedId || !profile) return;

    if (!isSupervisorOrAbove) {
      alert('Acceso denegado: Su rol no tiene permisos para trasladar asignaciones.');
      return;
    }

    if (selectedBedId === transferForm.targetBedId) {
      alert('Error: La cama de destino no puede ser la misma cama de origen.');
      return;
    }

    const targetBed = assets.find(b => b.id === transferForm.targetBedId);
    if (!targetBed) return;

    if (targetBed.status === 'bad' || targetBed.status === 'maintenance') {
      alert('Error: No se puede trasladar a una cama en mantenimiento o dañada.');
      return;
    }

    const isTargetOccupied = assignments.some(a => a.assetId === transferForm.targetBedId && a.status === 'active');
    if (isTargetOccupied) {
      alert('Error: La cama de destino ya está ocupada por otra persona.');
      return;
    }

    setIsSubmitting(true);
    try {
      const nowSecs = Math.floor(Date.now() / 1000);
      const originBed = selectedBed!;
      const occupantPerson = activeOccupant!;

      // 1. Close origin assignment
      await storage.updateDocument('assignments', activeAssignment.id, {
        status: 'returned',
        endDate: { seconds: nowSecs }
      });

      // 2. Clear origin bed
      await storage.updateDocument('assets', selectedBedId, {
        currentAssignmentId: null,
        assignedPersonId: null
      });

      // 3. Create target assignment
      const newAssign = await storage.addDocument('assignments', {
        assetId: transferForm.targetBedId,
        personId: occupantPerson.id,
        startDate: { seconds: nowSecs },
        status: 'active',
        userId: profile.uid,
        observations: `Traslado desde ${originBed.serial || originBed.code}. Motivo: ${transferForm.reason}`
      });

      // 4. Update target bed
      await storage.updateDocument('assets', transferForm.targetBedId, {
        currentAssignmentId: newAssign ? (newAssign as any).id : null,
        assignedPersonId: occupantPerson.id,
        details: {
          ...(targetBed.details || {}),
          course: originBed.details?.course
        }
      });

      // 5. Log transfer in audit trail
      await logAction({
        assetId: originBed.id,
        assetName: originBed.name,
        assetCode: originBed.code,
        operation: 'transfer',
        changes: [{ field: 'assignedPersonId', oldValue: occupantPerson.id, newValue: null }],
        observations: `Traslado saliente de ${occupantPerson.name} hacia cama ${targetBed.serial || targetBed.code}. Motivo: ${transferForm.reason}`,
        userId: profile.uid,
        userName: profile.name,
        timestamp: { seconds: nowSecs }
      });

      await logAction({
        assetId: targetBed.id,
        assetName: targetBed.name,
        assetCode: targetBed.code,
        operation: 'transfer',
        changes: [{ field: 'assignedPersonId', oldValue: null, newValue: occupantPerson.id }],
        observations: `Traslado entrante de ${occupantPerson.name} procedente de ${originBed.serial || originBed.code}. Motivo: ${transferForm.reason}`,
        userId: profile.uid,
        userName: profile.name,
        timestamp: { seconds: nowSecs }
      });

      setIsTransferModalOpen(false);
      setTransferForm({ targetBedId: '', reason: '' });
      setSelectedBedId(transferForm.targetBedId);
      alert('Traslado realizado con éxito.');
    } catch (error) {
      console.error('Error durante el traslado:', error);
      alert('Error técnico al ejecutar el traslado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Release Bed & Confirmation flow
  const [releaseTarget, setReleaseTarget] = useState<{
    bedId: string;
    assignmentId: string;
    label: string;
  } | null>(null);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [releaseNotice, setReleaseNotice] = useState<string | null>(null);
  const [releaseWarning, setReleaseWarning] = useState<string | null>(null);
  const releaseLock = useRef(false);

  useEffect(() => {
    if (releaseLock.current) return;
    setReleaseTarget(null);
    setReleaseError(null);
    setReleaseNotice(null);
    setReleaseWarning(null);
  }, [selectedBedId, activeAssignment?.id]);

  const beginReleaseBed = () => {
    setReleaseError(null);
    setReleaseNotice(null);
    setReleaseWarning(null);
    if (releaseLock.current || isSubmitting) return;
    if (!isSupervisorOrAbove) {
      setReleaseError('Su rol no tiene permiso para liberar camas.');
      return;
    }
    if (!selectedBedId || !selectedBed || !activeAssignment || !profile?.uid) {
      setReleaseError('No se pudo identificar la cama, su asignación o su sesión. Actualice la ficha e inténtelo de nuevo.');
      return;
    }
    if (selectedBed.id !== selectedBedId || activeAssignment.assetId !== selectedBedId) {
      setReleaseError('La ficha no coincide con la asignación seleccionada. Actualice los datos.');
      return;
    }
    setReleaseTarget({
      bedId: selectedBedId,
      assignmentId: activeAssignment.id,
      label: selectedBed.code || selectedBed.name,
    });
  };

  const handleReleaseBed = async () => {
    if (releaseLock.current || isSubmitting) return;
    setReleaseError(null);
    setReleaseNotice(null);
    setReleaseWarning(null);

    if (!releaseTarget) {
      setReleaseError('Seleccione Liberar cama y confirme la operación dentro de la ficha.');
      return;
    }
    if (!isSupervisorOrAbove || !profile?.uid) {
      setReleaseError('Su sesión o su rol no permiten finalizar esta asignación.');
      return;
    }
    if (!selectedBed || !selectedBedId || !activeAssignment ||
        selectedBed.id !== selectedBedId ||
        activeAssignment.assetId !== selectedBedId ||
        releaseTarget.bedId !== selectedBedId ||
        releaseTarget.assignmentId !== activeAssignment.id) {
      setReleaseError('La cama o la asignación cambió desde que abrió la confirmación. Seleccione la cama de nuevo.');
      setReleaseTarget(null);
      return;
    }

    const bed = selectedBed;
    const assignment = activeAssignment;
    const actor = { uid: profile.uid, name: profile.name || profile.uid };
    releaseLock.current = true;
    setIsSubmitting(true);
    try {
      const result = await storage.releaseBedAssignment({
        assetId: bed.id,
        assignmentId: assignment.id,
        userId: actor.uid,
        userName: actor.name,
      });

      setReleaseTarget(null);
      if (result.outcome === 'already-returned') {
        setReleaseNotice('Esa asignación ya estaba finalizada. Se conservó cualquier ocupación posterior de la cama.');
        return;
      }
      setReleaseNotice(result.outcome === 'reconciled'
        ? `Se corrigió el vínculo pendiente de la cama ${bed.code}. Se conservó la fecha de devolución original.`
        : `Asignación de la cama ${bed.code} finalizada. Se conservó su estado físico.`);

      try {
        await logAction({
          assetId: bed.id,
          assetName: bed.name || bed.code || bed.id,
          assetCode: bed.code || bed.id,
          operation: 'return',
          changes: [{
            field: 'assignedPersonId',
            oldValue: result.personId,
            newValue: null,
          }],
          observations: result.outcome === 'reconciled'
            ? `Corrección de vínculo de cama para la asignación ${result.assignmentId}, ya finalizada.`
            : `Liberación de cama. Asignación finalizada: ${result.assignmentId}.`,
          userId: actor.uid,
          userName: actor.name,
          timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
        });
      } catch (auditError) {
        console.error('La liberación se guardó; falló su copia en la bitácora:', auditError);
        setReleaseWarning('La liberación se guardó, pero no se pudo registrar su copia en la bitácora. Avise al administrador; no necesita liberar de nuevo.');
      }
    } catch (error) {
      console.error('Error al liberar cama:', error);
      setReleaseError(bedReleaseErrorMessage(error));
    } finally {
      releaseLock.current = false;
      setIsSubmitting(false);
    }
  };

  // 4. Report Damage
  const handleReportDamage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !selectedBedId || !selectedBed || !profile) return;
    if (!damageForm.reason.trim()) {
      alert('Por favor describa el motivo del daño o falla detectada.');
      return;
    }

    setIsSubmitting(true);
    try {
      const nowSecs = Math.floor(Date.now() / 1000);
      const bed = selectedBed;

      const maintenanceDoc: Record<string, any> = {
        assetId: selectedBedId,
        description: `${damageForm.damageType}: ${damageForm.reason.trim()}`,
        startDate: { seconds: nowSecs },
        status: 'open',
        userId: profile.uid,
        diagnostico: damageForm.reason.trim(),
        cycleId: `cycle_${selectedBedId}_${nowSecs}`
      };
      if (damageForm.photoBase64?.trim()) {
        maintenanceDoc.evidenceBeforePhotoId = damageForm.photoBase64.trim();
      }

      await storage.addDocument('maintenance', maintenanceDoc);

      const assetDetails: Record<string, any> = {
        ...(bed.details || {}),
        damageReason: damageForm.reason.trim(),
        damageDate: { seconds: nowSecs }
      };
      if (damageForm.photoBase64?.trim()) {
        assetDetails.damagePhotoId = damageForm.photoBase64.trim();
      }

      await storage.updateDocument('assets', selectedBedId, {
        status: 'bad',
        details: assetDetails
      });

      await logAction({
        assetId: selectedBedId,
        assetName: bed.name,
        assetCode: bed.code,
        operation: 'maintenance_open',
        changes: [{ field: 'status', oldValue: bed.status, newValue: 'bad' }],
        observations: `Incidencia reportada (${damageForm.damageType}): ${damageForm.reason.trim()}`,
        userId: profile.uid,
        userName: profile.name,
        timestamp: { seconds: nowSecs }
      });

      setIsDamageModalOpen(false);
      setDamageForm({ reason: '', damageType: 'Estructura Litera', photoBase64: '' });

      if (activeOccupant) {
        alert('Daño registrado. Esta cama ha pasado a estado inhabilitado (Gris). Le recomendamos gestionar el traslado del ocupante asignado a una cama libre.');
      } else {
        alert('Incidencia registrada con éxito. La cama ahora figura como inhabilitada (Gris).');
      }
    } catch (error) {
      console.error('Error al reportar daño:', error);
      alert('Error al reportar el daño.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Repair and Re-enable Bed
  const handleRepairBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !selectedBedId || !selectedBed || !profile) return;
    if (!repairForm.workDone.trim()) {
      alert('Por favor describa el trabajo o reparación realizada.');
      return;
    }

    setIsSubmitting(true);
    try {
      const nowSecs = Math.floor(Date.now() / 1000);
      const bed = selectedBed;
      const openTicket = bedMaintenanceHistory.find(m => m.status === 'open');

      if (openTicket) {
        const ticketUpdate: Record<string, any> = {
          status: 'closed',
          endDate: { seconds: nowSecs },
          workDone: repairForm.workDone.trim(),
          verifiedBy: profile.name,
          verifiedDate: { seconds: nowSecs }
        };
        if (repairForm.photoBase64?.trim()) {
          ticketUpdate.evidenceAfterPhotoId = repairForm.photoBase64.trim();
        }
        await storage.updateDocument('maintenance', openTicket.id, ticketUpdate);
      }

      const repairDetails: Record<string, any> = {
        ...(bed.details || {}),
        repairNotes: repairForm.workDone.trim(),
        repairDate: { seconds: nowSecs }
      };
      if (repairForm.photoBase64?.trim()) {
        repairDetails.repairPhotoId = repairForm.photoBase64.trim();
      }

      await storage.updateDocument('assets', selectedBedId, {
        status: 'good',
        details: repairDetails
      });

      await logAction({
        assetId: selectedBedId,
        assetName: bed.name,
        assetCode: bed.code,
        operation: 'maintenance_close',
        changes: [{ field: 'status', oldValue: bed.status, newValue: 'good' }],
        observations: `Reparación completada y cama habilitada: ${repairForm.workDone.trim()}`,
        userId: profile.uid,
        userName: profile.name,
        timestamp: { seconds: nowSecs }
      });

      setIsRepairModalOpen(false);
      setRepairForm({ workDone: '', photoBase64: '' });
      alert('Cama reparada exitosamente. Ahora vuelve a estar disponible (Verde).');
    } catch (error) {
      console.error('Error al registrar reparación:', error);
      alert('Error técnico al validar la reparación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Create New Bunk in Slot
  const handleAddBunk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !selectedDorm || !profile) return;

    if (!isAdminOrManager) {
      alert('Acceso denegado: Solo administradores pueden crear literas.');
      return;
    }

    const { bunkNumber, upperSerial, lowerSerial } = addBunkForm;
    const num = parseInt(bunkNumber) || configuringSlotIndex || 1;

    if (!upperSerial.trim() || !lowerSerial.trim()) {
      alert('Por favor complete las series de ambas camas.');
      return;
    }

    if (upperSerial.trim().toUpperCase() === lowerSerial.trim().toUpperCase()) {
      alert('Error: La serie superior no puede ser igual a la inferior.');
      return;
    }

    if (!isSerialUnique(upperSerial, assets)) {
      alert(`Error de unicidad: La serie "${upperSerial}" ya está registrada.`);
      return;
    }

    if (!isSerialUnique(lowerSerial, assets)) {
      alert(`Error de unicidad: La serie "${lowerSerial}" ya está registrada.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const dormCode = selectedDorm.name.replace(/\D/g, '') || 'D';
      const bunkId = `LIT-${dormCode}-${String(num).padStart(2, '0')}`;

      // Upper Bed
      await storage.addDocument('assets', {
        code: `EIC-CAM-${dormCode}-${String(num).padStart(2, '0')}-SUP`,
        serial: upperSerial.trim(),
        name: `Litera ${String(num).padStart(2, '0')} - Cama Superior`,
        description: `Cama superior de litera en ${selectedDorm.name}`,
        category: 'Mobiliario',
        brand: 'Metálicas Honduras',
        model: 'Litera Estándar',
        locationId: selectedDorm.id,
        status: 'good',
        type: 'general',
        details: {
          bunkId,
          bunkNumber: num,
          position: 'superior'
        }
      });

      // Lower Bed
      await storage.addDocument('assets', {
        code: `EIC-CAM-${dormCode}-${String(num).padStart(2, '0')}-INF`,
        serial: lowerSerial.trim(),
        name: `Litera ${String(num).padStart(2, '0')} - Cama Inferior`,
        description: `Cama inferior de litera en ${selectedDorm.name}`,
        category: 'Mobiliario',
        brand: 'Metálicas Honduras',
        model: 'Litera Estándar',
        locationId: selectedDorm.id,
        status: 'good',
        type: 'general',
        details: {
          bunkId,
          bunkNumber: num,
          position: 'inferior'
        }
      });

      await logAction({
        assetId: bunkId,
        assetName: `Litera ${num} (${selectedDorm.name})`,
        assetCode: bunkId,
        operation: 'create',
        changes: [{ field: 'bunkCreated', oldValue: null, newValue: { upperSerial, lowerSerial } }],
        observations: `Creación de Litera ${num} (Series: ${upperSerial}, ${lowerSerial})`,
        userId: profile.uid,
        userName: profile.name,
        timestamp: { seconds: Math.floor(Date.now() / 1000) }
      });

      setIsAddBunkModalOpen(false);
      setAddBunkForm({ bunkNumber: '', upperSerial: '', lowerSerial: '' });
      setConfiguringSlotIndex(null);
      alert(`Litera ${num} creada y vinculada correctamente.`);
    } catch (error) {
      console.error('Error al agregar litera:', error);
      alert('Error técnico al crear la litera.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 7. Edit Serial / Code
  const handleEditSerial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !selectedBedId || !selectedBed || !profile) return;

    if (!isAdminOrManager) {
      alert('Acceso denegado: Solo administradores pueden editar números de serie.');
      return;
    }

    const { serial, code, name } = editSerialForm;
    if (!serial.trim()) {
      alert('El número de serie no puede estar vacío.');
      return;
    }

    if (!isSerialUnique(serial, assets, selectedBedId)) {
      alert(`Error de unicidad: La serie "${serial}" ya está asignada.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const oldSerial = selectedBed.serial;
      await storage.updateDocument('assets', selectedBedId, {
        serial: serial.trim(),
        code: code.trim() || selectedBed.code,
        name: name.trim() || selectedBed.name
      });

      await logAction({
        assetId: selectedBedId,
        assetName: selectedBed.name,
        assetCode: selectedBed.code,
        operation: 'update',
        changes: [{ field: 'serial', oldValue: oldSerial, newValue: serial.trim() }],
        observations: `Actualización de número de serie de cama a: ${serial.trim()}`,
        userId: profile.uid,
        userName: profile.name,
        timestamp: { seconds: Math.floor(Date.now() / 1000) }
      });

      setIsEditSerialModalOpen(false);
      alert('Serie actualizada exitosamente.');
    } catch (error) {
      console.error('Error al editar serie:', error);
      alert('Error al guardar la serie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Photo upload helper
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('La fotografía excede el tamaño máximo permitido de 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const availableTransferBeds = useMemo(() => {
    return assets.filter(b => {
      if (b.id === selectedBedId) return false;
      const isDamaged = b.status === 'bad' || b.status === 'maintenance';
      if (isDamaged) return false;
      const isOccupied = assignments.some(a => a.assetId === b.id && a.status === 'active');
      return !isOccupied;
    });
  }, [assets, assignments, selectedBedId]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. TOP HEADER & COMPACT DORMITORY SELECTOR */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        {/* Breadcrumbs & Title matching screenshot */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
              <span>Inventario</span>
              <ChevronRight className="h-3 w-3 text-slate-300" />
              <span>Primera Planta</span>
              <ChevronRight className="h-3 w-3 text-slate-300" />
              <span className="text-primary font-bold">{selectedDorm?.name.toUpperCase() || 'DORMITORIO'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2.5">
              <BedDouble className="h-6 w-6 text-primary" />
              {selectedDorm?.name || 'Control de Dormitorios'}
            </h1>
          </div>

          {/* Action button if admin */}
          {isAdminOrManager && (
            <button
              onClick={() => {
                setConfiguringSlotIndex(null);
                setAddBunkForm({ bunkNumber: String(currentDormBeds.length / 2 + 1 || 1), upperSerial: '', lowerSerial: '' });
                setIsAddBunkModalOpen(true);
              }}
              className="px-3.5 py-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all self-end sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              Agregar Litera
            </button>
          )}
        </div>

        {/* 6 Dormitories Compact Pills Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-slate-100 pt-3">
          {dormitoryLocations.map((dorm) => {
            const isSelected = selectedDorm?.id === dorm.id;
            const shortName = dorm.name
              .replace('Dormitorio de Caballeros ', 'Caballeros ')
              .replace('Dormitorio de ', '');

            return (
              <button
                key={dorm.id}
                onClick={() => handleSelectDorm(dorm.id)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wide whitespace-nowrap transition-all shadow-sm flex items-center gap-1.5",
                  isSelected 
                    ? "bg-slate-900 text-white shadow-slate-300 scale-[1.02]" 
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200/60"
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", isSelected ? "bg-primary" : "bg-slate-300")} />
                {shortName}
              </button>
            );
          })}
        </div>

        {/* Compact Stats & Legend Strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 text-xs">
          {/* Counters */}
          <div className="flex flex-wrap items-center gap-3 font-bold">
            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
              <span className="text-[10px] text-slate-400 uppercase font-black">Total:</span>
              <span className="font-mono text-slate-800">{dormStats.total} Camas</span>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg">
              <span className="h-2 w-2 rounded-full bg-[#4ade80]" />
              <span className="text-[10px] uppercase font-black">Libres:</span>
              <span className="font-mono font-black">{dormStats.free}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-lg">
              <span className="h-2 w-2 rounded-full bg-[#f87171]" />
              <span className="text-[10px] uppercase font-black">Asignadas:</span>
              <span className="font-mono font-black">{dormStats.assigned}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-1 rounded-lg">
              <span className="h-2 w-2 rounded-full bg-[#9ca3af]" />
              <span className="text-[10px] uppercase font-black">F/S:</span>
              <span className="font-mono font-black">{dormStats.damaged}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-primary/5 text-primary border border-primary/20 px-2.5 py-1 rounded-lg">
              <span className="text-[10px] uppercase font-black">Capacidad:</span>
              <span className="font-mono font-black">{dormStats.usable} Plazas</span>
            </div>
          </div>

          {/* Occupancy Indicator with clean empty state */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500">Ocupación:</span>
            {dormStats.total === 0 ? (
              <span className="text-xs font-semibold text-slate-400 italic">Sin camas registradas</span>
            ) : (
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-24 bg-slate-200 rounded-full overflow-hidden flex">
                  {dormStats.occupancyRate > 0 && (
                    <div 
                      style={{ width: `${dormStats.occupancyRate}%` }} 
                      className="bg-rose-500 h-full rounded-full transition-all duration-300"
                    />
                  )}
                </div>
                <span className="font-mono font-black text-slate-700">{dormStats.occupancyRate}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. DIRECT INTERACTIVE 2D BUNK BED CANVAS (Matching Reference Screenshot) */}
      <div className="bg-slate-100/90 rounded-3xl p-4 sm:p-7 border border-slate-200/90 shadow-inner overflow-hidden">
        {/* Responsive horizontal scroll wrapper with minimum width to preserve exact aisle layout */}
        <div className="overflow-x-auto pb-4">
          <div className="min-w-[920px] max-w-[1240px] mx-auto space-y-4">
            {TEMPLATE_ROWS.map((rowDef) => (
              <div key={`row-${rowDef.row}`} className="grid grid-cols-5 gap-4 items-center">
                {rowDef.slots.map((slotIndex, colIdx) => {
                  // Aisle / empty space in center
                  if (slotIndex === null) {
                    return <div key={`empty-col-${colIdx}`} className="h-16 pointer-events-none" />;
                  }

                  const litera = slotMap.get(slotIndex);

                  // CASE A: CONFIGURED LITERA WITH 2 BEDS
                  if (litera && (litera.upperBed || litera.lowerBed)) {
                    const upperState = getBedVisualState(litera.upperBed);
                    const lowerState = getBedVisualState(litera.lowerBed);

                    const isUpperSelected = selectedBedId === litera.upperBed?.id;
                    const isLowerSelected = selectedBedId === litera.lowerBed?.id;

                    return (
                      <div 
                        key={`slot-${slotIndex}`}
                        className={cn(
                          "bg-white rounded-2xl p-2.5 shadow-md border transition-all duration-150 hover:shadow-lg flex items-center justify-between gap-2.5",
                          (isUpperSelected || isLowerSelected) ? "border-primary ring-2 ring-primary/30" : "border-slate-100"
                        )}
                      >
                        {/* BED 1: UPPER BED */}
                        <button
                          type="button"
                          disabled={!litera.upperBed}
                          onClick={() => litera.upperBed && setSelectedBedId(litera.upperBed.id)}
                          className={cn(
                            "py-3 px-3 rounded-xl flex-1 flex flex-col items-center justify-center transition-all duration-150 active:scale-95 text-center relative group",
                            upperState.colorClass,
                            isUpperSelected ? "ring-2 ring-primary scale-[1.02]" : ""
                          )}
                          title={`Litera ${slotIndex} - Superior (${upperState.statusText})`}
                          aria-label={`Litera ${slotIndex} Cama Superior, Serie: ${litera.upperBed?.serial || 'Sin Serie'}, Estado: ${upperState.statusText}`}
                        >
                          <span className="font-mono font-black text-sm tracking-tight leading-none text-slate-900 block">
                            {litera.upperBed?.serial || litera.upperBed?.code?.replace('EIC-CAM-', '') || 'S/N'}
                          </span>
                          <span className="text-[8px] font-bold uppercase opacity-60 mt-0.5 block text-slate-800">
                            Sup.
                          </span>
                        </button>

                        {/* BED 2: LOWER BED */}
                        <button
                          type="button"
                          disabled={!litera.lowerBed}
                          onClick={() => litera.lowerBed && setSelectedBedId(litera.lowerBed.id)}
                          className={cn(
                            "py-3 px-3 rounded-xl flex-1 flex flex-col items-center justify-center transition-all duration-150 active:scale-95 text-center relative group",
                            lowerState.colorClass,
                            isLowerSelected ? "ring-2 ring-primary scale-[1.02]" : ""
                          )}
                          title={`Litera ${slotIndex} - Inferior (${lowerState.statusText})`}
                          aria-label={`Litera ${slotIndex} Cama Inferior, Serie: ${litera.lowerBed?.serial || 'Sin Serie'}, Estado: ${lowerState.statusText}`}
                        >
                          <span className="font-mono font-black text-sm tracking-tight leading-none text-slate-900 block">
                            {litera.lowerBed?.serial || litera.lowerBed?.code?.replace('EIC-CAM-', '') || 'S/N'}
                          </span>
                          <span className="text-[8px] font-bold uppercase opacity-60 mt-0.5 block text-slate-800">
                            Inf.
                          </span>
                        </button>
                      </div>
                    );
                  }

                  // CASE B: UNCONFIGURED SLOT (Clean dashed box)
                  return (
                    <div 
                      key={`slot-${slotIndex}`}
                      onClick={() => {
                        if (isAdminOrManager && selectedDorm) {
                          setConfiguringSlotIndex(slotIndex);
                          setAddBunkForm({ bunkNumber: String(slotIndex), upperSerial: '', lowerSerial: '' });
                          setIsAddBunkModalOpen(true);
                        }
                      }}
                      className={cn(
                        "rounded-2xl border-2 border-dashed border-slate-300 bg-white/40 p-2.5 flex flex-col items-center justify-center min-h-[64px] transition-all",
                        isAdminOrManager ? "hover:border-primary hover:bg-white/80 cursor-pointer group" : "cursor-default opacity-70"
                      )}
                      title={`Posición Litera ${slotIndex}: Sin configurar`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-primary">
                        Litera {String(slotIndex).padStart(2, '0')}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 italic">
                        {isAdminOrManager ? '+ Configurar' : 'Sin configurar'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL 1: BED DETAIL & OPERATIONS MODAL */}
      {selectedBed && (
        <Modal
          isOpen={Boolean(selectedBedId)}
          onClose={() => setSelectedBedId(null)}
          title={`Ficha de Cama: ${selectedBed.serial || selectedBed.code}`}
        >
          <div className="space-y-5">
            {/* Header Strip */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-wrap justify-between items-center gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary block">
                  {selectedBed.name}
                </span>
                <span className="text-xl font-black font-mono text-slate-800">
                  Serie: {selectedBed.serial || 'Sin Serie'}
                </span>
                <p className="text-xs text-slate-400 font-mono">Código: {selectedBed.code}</p>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full",
                  selectedBed.status === 'good' ? "bg-emerald-100 text-emerald-800" :
                  selectedBed.status === 'regular' ? "bg-amber-100 text-amber-800" :
                  "bg-rose-100 text-rose-800"
                )}>
                  Condición: {selectedBed.status === 'good' ? 'Bueno' : selectedBed.status === 'regular' ? 'Regular' : 'Dañado / Malo'}
                </span>

                {activeAssignment ? (
                  <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-rose-500 text-white">
                    ● Asignada
                  </span>
                ) : selectedBed.status === 'good' || selectedBed.status === 'regular' ? (
                  <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500 text-white">
                    ● Libre
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-slate-400 text-slate-900">
                    ● Fuera de Servicio
                  </span>
                )}
              </div>
            </div>

            {/* Damage banner if damaged */}
            {(selectedBed.status === 'bad' || selectedBed.status === 'maintenance') && (
              <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-800 space-y-1">
                <span className="font-black uppercase tracking-wider flex items-center gap-1.5 text-rose-700">
                  <AlertTriangle className="h-4 w-4" />
                  Incidencia de Daño Activa
                </span>
                <p className="font-semibold">{selectedBed.details?.damageReason || 'Cama marcada como dañada o en mantenimiento.'}</p>
                {selectedBed.details?.damagePhotoId && (
                  <div className="mt-2">
                    <img 
                      src={selectedBed.details.damagePhotoId} 
                      alt="Evidencia daño" 
                      className="h-24 w-auto rounded-xl border border-rose-200 object-cover" 
                    />
                  </div>
                )}
              </div>
            )}

            {/* Occupant card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                Asignación Vigente
              </h4>

              {activeOccupant && activeAssignment ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-sm">
                      {activeOccupant.name.charAt(0)}
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-800">{activeOccupant.name}</h5>
                      <p className="text-xs font-mono text-slate-500">DNI: {activeOccupant.identification}</p>
                      <p className="text-[11px] font-semibold text-slate-400">{activeOccupant.department}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/60 text-xs">
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 block">Fecha Asignación:</span>
                      <span className="font-bold text-slate-700">{formatDateTime(activeAssignment.startDate)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 block">Curso / Grupo:</span>
                      <span className="font-bold text-slate-700">{selectedBed.details?.courseName || selectedBed.details?.course || activeAssignment.courseName || activeAssignment.course || 'No especificado'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No registra persona asignada en este momento.</p>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                Operaciones Permitidas
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* 1. Asignar Persona */}
                {!activeOccupant && selectedBed.status !== 'bad' && selectedBed.status !== 'maintenance' && isSupervisorOrAbove && (
                  <button
                    onClick={() => handleOpenAssignModal(selectedBed)}
                    className="w-full py-2.5 px-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Asignar Persona
                  </button>
                )}

                {/* 2. Trasladar */}
                {activeOccupant && isSupervisorOrAbove && (
                  <button
                    onClick={() => setIsTransferModalOpen(true)}
                    className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Trasladar a Otra Cama
                  </button>
                )}

                {/* 3. Liberar */}
                {activeAssignment && isSupervisorOrAbove && (
                  <button
                    type="button"
                    onClick={beginReleaseBed}
                    disabled={isSubmitting || !!releaseTarget}
                    className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    Liberar Cama
                  </button>
                )}

                {releaseTarget && (
                  <div
                    role="group"
                    aria-label="Confirmar liberación de cama"
                    aria-busy={isSubmitting}
                    className="rounded-xl border border-primary/30 bg-slate-50 p-4 space-y-3"
                  >
                    <p className="text-sm font-bold text-slate-800">
                      ¿Finalizar la asignación de la cama {releaseTarget.label}?
                    </p>
                    <p className="text-xs text-slate-600">
                      Se conservará el historial. Su disponibilidad dependerá de su estado físico.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleReleaseBed}
                        disabled={isSubmitting}
                        className="flex-1 rounded-lg bg-primary text-white px-3 py-2 text-xs font-bold disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isSubmitting ? 'Guardando…' : 'Confirmar liberación'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReleaseTarget(null);
                          setReleaseError(null);
                        }}
                        disabled={isSubmitting}
                        className="flex-1 rounded-lg border border-slate-300 bg-white text-slate-700 px-3 py-2 text-xs font-bold disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {releaseError && (
                  <p role="alert" className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-800">
                    {releaseError}
                  </p>
                )}
                {releaseNotice && (
                  <p role="status" className="rounded-xl bg-green-50 border border-green-200 p-3 text-xs text-green-800">
                    {releaseNotice}
                  </p>
                )}
                {releaseWarning && (
                  <p role="alert" className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                    {releaseWarning}
                  </p>
                )}

                {/* 4. Reportar Daño */}
                {selectedBed.status !== 'bad' && selectedBed.status !== 'maintenance' && isSupervisorOrAbove && (
                  <button
                    onClick={() => setIsDamageModalOpen(true)}
                    className="w-full py-2.5 px-3 border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Reportar Daño / Incidencia
                  </button>
                )}

                {/* 5. Reparar */}
                {(selectedBed.status === 'bad' || selectedBed.status === 'maintenance') && isSupervisorOrAbove && (
                  <button
                    onClick={() => setIsRepairModalOpen(true)}
                    className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Registrar Reparación y Habilitar
                  </button>
                )}

                {/* 6. Modificar Serie */}
                {isAdminOrManager && (
                  <button
                    onClick={() => {
                      setEditSerialForm({
                        serial: selectedBed.serial || '',
                        code: selectedBed.code || '',
                        name: selectedBed.name || ''
                      });
                      setIsEditSerialModalOpen(true);
                    }}
                    className="w-full py-2.5 px-3 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Edit3 className="h-4 w-4" />
                    Modificar Serie Única
                  </button>
                )}
              </div>
            </div>

            {/* HISTORIAL */}
            <div className="border-t border-slate-200/80 pt-3 space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Historial de Asignaciones y Mantenimientos
              </h4>

              <div className="max-h-40 overflow-y-auto space-y-2 pr-1 text-xs">
                {bedAssignmentHistory.map((a) => {
                  const person = people.find(p => p.id === a.personId);
                  return (
                    <div key={a.id} className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1">
                      <div className="flex justify-between items-center font-bold">
                        <span className={cn(
                          "text-[9px] uppercase px-1.5 py-0.5 rounded font-black",
                          a.status === 'active' ? "bg-rose-100 text-rose-700" : "bg-slate-200 text-slate-600"
                        )}>
                          {a.status === 'active' ? 'Asignación Activa' : 'Finalizada'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{formatDateTime(a.startDate)}</span>
                      </div>
                      <p className="text-slate-700 font-semibold">{person?.name || 'Persona N/D'} ({person?.identification})</p>
                    </div>
                  );
                })}

                {bedMaintenanceHistory.map((m) => (
                  <div key={m.id} className="p-2.5 bg-amber-50/50 border border-amber-200/60 rounded-xl space-y-1">
                    <div className="flex justify-between items-center font-bold">
                      <span className={cn(
                        "text-[9px] uppercase px-1.5 py-0.5 rounded font-black",
                        m.status === 'open' ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                      )}>
                        {m.status === 'open' ? 'Mantenimiento Pendiente' : 'Reparado'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{formatDateTime(m.startDate)}</span>
                    </div>
                    <p className="text-slate-700 font-semibold">{m.description}</p>
                    {m.workDone && <p className="text-[11px] text-emerald-700">Trabajo: {m.workDone}</p>}
                  </div>
                ))}

                {bedAssignmentHistory.length === 0 && bedMaintenanceHistory.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-3">Sin historial registrado.</p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: ASSIGN PERSON (BY 13-DIGIT IDENTIFICATION) */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setAssigningBed(null);
          setAssignSubmitError(null);
        }}
        title={`Asignar Persona a Cama: ${assigningBed?.serial || assigningBed?.code || ''}`}
      >
        <form onSubmit={handleAssignBed} className="space-y-4">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs font-semibold text-emerald-800">
            Asignando Cama: <span className="font-mono font-black">{assigningBed?.serial || assigningBed?.code}</span> ({selectedDorm?.name})
          </div>

          {/* Error banner on submission */}
          {assignSubmitError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-start gap-2 animate-in fade-in duration-200 break-words overflow-hidden">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1 break-words min-w-0">{assignSubmitError}</div>
            </div>
          )}

          {/* 13-digit identification input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
              Número de identidad *
            </label>
            <input 
              type="text"
              inputMode="numeric"
              maxLength={13}
              required
              autoFocus
              placeholder="0801199012345"
              value={assignForm.identification}
              onChange={handleIdentityChange}
              onPaste={handleIdentityPaste}
              className={cn(
                "w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2",
                identityError || matchedPersonResult.status === 'not_found' || matchedPersonResult.status === 'duplicate'
                  ? "border-rose-400 focus:ring-rose-200"
                  : matchedPersonResult.status === 'found'
                    ? "border-emerald-400 focus:ring-emerald-200"
                    : "border-slate-200 focus:ring-primary/20"
              )}
            />
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400">Exactamente 13 dígitos numéricos (solo 0-9)</span>
              <span className={cn("font-mono font-bold", assignForm.identification.length === 13 ? "text-emerald-600" : "text-slate-400")}>
                {assignForm.identification.length} / 13
              </span>
            </div>
          </div>

          {/* Validation & Search Feedback Banners */}
          {identityError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {identityError}
            </div>
          )}

          {matchedPersonResult.status === 'not_found' && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Identidad no registrada. Registre primero a la persona.</span>
            </div>
          )}

          {matchedPersonResult.status === 'duplicate' && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{matchedPersonResult.error}</span>
            </div>
          )}

          {/* Person Read-only Card when Found */}
          {matchedPersonResult.status === 'found' && matchedPersonResult.person && (
            <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-1.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Persona Identificada (Solo Lectura)
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-800">
                  DNI: {matchedPersonResult.person.identification}
                </span>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <div className="h-9 w-9 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
                  {matchedPersonResult.person.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800">{matchedPersonResult.person.name}</p>
                  <p className="text-xs font-semibold text-slate-500">{matchedPersonResult.person.department || 'Sin departamento'}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Fecha de Ingreso *</label>
              <input 
                type="date"
                required
                value={assignForm.startDate}
                onChange={e => {
                  setAssignSubmitError(null);
                  setAssignForm(prev => ({ ...prev, startDate: e.target.value }));
                }}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Fecha Salida (Opcional)</label>
              <input 
                type="date"
                value={assignForm.endDate}
                onChange={e => {
                  setAssignSubmitError(null);
                  setAssignForm(prev => ({ ...prev, endDate: e.target.value }));
                }}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5 text-primary" />
                Curso *
              </label>
              {courseError && (
                <span className="text-[10px] font-bold text-rose-600 animate-in fade-in duration-150">
                  {courseError}
                </span>
              )}
            </div>
            <select 
              required
              value={assignForm.courseId}
              onChange={e => {
                setCourseError(null);
                setAssignSubmitError(null);
                setAssignForm(prev => ({ ...prev, courseId: e.target.value }));
              }}
              className={cn(
                "w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 appearance-none cursor-pointer",
                courseError 
                  ? "border-rose-400 focus:ring-rose-200 bg-rose-50/20" 
                  : "border-slate-200 focus:ring-primary/20"
              )}
            >
              <option value="">Seleccione un curso...</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.code ? `(${c.code})` : ''}
                </option>
              ))}
            </select>
            {courses.length === 0 && (
              <p className="text-[10px] text-slate-400 italic">Cargando catálogo de cursos...</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Observaciones</label>
            <textarea 
              rows={2}
              placeholder="Notas u observaciones de la asignación..."
              value={assignForm.observations}
              onChange={e => {
                setAssignSubmitError(null);
                setAssignForm(prev => ({ ...prev, observations: e.target.value }));
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsAssignModalOpen(false);
                setAssigningBed(null);
                setAssignSubmitError(null);
                setCourseError(null);
              }}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || matchedPersonResult.status !== 'found' || assignForm.identification.length !== 13 || !assignForm.courseId}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2",
                matchedPersonResult.status === 'found' && assignForm.identification.length === 13 && assignForm.courseId && !isSubmitting
                  ? "bg-primary hover:bg-primary/90 text-white cursor-pointer"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Asignando...</span>
                </>
              ) : (
                'Confirmar Asignación'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: TRANSFER */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Traslado Consistente de Plaza"
      >
        <form onSubmit={handleTransferBed} className="space-y-4">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs font-semibold text-amber-900">
            ⚠️ Trasladar a <span className="font-bold">{activeOccupant?.name}</span> desde la cama <span className="font-mono font-bold">{selectedBed?.serial || selectedBed?.code}</span>.
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
              Cama Libre de Destino *
            </label>
            <select
              required
              value={transferForm.targetBedId}
              onChange={e => setTransferForm(prev => ({ ...prev, targetBedId: e.target.value }))}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              <option value="">Seleccione cama libre de destino...</option>
              {availableTransferBeds.map(b => {
                const dormName = locations.find(l => l.id === b.locationId)?.name || 'Dormitorio';
                return (
                  <option key={b.id} value={b.id}>
                    {dormName} — Serie: {b.serial || b.code} ({b.name})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
              Motivo del Traslado *
            </label>
            <textarea 
              rows={2}
              required
              placeholder="Describa la justificación del cambio..."
              value={transferForm.reason}
              onChange={e => setTransferForm(prev => ({ ...prev, reason: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(false)}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 shadow-sm cursor-pointer"
            >
              {isSubmitting ? 'Procesando...' : 'Ejecutar Traslado'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: DAMAGE REPORT */}
      <Modal
        isOpen={isDamageModalOpen}
        onClose={() => setIsDamageModalOpen(false)}
        title="Reportar Daño o Mantenimiento"
      >
        <form onSubmit={handleReportDamage} className="space-y-4">
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-xs font-semibold text-rose-800">
            Cama: <span className="font-mono font-bold">{selectedBed?.serial || selectedBed?.code}</span>. Al reportar daño pasará a estado inhabilitado (Gris).
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Tipo de Incidencia *</label>
            <select
              value={damageForm.damageType}
              onChange={e => setDamageForm(prev => ({ ...prev, damageType: e.target.value }))}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              <option value="Estructura Litera">Estructura Litera / Soldadura</option>
              <option value="Colchón / Soporte">Colchón / Resortes</option>
              <option value="Pintura y Óxido">Pintura y Corrosión</option>
              <option value="General">General / Desgaste</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Descripción del Problema *</label>
            <textarea 
              rows={2}
              required
              placeholder="Detalle el daño observado..."
              value={damageForm.reason}
              onChange={e => setDamageForm(prev => ({ ...prev, reason: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 resize-none"
            />
          </div>

          {/* Optional Photo upload strictly for damage flow */}
          <div className="space-y-1 pt-1 border-t border-slate-100">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5" />
              Fotografía de Daño (Opcional)
            </label>
            <input 
              type="file" 
              accept="image/*"
              onChange={e => handlePhotoUpload(e, (b64) => setDamageForm(prev => ({ ...prev, photoBase64: b64 })))}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
            />
            {damageForm.photoBase64 && (
              <img src={damageForm.photoBase64} alt="Previsualización daño" className="h-16 w-auto rounded-lg mt-1 border border-slate-200" />
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsDamageModalOpen(false)}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 shadow-sm cursor-pointer"
            >
              {isSubmitting ? 'Guardando...' : 'Registrar Incidencia'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 5: REPAIR */}
      <Modal
        isOpen={isRepairModalOpen}
        onClose={() => setIsRepairModalOpen(false)}
        title="Registrar Reparación y Habilitar"
      >
        <form onSubmit={handleRepairBed} className="space-y-4">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs font-semibold text-emerald-800">
            Habilitación de Cama: <span className="font-mono font-bold">{selectedBed?.serial || selectedBed?.code}</span>. Al confirmar volverá a estar disponible (Verde).
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Trabajo Realizado *</label>
            <textarea 
              rows={2}
              required
              placeholder="Describa la reparación ejecutada..."
              value={repairForm.workDone}
              onChange={e => setRepairForm(prev => ({ ...prev, workDone: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 resize-none"
            />
          </div>

          {/* Optional Photo upload strictly for repair flow */}
          <div className="space-y-1 pt-1 border-t border-slate-100">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5" />
              Fotografía Posterior a Reparación (Opcional)
            </label>
            <input 
              type="file" 
              accept="image/*"
              onChange={e => handlePhotoUpload(e, (b64) => setRepairForm(prev => ({ ...prev, photoBase64: b64 })))}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
            />
            {repairForm.photoBase64 && (
              <img src={repairForm.photoBase64} alt="Previsualización reparación" className="h-16 w-auto rounded-lg mt-1 border border-slate-200" />
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsRepairModalOpen(false)}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-sm cursor-pointer"
            >
              {isSubmitting ? 'Guardando...' : 'Habilitar Cama'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 6: ADD BUNK (2 Beds) */}
      <Modal
        isOpen={isAddBunkModalOpen}
        onClose={() => setIsAddBunkModalOpen(false)}
        title={`Registrar Litera ${configuringSlotIndex ? `en Posición ${configuringSlotIndex}` : ''}`}
      >
        <form onSubmit={handleAddBunk} className="space-y-4">
          <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 text-xs font-semibold text-primary">
            Dormitorio: <span className="font-black">{selectedDorm?.name}</span>. Una litera registra 2 plazas con series únicas independientes.
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Número de Litera *</label>
            <input 
              type="number"
              min={1}
              max={25}
              required
              placeholder="Ej. 14"
              value={addBunkForm.bunkNumber}
              onChange={e => setAddBunkForm(prev => ({ ...prev, bunkNumber: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
              Serie Única — Cama Superior *
            </label>
            <input 
              type="text"
              required
              placeholder="Ej. 4951381"
              value={addBunkForm.upperSerial}
              onChange={e => setAddBunkForm(prev => ({ ...prev, upperSerial: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
              Serie Única — Cama Inferior *
            </label>
            <input 
              type="text"
              required
              placeholder="Ej. 4951382"
              value={addBunkForm.lowerSerial}
              onChange={e => setAddBunkForm(prev => ({ ...prev, lowerSerial: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAddBunkModalOpen(false)}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 shadow-sm cursor-pointer"
            >
              {isSubmitting ? 'Creando...' : 'Crear Litera'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 7: EDIT SERIAL */}
      <Modal
        isOpen={isEditSerialModalOpen}
        onClose={() => setIsEditSerialModalOpen(false)}
        title="Modificar Serie Única de Cama"
      >
        <form onSubmit={handleEditSerial} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Número de Serie Único *</label>
            <input 
              type="text"
              required
              value={editSerialForm.serial}
              onChange={e => setEditSerialForm(prev => ({ ...prev, serial: e.target.value }))}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Código Interno</label>
            <input 
              type="text"
              value={editSerialForm.code}
              onChange={e => setEditSerialForm(prev => ({ ...prev, code: e.target.value }))}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Nombre del Activo</label>
            <input 
              type="text"
              value={editSerialForm.name}
              onChange={e => setEditSerialForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEditSerialModalOpen(false)}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 shadow-sm cursor-pointer"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
