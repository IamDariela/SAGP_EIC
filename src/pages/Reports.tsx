import { useState, useEffect, useMemo } from 'react';
import { storage, isDemoMode } from '../lib/storage';
import { FileText, Download, Clock, Package, Car, Monitor, Shield, File, Check, Filter } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, format as formatDate } from 'date-fns';
import { generateReport, ReportFormat } from '../lib/reports';
import { Asset, Location, AuditLog, Person, AssetType } from '../types';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import ReportFormatSelector from '../components/ReportFormatSelector';

export default function Reports() {
  const { profile } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });

  const setPeriod = (period: 'today' | 'week' | 'month') => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (period) {
      case 'today':
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case 'week':
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        start = startOfMonth(now);
        end = now;
        break;
      default:
        return;
    }

    setDateRange({
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd')
    });
  };

  const [reportFilters, setReportFilters] = useState({
    type: 'all' as AssetType | 'all' | 'it',
    locationId: '',
    office: '',
    assignedTo: '',
    status: 'all',
    orientation: 'auto' as 'auto' | 'p' | 'l',
    format: 'pdf' as ReportFormat,
  });

  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsubAssets = storage.subscribe('assets', (data) => setAssets(data as Asset[]));
    const unsubLocations = storage.subscribe('locations', (data) => setLocations(data as Location[]));
    const unsubPeople = storage.subscribe('people', (data) => setPeople(data as Person[]));
    const unsubLogs = storage.subscribe('audit_logs', (data) => setLogs(data as AuditLog[]));

    return () => {
      unsubAssets();
      unsubLocations();
      unsubPeople();
      unsubLogs();
    };
  }, []);

  const filteredAssetsToExport = useMemo(() => {
    return assets.filter(a => {
      const matchesType = reportFilters.type === 'all' 
        ? true 
        : reportFilters.type === 'it' 
          ? a.category.toLowerCase().includes('informát') || a.category.toLowerCase().includes('it')
          : a.type === reportFilters.type;
      
      const matchesLocation = !reportFilters.locationId || a.locationId === reportFilters.locationId;
      const matchesOffice = !reportFilters.office || a.office === reportFilters.office;
      const matchesStatus = reportFilters.status === 'all' || a.status === reportFilters.status;
      const matchesAssignment = !reportFilters.assignedTo || 
        (reportFilters.assignedTo === 'unassigned' ? !a.assignedPersonId : a.assignedPersonId === reportFilters.assignedTo);

      return matchesType && matchesLocation && matchesOffice && matchesStatus && matchesAssignment;
    });
  }, [assets, reportFilters]);

  const handleDownloadInventory = async () => {
    if (!profile) return;
    setIsGenerating(true);
    
    if (filteredAssetsToExport.length === 0) {
      alert('No hay bienes que coincidan con los filtros seleccionados.');
      setIsGenerating(false);
      return;
    }

    try {
      const typeLabels: any = { all: 'Inventario General', general: 'Mobiliario', weapon: 'Armamiento', vehicle: 'Vehículos', it: 'Equipo Informático' };
      const statusLabels: any = { all: 'Todos', good: 'Buenos', regular: 'Regulares (Legacy)', bad: 'Malos', maintenance: 'Mantenimiento', repaired: 'Reparados', bodega: 'Bodega' };

      let reportTitle = typeLabels[reportFilters.type];
      let columns = [
        { header: 'Código', dataKey: 'code' },
        { header: 'Descripción', dataKey: 'name' },
        { header: 'Ubicación', dataKey: 'locationName' },
        { header: 'Oficina', dataKey: 'officeLabel' },
        { header: 'Estado', dataKey: 'statusLabel' },
        { header: 'Asignado a', dataKey: 'assignedLabel' },
      ];

      if (reportFilters.type === 'vehicle') {
        columns = [
          { header: 'Código', dataKey: 'code' },
          { header: 'Placa', dataKey: 'plate' },
          { header: 'Marca', dataKey: 'brand' },
          { header: 'Modelo', dataKey: 'model' },
          { header: 'Ubicación', dataKey: 'locationName' },
          { header: 'Responsable', dataKey: 'assignedLabel' },
        ];
      } else if (reportFilters.type === 'it') {
        columns = [
          { header: 'Código', dataKey: 'code' },
          { header: 'Tipo Equipo', dataKey: 'category' },
          { header: 'Marca', dataKey: 'brand' },
          { header: 'Modelo', dataKey: 'model' },
          { header: 'Serie', dataKey: 'serial' },
          { header: 'Responsable', dataKey: 'assignedLabel' },
        ];
      } else if (reportFilters.type === 'weapon') {
        columns = [
          { header: 'Código', dataKey: 'code' },
          { header: 'Tipo', dataKey: 'name' },
          { header: 'Marca', dataKey: 'brand' },
          { header: 'Serie', dataKey: 'serial' },
          { header: 'Persona Asignada', dataKey: 'assignedLabel' },
        ];
      }

      await generateReport({
        title: reportTitle,
        filename: `SAGP_Inventario_${reportFilters.type}`,
        columns: columns,
        orientation: reportFilters.orientation,
        format: reportFilters.format,
        data: filteredAssetsToExport.map(a => ({
          ...a,
          locationName: locations.find(l => l.id === a.locationId)?.name || 'No registrado',
          officeLabel: a.office || 'No registrado',
          statusLabel: a.status === 'good' ? 'BUENO' : a.status === 'regular' ? 'REGULAR' : a.status === 'bad' ? 'MALO' : a.status === 'maintenance' ? 'MANTENIMIENTO' : a.status === 'repaired' ? 'BUENO (REPARADO)' : a.status === 'bodega' ? 'BODEGA (ALMACENADO)' : 'BAJA',
          assignedLabel: people.find(p => p.id === a.assignedPersonId)?.name || 'Sin asignar',
          plate: a.details?.plate || 'No registrado',
          brand: a.brand || 'No registrado',
          model: a.model || 'No registrado',
          serial: a.serial || 'No registrado',
        })),
        userName: profile.name,
        filters: {
          'Ubicación': locations.find(l => l.id === reportFilters.locationId)?.name || 'Todas',
          'Oficina': reportFilters.office || 'Todas',
          'Estado': statusLabels[reportFilters.status],
          'Responsable': reportFilters.assignedTo === 'unassigned' ? 'Sin asignar' : people.find(p => p.id === reportFilters.assignedTo)?.name || 'Cualquiera'
        },
        summary: {
          'Total de Registros': filteredAssetsToExport.length
        }
      });
      setIsInventoryModalOpen(false);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadActivity = async (reportFormat: ReportFormat = 'pdf') => {
    if (!profile) return;
    setIsGenerating(true);
    
    const start = new Date(dateRange.start + 'T00:00:00').getTime();
    const end = new Date(dateRange.end + 'T23:59:59').getTime();
    
    const activityData = logs.filter(log => {
      const logTimestamp = log.timestamp.seconds * 1000;
      return logTimestamp >= start && logTimestamp <= end;
    }).sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);

    if (activityData.length === 0) {
      alert('No se encontraron eventos de actividad en el período seleccionado.');
      setIsGenerating(false);
      return;
    }

    try {
      await generateReport({
        title: 'Reporte de Bitácora y Actividad',
        subtitle: `Período: ${formatDate(new Date(start), 'dd/MM/yyyy')} al ${formatDate(new Date(end), 'dd/MM/yyyy')}`,
        filename: 'SAGP_Bitacora',
        userName: profile.name,
        format: reportFormat,
        hideFilters: true,
        orientation: reportFilters.orientation,
        filters: {
          'Desde': formatDate(new Date(start), 'dd/MM/yyyy'),
          'Hasta': formatDate(new Date(end), 'dd/MM/yyyy'),
        },
        summary: {
          'Total de Operaciones': activityData.length,
          'Entorno': isDemoMode() ? 'DEMOSTRACIÓN' : 'SISTEMA REAL'
        },
        columns: [
          { header: 'Fecha', dataKey: 'dateStr' },
          { header: 'Operación', dataKey: 'operationLabel' },
          { header: 'Bien', dataKey: 'assetLabel' },
          { header: 'Detalle de Cambios', dataKey: 'changesStr' },
          { header: 'Responsable', dataKey: 'userName' },
        ],
        data: activityData.map(l => ({
          ...l,
          dateStr: formatDate(new Date(l.timestamp.seconds * 1000), 'dd/MM/yyyy HH:mm'),
          operationLabel: l.operation.replace('_', ' ').toUpperCase(),
          assetLabel: `${l.assetName}\n(${l.assetCode})`,
          changesStr: l.changes && l.changes.length > 0
            ? l.changes.map(c => `${c.field.toUpperCase()}: ${c.oldValue || 'N/A'} -> ${c.newValue}`).join('\n') 
            : (l.observations || 'Sin detalles adicionales')
        }))
      });
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error al generar el reporte.');
    } finally {
      setIsGenerating(false);
    }
  };

  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800 flex items-center gap-2 uppercase tracking-tight">
            <FileText className="h-6 w-6 text-primary" />
            Centro de Reportes
          </h2>
          <p className="text-xs lg:text-sm text-slate-500 font-medium italic">Gestión de documentos y trazabilidad institucional</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { id: 'all', title: 'Inventario General', icon: Package, color: 'blue' },
          { id: 'vehicle', title: 'Solo Vehículos', icon: Car, color: 'emerald' },
          { id: 'it', title: 'Equipo Informático', icon: Monitor, color: 'indigo' },
          { id: 'weapon', title: 'Solo Armas', icon: Shield, color: 'rose' },
        ].map((type) => (
          <button
            key={type.id}
            onClick={() => {
              setReportFilters(prev => ({ ...prev, type: type.id as any }));
              setIsInventoryModalOpen(true);
            }}
            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group text-left"
          >
            <div className={`p-4 bg-${type.color}-50 rounded-2xl mb-4 group-hover:scale-110 transition-transform inline-block`}>
              <type.icon className={`h-6 w-6 text-${type.color}-600`} />
            </div>
            <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">{type.title}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Generar Reporte</p>
          </button>
        ))}
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group flex flex-col md:flex-row justify-between gap-8">
        <div className="flex-1">
          <div className="flex justify-between items-start mb-6">
            <div className="p-4 bg-amber-50 rounded-2xl group-hover:bg-amber-100 transition-colors">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">Reporte de Bitácora y Actividad</h3>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">Documento detallado de todos los movimientos, cambios de estado y actualizaciones ocurridas en un período determinado.</p>
          
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <File className="h-3 w-3" />
                  Formato de Bitácora
                </label>
                <ReportFormatSelector 
                  selectedFormat={reportFilters.format}
                  onFormatChange={(f) => setReportFilters(prev => ({ ...prev, format: f }))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase">Orientación</label>
                <div className="flex gap-2 mt-1">
                  {['auto', 'p', 'l'].map((opt) => (
                    <button 
                      key={opt}
                      type="button"
                      onClick={() => setReportFilters(prev => ({ ...prev, orientation: opt as any }))} 
                      className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all border ${reportFilters.orientation === opt ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                      {opt === 'auto' ? 'Auto' : opt === 'p' ? 'Vertical' : 'Horizontal'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase">Período Seleccionado</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  <button type="button" onClick={() => setPeriod('today')} className="px-3 py-2 bg-white hover:bg-primary hover:text-white rounded-lg text-[10px] font-bold transition-all border border-slate-200 shadow-sm flex-1">Hoy</button>
                  <button type="button" onClick={() => setPeriod('week')} className="px-3 py-2 bg-white hover:bg-primary hover:text-white rounded-lg text-[10px] font-bold transition-all border border-slate-200 shadow-sm flex-1">Semana</button>
                  <button type="button" onClick={() => setPeriod('month')} className="px-3 py-2 bg-white hover:bg-primary hover:text-white rounded-lg text-[10px] font-bold transition-all border border-slate-200 shadow-sm flex-1">Mes</button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2 border-t border-slate-200">
              <div className="space-y-1 flex-1">
                <label className="text-[9px] font-black text-slate-400 uppercase">Fecha Inicial</label>
                <input type="date" className="block w-full bg-transparent text-sm font-black outline-none text-primary" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} />
              </div>
              <div className="h-8 w-px bg-slate-200"></div>
              <div className="space-y-1 flex-1">
                <label className="text-[9px] font-black text-slate-400 uppercase">Fecha Final</label>
                <input type="date" className="block w-full bg-transparent text-sm font-black outline-none text-primary" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="relative">
            <button 
              type="button"
              onClick={() => handleDownloadActivity(reportFilters.format)}
              disabled={isGenerating || loading}
              className="w-full flex items-center justify-center gap-3 bg-institutional py-4 rounded-2xl hover:brightness-110 transition-all font-black shadow-xl active:scale-[0.98] disabled:opacity-50"
            >
              <Download className="h-5 w-5" />
              <span>{isGenerating ? 'Generando...' : `GENERAR ${reportFilters.format.toUpperCase()}`}</span>
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isInventoryModalOpen}
        onClose={() => setIsInventoryModalOpen(false)}
        title="Configurar Reporte de Inventario"
      >
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-4">
            <Filter className="h-8 w-8 text-primary" />
            <div>
              <p className="font-bold text-slate-800 uppercase tracking-tight text-sm">
                Filtros de Exportación
              </p>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Personalice el alcance del documento</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ubicación</label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold"
                value={reportFilters.locationId}
                onChange={e => setReportFilters(prev => ({ ...prev, locationId: e.target.value, office: '' }))}
              >
                <option value="">Todas las ubicaciones</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            <div className="space-y-3 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <File className="h-3 w-3" />
                Formato de Exportación
              </label>
              <ReportFormatSelector 
                selectedFormat={reportFilters.format}
                onFormatChange={(f) => setReportFilters(prev => ({ ...prev, format: f }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-primary">Estado de Bienes</label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold"
                value={reportFilters.status}
                onChange={e => setReportFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="all">Todos los estados</option>
                <option value="good">Solo buenos</option>
                <option value="regular">Solo regulares (Legacy)</option>
                <option value="bad">Solo malos</option>
                <option value="maintenance">Solo en mantenimiento</option>
                <option value="repaired">Solo reparados</option>
                <option value="bodega">Solo en bodega</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asignado a</label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold"
                value={reportFilters.assignedTo}
                onChange={e => setReportFilters(prev => ({ ...prev, assignedTo: e.target.value }))}
              >
                <option value="">Cualquier persona</option>
                <option value="unassigned">Sin asignar</option>
                {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Orientación</label>
              <div className="flex gap-2">
                {['auto', 'p', 'l'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setReportFilters(prev => ({ ...prev, orientation: opt as any }))}
                    className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold transition-all border ${
                      reportFilters.orientation === opt 
                        ? 'bg-primary text-white border-primary shadow-sm' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-primary/30'
                    }`}
                  >
                    {opt === 'auto' ? 'Auto' : opt === 'p' ? 'Vertical' : 'Horizontal'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Registros encontrados:</p>
            <p className="text-2xl font-black text-primary">{filteredAssetsToExport.length}</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              onClick={() => setIsInventoryModalOpen(false)}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all uppercase text-[10px] tracking-widest"
            >
              Cancelar
            </button>
            <button 
              onClick={handleDownloadInventory}
              disabled={isGenerating || filteredAssetsToExport.length === 0}
              className="flex-1 bg-primary text-white px-4 py-3 rounded-xl hover:bg-primary/90 transition-all font-bold shadow-lg flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest disabled:opacity-50"
            >
              <Download className="h-5 w-5" />
              <span>{isGenerating ? 'Generando...' : `GENERAR ${reportFilters.format.toUpperCase()}`}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
