import { useState, useEffect } from 'react';
import { storage, logAction } from '../lib/storage';
import { Asset, Person, Assignment, Location } from '../types';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import PhotoCell from '../components/PhotoCell';
import { ShieldAlert, UserCheck, RotateCcw, History, Search, Box, Wrench, Save, Download, ChevronDown, Check, File, FileText, Plus, MapPin, User, AlertTriangle } from 'lucide-react';
import { formatDateTime, cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import ImageUpload from '../components/ImageUpload';
import ReportFormatSelector from '../components/ReportFormatSelector';
import { generateReport, ReportFormat } from '../lib/reports';

export default function Weapons() {
  const [weapons, setWeapons] = useState<Asset[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportFormat, setReportFormat] = useState<ReportFormat>('pdf');
  const [editingWeapon, setEditingWeapon] = useState<Partial<Asset> | null>(null);
  const [statusObservation, setStatusObservation] = useState('');
  const [newWeapon, setNewWeapon] = useState<Partial<Asset>>({
    code: '',
    serial: '',
    name: '',
    brand: '',
    model: '',
    status: 'good',
    locationId: '',
    assignedPersonId: '',
    photoId: undefined
  });
  const { profile } = useAuth();

  useEffect(() => {
    setLoading(true);
    
    const unsubscribeAssets = storage.subscribe('assets', (data) => {
      setWeapons((data as Asset[]).filter(a => a.type === 'weapon'));
    });

    const unsubscribePeople = storage.subscribe('people', (data) => {
      setPeople(data as Person[]);
    });

    const unsubscribeLocations = storage.subscribe('locations', (data) => {
      setLocations(data as Location[]);
    });

    const unsubscribeAssignments = storage.subscribe('assignments', (data) => {
      const sorted = (data as Assignment[]).sort((a, b) => (b.startDate?.seconds || 0) - (a.startDate?.seconds || 0));
      setAssignments(sorted);
      setLoading(false);
    });

    return () => {
      unsubscribeAssets();
      unsubscribePeople();
      unsubscribeLocations();
      unsubscribeAssignments();
    };
  }, []);

  const handleAssign = async (weaponId: string, personId: string) => {
    if (!profile) return;
    
    const weapon = weapons.find(w => w.id === weaponId);
    const person = people.find(p => p.id === personId);

    const assignmentData = {
      assetId: weaponId,
      personId,
      startDate: { seconds: Math.floor(Date.now() / 1000) },
      status: 'active',
      userId: profile.uid,
    };
    
    const newAssignment = await storage.addDocument('assignments', assignmentData);

    await storage.updateDocument('assets', weaponId, {
      currentAssignmentId: newAssignment.id,
    });

    if (weapon && person) {
      await logAction({
        assetId: weaponId,
        assetName: weapon.name,
        assetCode: weapon.code,
        operation: 'assign',
        changes: [{ field: 'assignedTo', oldValue: null, newValue: person.name }],
        userId: profile.uid,
        userName: profile.name,
        timestamp: { seconds: Math.floor(Date.now() / 1000) }
      });
    }
  };

  const handleReturn = async (weaponId: string, assignmentId: string) => {
    if (!profile) return;
    const weapon = weapons.find(w => w.id === weaponId);
    
    await storage.updateDocument('assignments', assignmentId, {
      endDate: { seconds: Math.floor(Date.now() / 1000) },
      status: 'returned',
    });

    await storage.updateDocument('assets', weaponId, {
      currentAssignmentId: null,
    });

    if (weapon) {
      await logAction({
        assetId: weaponId,
        assetName: weapon.name,
        assetCode: weapon.code,
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
      const filteredWeapons = weapons.filter(w => 
        w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        w.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.serial?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (filteredWeapons.length === 0) {
        alert('No hay armas para exportar con los filtros actuales.');
        setIsGenerating(false);
        return;
      }

      await generateReport({
        title: 'Reporte de Armamento Institucional',
        filename: 'SAGP_Reporte_Armas',
        userName: profile.name,
        format,
        columns: [
          { header: 'Código', dataKey: 'code' },
          { header: 'Arma', dataKey: 'name' },
          { header: 'Marca', dataKey: 'brand' },
          { header: 'Modelo', dataKey: 'model' },
          { header: 'Serie', dataKey: 'serial' },
          { header: 'Estado', dataKey: 'statusLabel' },
          { header: 'Asignado a', dataKey: 'assignedLabel' }
        ],
        data: filteredWeapons.map(w => ({
          ...w,
          statusLabel: w.status === 'good' ? 'BUENO' : w.status === 'bad' ? 'MALO' : w.status === 'maintenance' ? 'MANTENIMIENTO' : 'BAJA',
          assignedLabel: people.find(p => p.id === w.assignedPersonId)?.name || 'Sin asignar'
        }))
      });
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredWeapons = weapons.filter(w => 
    w.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.serial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { 
      header: 'Foto', 
      accessorKey: (w: Asset) => <PhotoCell photoId={w.photoId} />,
      className: 'w-16'
    },
    { header: 'Identificación', accessorKey: (w: Asset) => (
      <div>
        <div className="font-mono font-bold text-slate-800">{w.code}</div>
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">S/N: {w.serial || 'SIN SERIE'}</div>
      </div>
    )},
    { header: 'Especificaciones', accessorKey: (w: Asset) => (
      <div>
        <div className="text-slate-700 font-medium">{w.details?.weaponType || 'N/A'}</div>
        <div className="text-[10px] text-slate-500 font-bold">{w.details?.caliber || 'N/A'} - {w.brand}</div>
      </div>
    )},
    { 
      header: 'Estado Asignación', 
      accessorKey: (w: Asset) => {
        const assignment = assignments.find(a => a.id === w.currentAssignmentId && a.status === 'active');
        const person = people.find(p => p.id === assignment?.personId);
        return person ? (
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] text-primary font-bold border border-primary/20">
              {person.name.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800 leading-tight">{person.name}</span>
              <span className="text-[10px] text-emerald-600 font-bold uppercase">Asignado</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 opacity-50">
            <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-bold border border-slate-200">
              ?
            </div>
            <span className="text-slate-400 italic text-[10px] font-bold uppercase">Disponible</span>
          </div>
        );
      }
    },
    { 
      header: 'Gestión', 
      accessorKey: (w: Asset) => {
        const isActive = !!w.currentAssignmentId;
        return (
          <div className="flex items-center gap-2">
            {isActive ? (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleReturn(w.id, w.currentAssignmentId!);
                }}
                className="flex items-center gap-1.5 text-amber-600 hover:text-white font-bold text-[10px] uppercase px-3 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-600 transition-all active:scale-95"
              >
                <RotateCcw className="h-3 w-3" /> Devolver
              </button>
            ) : (
              <select 
                className="text-[10px] font-bold uppercase border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  if (e.target.value) handleAssign(w.id, e.target.value);
                }}
                defaultValue=""
              >
                <option value="" disabled>Asignar a...</option>
                {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setEditingWeapon(w);
                setIsModalOpen(true);
              }}
              className="p-1.5 text-slate-400 hover:text-primary transition-colors"
              title="Cambiar Estado"
            >
              <Wrench className="h-4 w-4" />
            </button>
          </div>
        );
      }
    },
  ];

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWeapon?.id) return;

    const originalWeapon = weapons.find(w => w.id === editingWeapon.id);
    if (originalWeapon && originalWeapon.status !== editingWeapon.status) {
      await logAction({
        assetId: editingWeapon.id,
        assetName: editingWeapon.name!,
        assetCode: editingWeapon.code!,
        operation: 'status_change',
        changes: [{ field: 'status', oldValue: originalWeapon.status, newValue: editingWeapon.status }],
        observations: statusObservation,
        userId: profile?.uid || 'demo-user',
        userName: profile?.name || 'Usuario Demo',
        timestamp: { seconds: Math.floor(Date.now() / 1000) }
      });
    }

    await storage.updateDocument('assets', editingWeapon.id, {
      status: editingWeapon.status
    });

    setIsModalOpen(false);
    setEditingWeapon(null);
    setStatusObservation('');
  };

  const handleCreateWeapon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    // Check permissions
    const isAuthorized = profile.role === 'admin' || profile.role === 'weapon_manager';
    if (!isAuthorized) {
      alert(`Acceso Denegado: Su rol de ${profile.role.replace('_', ' ').toUpperCase()} no tiene permisos para registrar armamento táctico.`);
      return;
    }

    if (!newWeapon.code || !newWeapon.name || !newWeapon.brand || !newWeapon.model || !newWeapon.locationId) {
      alert('Por favor complete todos los campos requeridos.');
      return;
    }

    // Check duplicates
    const isCodeDuplicate = weapons.some(w => w.code.toLowerCase().trim() === newWeapon.code?.toLowerCase().trim());
    const isSerialDuplicate = newWeapon.serial && weapons.some(w => w.serial?.toLowerCase().trim() === newWeapon.serial?.toLowerCase().trim());

    if (isCodeDuplicate) {
      alert(`Error: Ya existe un arma registrada con el Código "${newWeapon.code}".`);
      return;
    }
    if (isSerialDuplicate) {
      alert(`Error: Ya existe un arma registrada con el Número de Serie "${newWeapon.serial}".`);
      return;
    }

    try {
      setLoading(true);
      const weaponDoc = {
        code: newWeapon.code.trim(),
        serial: newWeapon.serial?.trim() || null,
        name: newWeapon.name.trim(),
        brand: newWeapon.brand.trim(),
        model: newWeapon.model.trim(),
        locationId: newWeapon.locationId,
        status: newWeapon.status || 'good',
        type: 'weapon' as const,
        photoId: newWeapon.photoId || null,
        details: {
          caliber: (newWeapon as any).caliber?.trim() || 'N/A',
          weaponType: (newWeapon as any).weaponType || 'Pistola',
          observations: (newWeapon as any).observations?.trim() || ''
        }
      };

      const docRef = await storage.addDocument('assets', weaponDoc);

      if (newWeapon.assignedPersonId) {
        await handleAssign(docRef.id, newWeapon.assignedPersonId);
      } else {
        await logAction({
          assetId: docRef.id,
          assetName: newWeapon.name,
          assetCode: newWeapon.code,
          operation: 'create',
          userId: profile.uid,
          userName: profile.name,
          timestamp: { seconds: Math.floor(Date.now() / 1000) }
        });
      }

      setIsCreateModalOpen(false);
      setNewWeapon({
        code: '',
        serial: '',
        name: '',
        brand: '',
        model: '',
        status: 'good',
        locationId: '',
        assignedPersonId: '',
        photoId: undefined
      });
      alert('Arma registrada exitosamente en el sistema real.');
    } catch (error) {
      console.error('Error creating weapon:', error);
      alert('Error al registrar el arma. Por favor intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {profile && !['admin', 'weapon_manager'].includes(profile.role) && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <span className="text-xs font-bold uppercase">Su rol ({profile.role.replace('_', ' ')}) tiene acceso de SÓLO LECTURA en este módulo de armamento táctico.</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800 flex items-center gap-2 uppercase tracking-tight">
            <ShieldAlert className="h-6 w-6 text-red-600" />
            Control de Armamento
          </h2>
          <p className="text-xs lg:text-sm text-slate-500 font-medium italic">Trazabilidad de equipo táctico institucional</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex-1 flex items-center gap-3 pr-4 border-r border-slate-100">
            <div className="p-2 bg-primary/5 rounded-lg">
              <File className="h-4 w-4 text-primary" />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Formato</span>
            <ReportFormatSelector 
              selectedFormat={reportFormat}
              onFormatChange={setReportFormat}
              className="grid-cols-3 gap-1.5"
            />
          </div>
          <button 
            onClick={() => handleDownloadReport(reportFormat)}
            disabled={loading || isGenerating || filteredWeapons.length === 0}
            className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-all font-black shadow-lg active:scale-95 disabled:opacity-50 min-w-[160px]"
          >
            <Download className="h-4 w-4" />
            <span>{isGenerating ? 'Generando...' : `GENERAR ${reportFormat.toUpperCase()}`}</span>
          </button>
          
          <button 
            onClick={() => {
              if (profile && !['admin', 'weapon_manager'].includes(profile.role)) {
                alert(`Acceso Denegado: Su rol de ${profile.role.replace('_', ' ').toUpperCase()} no tiene permisos para registrar armamento táctico.`);
                return;
              }
              setIsCreateModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl transition-all font-black shadow-lg active:scale-95 min-w-[160px]"
          >
            <Plus className="h-4 w-4" />
            <span>REGISTRAR ARMA</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código, serie o modelo..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="grid grid-cols-3 gap-2 lg:col-span-2">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Total</p>
            <p className="text-xl font-black text-slate-800">{weapons.length}</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
            <p className="text-[9px] text-blue-400 uppercase font-black tracking-widest mb-1">Asignadas</p>
            <p className="text-xl font-black text-primary">{weapons.filter(w => w.currentAssignmentId).length}</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
            <p className="text-[9px] text-emerald-400 uppercase font-black tracking-widest mb-1">Disponibles</p>
            <p className="text-xl font-black text-emerald-600">{weapons.filter(w => !w.currentAssignmentId).length}</p>
          </div>
        </div>
      </div>

      <DataTable 
        data={filteredWeapons} 
        columns={columns} 
        loading={loading}
        onRowClick={(w) => {
          // Logic to edit or view details could go here
          console.log('Weapon selected:', w);
        }}
      />
      
      <div className="bg-primary p-6 rounded-2xl shadow-xl text-white relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
          <History className="h-48 w-48" />
        </div>
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="h-1 w-6 bg-accent rounded-full"></div>
          <h3 className="text-lg font-bold">Bitácora de Asignaciones Recientes</h3>
        </div>
        <div className="space-y-3 relative z-10">
          {assignments.slice(0, 5).map(a => {
            const weapon = weapons.find(w => w.id === a.assetId);
            const person = people.find(p => p.id === a.personId);
            if (!weapon || !person) return null;
            return (
              <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors gap-3">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full ring-4 ring-opacity-20",
                    a.status === 'active' ? "bg-accent ring-accent" : "bg-slate-500 ring-slate-500"
                  )} />
                  <div>
                    <p className="text-sm font-bold">
                      {a.status === 'active' ? 'ASIGNACIÓN' : 'DEVOLUCIÓN'}: {weapon.name}
                    </p>
                    <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider">
                      Responsable: {person.name} | COD: {weapon.code}
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-mono text-white/80">{formatDateTime(a.startDate)}</p>
                  <p className="text-[9px] font-black uppercase text-accent tracking-widest">{a.status}</p>
                </div>
              </div>
            );
          })}
          {assignments.length === 0 && (
            <p className="text-sm text-white/40 italic py-4">No hay movimientos registrados recientemente.</p>
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingWeapon(null);
        }}
        title="Actualizar Estado de Armamento"
      >
        <form onSubmit={handleUpdateStatus} className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-4 mb-4">
            <PhotoCell photoId={editingWeapon?.photoId} />
            <div>
              <p className="font-bold text-slate-800">{editingWeapon?.name}</p>
              <p className="text-xs text-slate-500 font-mono">{editingWeapon?.code}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nuevo Estado</label>
              <select 
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white transition-all"
                value={editingWeapon?.status || 'good'}
                onChange={e => setEditingWeapon(prev => ({ ...prev, status: e.target.value as any }))}
              >
                <option value="good">Buen Estado</option>
                <option value="bad">Mal Estado / Dañado</option>
                <option value="maintenance">En Mantenimiento</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Observaciones</label>
              <textarea 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none h-24"
                value={statusObservation}
                onChange={e => setStatusObservation(e.target.value)}
                placeholder="Describa la razón del cambio de estado..."
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 bg-primary text-white px-4 py-3 rounded-xl hover:bg-primary/90 transition-all font-bold shadow-lg flex items-center justify-center gap-2"
            >
              <Save className="h-5 w-5" />
              <span>Guardar Cambio</span>
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setNewWeapon({
            code: '',
            serial: '',
            name: '',
            brand: '',
            model: '',
            status: 'good',
            locationId: '',
            assignedPersonId: '',
            photoId: undefined
          });
        }}
        title="Registrar Nueva Arma"
      >
        <form onSubmit={handleCreateWeapon} className="space-y-6">
          <ImageUpload 
            currentPhotoId={newWeapon.photoId}
            onImageUploaded={(photoId) => setNewWeapon(prev => ({ ...prev, photoId }))}
            onRemove={() => setNewWeapon(prev => ({ ...prev, photoId: undefined }))}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Código de Identificación</label>
              <input 
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono"
                value={newWeapon.code || ''}
                onChange={e => setNewWeapon(prev => ({ ...prev, code: e.target.value }))}
                placeholder="EIC-ARM-XXXX"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Número de Serie</label>
              <input 
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono"
                value={newWeapon.serial || ''}
                onChange={e => setNewWeapon(prev => ({ ...prev, serial: e.target.value }))}
                placeholder="SERIE / SN"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre del Arma / Tipo</label>
              <input 
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                value={newWeapon.name || ''}
                onChange={e => setNewWeapon(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Pistola Glock 17"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo de Arma</label>
              <select 
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white font-bold"
                value={(newWeapon as any).weaponType || 'Pistola'}
                onChange={e => setNewWeapon(prev => ({ ...prev, weaponType: e.target.value }))}
              >
                <option value="Pistola">Pistola</option>
                <option value="Revólver">Revólver</option>
                <option value="Fusil">Fusil</option>
                <option value="Subfusil">Subfusil</option>
                <option value="Escopeta">Escopeta</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Marca</label>
              <input 
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                value={newWeapon.brand || ''}
                onChange={e => setNewWeapon(prev => ({ ...prev, brand: e.target.value }))}
                placeholder="Glock"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Modelo</label>
              <input 
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                value={newWeapon.model || ''}
                onChange={e => setNewWeapon(prev => ({ ...prev, model: e.target.value }))}
                placeholder="17 Gen 5"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Calibre</label>
              <input 
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                value={(newWeapon as any).caliber || ''}
                onChange={e => setNewWeapon(prev => ({ ...prev, caliber: e.target.value }))}
                placeholder="9x19 mm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estado Físico</label>
              <select 
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white font-bold"
                value={newWeapon.status || 'good'}
                onChange={e => setNewWeapon(prev => ({ ...prev, status: e.target.value as any }))}
              >
                <option value="good">Buen Estado</option>
                <option value="regular">Regular</option>
                <option value="bad">Mal Estado / Dañado</option>
                <option value="maintenance">En Mantenimiento</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ubicación de Resguardo</label>
              <select 
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white font-bold text-sm"
                value={newWeapon.locationId || ''}
                onChange={e => setNewWeapon(prev => ({ ...prev, locationId: e.target.value }))}
              >
                <option value="">Seleccione Ubicación...</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id}>{l.name} - {l.building}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Asignación Inicial (Opcional)</label>
              <select 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white font-bold text-sm"
                value={newWeapon.assignedPersonId || ''}
                onChange={e => setNewWeapon(prev => ({ ...prev, assignedPersonId: e.target.value }))}
              >
                <option value="">Sin Asignación (Disponible)</option>
                {people.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Observaciones</label>
              <textarea 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none h-11"
                value={(newWeapon as any).observations || ''}
                onChange={e => setNewWeapon(prev => ({ ...prev, observations: e.target.value }))}
                placeholder="Observaciones iniciales..."
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false);
                setNewWeapon({
                  code: '',
                  serial: '',
                  name: '',
                  brand: '',
                  model: '',
                  status: 'good',
                  locationId: '',
                  assignedPersonId: '',
                  photoId: undefined
                });
              }}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl transition-all font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              <span>{loading ? 'Guardando...' : 'Registrar Arma'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
