import { useState, useEffect } from 'react';
import { storage, logAction } from '../lib/storage';
import { MaintenanceRecord, Asset } from '../types';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import { Wrench, Plus, History, Clock, Save } from 'lucide-react';
import { formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export default function Maintenance() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRecord, setNewRecord] = useState<Partial<MaintenanceRecord>>({
    assetId: '',
    description: '',
    status: 'open'
  });

  useEffect(() => {
    setLoading(true);
    const unsubscribeRecords = storage.subscribe('maintenance', (data) => {
      const sorted = (data as MaintenanceRecord[]).sort((a, b) => (b.startDate?.seconds || 0) - (a.startDate?.seconds || 0));
      setRecords(sorted);
    });

    const unsubscribeAssets = storage.subscribe('assets', (data) => {
      setAssets(data as Asset[]);
      setLoading(false);
    });

    return () => {
      unsubscribeRecords();
      unsubscribeAssets();
    };
  }, []);

  const handleOpenMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecord.assetId || !newRecord.description || !profile) return;

    const asset = assets.find(a => a.id === newRecord.assetId);
    if (!asset) return;

    const recordId = await storage.addDocument('maintenance', {
      ...newRecord,
      startDate: { seconds: Math.floor(Date.now() / 1000) },
      userId: profile.uid,
      status: 'open'
    });

    // Update asset status to maintenance
    await storage.updateDocument('assets', asset.id, { status: 'maintenance' });

    // Log action
    await logAction({
      assetId: asset.id,
      assetName: asset.name,
      assetCode: asset.code,
      operation: 'maintenance_open',
      changes: [{ field: 'status', oldValue: asset.status, newValue: 'maintenance' }],
      observations: newRecord.description,
      userId: profile.uid,
      userName: profile.name,
      timestamp: { seconds: Math.floor(Date.now() / 1000) }
    });

    setIsModalOpen(false);
    setNewRecord({ assetId: '', description: '', status: 'open' });
  };

  const handleCloseMaintenance = async (record: MaintenanceRecord) => {
    if (!profile) return;
    const workDone = prompt('Describa el trabajo realizado:');
    if (workDone === null) return;

    const asset = assets.find(a => a.id === record.assetId);
    if (!asset) return;

    await storage.updateDocument('maintenance', record.id, {
      status: 'closed',
      endDate: { seconds: Math.floor(Date.now() / 1000) },
      workDone
    });

    // Restore asset status to good (assuming maintenance fixed it)
    await storage.updateDocument('assets', asset.id, { status: 'good' });

    // Log action
    await logAction({
      assetId: asset.id,
      assetName: asset.name,
      assetCode: asset.code,
      operation: 'maintenance_close',
      changes: [{ field: 'status', oldValue: 'maintenance', newValue: 'good' }],
      observations: `Trabajo: ${workDone}`,
      userId: profile.uid,
      userName: profile.name,
      timestamp: { seconds: Math.floor(Date.now() / 1000) }
    });
  };

  const columns: Column<MaintenanceRecord>[] = [
    { 
      header: 'Bien', 
      accessorKey: (r: MaintenanceRecord) => {
        const asset = assets.find(a => a.id === r.assetId);
        return asset ? `${asset.name} (${asset.code})` : 'Desconocido';
      }
    },
    { header: 'Descripción', accessorKey: (r: MaintenanceRecord) => r.description },
    { header: 'Fecha Inicio', accessorKey: (r: MaintenanceRecord) => formatDate(r.startDate) },
    { 
      header: 'Estado', 
      accessorKey: (r: MaintenanceRecord) => (
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
          r.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
        }`}>
          {r.status === 'open' ? 'Abierto' : 'Finalizado'}
        </span>
      )
    },
    { 
      header: 'Acciones', 
      accessorKey: (r: MaintenanceRecord) => r.status === 'open' ? (
        <button 
          onClick={() => handleCloseMaintenance(r)}
          className="text-primary text-[10px] font-black uppercase tracking-widest hover:underline"
        >
          Finalizar
        </button>
      ) : (
        <span className="text-[10px] text-slate-400 italic">Completado</span>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800 flex items-center gap-2 uppercase tracking-tight">
            <Wrench className="h-6 w-6 text-amber-600" />
            Mantenimiento de Bienes
          </h2>
          <p className="text-xs lg:text-sm text-slate-500 font-medium italic">Seguimiento técnico y preventivo de activos</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-all font-bold shadow-md active:scale-95"
        >
          <Plus className="h-5 w-5" />
          Abrir Orden
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-amber-300 transition-colors">
          <div className="p-3 bg-amber-50 rounded-xl group-hover:bg-amber-100 transition-colors">
            <Clock className="h-7 w-7 text-amber-600" />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-800">{records.filter(r => r.status === 'open').length}</p>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">En Proceso / Abiertos</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-emerald-300 transition-colors">
          <div className="p-3 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors">
            <History className="h-7 w-7 text-emerald-600" />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-800">{records.filter(r => r.status === 'closed').length}</p>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Órdenes Completadas</p>
          </div>
        </div>
      </div>

      <DataTable data={records} columns={columns} loading={loading} />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Abrir Orden de Mantenimiento"
      >
        <form onSubmit={handleOpenMaintenance} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Seleccionar Bien</label>
            <select
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white transition-all"
              value={newRecord.assetId}
              onChange={e => setNewRecord(prev => ({ ...prev, assetId: e.target.value }))}
            >
              <option value="">Seleccione un bien...</option>
              {assets.filter(a => a.status !== 'maintenance').map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Descripción del Problema</label>
            <textarea
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none transition-all h-24 resize-none"
              value={newRecord.description}
              onChange={e => setNewRecord(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describa la falla o motivo del mantenimiento..."
            />
          </div>

          <div className="flex gap-3">
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
              <span>Abrir Orden</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
