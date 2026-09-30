import { useState, useEffect } from 'react';
import { storage, logAction } from '../lib/storage';
import { Asset, Person, Driver } from '../types';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import PhotoCell from '../components/PhotoCell';
import { 
  Car, 
  RotateCcw, 
  Search, 
  Gauge, 
  ShieldCheck, 
  Wrench, 
  Download, 
  File, 
  Plus, 
  Upload, 
  Eye, 
  Edit2, 
  AlertCircle, 
  Loader2,
  X,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import ReportFormatSelector from '../components/ReportFormatSelector';
import { generateReport, ReportFormat } from '../lib/reports';
import { saveImage, getImage } from '../lib/idb';

export default function Vehicles() {
  const [activeTab, setActiveTab] = useState<'fleet' | 'drivers'>('fleet');
  const [vehicles, setVehicles] = useState<Asset[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [driverSearch, setDriverSearch] = useState('');
  
  // Fleet Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportFormat, setReportFormat] = useState<ReportFormat>('pdf');
  const [editingVehicle, setEditingVehicle] = useState<Partial<Asset> | null>(null);
  const [statusObservation, setStatusObservation] = useState('');

  // Driver Modals & State
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [driverModalMode, setDriverModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [driverActiveSubTab, setDriverActiveSubTab] = useState<'personal' | 'license' | 'documents'>('personal');
  const [isSubmittingDriver, setIsSubmittingDriver] = useState(false);
  const [driverFormError, setDriverFormError] = useState<string | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);

  // Document Viewer Modal State
  const [viewingDocUrl, setViewingDocUrl] = useState<string | null>(null);
  const [viewingDocTitle, setViewingDocTitle] = useState<string>('');

  // Driver Form State
  const [driverForm, setDriverForm] = useState({
    name: '',
    identification: '',
    phone: '',
    licenseNumber: '',
    licenseCategory: '',
    licenseIssueDate: '',
    licenseExpiration: '',
    observations: '',
    photoId: '',
    licenseFrontPhotoId: '',
    licenseBackPhotoId: '',
    dniFrontPhotoId: '',
    dniBackPhotoId: '',
  });

  const { profile } = useAuth();
  const isSupervisorOrAbove = profile?.role === 'admin' || profile?.role === 'vehicle_manager' || profile?.role === 'supervisor';

  useEffect(() => {
    setLoading(true);
    
    const unsubscribeAssets = storage.subscribe('assets', (data) => {
      setVehicles((data as Asset[]).filter(a => a.type === 'vehicle'));
      setLoading(false);
    });

    const unsubscribePeople = storage.subscribe('people', (data) => {
      setPeople(data as Person[]);
    });

    const unsubscribeDrivers = storage.subscribe('drivers', (data) => {
      setDrivers(data as Driver[]);
    });

    return () => {
      unsubscribeAssets();
      unsubscribePeople();
      unsubscribeDrivers();
    };
  }, []);

  // 13-digit identity validation helper
  const handleIdentificationChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length > 13) return;
    if (cleaned && !/^[0-9]+$/.test(cleaned)) {
      setIdentityError('Solo se admiten dígitos del 0 al 9.');
      return;
    }
    if (cleaned.length > 0 && cleaned.length < 13) {
      setIdentityError('El número de identidad debe tener exactamente 13 dígitos.');
    } else {
      setIdentityError(null);
    }
    setDriverForm(prev => ({ ...prev, identification: cleaned }));
  };

  const handleIdentificationPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').trim();
    const cleaned = pasted.replace(/\D/g, '');
    if (cleaned.length !== 13) {
      e.preventDefault();
      setIdentityError('El texto pegado debe contener exactamente 13 dígitos numéricos.');
    } else {
      setIdentityError(null);
    }
  };

  const handleFileUpload = async (field: keyof typeof driverForm, file: File) => {
    if (!file) return;
    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('El archivo excede el límite de 10MB.');
      return;
    }
    try {
      const id = await saveImage(file);
      setDriverForm(prev => ({ ...prev, [field]: id }));
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('Error al guardar el archivo. Por favor intente de nuevo.');
    }
  };

  const openDocumentViewer = async (photoId?: string, title = 'Documento') => {
    if (!photoId) return;
    try {
      const url = await getImage(photoId);
      if (url) {
        setViewingDocUrl(url);
        setViewingDocTitle(title);
      } else {
        alert('No se pudo encontrar el archivo adjunto.');
      }
    } catch (err) {
      console.error(err);
      alert('Error al abrir el documento.');
    }
  };

  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingDriver) return;

    if (!isSupervisorOrAbove) {
      setDriverFormError('Acceso denegado: Su rol no tiene permisos para gestionar conductores.');
      return;
    }

    if (!driverForm.name.trim()) {
      setDriverFormError('El nombre completo es obligatorio.');
      return;
    }

    if (driverForm.identification.length !== 13) {
      setDriverFormError('El número de identidad debe tener exactamente 13 dígitos.');
      return;
    }

    if (!driverForm.licenseNumber.trim()) {
      setDriverFormError('El número de licencia es obligatorio.');
      return;
    }

    if (!driverForm.licenseCategory.trim()) {
      setDriverFormError('La categoría de licencia es obligatoria.');
      return;
    }

    if (!driverForm.licenseExpiration) {
      setDriverFormError('La fecha de vencimiento de la licencia es obligatoria.');
      return;
    }

    setIsSubmittingDriver(true);
    setDriverFormError(null);

    try {
      const now = Math.floor(Date.now() / 1000);

      // Check or create person in 'people' registry (avoiding duplicates)
      const person = people.find(p => p.identification === driverForm.identification);
      let personId = person ? person.id : null;

      if (!person) {
        const newPerson = await storage.addDocument('people', {
          name: driverForm.name.trim(),
          identification: driverForm.identification,
          department: 'Transportes / Conductores',
          phone: driverForm.phone.trim() || undefined
        });
        personId = newPerson.id;
      } else {
        await storage.updateDocument('people', person.id, {
          name: driverForm.name.trim(),
          phone: driverForm.phone.trim() || person.phone
        });
      }

      const driverData = {
        personId,
        name: driverForm.name.trim(),
        identification: driverForm.identification,
        phone: driverForm.phone.trim() || '',
        licenseNumber: driverForm.licenseNumber.trim(),
        licenseCategory: driverForm.licenseCategory.trim(),
        licenseIssueDate: driverForm.licenseIssueDate || '',
        licenseExpiration: driverForm.licenseExpiration,
        observations: driverForm.observations.trim() || '',
        photoId: driverForm.photoId || '',
        licenseFrontPhotoId: driverForm.licenseFrontPhotoId || '',
        licenseBackPhotoId: driverForm.licenseBackPhotoId || '',
        dniFrontPhotoId: driverForm.dniFrontPhotoId || '',
        dniBackPhotoId: driverForm.dniBackPhotoId || '',
        updatedAt: { seconds: now }
      };

      if (driverModalMode === 'edit' && selectedDriver) {
        await storage.updateDocument('drivers', selectedDriver.id, driverData);
        await logAction({
          assetId: selectedDriver.id,
          assetName: driverForm.name,
          assetCode: driverForm.identification,
          operation: 'update',
          observations: `Actualización de ficha de conductor: ${driverForm.name}`,
          userId: profile?.uid || 'system',
          userName: profile?.name || 'Sistema',
          timestamp: { seconds: now }
        });
      } else {
        const newDriver = await storage.addDocument('drivers', {
          ...driverData,
          createdBy: profile?.uid || 'system',
          createdByName: profile?.name || 'Sistema',
          createdAt: { seconds: now }
        });
        await logAction({
          assetId: newDriver.id,
          assetName: driverForm.name,
          assetCode: driverForm.identification,
          operation: 'create',
          observations: `Registro de nuevo conductor: ${driverForm.name}`,
          userId: profile?.uid || 'system',
          userName: profile?.name || 'Sistema',
          timestamp: { seconds: now }
        });
      }

      setIsDriverModalOpen(false);
      setSelectedDriver(null);
      resetDriverForm();
    } catch (err) {
      console.error('Error saving driver:', err);
      setDriverFormError('Error al guardar el conductor. Por favor intente de nuevo.');
    } finally {
      setIsSubmittingDriver(false);
    }
  };

  const resetDriverForm = () => {
    setDriverForm({
      name: '',
      identification: '',
      phone: '',
      licenseNumber: '',
      licenseCategory: '',
      licenseIssueDate: '',
      licenseExpiration: '',
      observations: '',
      photoId: '',
      licenseFrontPhotoId: '',
      licenseBackPhotoId: '',
      dniFrontPhotoId: '',
      dniBackPhotoId: '',
    });
    setDriverFormError(null);
    setIdentityError(null);
  };

  const handleOpenCreateDriver = () => {
    resetDriverForm();
    setSelectedDriver(null);
    setDriverModalMode('create');
    setDriverActiveSubTab('personal');
    setIsDriverModalOpen(true);
  };

  const handleOpenEditDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    setDriverForm({
      name: driver.name || '',
      identification: driver.identification || '',
      phone: driver.phone || '',
      licenseNumber: driver.licenseNumber || '',
      licenseCategory: driver.licenseCategory || '',
      licenseIssueDate: driver.licenseIssueDate || '',
      licenseExpiration: driver.licenseExpiration || '',
      observations: driver.observations || '',
      photoId: driver.photoId || '',
      licenseFrontPhotoId: driver.licenseFrontPhotoId || '',
      licenseBackPhotoId: driver.licenseBackPhotoId || '',
      dniFrontPhotoId: driver.dniFrontPhotoId || '',
      dniBackPhotoId: driver.dniBackPhotoId || '',
    });
    setDriverModalMode('edit');
    setDriverActiveSubTab('personal');
    setIsDriverModalOpen(true);
  };

  const handleOpenViewDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    setDriverForm({
      name: driver.name || '',
      identification: driver.identification || '',
      phone: driver.phone || '',
      licenseNumber: driver.licenseNumber || '',
      licenseCategory: driver.licenseCategory || '',
      licenseIssueDate: driver.licenseIssueDate || '',
      licenseExpiration: driver.licenseExpiration || '',
      observations: driver.observations || '',
      photoId: driver.photoId || '',
      licenseFrontPhotoId: driver.licenseFrontPhotoId || '',
      licenseBackPhotoId: driver.licenseBackPhotoId || '',
      dniFrontPhotoId: driver.dniFrontPhotoId || '',
      dniBackPhotoId: driver.dniBackPhotoId || '',
    });
    setDriverModalMode('view');
    setDriverActiveSubTab('personal');
    setIsDriverModalOpen(true);
  };

  const handleAssign = async (vehicleId: string, personId: string) => {
    if (!profile) return;
    
    const vehicle = vehicles.find(v => v.id === vehicleId);
    const person = people.find(p => p.id === personId);

    const assignmentData = {
      assetId: vehicleId,
      personId,
      startDate: { seconds: Math.floor(Date.now() / 1000) },
      status: 'active',
      userId: profile.uid,
    };
    
    const newAssignment = await storage.addDocument('assignments', assignmentData);

    await storage.updateDocument('assets', vehicleId, {
      currentAssignmentId: newAssignment.id,
      assignedPersonId: personId
    });

    if (vehicle && person) {
      await logAction({
        assetId: vehicleId,
        assetName: vehicle.name,
        assetCode: vehicle.code,
        operation: 'assign',
        changes: [{ field: 'assignedTo', oldValue: null, newValue: person.name }],
        userId: profile.uid,
        userName: profile.name,
        timestamp: { seconds: Math.floor(Date.now() / 1000) }
      });
    }
  };

  const handleReturn = async (vehicleId: string, assignmentId: string) => {
    if (!profile) return;
    const vehicle = vehicles.find(v => v.id === vehicleId);
    
    await storage.updateDocument('assignments', assignmentId, {
      endDate: { seconds: Math.floor(Date.now() / 1000) },
      status: 'returned',
    });

    await storage.updateDocument('assets', vehicleId, {
      currentAssignmentId: null,
      assignedPersonId: null
    });

    if (vehicle) {
      await logAction({
        assetId: vehicleId,
        assetName: vehicle.name,
        assetCode: vehicle.code,
        operation: 'return',
        userId: profile.uid,
        userName: profile.name,
        timestamp: { seconds: Math.floor(Date.now() / 1000) }
      });
    }
  };

  const handleDownloadReport = async (format: ReportFormat = 'pdf') => {
    if (!profile) return;
    setIsGenerating(true);

    try {
      const filteredVehicles = vehicles.filter(v => 
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.details?.plate?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (filteredVehicles.length === 0) {
        alert('No hay vehículos para exportar con los filtros actuales.');
        setIsGenerating(false);
        return;
      }

      await generateReport({
        title: 'Reporte de Flota Vehicular EIC',
        filename: 'SAGP_Reporte_Vehiculos',
        userName: profile.name,
        format,
        columns: [
          { header: 'Código', dataKey: 'code' },
          { header: 'Vehículo', dataKey: 'name' },
          { header: 'Placa', dataKey: 'plate' },
          { header: 'Marca', dataKey: 'brand' },
          { header: 'Modelo', dataKey: 'model' },
          { header: 'Estado', dataKey: 'statusLabel' },
          { header: 'Asignado a', dataKey: 'assignedLabel' }
        ],
        data: filteredVehicles.map(v => ({
          ...v,
          plate: v.details?.plate || 'N/A',
          statusLabel: v.status === 'good' ? 'BUENO' : v.status === 'bad' ? 'MALO' : v.status === 'maintenance' ? 'MANTENIMIENTO' : 'BAJA',
          assignedLabel: people.find(p => p.id === v.assignedPersonId)?.name || 'Sin asignar'
        }))
      });
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredVehicles = vehicles.filter(v => 
    v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.details?.plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDrivers = drivers.filter(d =>
    d.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
    d.identification.includes(driverSearch) ||
    d.licenseNumber.toLowerCase().includes(driverSearch.toLowerCase())
  );

  const vehicleColumns = [
    { 
      header: 'Foto', 
      accessorKey: (v: Asset) => <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center"><PhotoCell photoId={v.photoId} /></div>,
      className: 'w-16'
    },
    { header: 'Placa / Código', accessorKey: (v: Asset) => (
      <div>
        <div className="font-black text-slate-800 uppercase tracking-tighter">{v.details?.plate || 'S/P'}</div>
        <div className="text-[10px] font-mono font-bold text-slate-400">{v.code}</div>
      </div>
    )},
    { header: 'Vehículo', accessorKey: (v: Asset) => (
      <div>
        <div className="text-sm font-bold text-slate-700">{v.brand} {v.model}</div>
        <div className="text-[10px] text-slate-500 font-bold uppercase">Modelo: {v.details?.year}</div>
      </div>
    )},
    { header: 'Uso / Kilometraje', accessorKey: (v: Asset) => (
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-slate-100 rounded-lg">
          <Gauge className="h-3 w-3 text-slate-500" />
        </div>
        <span className="text-sm font-black text-slate-700">{v.details?.mileage?.toLocaleString()} KM</span>
      </div>
    )},
    { header: 'Estado', accessorKey: (v: Asset) => <StatusBadge status={v.status} /> },
    { 
      header: 'Gestión', 
      accessorKey: (v: Asset) => (
        <div className="flex items-center gap-2">
          {v.currentAssignmentId ? (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleReturn(v.id, v.currentAssignmentId!);
              }}
              className="flex items-center gap-1.5 text-amber-600 hover:text-white font-bold text-[10px] uppercase px-3 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-600 transition-all active:scale-95"
            >
              <RotateCcw className="h-3 w-3" /> Devolver
            </button>
          ) : (
            <select 
              className="text-[10px] font-bold uppercase border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#042B60]/20 cursor-pointer hover:border-[#042B60]/50 transition-colors"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                if (e.target.value) handleAssign(v.id, e.target.value);
              }}
              defaultValue=""
            >
              <option value="" disabled>Asignar a conductor...</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.name} ({p.identification})</option>)}
            </select>
          )}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setEditingVehicle(v);
              setIsModalOpen(true);
            }}
            className="p-1.5 text-slate-400 hover:text-[#042B60] transition-colors"
            title="Cambiar Estado"
          >
            <Wrench className="h-4 w-4" />
          </button>
        </div>
      )
    },
  ];

  const driverColumns = [
    {
      header: 'Conductor',
      accessorKey: (d: Driver) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-[#042B60]/10 text-[#042B60] font-black flex items-center justify-center text-xs overflow-hidden">
            {d.photoId ? (
              <div className="h-full w-full object-cover"><PhotoCell photoId={d.photoId} /></div>
            ) : (
              d.name.charAt(0)
            )}
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800">{d.name}</div>
            <div className="text-[10px] font-mono text-slate-400">Tel: {d.phone || 'N/D'}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Identidad (DNI)',
      accessorKey: (d: Driver) => (
        <span className="font-mono font-bold text-xs text-slate-700">{d.identification}</span>
      )
    },
    {
      header: 'Licencia',
      accessorKey: (d: Driver) => (
        <div>
          <div className="font-mono font-bold text-xs text-slate-800">{d.licenseNumber}</div>
          <span className="inline-block mt-0.5 px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-black rounded uppercase">
            Cat: {d.licenseCategory}
          </span>
        </div>
      )
    },
    {
      header: 'Vencimiento',
      accessorKey: (d: Driver) => {
        const isExpired = new Date(d.licenseExpiration) < new Date();
        return (
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold tabular-nums ${isExpired ? 'text-rose-600 font-black' : 'text-slate-700'}`}>
              {d.licenseExpiration}
            </span>
            {isExpired && (
              <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[9px] font-black uppercase rounded">Vencida</span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Documentos',
      accessorKey: (d: Driver) => {
        const docsCount = [d.photoId, d.licenseFrontPhotoId, d.licenseBackPhotoId, d.dniFrontPhotoId, d.dniBackPhotoId].filter(Boolean).length;
        return (
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${docsCount === 5 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
            {docsCount} / 5 Adjuntos
          </span>
        );
      }
    },
    {
      header: 'Acciones',
      accessorKey: (d: Driver) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenViewDriver(d)}
            className="p-1.5 text-slate-400 hover:text-[#042B60] transition-colors"
            title="Consultar Ficha"
          >
            <Eye className="h-4 w-4" />
          </button>
          {isSupervisorOrAbove && (
            <button
              onClick={() => handleOpenEditDriver(d)}
              className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors"
              title="Editar Ficha"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-[#042B60] flex items-center gap-2.5 uppercase tracking-tight">
            <Car className="h-6 w-6 text-[#042B60]" />
            Control de Vehículos y Conductores
          </h2>
          <p className="text-xs lg:text-sm text-slate-500 font-medium italic">Supervisión de flota vehicular, asignaciones y registro de conductores autorizados</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/60">
          <button
            onClick={() => setActiveTab('fleet')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'fleet' ? 'bg-[#042B60] text-[#FFED00] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Flota Vehicular
          </button>
          <button
            onClick={() => setActiveTab('drivers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'drivers' ? 'bg-[#042B60] text-[#FFED00] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Conductores ({drivers.length})
          </button>
        </div>
      </div>

      {activeTab === 'fleet' ? (
        <>
          {/* Fleet Controls & Export */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por placa, código o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#042B60]/20 font-medium"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <div className="flex items-center gap-2 pr-4 border-r border-slate-100">
                <File className="h-4 w-4 text-slate-400" />
                <ReportFormatSelector 
                  selectedFormat={reportFormat}
                  onFormatChange={setReportFormat}
                  className="grid-cols-3 gap-1"
                />
              </div>
              <button 
                onClick={() => handleDownloadReport(reportFormat)}
                disabled={loading || isGenerating}
                className="flex items-center justify-center gap-2 bg-[#042B60] text-white px-5 py-2.5 rounded-xl hover:bg-[#042B60]/90 transition-all font-black text-xs shadow-md active:scale-95 disabled:opacity-50"
              >
                <Download className="h-4 w-4 text-[#FFED00]" />
                <span>{isGenerating ? 'Generando...' : `EXPORTAR ${reportFormat.toUpperCase()}`}</span>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
              <Car className="h-5 w-5 text-slate-400 mb-1" />
              <p className="text-2xl font-black text-slate-800">{vehicles.length}</p>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Total Flota</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
              <ShieldCheck className="h-5 w-5 text-emerald-500 mb-1" />
              <p className="text-2xl font-black text-emerald-600">{vehicles.filter(v => v.status === 'good').length}</p>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Operativos</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
              <Wrench className="h-5 w-5 text-amber-500 mb-1" />
              <p className="text-2xl font-black text-amber-600">{vehicles.filter(v => v.status === 'maintenance' || v.status === 'bad').length}</p>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">En Taller / Dañados</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
              <UserCheck className="h-5 w-5 text-[#042B60] mb-1" />
              <p className="text-2xl font-black text-[#042B60]">{vehicles.filter(v => v.currentAssignmentId).length}</p>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Asignados</p>
            </div>
          </div>

          {/* Vehicles DataTable */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <DataTable 
              columns={vehicleColumns}
              data={filteredVehicles}
              loading={loading}
              emptyMessage="No se encontraron vehículos registrados."
            />
          </div>
        </>
      ) : (
        <>
          {/* Drivers Tab Content */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, identidad o licencia..."
                value={driverSearch}
                onChange={(e) => setDriverSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#042B60]/20 font-medium"
              />
            </div>

            {isSupervisorOrAbove && (
              <button
                onClick={handleOpenCreateDriver}
                className="flex items-center gap-2 bg-[#042B60] text-[#FFED00] px-5 py-2.5 rounded-xl hover:bg-[#042B60]/90 transition-all font-black text-xs shadow-md active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Registrar Conductor</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <DataTable 
              columns={driverColumns}
              data={filteredDrivers}
              loading={loading}
              emptyMessage="No hay conductores registrados."
            />
          </div>
        </>
      )}

      {/* Vehicle Status Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Actualizar Estado de Vehículo">
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!editingVehicle?.id) return;
          const originalVehicle = vehicles.find(v => v.id === editingVehicle.id);
          if (originalVehicle && originalVehicle.status !== editingVehicle.status) {
            await logAction({
              assetId: editingVehicle.id,
              assetName: editingVehicle.name!,
              assetCode: editingVehicle.code!,
              operation: 'status_change',
              changes: [{ field: 'status', oldValue: originalVehicle.status, newValue: editingVehicle.status }],
              observations: statusObservation,
              userId: profile?.uid || 'demo-user',
              userName: profile?.name || 'Usuario Demo',
              timestamp: { seconds: Math.floor(Date.now() / 1000) }
            });
          }
          await storage.updateDocument('assets', editingVehicle.id, {
            status: editingVehicle.status
          });
          setIsModalOpen(false);
          setEditingVehicle(null);
          setStatusObservation('');
        }} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nuevo Estado</label>
            <select
              value={editingVehicle?.status || 'good'}
              onChange={(e) => setEditingVehicle(prev => prev ? { ...prev, status: e.target.value as any } : null)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-[#042B60]/20"
            >
              <option value="good">Operativo (Bueno)</option>
              <option value="regular">Regular</option>
              <option value="maintenance">En Mantenimiento</option>
              <option value="bad">Dañado / Fuera de servicio</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observaciones / Motivo</label>
            <textarea
              rows={3}
              value={statusObservation}
              onChange={(e) => setStatusObservation(e.target.value)}
              placeholder="Describa el motivo del cambio de estado..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#042B60]/20"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#042B60] text-[#FFED00] rounded-xl text-xs font-black shadow-md hover:bg-[#042B60]/90"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </Modal>

      {/* Driver Registration / Edit / View Modal */}
      <Modal 
        isOpen={isDriverModalOpen} 
        onClose={() => setIsDriverModalOpen(false)} 
        title={driverModalMode === 'create' ? 'Registrar Nuevo Conductor' : driverModalMode === 'edit' ? 'Editar Ficha de Conductor' : 'Consulta de Conductor'}
      >
        <form onSubmit={handleSaveDriver} className="space-y-6">
          {driverFormError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{driverFormError}</span>
            </div>
          )}

          {/* Sub-tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <button
              type="button"
              onClick={() => setDriverActiveSubTab('personal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${driverActiveSubTab === 'personal' ? 'bg-[#042B60] text-[#FFED00]' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              1. Datos Personales
            </button>
            <button
              type="button"
              onClick={() => setDriverActiveSubTab('license')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${driverActiveSubTab === 'license' ? 'bg-[#042B60] text-[#FFED00]' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              2. Licencia
            </button>
            <button
              type="button"
              onClick={() => setDriverActiveSubTab('documents')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${driverActiveSubTab === 'documents' ? 'bg-[#042B60] text-[#FFED00]' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              3. Documentos y Adjuntos
            </button>
          </div>

          {/* Sub-tab 1: Personal Data */}
          {driverActiveSubTab === 'personal' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  disabled={driverModalMode === 'view'}
                  value={driverForm.name}
                  onChange={(e) => setDriverForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej. Juan Carlos Pérez Morales"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#042B60]/20 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Número de Identidad (13 Dígitos) *</label>
                <input
                  type="text"
                  required
                  maxLength={13}
                  disabled={driverModalMode === 'view'}
                  value={driverForm.identification}
                  onChange={(e) => handleIdentificationChange(e.target.value)}
                  onPaste={handleIdentificationPaste}
                  placeholder="0801199012345"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-[#042B60]/20 disabled:bg-slate-50"
                />
                {identityError && <p className="text-[10px] text-rose-600 font-bold mt-1">{identityError}</p>}
                <p className="text-[10px] text-slate-400 mt-1">Exactamente 13 dígitos numéricos, conservando ceros iniciales.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Teléfono de Contacto (Opcional)</label>
                <input
                  type="tel"
                  disabled={driverModalMode === 'view'}
                  value={driverForm.phone}
                  onChange={(e) => setDriverForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+504 9999-9999"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#042B60]/20 disabled:bg-slate-50"
                />
              </div>

              {/* Driver Photo Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fotografía del Conductor</label>
                <div className="flex items-center gap-4">
                  {driverForm.photoId ? (
                    <div className="relative h-16 w-16 rounded-xl overflow-hidden border border-slate-200">
                      <div className="h-full w-full object-cover"><PhotoCell photoId={driverForm.photoId} /></div>
                      {driverModalMode !== 'view' && (
                        <button
                          type="button"
                          onClick={() => setDriverForm(prev => ({ ...prev, photoId: '' }))}
                          className="absolute top-0 right-0 bg-rose-600 text-white p-0.5 rounded-bl"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="h-16 w-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">
                      Sin foto
                    </div>
                  )}
                  {driverModalMode !== 'view' && (
                    <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2">
                      <Upload className="h-3.5 w-3.5" />
                      <span>Subir Foto</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload('photoId', file);
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab 2: License Data */}
          {driverActiveSubTab === 'license' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Número de Licencia *</label>
                  <input
                    type="text"
                    required
                    disabled={driverModalMode === 'view'}
                    value={driverForm.licenseNumber}
                    onChange={(e) => setDriverForm(prev => ({ ...prev, licenseNumber: e.target.value }))}
                    placeholder="L-0801-1990-12345"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-[#042B60]/20 disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Categoría / Tipo *</label>
                  <select
                    required
                    disabled={driverModalMode === 'view'}
                    value={driverForm.licenseCategory}
                    onChange={(e) => setDriverForm(prev => ({ ...prev, licenseCategory: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-[#042B60]/20 disabled:bg-slate-50"
                  >
                    <option value="" disabled>Seleccione categoría...</option>
                    <option value="Liviana (A)">Liviana (A)</option>
                    <option value="Pesada (B)">Pesada (B)</option>
                    <option value="Equipo Pesado (C)">Equipo Pesado (C)</option>
                    <option value="Motocicleta (M)">Motocicleta (M)</option>
                    <option value="Especial (E)">Especial (E)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha de Emisión</label>
                  <input
                    type="date"
                    disabled={driverModalMode === 'view'}
                    value={driverForm.licenseIssueDate}
                    onChange={(e) => setDriverForm(prev => ({ ...prev, licenseIssueDate: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#042B60]/20 disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha de Vencimiento *</label>
                  <input
                    type="date"
                    required
                    disabled={driverModalMode === 'view'}
                    value={driverForm.licenseExpiration}
                    onChange={(e) => setDriverForm(prev => ({ ...prev, licenseExpiration: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#042B60]/20 disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observaciones / Restricciones (Opcional)</label>
                <textarea
                  rows={3}
                  disabled={driverModalMode === 'view'}
                  value={driverForm.observations}
                  onChange={(e) => setDriverForm(prev => ({ ...prev, observations: e.target.value }))}
                  placeholder="Ej. Uso obligatorio de lentes correctivos..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#042B60]/20 disabled:bg-slate-50"
                />
              </div>
            </div>
          )}

          {/* Sub-tab 3: Documents */}
          {driverActiveSubTab === 'documents' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <p className="text-xs text-slate-500 font-medium">
                Adjunte los documentos escaneados o fotografías (JPG, PNG, PDF). Estos documentos están protegidos por los controles de acceso del sistema.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* License Front */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase">Licencia (Frente)</span>
                    {driverForm.licenseFrontPhotoId ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-black">Adjunto</span>
                    ) : (
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-black">Pendiente</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {driverForm.licenseFrontPhotoId && (
                      <button
                        type="button"
                        onClick={() => openDocumentViewer(driverForm.licenseFrontPhotoId, 'Licencia Frente')}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-[#042B60] rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" /> Ver
                      </button>
                    )}
                    {driverModalMode !== 'view' && (
                      <label className="cursor-pointer bg-[#042B60] text-[#FFED00] px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 hover:bg-[#042B60]/90">
                        <Upload className="h-3.5 w-3.5" /> Subir
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload('licenseFrontPhotoId', file);
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* License Back */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase">Licencia (Reverso)</span>
                    {driverForm.licenseBackPhotoId ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-black">Adjunto</span>
                    ) : (
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-black">Pendiente</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {driverForm.licenseBackPhotoId && (
                      <button
                        type="button"
                        onClick={() => openDocumentViewer(driverForm.licenseBackPhotoId, 'Licencia Reverso')}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-[#042B60] rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" /> Ver
                      </button>
                    )}
                    {driverModalMode !== 'view' && (
                      <label className="cursor-pointer bg-[#042B60] text-[#FFED00] px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 hover:bg-[#042B60]/90">
                        <Upload className="h-3.5 w-3.5" /> Subir
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload('licenseBackPhotoId', file);
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* DNI Front */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase">Identidad / DNI (Frente)</span>
                    {driverForm.dniFrontPhotoId ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-black">Adjunto</span>
                    ) : (
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-black">Pendiente</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {driverForm.dniFrontPhotoId && (
                      <button
                        type="button"
                        onClick={() => openDocumentViewer(driverForm.dniFrontPhotoId, 'DNI Frente')}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-[#042B60] rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" /> Ver
                      </button>
                    )}
                    {driverModalMode !== 'view' && (
                      <label className="cursor-pointer bg-[#042B60] text-[#FFED00] px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 hover:bg-[#042B60]/90">
                        <Upload className="h-3.5 w-3.5" /> Subir
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload('dniFrontPhotoId', file);
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* DNI Back */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase">Identidad / DNI (Reverso)</span>
                    {driverForm.dniBackPhotoId ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-black">Adjunto</span>
                    ) : (
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-black">Pendiente</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {driverForm.dniBackPhotoId && (
                      <button
                        type="button"
                        onClick={() => openDocumentViewer(driverForm.dniBackPhotoId, 'DNI Reverso')}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-[#042B60] rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" /> Ver
                      </button>
                    )}
                    {driverModalMode !== 'view' && (
                      <label className="cursor-pointer bg-[#042B60] text-[#FFED00] px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 hover:bg-[#042B60]/90">
                        <Upload className="h-3.5 w-3.5" /> Subir
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload('dniBackPhotoId', file);
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsDriverModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
            >
              Cerrar
            </button>
            {driverModalMode !== 'view' && (
              <button
                type="submit"
                disabled={isSubmittingDriver}
                className="px-6 py-2.5 bg-[#042B60] text-[#FFED00] rounded-xl text-xs font-black shadow-md hover:bg-[#042B60]/90 flex items-center gap-2"
              >
                {isSubmittingDriver && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{isSubmittingDriver ? 'Guardando...' : 'Guardar Ficha'}</span>
              </button>
            )}
          </div>
        </form>
      </Modal>

      {/* Document Viewer Modal */}
      <Modal isOpen={Boolean(viewingDocUrl)} onClose={() => setViewingDocUrl(null)} title={viewingDocTitle}>
        <div className="space-y-4 text-center">
          {viewingDocUrl && (
            <div className="max-h-[60vh] overflow-auto rounded-2xl border border-slate-200 bg-slate-100 flex items-center justify-center p-2">
              <img src={viewingDocUrl} alt="Documento" className="max-w-full max-h-[50vh] object-contain rounded-xl shadow" />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <a
              href={viewingDocUrl || '#'}
              download="Documento_Conductor"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-[#042B60] text-[#FFED00] rounded-xl text-xs font-black shadow-md hover:bg-[#042B60]/90 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              <span>Descargar Archivo</span>
            </a>
          </div>
        </div>
      </Modal>
    </div>
  );
}
