import { useState, useEffect, useMemo } from 'react';
import { storage, logAction } from '../lib/storage';
import { Asset, Location, AssetStatus, AssetType, AuditLog, Person, Assignment } from '../types';
import DataTable, { Column } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import ImageUpload from '../components/ImageUpload';
import PhotoCell from '../components/PhotoCell';
import ReportFormatSelector from '../components/ReportFormatSelector';
import { Search, Filter, Plus, Package, MapPin, Save, AlertTriangle, Clock, Download, CheckCircle2, Hammer, ArrowLeft, LayoutGrid, Map as MapIcon, ChevronRight, User, Users, UserMinus, History, FileText, Info, Check, File } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { generatePDF } from '../lib/reports';
import InteractiveFloorPlan from '../components/InteractiveFloorPlan';
import { INVENTORY_TEMPLATES, TEMPLATE_MAPPINGS, DECLARACION_RESPONSABILIDAD, ENCABEZADO_PATRIMONIAL } from '../assets/inventoryTemplates';
import { generateReport, ReportFormat } from '../lib/reports';

export default function Inventory() {
  const { profile } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Navigation State
  const [view, setView] = useState<'selection' | 'plan' | 'list'>('selection');
  const [currentFloor, setCurrentFloor] = useState<1 | 2>(2);

  const [filters, setFilters] = useState({
    category: '',
    locationId: '',
    office: '',
    status: '',
    assignedTo: '',
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportConfig, setReportConfig] = useState({
    status: 'all',
    orientation: 'auto' as 'auto' | 'p' | 'l',
    format: 'pdf' as ReportFormat
  });
  const [editingAsset, setEditingAsset] = useState<Partial<Asset> | null>(null);
  const [selectedAssetLogs, setSelectedAssetLogs] = useState<AuditLog[]>([]);
  const [statusObservation, setStatusObservation] = useState('');
  const [assignmentNote, setAssignmentNote] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState('');

  useEffect(() => {
    setLoading(true);
    const unsubscribeAssets = storage.subscribe('assets', (data) => {
      setAssets(data as Asset[]);
      setLoading(false);
    });

    const unsubscribePeople = storage.subscribe('people', (data) => {
      setPeople(data as Person[]);
    });

    const fetchLocations = async () => {
      const data = await storage.getCollection<Location>('locations');
      setLocations(data);
    };

    fetchLocations();
    return () => {
      unsubscribeAssets();
      unsubscribePeople();
    };
  }, []);

  const handleLocationFromPlan = async (locationName: string) => {
    // Normalization / abbreviation map
    const normalizedNameMap: Record<string, string> = {
      'admin estudiantil': 'Administración Estudiantil',
      'dept. academico': 'Departamento Académico',
      'dept academico': 'Departamento Académico',
      'recursos humanos': 'Recursos Humanos',
      'gestión academica': 'Gestión Académica',
      'gestion academica': 'Gestión Académica',
      'gestión curricular': 'Gestión Curricular',
      'gestion curricular': 'Gestión Curricular',
      'gestión tecnológica': 'Gestión Tecnológica',
      'gestion tecnologica': 'Gestión Tecnológica',
      'extensión dept. academico': 'Extensión del Departamento Académico',
      'extensión dept. académico': 'Extensión del Departamento Académico',
      'extension dept. academico': 'Extensión del Departamento Académico',
      'dormitorio de mujeres': 'Dormitorio de Damas',
      'laboratorio balistica': 'Laboratorio de Balística',
      'lab de dactiloscopia': 'Laboratorio de Dactiloscopía',
      'lab de documento-logia': 'Laboratorio de Documentología',
      'lab informática': 'Laboratorio de Informática',
    };

    // Clean location name and resolve alias if applicable
    const cleanLower = locationName.toLowerCase().replace(/\s*\(planta\s*[12]\)\s*/gi, '').trim();
    const resolvedName = normalizedNameMap[cleanLower] || locationName.replace(/\s*\(planta\s*[12]\)\s*/gi, '').trim();

    // Find location by name and floor with robust matching
    let location = locations.find(l => {
      if (!l.name) return false;
      const lNameLower = l.name.toLowerCase().trim();
      const resLower = resolvedName.toLowerCase();
      
      // Match exact name
      const nameMatches = lNameLower === resLower || 
        (resLower === 'dormitorio de damas' && (lNameLower === 'dormitorio de damas' || lNameLower === 'dormitorio de mujeres')) ||
        (resLower.includes('extensión') && lNameLower.includes('extensión') && lNameLower.includes('académico'));

      if (!nameMatches) return false;

      // If location specifies floor, verify it matches current floor
      if (l.floor !== undefined && l.floor !== currentFloor) return false;
      return true;
    });

    // If matching an existing "Dormitorio de Mujeres", rename it to "Dormitorio de Damas"
    if (location && location.name === 'Dormitorio de Mujeres') {
      try {
        await storage.updateDocument('locations', location.id, { name: 'Dormitorio de Damas' });
        location.name = 'Dormitorio de Damas';
        const updatedLocations = await storage.getCollection<Location>('locations');
        setLocations(updatedLocations || []);
      } catch (e) {
        console.error('Error renaming Dormitorio de Mujeres:', e);
      }
    }

    // Hardcoded mapping from name to zoneId for the plan selection
    const nameToZoneId: Record<string, string> = {
      'Aula 1': 'aula_1',
      'Aula 2': 'aula_2',
      'Aula 3': 'aula_3',
      'Laboratorio de Balística': 'balistica',
      'Laboratorio de Documentología': 'documentologia',
      'Laboratorio de Dactiloscopía': 'dactiloscopia',
      'Laboratorio de Informática': 'informatica',
      'Dormitorio 1': 'dorm_1',
      'Dormitorio 2': 'dorm_2',
      'Dormitorio 3': 'dorm_3',
      'Dormitorio 4': 'dorm_4',
      'Dormitorio de Damas': 'dorm_damas',
      'Dormitorio de Mujeres': 'dorm_damas',
      'Dormitorio de Instructores': 'dorm_inst',
      'Auditorio': 'auditorio',
      'Biblioteca': 'biblioteca',
      'Logística': 'logistica',
      'Generador': 'generador',
      'Gimnasio': 'gimnasio',
      'Parqueo': 'parqueo',
      'Ciudadela': 'ciudadela',
      'Recursos Humanos': 'rh',
      'Departamento Académico': 'dept_acad',
      'Extensión del Departamento Académico': 'ext_dept_acad',
      'Sistema Integrado de Gestión': 'sig',
      'Gestión Académica': 'ga',
      'Gestión Curricular': 'gc',
      'Gestión Tecnológica': 'gt',
      'Administración Estudiantil': 'admin_est',
      'Dirección': 'direccion',
      'Subdirector': 'subdirector',
      'Sala de Reuniones': 'sala',
      'Cocineta': 'cocineta'
    };

    const zoneId = nameToZoneId[resolvedName] || nameToZoneId[locationName];
    const templateId = zoneId ? TEMPLATE_MAPPINGS[zoneId] : undefined;

    if (!location) {
      // Create missing location persistently as requested
      try {
        location = await storage.addDocument('locations', {
          name: resolvedName,
          building: 'EIC',
          area: currentFloor === 1 ? 'Primera Planta' : 'Segunda Planta',
          floor: currentFloor,
          type: resolvedName === 'Generador' ? 'Servicios' : (resolvedName.startsWith('Dormitorio') ? 'Dormitorio' : (resolvedName.startsWith('Aula') ? 'Aula' : 'Oficina')),
          templateId: templateId
        });
        // Refresh locations list
        const updatedLocations = await storage.getCollection<Location>('locations');
        setLocations(updatedLocations || []);
      } catch (error) {
        console.error('Error creating location from plan:', error);
        return;
      }
    } else if (templateId && !location.templateId) {
      // Update existing location if templateId is missing
      await storage.updateDocument('locations', location.id, { templateId });
      location.templateId = templateId;
    }

    if (!location?.id) return;

    // Set filter and switch to list view
    // CRITICAL: Reset ALL other filters to ensure valid view as requested
    setFilters({
      locationId: location.id,
      office: '',
      category: '',
      status: '',
      assignedTo: ''
    });
    
    // Slight delay to allow state to settle before switching view if needed, 
    // but React batching should handle it.
    setView('list');
  };

  const resetView = () => {
    setFilters(prev => ({ ...prev, locationId: '' }));
    setView('selection');
  };

  const selectedLocation = useMemo(() => 
    locations.find(l => l.id === filters.locationId),
    [locations, filters.locationId]
  );

  const openHistory = async (asset: Asset) => {
    setEditingAsset(asset);
    const allLogs = await storage.getCollection<AuditLog>('audit_logs');
    const assetLogs = allLogs
      .filter(log => log.assetId === asset.id)
      .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
    setSelectedAssetLogs(assetLogs);
    setIsHistoryOpen(true);
  };

  const handleDownloadAssetHistory = async () => {
    if (!profile || !editingAsset || selectedAssetLogs.length === 0) return;
    
    await generatePDF({
      title: 'Historial de Bien Individual',
      subtitle: `${editingAsset.name} (${editingAsset.code})`,
      filename: `historial_${editingAsset.code}`,
      userName: profile.name,
      summary: {
        'Código': editingAsset.code || 'N/A',
        'Nombre': editingAsset.name || 'N/A',
        'Categoría': editingAsset.category || 'N/A',
        'Ubicación Actual': locations.find(l => l.id === editingAsset.locationId)?.name || 'N/A',
        'Total de Eventos': selectedAssetLogs.length
      },
      columns: [
        { header: 'Fecha', dataKey: 'dateStr' },
        { header: 'Operación', dataKey: 'operationLabel' },
        { header: 'Detalles de Cambios', dataKey: 'changesStr' },
        { header: 'Responsable', dataKey: 'userName' }
      ],
      data: selectedAssetLogs.map(l => ({
        ...l,
        dateStr: format(new Date(l.timestamp.seconds * 1000), "dd/MM/yyyy HH:mm"),
        operationLabel: l.operation.replace('_', ' ').toUpperCase(),
        changesStr: l.changes && l.changes.length > 0
          ? l.changes.map(c => `${c.field.toUpperCase()}: ${c.oldValue || 'N/A'} -> ${c.newValue}`).join('\n')
          : (l.observations || 'Sin detalles')
      }))
    });
  };

  const handleDownloadPatrimonialForm = async (reportFormat: ReportFormat = 'pdf') => {
    if (!profile || !selectedLocation) return;
    setIsGenerating(true);

    try {
      const template = INVENTORY_TEMPLATES.find(t => t.templateId === selectedLocation.templateId);
      if (!template) {
        alert('Esta ubicación no tiene una plantilla patrimonial asignada.');
        setIsGenerating(false);
        return;
      }

      const assetsToExport = [...filteredAssets];
      if (assetsToExport.length === 0) {
        alert('No hay bienes para exportar en esta ubicación.');
        setIsGenerating(false);
        return;
      }

      // Determine responsible person
      let responsible: Person | undefined;
      if (filters.assignedTo && filters.assignedTo !== 'unassigned') {
        responsible = people.find(p => p.id === filters.assignedTo);
      } else {
        // Find first person assigned in these assets
        const firstAssetWithAssignment = assetsToExport.find(a => a.assignedPersonId);
        if (firstAssetWithAssignment) {
          responsible = people.find(p => p.id === firstAssetWithAssignment.assignedPersonId);
        }
      }

      if (!responsible) {
        alert('Debe seleccionar un responsable (Asignación) para generar el Formulario Patrimonial.');
        setIsGenerating(false);
        return;
      }

      // Map columns from template
      const reportColumns = template.columnas.map(col => ({
        header: col.etiqueta,
        dataKey: col.campoPropuesto === 'numeroFila' ? 'index' : col.campoPropuesto
      }));

      await generateReport({
        title: 'Formulario de Bienes Patrimoniales',
        filename: `SAGP_Patrimonial_${selectedLocation.name.replace(/\s+/g, '_')}`,
        userName: profile.name,
        format: reportFormat,
        isPatrimonial: true,
        patrimonialData: {
          institucion: 'SECRETARÍA DE SEGURIDAD',
          edificio: 'EIC–COMAYAGUA',
          planta: selectedLocation.area || (selectedLocation.floor === 1 ? 'PRIMERA PLANTA' : 'SEGUNDA PLANTA'),
          ubicacion: selectedLocation.name,
          encargado: responsible.name,
          identidad: responsible.identification,
          telefono: responsible.phone || 'N/T',
          dependencia: responsible.department || 'UNIVERSIDAD NACIONAL DE LA POLICÍA DE HONDURAS',
          declaracion: DECLARACION_RESPONSABILIDAD
        },
        columns: reportColumns,
        data: assetsToExport.map((a, i) => {
          const row: any = { ...a, index: i + 1 };
          if (a.status === 'good') row.status = 'BUENO';
          else if (a.status === 'regular') row.status = 'REGULAR';
          else if (a.status === 'bad') row.status = 'MALO';
          else if (a.status === 'maintenance') row.status = 'MANTENIMIENTO';
          else if (a.status === 'repaired') row.status = 'BUENO (REPARADO)';
          else if (a.status === 'bodega') row.status = 'BODEGA';
          
          if (a.costoUnitario) row.costoUnitario = `L. ${a.costoUnitario.toFixed(2)}`;
          return row;
        }),
        orientation: 'l' 
      });
    } catch (error) {
      console.error('Error generating patrimonial report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadInventoryReport = async () => {
    if (!profile) return;
    setIsGenerating(true);

    try {
      let assetsToExport = [...filteredAssets];
      if (reportConfig.status !== 'all') {
        assetsToExport = assetsToExport.filter(a => a.status === reportConfig.status);
      }

      if (assetsToExport.length === 0) {
        alert('No hay bienes que coincidan con el estado seleccionado para exportar.');
        setIsGenerating(false);
        return;
      }

      const statusLabels: Record<string, string> = {
        all: 'Todos los estados',
        good: 'Solo buenos',
        regular: 'Solo regulares',
        bad: 'Solo malos',
        maintenance: 'Solo en mantenimiento',
        repaired: 'Solo reparados',
        bodega: 'Solo en bodega'
      };

      const template = INVENTORY_TEMPLATES.find(t => t.templateId === selectedLocation?.templateId);
      
      let reportColumns = [
        { header: 'Código', dataKey: 'code' },
        { header: 'Nombre', dataKey: 'name' },
        { header: 'Categoría', dataKey: 'category' },
        { header: 'Ubicación', dataKey: 'locationName' },
        { header: 'Estado', dataKey: 'statusLabel' }
      ];

      if (template) {
        reportColumns = template.columnas.map(col => ({
          header: col.etiqueta,
          dataKey: col.campoPropuesto === 'numeroFila' ? 'index' : col.campoPropuesto
        })) as any;
      }

      let filename = 'SAGP_Inventario_General';
      let title = 'Inventario General de Bienes';

      if (filters.locationId) {
        const loc = locations.find(l => l.id === filters.locationId);
        title = `Inventario: ${loc?.name || 'Ubicación'}`;
        filename = `SAGP_Inventario_${loc?.name.replace(/\s+/g, '_')}`;
      }

      await generateReport({
        title,
        filename,
        userName: profile.name,
        format: reportConfig.format,
        filters: {
          'Búsqueda': searchTerm || 'Todas',
          'Categoría': filters.category || 'Todas',
          'Ubicación': locations.find(l => l.id === filters.locationId)?.name || 'Todas',
          'Estado': statusLabels[reportConfig.status]
        },
        summary: {
          'Total de Bienes': assetsToExport.length
        },
        columns: reportColumns,
        data: assetsToExport.map((a, i) => ({
          ...a,
          index: i + 1,
          locationName: locations.find(l => l.id === a.locationId)?.name || 'N/A',
          statusLabel: a.status === 'good' ? 'BUENO' : a.status === 'regular' ? 'REGULAR' : a.status === 'bad' ? 'MALO' : a.status === 'maintenance' ? 'MANTENIMIENTO' : a.status === 'repaired' ? 'BUENO (REPARADO)' : a.status === 'bodega' ? 'BODEGA (ALMACENADO)' : 'BAJA'
        })),
        orientation: reportConfig.orientation
      });

      setIsConfigModalOpen(false);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset?.code || !editingAsset?.name || !editingAsset?.locationId) return;

    if (editingAsset.id) {
      const originalAsset = assets.find(a => a.id === editingAsset.id);
      if (originalAsset) {
        const changes: any[] = [];
        const fieldsToTrack = ['name', 'code', 'description', 'status', 'locationId', 'photoId', 'brand', 'model', 'serial', 'color', 'costoUnitario', 'tipoDocumentoValuacion'];
        
        fieldsToTrack.forEach(field => {
          if (editingAsset[field as keyof Asset] !== originalAsset[field as keyof Asset]) {
            changes.push({
              field,
              oldValue: originalAsset[field as keyof Asset],
              newValue: editingAsset[field as keyof Asset]
            });
          }
        });

        if (changes.length > 0) {
          await logAction({
            assetId: editingAsset.id,
            assetName: editingAsset.name,
            assetCode: editingAsset.code,
            operation: originalAsset.status !== editingAsset.status ? 'status_change' : 'update',
            changes,
            observations: statusObservation,
            userId: profile?.uid || 'demo-user',
            userName: profile?.name || 'Usuario Demo',
            timestamp: { seconds: Math.floor(Date.now() / 1000) }
          });
        }
      }
      await storage.updateDocument('assets', editingAsset.id, editingAsset);
    } else {
      const newAsset = await storage.addDocument('assets', {
        ...editingAsset,
        type: (editingAsset.type || 'general') as AssetType,
        status: (editingAsset.status || 'good') as AssetStatus,
        category: editingAsset.category || 'Sin categoría',
        description: editingAsset.description || '',
      });

      await logAction({
        assetId: newAsset.id,
        assetName: editingAsset.name!,
        assetCode: editingAsset.code,
        operation: 'create',
        userId: profile?.uid || 'demo-user',
        userName: profile?.name || 'Usuario Demo',
        timestamp: { seconds: Math.floor(Date.now() / 1000) }
      });
    }
    setIsModalOpen(false);
    setEditingAsset(null);
    setStatusObservation('');
  };

  const handleDecommission = async (asset: Asset) => {
    if (!profile) return;
    const confirmed = confirm(`¿Está seguro de dar de BAJA INSTITUCIONAL al bien ${asset.code}? Esta acción no se puede deshacer.`);
    if (!confirmed) return;

    const observation = prompt('Motivo de la baja:');
    if (observation === null) return;

    await storage.updateDocument('assets', asset.id, { 
      status: 'decommissioned',
      updatedAt: { seconds: Math.floor(Date.now() / 1000) }
    });

    await logAction({
      assetId: asset.id,
      assetName: asset.name,
      assetCode: asset.code,
      operation: 'decommission',
      changes: [{ field: 'status', oldValue: asset.status, newValue: 'decommissioned' }],
      observations: observation,
      userId: profile.uid,
      userName: profile.name,
      timestamp: { seconds: Math.floor(Date.now() / 1000) }
    });

    setIsModalOpen(false);
    setEditingAsset(null);
  };

  const handleAssign = async () => {
    if (!profile || !editingAsset?.id || !selectedPersonId) return;
    
    const asset = assets.find(a => a.id === editingAsset.id);
    if (!asset) return;

    const person = people.find(p => p.id === selectedPersonId);
    if (!person) return;

    // 1. Create assignment record
    const assignment = await storage.addDocument('assignments', {
      assetId: asset.id,
      personId: person.id,
      previousPersonId: asset.assignedPersonId || null,
      startDate: { seconds: Math.floor(Date.now() / 1000) },
      status: 'active',
      userId: profile.uid,
      observations: assignmentNote
    });

    // 2. Update asset with current assignment
    await storage.updateDocument('assets', asset.id, {
      currentAssignmentId: assignment.id,
      assignedPersonId: person.id
    });

    // 3. Log action
    await logAction({
      assetId: asset.id,
      assetName: asset.name,
      assetCode: asset.code,
      operation: 'assign',
      changes: [
        { field: 'assignedPersonId', oldValue: asset.assignedPersonId || 'Sin asignar', newValue: person.name }
      ],
      observations: assignmentNote,
      userId: profile.uid,
      userName: profile.name,
      timestamp: { seconds: Math.floor(Date.now() / 1000) }
    });

    setIsAssignModalOpen(false);
    setSelectedPersonId('');
    setAssignmentNote('');
  };

  const handleReturn = async (asset: Asset) => {
    if (!profile || !asset.currentAssignmentId) return;

    const confirmed = confirm(`¿Confirma la devolución del bien ${asset.code}? El bien quedará sin asignación activa.`);
    if (!confirmed) return;

    const observation = prompt('Observaciones de la devolución:');
    
    // 1. Close current assignment
    await storage.updateDocument('assignments', asset.currentAssignmentId, {
      status: 'returned',
      endDate: { seconds: Math.floor(Date.now() / 1000) }
    });

    // 2. Update asset
    await storage.updateDocument('assets', asset.id, {
      currentAssignmentId: null,
      assignedPersonId: null
    });

    // 3. Log action
    await logAction({
      assetId: asset.id,
      assetName: asset.name,
      assetCode: asset.code,
      operation: 'return',
      changes: [
        { field: 'assignedPersonId', oldValue: people.find(p => p.id === asset.assignedPersonId)?.name || 'N/A', newValue: 'Sin asignar' }
      ],
      observations: observation || 'Devolución estándar',
      userId: profile.uid,
      userName: profile.name,
      timestamp: { seconds: Math.floor(Date.now() / 1000) }
    });
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = 
      asset.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.serial && asset.serial.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = !filters.category || asset.category === filters.category;
    const matchesLocation = !filters.locationId || asset.locationId === filters.locationId;
    const matchesOffice = !filters.office || asset.office === filters.office;
    const matchesStatus = !filters.status || asset.status === filters.status;
    const matchesAssignment = !filters.assignedTo || 
      (filters.assignedTo === 'unassigned' ? !asset.assignedPersonId : asset.assignedPersonId === filters.assignedTo);

    return matchesSearch && matchesCategory && matchesLocation && matchesStatus && matchesOffice && matchesAssignment;
  });

  const categories = Array.from(new Set(assets.map(a => a.category)));
  const officesInLocation = useMemo(() => {
    const loc = locations.find(l => l.id === filters.locationId);
    return loc?.offices || [];
  }, [filters.locationId, locations]);

  const columns = useMemo(() => {
    const template = INVENTORY_TEMPLATES.find(t => t.templateId === selectedLocation?.templateId);
    
    if (!template) {
      // Default columns if no template is assigned
      return [
        { 
          header: 'Foto', 
          accessorKey: (asset: Asset) => <PhotoCell photoId={asset.photoId} />,
          className: 'w-16'
        },
        { header: 'Código', accessorKey: (asset: Asset) => asset.code, className: 'font-mono' },
        { header: 'Nombre', accessorKey: (asset: Asset) => asset.name },
        { 
          header: 'Asignado a', 
          accessorKey: (asset: Asset) => {
            const person = people.find(p => p.id === asset.assignedPersonId);
            return person ? (
              <div className="flex items-center gap-2 text-slate-700">
                <User className="h-3 w-3 text-primary" />
                <span className="font-medium">{person.name}</span>
              </div>
            ) : (
              <span className="text-slate-400 italic text-[10px]">Sin asignar</span>
            );
          }
        },
        { header: 'Categoría', accessorKey: (asset: Asset) => asset.category, className: 'hidden md:table-cell' },
        { 
          header: 'Estado', 
          accessorKey: (asset: Asset) => <StatusBadge status={asset.status} /> 
        },
        {
          header: 'Acciones',
          accessorKey: (asset: Asset) => (
            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingAsset(asset);
                  setIsModalOpen(true);
                }}
                className="p-2 text-primary hover:bg-primary/5 rounded-lg transition-colors"
                title="Editar Bien"
              >
                <Save className="h-4 w-4" />
              </button>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  openHistory(asset);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                title="Historial"
              >
                <Clock className="h-4 w-4" />
              </button>

              {!asset.assignedPersonId ? (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingAsset(asset);
                    setIsAssignModalOpen(true);
                  }}
                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  title="Asignar a Persona"
                >
                  <User className="h-4 w-4" />
                </button>
              ) : (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReturn(asset);
                  }}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Registrar Devolución"
                >
                  <UserMinus className="h-4 w-4" />
                </button>
              )}
            </div>
          )
        }
      ] as Column<Asset>[];
    }

    // Dynamic columns based on template
    const templateColumns: Column<Asset>[] = [
      { 
        header: 'Foto', 
        accessorKey: (asset: Asset) => <PhotoCell photoId={asset.photoId} />,
        className: 'w-16'
      }
    ];

    template.columnas.forEach(col => {
      if (col.campoPropuesto === 'numeroFila') {
        templateColumns.push({
          header: col.etiqueta,
          accessorKey: (_: Asset, index?: number) => (index !== undefined ? index + 1 : '-'),
          className: 'w-10 text-center font-bold text-slate-400'
        });
      } else if (col.campoPropuesto === 'status') {
        templateColumns.push({
          header: col.etiqueta,
          accessorKey: (asset: Asset) => <StatusBadge status={asset.status} />
        });
      } else if (col.campoPropuesto === 'costoUnitario') {
        templateColumns.push({
          header: col.etiqueta,
          accessorKey: (asset: Asset) => asset.costoUnitario !== undefined ? `L. ${asset.costoUnitario.toFixed(2)}` : 'N/T',
          className: 'text-right'
        });
      } else {
        templateColumns.push({
          header: col.etiqueta,
          accessorKey: (asset: Asset) => (asset as any)[col.campoPropuesto] || 'N/T'
        });
      }
    });

    // Add common actions
    templateColumns.push({
      header: 'Acciones',
      accessorKey: (asset: Asset) => (
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setEditingAsset(asset);
              setIsModalOpen(true);
            }}
            className="p-2 text-primary hover:bg-primary/5 rounded-lg transition-colors"
            title="Editar Bien"
          >
            <Save className="h-4 w-4" />
          </button>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              openHistory(asset);
            }}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            title="Historial"
          >
            <Clock className="h-4 w-4" />
          </button>

          {!asset.assignedPersonId ? (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setEditingAsset(asset);
                setIsAssignModalOpen(true);
              }}
              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Asignar a Persona"
            >
              <User className="h-4 w-4" />
            </button>
          ) : (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleReturn(asset);
              }}
              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Registrar Devolución"
            >
              <UserMinus className="h-4 w-4" />
            </button>
          )}
        </div>
      )
    });

    return templateColumns;
  }, [selectedLocation, people, assets]);

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Navigation & Breadcrumbs */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        <button 
          onClick={resetView}
          className={`flex items-center gap-1 transition-colors ${view === 'selection' ? 'text-primary' : 'hover:text-primary'}`}
        >
          <Package className="h-3 w-3" />
          <span>Inventario</span>
        </button>
        
        {view !== 'selection' && (
          <>
            <ChevronRight className="h-3 w-3" />
            <button 
              onClick={() => setView('plan')}
              className={`flex items-center gap-1 transition-colors ${view === 'plan' ? 'text-primary' : 'hover:text-primary'}`}
            >
              <MapIcon className="h-3 w-3" />
              <span>{currentFloor === 1 ? 'Primera Planta' : 'Segunda Planta'}</span>
            </button>
          </>
        )}

        {filters.locationId && (
          <>
            <ChevronRight className="h-3 w-3" />
            <div className="flex items-center gap-1 text-primary bg-primary/5 px-2 py-1 rounded-lg border border-primary/10">
              <MapPin className="h-3 w-3" />
              <span>{selectedLocation?.name || 'Espacio Seleccionado'}</span>
            </div>
          </>
        )}
      </div>

      {view === 'selection' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
          <button 
            onClick={() => { setCurrentFloor(1); setView('plan'); }}
            className="group relative overflow-hidden bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all text-left"
          >
            <div className="p-4 bg-slate-50 rounded-2xl mb-6 group-hover:bg-primary/5 transition-colors inline-block">
              <LayoutGrid className="h-8 w-8 text-slate-400 group-hover:text-primary" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">Primera Planta</h3>
            <p className="text-sm text-slate-500 leading-relaxed">Consulta oficinas y espacios en el nivel inferior.</p>
            <div className="mt-6 flex items-center text-xs font-black text-primary uppercase tracking-widest gap-2">
              <span>Explorar Plano</span>
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button 
            onClick={() => { setCurrentFloor(2); setView('plan'); }}
            className="group relative overflow-hidden bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all text-left"
          >
            <div className="p-4 bg-slate-50 rounded-2xl mb-6 group-hover:bg-primary/5 transition-colors inline-block">
              <MapIcon className="h-8 w-8 text-slate-400 group-hover:text-primary" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">Segunda Planta</h3>
            <p className="text-sm text-slate-500 leading-relaxed">Distribución actual de las oficinas académicas y administrativas.</p>
            <div className="mt-6 flex items-center text-xs font-black text-primary uppercase tracking-widest gap-2">
              <span>Explorar Plano</span>
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button 
            onClick={() => { setFilters(prev => ({ ...prev, locationId: '' })); setView('list'); }}
            className="group relative overflow-hidden bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-sm hover:shadow-xl transition-all text-left"
          >
            <div className="p-4 bg-slate-700 rounded-2xl mb-6 group-hover:bg-slate-600 transition-colors inline-block">
              <Package className="h-8 w-8 text-white/50 group-hover:text-white" />
            </div>
            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Inventario General</h3>
            <p className="text-sm text-white/60 leading-relaxed">Acceso a todos los bienes institucionales sin filtrar por ubicación.</p>
            <div className="mt-6 flex items-center text-xs font-black text-primary uppercase tracking-widest gap-2">
              <span>Ver Todo</span>
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>
      ) : view === 'plan' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
                Navegación por {currentFloor === 1 ? 'Primera' : 'Segunda'} Planta
              </h2>
              <p className="text-sm text-slate-500 italic">Selecciona un espacio para consultar su inventario.</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentFloor(currentFloor === 1 ? 2 : 1)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
              >
                <LayoutGrid className="h-4 w-4" />
                Cambiar a {currentFloor === 1 ? '2da' : '1ra'} Planta
              </button>
              <button 
                onClick={() => setView('selection')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-all shadow-sm active:scale-95"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </button>
            </div>
          </div>

          <InteractiveFloorPlan 
            floor={currentFloor} 
            locations={locations} 
            onLocationSelect={handleLocationFromPlan} 
          />
        </div>
      ) : (
        <>
          {filters.locationId && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-tight">
                    Inventario de {selectedLocation?.name || 'Espacio'}
                  </h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{selectedLocation?.building} • {selectedLocation?.area}</p>
                </div>
              </div>
              <button 
                onClick={() => setView('plan')}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al Plano
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 max-w-2xl">
              <button 
                onClick={() => setView('plan')}
                className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-primary transition-all shadow-sm active:scale-95"
                title="Volver al Plano"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por código, nombre o serie..."
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white shadow-sm transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              {filters.locationId && (
                <div className="flex flex-col gap-2 p-3 bg-primary/5 rounded-2xl border border-primary/10">
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest px-1">Formulario Patrimonial</span>
                  <div className="flex items-center gap-2">
                    <ReportFormatSelector 
                      selectedFormat={reportConfig.format}
                      onFormatChange={(f) => setReportConfig(prev => ({ ...prev, format: f }))}
                      className="grid-cols-3 gap-1 h-12"
                    />
                    <button 
                      onClick={() => handleDownloadPatrimonialForm(reportConfig.format)}
                      disabled={isGenerating}
                      className="h-12 flex items-center justify-center gap-2 bg-primary text-white px-4 rounded-xl hover:bg-primary/90 transition-all font-bold shadow-md active:scale-95 disabled:opacity-50"
                      title={`Generar ${reportConfig.format.toUpperCase()}`}
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              <button 
                onClick={() => setIsConfigModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-xl hover:bg-slate-900 transition-all font-bold shadow-md active:scale-95"
              >
                <Download className="h-5 w-5" />
                <span className="hidden sm:inline">Reporte General</span>
              </button>

              <button 
                onClick={() => {
                  setEditingAsset({ 
                    type: 'general', 
                    status: 'good', 
                    locationId: filters.locationId,
                    office: filters.office
                  });
                  setIsModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-all font-bold shadow-md active:scale-95"
              >
                <Plus className="h-5 w-5" />
                <span>Nuevo Bien</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm min-w-[180px]">
              <Filter className="h-4 w-4 text-slate-400" />
              <select 
                className="flex-1 text-[10px] font-black uppercase tracking-widest focus:outline-none bg-transparent cursor-pointer"
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="">Categoría</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm min-w-[180px]">
              <MapPin className="h-4 w-4 text-slate-400" />
              <select 
                className="flex-1 text-[10px] font-black uppercase tracking-widest focus:outline-none bg-transparent cursor-pointer"
                value={filters.locationId}
                onChange={(e) => setFilters(prev => ({ ...prev, locationId: e.target.value, office: '' }))}
              >
                <option value="">Ubicación</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            {officesInLocation.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/10 rounded-xl shadow-sm min-w-[180px] animate-in slide-in-from-left-2 duration-300">
                <LayoutGrid className="h-4 w-4 text-primary" />
                <select 
                  className="flex-1 text-[10px] font-black uppercase tracking-widest focus:outline-none bg-transparent cursor-pointer text-primary"
                  value={filters.office}
                  onChange={(e) => setFilters(prev => ({ ...prev, office: e.target.value }))}
                >
                  <option value="">Todas las oficinas</option>
                  {officesInLocation.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm min-w-[180px]">
              <Users className="h-4 w-4 text-slate-400" />
              <select 
                className="flex-1 text-[10px] font-black uppercase tracking-widest focus:outline-none bg-transparent cursor-pointer"
                value={filters.assignedTo}
                onChange={(e) => setFilters(prev => ({ ...prev, assignedTo: e.target.value }))}
              >
                <option value="">Asignación</option>
                <option value="unassigned">Sin asignar</option>
                {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm min-w-[180px]">
              <Package className="h-4 w-4 text-slate-400" />
              <select 
                className="flex-1 text-[10px] font-black uppercase tracking-widest focus:outline-none bg-transparent cursor-pointer"
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">Estado</option>
                <option value="good">Bueno</option>
                <option value="regular">Regular (Legacy)</option>
                <option value="bad">Malo</option>
                <option value="maintenance">Mantenimiento</option>
                <option value="repaired">Bueno · Reparado</option>
                <option value="bodega">Bodega</option>
              </select>
            </div>
          </div>

          {filteredAssets.length === 0 && filters.locationId && !searchTerm && !filters.category && !filters.status && (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center shadow-sm">
              <div className="p-4 bg-slate-50 rounded-2xl inline-block mb-4">
                <Package className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No hay bienes registrados en este espacio</p>
              <button 
                onClick={() => {
                  setEditingAsset({ type: 'general', status: 'good', locationId: filters.locationId });
                  setIsModalOpen(true);
                }}
                className="mt-4 text-primary font-black uppercase tracking-widest text-[10px] hover:underline"
              >
                + Registrar el primer bien
              </button>
            </div>
          )}

          <DataTable 
            data={filteredAssets} 
            columns={columns} 
            loading={loading}
            onRowClick={(asset) => {
              setEditingAsset(asset);
              setIsModalOpen(true);
            }}
          />
        </>
      )}


      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAsset(null);
        }}
        title={editingAsset?.id ? 'Editar Bien' : 'Registrar Nuevo Bien'}
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Control Interno</label>
              <input 
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono"
                value={editingAsset?.code || ''}
                onChange={e => setEditingAsset(prev => ({ ...prev, code: e.target.value }))}
                placeholder="EIC-XXXX-000"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre del Bien</label>
              <input 
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                value={editingAsset?.name || ''}
                onChange={e => setEditingAsset(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Descripción según Factura</label>
            <textarea 
              required
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              value={editingAsset?.description || ''}
              onChange={e => setEditingAsset(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descripción detallada del bien..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Serie</label>
              <input 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                value={editingAsset?.serial || ''}
                onChange={e => setEditingAsset(prev => ({ ...prev, serial: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Color</label>
              <input 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                value={editingAsset?.color || ''}
                onChange={e => setEditingAsset(prev => ({ ...prev, color: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Costo Unitario (L)</label>
              <input 
                type="number"
                step="0.01"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                value={editingAsset?.costoUnitario === undefined ? '' : editingAsset.costoUnitario}
                onChange={e => setEditingAsset(prev => ({ ...prev, costoUnitario: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
              />
            </div>
          </div>

          {selectedLocation?.templateId === 'oficinas' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo de Documento (Valuación)</label>
              <input 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                value={editingAsset?.tipoDocumentoValuacion || ''}
                onChange={e => setEditingAsset(prev => ({ ...prev, tipoDocumentoValuacion: e.target.value }))}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ubicación (Espacio/Área)</label>
              <select 
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white font-bold text-sm"
                value={editingAsset?.locationId || ''}
                onChange={e => setEditingAsset(prev => ({ ...prev, locationId: e.target.value, office: '' }))}
              >
                <option value="">Seleccione ubicación</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name} - {l.building}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Oficina Específica</label>
              <select 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white font-bold text-sm disabled:opacity-50"
                value={editingAsset?.office || ''}
                disabled={!editingAsset?.locationId || !locations.find(l => l.id === editingAsset.locationId)?.offices}
                onChange={e => setEditingAsset(prev => ({ ...prev, office: e.target.value }))}
              >
                <option value="">Sin oficina específica</option>
                {locations.find(l => l.id === editingAsset?.locationId)?.offices?.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estado Actual</label>
              <select 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                value={editingAsset?.status || 'good'}
                onChange={e => {
                  const newStatus = e.target.value as AssetStatus;
                  const originalAsset = editingAsset?.id ? assets.find(a => a.id === editingAsset.id) : null;
                  const originalPhotoId = originalAsset?.photoId;
                  setEditingAsset(prev => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      status: newStatus,
                      photoId: (newStatus === 'bad' || newStatus === 'repaired') ? prev.photoId : (originalPhotoId || undefined)
                    };
                  });
                }}
              >
                <option value="good">Buen Estado</option>
                {editingAsset?.status === 'regular' && (
                  <option value="regular">Estado Regular (Pendiente de reclasificación)</option>
                )}
                <option value="bad">Mal Estado / Dañado</option>
                <option value="maintenance">En Mantenimiento</option>
                <option value="repaired">Reparado</option>
                <option value="bodega">Bodega (Almacenado)</option>
              </select>
            </div>
            {editingAsset?.id && assets.find(a => a.id === editingAsset.id)?.status !== editingAsset?.status && (
              <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Observación del Cambio</label>
                <input 
                  className="w-full px-4 py-2.5 rounded-xl border border-amber-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-amber-50/30"
                  value={statusObservation}
                  onChange={e => setStatusObservation(e.target.value)}
                  placeholder="Razón del cambio de estado..."
                  required
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo de Bien</label>
              <select 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                value={editingAsset?.type || 'general'}
                onChange={e => setEditingAsset(prev => ({ ...prev, type: e.target.value as AssetType }))}
              >
                <option value="general">Mobiliario / General</option>
                <option value="weapon">Armamento</option>
                <option value="vehicle">Vehículo</option>
              </select>
            </div>
          </div>

          {/* Evidencia fotográfica condicional al final del formulario (Sección 2) */}
          {(editingAsset?.status === 'bad' || editingAsset?.status === 'repaired') && (
            <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                {editingAsset.status === 'bad' ? 'Fotografía del daño (Evidencia)' : 'Fotografía del bien reparado (Evidencia)'}
              </label>
              <ImageUpload 
                currentPhotoId={editingAsset?.photoId}
                onImageUploaded={(photoId) => setEditingAsset(prev => ({ ...prev, photoId }))}
                onRemove={() => setEditingAsset(prev => ({ ...prev, photoId: undefined }))}
              />
            </div>
          )}

          <div className="pt-4 flex gap-3">
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
              <span>Guardar Registro</span>
            </button>
          </div>
          
          {editingAsset?.id && (
            <div className="pt-6 border-t border-slate-100">
              <button 
                type="button"
                onClick={() => handleDecommission(editingAsset as Asset)}
                className="w-full py-3 rounded-xl border border-rose-200 text-rose-600 font-bold hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                Dar de Baja Institucional
              </button>
            </div>
          )}
        </form>
      </Modal>
      
      {/* Assignment Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setEditingAsset(null);
          setSelectedPersonId('');
          setAssignmentNote('');
        }}
        title="Asignar Responsable de Bien"
      >
        <div className="space-y-6">
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-xl">
              <User className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-slate-800">{editingAsset?.name}</p>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{editingAsset?.code}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seleccionar Persona Responsable</label>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <select
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold appearance-none"
                value={selectedPersonId}
                onChange={e => setSelectedPersonId(e.target.value)}
              >
                <option value="">Buscar persona...</option>
                {people.map(p => (
                  <option key={p.id} value={p.id}>{p.name} - {p.identification}</option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-slate-400 italic text-center">Si la persona no aparece, debe registrarla primero en el módulo de Personal.</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motivo u Observaciones</label>
            <textarea
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm min-h-[100px]"
              placeholder="Ej: Entrega por nueva asignación de cargo..."
              value={assignmentNote}
              onChange={e => setAssignmentNote(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              onClick={() => setIsAssignModalOpen(false)}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={handleAssign}
              disabled={!selectedPersonId}
              className="flex-1 bg-primary text-white px-4 py-3 rounded-xl hover:bg-primary/90 transition-all font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span>Confirmar Asignación</span>
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title={`Historial: ${editingAsset?.name}`}
      >
        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-4">
            <PhotoCell photoId={editingAsset?.photoId} />
            <div>
              <p className="font-bold text-slate-800">{editingAsset?.name}</p>
              <p className="text-xs text-slate-500 font-mono">{editingAsset?.code}</p>
            </div>
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {selectedAssetLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 italic text-sm">
                No hay registros de actividad previos para este bien.
              </div>
            ) : (
              selectedAssetLogs.map((log) => (
                <div key={log.id} className="relative pl-6 border-l-2 border-slate-100 pb-4 last:pb-0">
                  <div className="absolute left-[-9px] top-0 h-4 w-4 rounded-full bg-white border-2 border-primary"></div>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-black text-primary uppercase tracking-wider">
                      {log.operation.replace('_', ' ')}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold">
                      {format(new Date(log.timestamp.seconds * 1000), "dd/MM/yyyy HH:mm", { locale: es })}
                    </span>
                  </div>
                  <div className="text-xs space-y-1">
                    {log.changes?.map((c, i) => (
                      <p key={i} className="text-slate-600">
                        <span className="font-bold uppercase text-[9px] text-slate-400 mr-1">{c.field}:</span>
                        <span className="text-rose-400 line-through mr-1">{String(c.oldValue || 'N/A')}</span>
                        <span className="text-emerald-600 font-bold">{String(c.newValue)}</span>
                      </p>
                    ))}
                    {log.observations && (
                      <p className="text-slate-500 italic mt-1 bg-slate-50 p-2 rounded-lg">"{log.observations}"</p>
                    )}
                    <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-tighter">Por: {log.userName}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="flex gap-3 mt-6">
            <button 
              onClick={handleDownloadAssetHistory}
              disabled={selectedAssetLogs.length === 0}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-800 text-white py-3 rounded-xl hover:bg-slate-900 transition-all font-bold disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Descargar PDF
            </button>
            <button 
              onClick={() => setIsHistoryOpen(false)}
              className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl hover:bg-slate-200 transition-all font-bold"
            >
              Cerrar
            </button>
          </div>
        </div>
      </Modal>
      
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title="Configurar Reporte de Inventario"
      >
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-4">
            <Download className="h-8 w-8 text-primary" />
            <div>
              <p className="font-bold text-slate-800">Exportar Inventario</p>
              <p className="text-xs text-slate-500 italic">Personalice los bienes que se incluirán en el documento.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtrar por Estado</label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: 'all', label: 'Todos los estados', icon: Package },
                  { id: 'good', label: 'Solo buenos', icon: CheckCircle2 },
                  { id: 'regular', label: 'Solo regulares (Legacy)', icon: Info },
                  { id: 'bad', label: 'Solo malos', icon: AlertTriangle },
                  { id: 'maintenance', label: 'Solo en mantenimiento', icon: Hammer },
                  { id: 'repaired', label: 'Solo reparados', icon: CheckCircle2 },
                  { id: 'bodega', label: 'Solo en bodega', icon: Package }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setReportConfig(prev => ({ ...prev, status: opt.id }))}
                    className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                      reportConfig.status === opt.id 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <opt.icon className={`h-4 w-4 ${reportConfig.status === opt.id ? 'text-primary' : 'text-slate-400'}`} />
                      <span className="font-bold text-xs">{opt.label}</span>
                    </div>
                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                      reportConfig.status === opt.id ? 'border-primary bg-primary' : 'border-slate-300'
                    }`}>
                      {reportConfig.status === opt.id && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <File className="h-3 w-3" />
                  Formato de Salida
                </label>
                <ReportFormatSelector 
                  selectedFormat={reportConfig.format}
                  onFormatChange={(f) => setReportConfig(prev => ({ ...prev, format: f }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Orientación</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold appearance-none cursor-pointer"
                  value={reportConfig.orientation}
                  onChange={e => setReportConfig(prev => ({ ...prev, orientation: e.target.value as any }))}
                >
                  <option value="auto">Automática</option>
                  <option value="p">Vertical</option>
                  <option value="l">Horizontal</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold text-slate-600 uppercase">Bienes a incluir:</p>
              <p className="text-lg font-black text-primary">
                {reportConfig.status === 'all' 
                  ? filteredAssets.length 
                  : filteredAssets.filter(a => a.status === reportConfig.status).length
                }
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              onClick={() => setIsConfigModalOpen(false)}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={handleDownloadInventoryReport}
              disabled={isGenerating}
              className="flex-1 bg-primary text-white px-4 py-3 rounded-xl hover:bg-primary/90 transition-all font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download className="h-5 w-5" />
              <span>{isGenerating ? 'Generando...' : `GENERAR ${reportConfig.format.toUpperCase()}`}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
