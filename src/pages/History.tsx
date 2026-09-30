import { useState, useEffect } from 'react';
import { storage } from '../lib/storage';
import { AuditLog, Location, Asset } from '../types';
import DataTable, { Column } from '../components/DataTable';
import { History as HistoryIcon, Search, Filter, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { generateReport, ReportFormat } from '../lib/reports';
import { useAuth } from '../context/AuthContext';
import { Download, ChevronDown, Check, File, FileText } from 'lucide-react';
import ReportFormatSelector from '../components/ReportFormatSelector';

export default function History() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportFormat, setReportFormat] = useState<ReportFormat>('pdf');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    operation: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    setLoading(true);
    const unsubscribe = storage.subscribe('audit_logs', (data) => {
      // Sort by timestamp desc
      const sorted = (data as AuditLog[]).sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
      setLogs(sorted);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.assetCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesOperation = !filters.operation || log.operation === filters.operation;
    
    // Date filtering robust for America/Tegucigalpa (UTC-6)
    const logTimestamp = log.timestamp.seconds * 1000;
    
    let matchesStartDate = true;
    if (filters.startDate) {
      // Create date at 00:00 local time
      const start = new Date(filters.startDate + 'T00:00:00');
      matchesStartDate = logTimestamp >= start.getTime();
    }
    
    let matchesEndDate = true;
    if (filters.endDate) {
      // Create date at 23:59:59 local time
      const end = new Date(filters.endDate + 'T23:59:59');
      matchesEndDate = logTimestamp <= end.getTime();
    }

    return matchesSearch && matchesOperation && matchesStartDate && matchesEndDate;
  });

  const handleDownloadReport = async (reportFormat: ReportFormat = 'pdf') => {
    if (!profile) return;
    setIsGenerating(true);
    
    if (filteredLogs.length === 0) {
      alert('No hay datos para exportar con los filtros actuales.');
      setIsGenerating(false);
      return;
    }

    try {
      await generateReport({
        title: 'Reporte de Bitácora y Actividad',
        subtitle: (filters.startDate || filters.endDate) 
          ? `${filters.startDate || 'Inicio'} al ${filters.endDate || 'Hoy'}`
          : 'Todo el historial disponible',
        filename: 'SAGP_Bitacora_Completa',
        userName: profile.name,
        format: reportFormat,
        hideFilters: true,
        filters: {
          'Búsqueda': searchTerm,
          'Operación': filters.operation,
          'Desde': filters.startDate,
          'Hasta': filters.endDate
        },
        summary: {
          'Total Eventos': filteredLogs.length
        },
        columns: [
          { header: 'Fecha', dataKey: 'dateStr' },
          { header: 'Operación', dataKey: 'operationLabel' },
          { header: 'Bien', dataKey: 'assetLabel' },
          { header: 'Cambios', dataKey: 'changesStr' },
          { header: 'Usuario', dataKey: 'userName' }
        ],
        data: filteredLogs.map(l => ({
          ...l,
          dateStr: format(new Date(l.timestamp.seconds * 1000), 'dd/MM/yyyy HH:mm'),
          operationLabel: l.operation.replace('_', ' ').toUpperCase(),
          assetLabel: `${l.assetName} (${l.assetCode})`,
          changesStr: l.changes && l.changes.length > 0
            ? l.changes.map(c => `${c.field.toUpperCase()}: ${c.oldValue || 'N/A'} -> ${c.newValue}`).join('\n')
            : (l.observations || 'Sin detalles')
        })),
        orientation: 'l'
      });
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const columns: Column<AuditLog>[] = [
    { 
      header: 'Fecha y Hora', 
      accessorKey: (log: AuditLog) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-800">
            {format(new Date(log.timestamp.seconds * 1000), 'dd/MM/yyyy', { locale: es })}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {format(new Date(log.timestamp.seconds * 1000), 'HH:mm:ss')}
          </span>
        </div>
      )
    },
    { 
      header: 'Operación', 
      accessorKey: (log: AuditLog) => (
        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
          log.operation === 'create' ? 'bg-emerald-100 text-emerald-700' :
          log.operation === 'status_change' ? 'bg-amber-100 text-amber-700' :
          log.operation === 'decommission' ? 'bg-rose-100 text-rose-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {log.operation.replace('_', ' ')}
        </span>
      )
    },
    { 
      header: 'Bien', 
      accessorKey: (log: AuditLog) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-800 truncate max-w-[150px]">{log.assetName}</span>
          <span className="text-[10px] text-slate-400 font-mono">{log.assetCode}</span>
        </div>
      )
    },
    { 
      header: 'Cambios / Detalle', 
      accessorKey: (log: AuditLog) => (
        <div className="text-[10px] space-y-1">
          {log.changes?.map((c, i) => (
            <div key={i} className="flex gap-1 items-center">
              <span className="font-bold uppercase text-slate-400">{c.field}:</span>
              <span className="text-rose-500 line-through">{String(c.oldValue || 'N/A')}</span>
              <span className="text-slate-400">→</span>
              <span className="text-emerald-600 font-bold">{String(c.newValue)}</span>
            </div>
          ))}
          {log.observations && (
            <p className="italic text-slate-500 truncate max-w-[200px]">Obs: {log.observations}</p>
          )}
          {!log.changes && <span className="text-slate-400">Sin cambios registrados</span>}
        </div>
      )
    },
    { header: 'Responsable', accessorKey: (log: AuditLog) => log.userName, className: 'text-xs' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800 flex items-center gap-2 uppercase tracking-tight">
            <HistoryIcon className="h-6 w-6 text-primary" />
            Bitácora de Operaciones
          </h2>
          <p className="text-xs lg:text-sm text-slate-500 font-medium italic">Historial completo de cambios y movimientos</p>
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
            disabled={loading || filteredLogs.length === 0 || isGenerating}
            className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-all font-black shadow-lg active:scale-95 disabled:opacity-50 min-w-[160px]"
          >
            <Download className="h-4 w-4" />
            <span>{isGenerating ? 'Generando...' : `GENERAR ${reportFormat.toUpperCase()}`}</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 lg:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative group col-span-1 md:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Buscar por código, nombre o responsable..."
              className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 bg-slate-50/50 transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 bg-slate-50/50 transition-all text-sm appearance-none"
              value={filters.operation}
              onChange={(e) => setFilters(prev => ({ ...prev, operation: e.target.value }))}
            >
              <option value="">Todas las Operaciones</option>
              <option value="create">Registros</option>
              <option value="update">Modificaciones</option>
              <option value="status_change">Cambios de Estado</option>
              <option value="assign">Asignaciones</option>
              <option value="return">Devoluciones</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-slate-400 shrink-0" />
            <input 
              type="date"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary/20 outline-none"
              value={filters.startDate}
              onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            />
            <span className="text-slate-400">-</span>
            <input 
              type="date"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary/20 outline-none"
              value={filters.endDate}
              onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <DataTable data={filteredLogs} columns={columns} loading={loading} />
    </div>
  );
}
