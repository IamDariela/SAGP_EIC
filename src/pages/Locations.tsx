import { useState, useEffect } from 'react';
import { storage } from '../lib/storage';
import { Location, Asset } from '../types';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import { Building2, MapPin, Plus, Save, Trash2, LayoutGrid } from 'lucide-react';
import { INVENTORY_TEMPLATES } from '../assets/inventoryTemplates';

export default function Locations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Partial<Location> | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribeLocations = storage.subscribe('locations', (data) => {
      setLocations(data as Location[]);
    });

    const unsubscribeAssets = storage.subscribe('assets', (data) => {
      setAssets(data as Asset[]);
      setLoading(false);
    });

    return () => {
      unsubscribeLocations();
      unsubscribeAssets();
    };
  }, []);

  const locationStats = locations.map(loc => {
    const locAssets = assets.filter(a => a.locationId === loc.id);
    return {
      ...loc,
      totalItems: locAssets.length,
      goodCount: locAssets.filter(a => a.status === 'good').length,
      badCount: locAssets.filter(a => a.status === 'bad').length,
    };
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocation?.name) return;

    if (editingLocation.id) {
      await storage.updateDocument('locations', editingLocation.id, editingLocation);
    } else {
      await storage.addDocument('locations', {
        ...editingLocation,
        building: editingLocation.building || 'EIC',
        area: editingLocation.area || 'Segunda Planta',
        type: editingLocation.type || 'Oficina'
      });
    }
    setIsModalOpen(false);
    setEditingLocation(null);
  };

  const columns: Column<any>[] = [
    { header: 'Nombre', accessorKey: (loc: any) => loc.name, className: 'font-semibold' },
    { header: 'Edificio', accessorKey: (loc: any) => loc.building },
    { header: 'Área', accessorKey: (loc: any) => loc.area },
    { header: 'Tipo', accessorKey: (loc: any) => loc.type },
    { 
      header: 'Plantilla', 
      accessorKey: (loc: any) => {
        const template = INVENTORY_TEMPLATES.find(t => t.templateId === loc.templateId);
        return template ? (
          <span className="text-primary font-bold text-[10px] uppercase tracking-wider bg-primary/5 px-2 py-1 rounded-lg border border-primary/10">
            {template.templateId.replace('_', ' ')}
          </span>
        ) : (
          <span className="text-slate-400 italic text-[10px]">Sin asignar</span>
        );
      }
    },
    { 
      header: 'Total Bienes', 
      accessorKey: (loc: any) => (
        <span className="bg-slate-100 px-2 py-1 rounded-md font-mono text-xs">
          {loc.totalItems}
        </span>
      )
    },
    { 
      header: 'Estado', 
      accessorKey: (loc: any) => (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-emerald-600">B: {loc.goodCount}</span>
          <span className="text-rose-600">M: {loc.badCount}</span>
        </div>
      )
    },
    {
      header: 'Acciones',
      accessorKey: (loc: any) => (
        <button 
          onClick={() => {
            setEditingLocation(loc);
            setIsModalOpen(true);
          }}
          className="p-2 text-primary hover:bg-primary/5 rounded-lg transition-colors"
        >
          <Save className="h-4 w-4" />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800 flex items-center gap-2 uppercase tracking-tight">
            <Building2 className="h-6 w-6 text-primary" />
            Infraestructura
          </h2>
          <p className="text-xs lg:text-sm text-slate-500 font-medium italic">Distribución física de los activos institucionales</p>
        </div>
        <button 
          onClick={() => {
            setEditingLocation({ building: 'EIC', area: 'Segunda Planta', type: 'Oficina' });
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-all font-bold shadow-md active:scale-95"
        >
          <Plus className="h-5 w-5" />
          Nueva Ubicación
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locationStats.slice(0, 3).map(loc => (
          <div key={loc.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-primary/20 transition-all hover:shadow-md group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-primary/5 transition-colors">
                <MapPin className="h-6 w-6 text-slate-400 group-hover:text-primary" />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{loc.type}</span>
            </div>
            <h3 className="text-lg font-black text-slate-800 truncate mb-1">{loc.name}</h3>
            <p className="text-xs text-slate-500 mb-6 font-medium">{loc.building} — {loc.area}</p>
            <div className="flex items-center justify-between pt-6 border-t border-slate-100">
              <div className="text-center">
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Total</p>
                <p className="text-lg font-black text-slate-800">{loc.totalItems}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest mb-1">Buenos</p>
                <p className="text-lg font-black text-emerald-600">{loc.goodCount}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-rose-400 font-black uppercase tracking-widest mb-1">Malos</p>
                <p className="text-lg font-black text-rose-600">{loc.badCount}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <DataTable data={locationStats} columns={columns} loading={loading} />

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingLocation(null);
        }}
        title={editingLocation?.id ? 'Editar Ubicación' : 'Nueva Ubicación'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre de la Ubicación</label>
            <input 
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              value={editingLocation?.name || ''}
              onChange={e => setEditingLocation(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Edificio</label>
              <input 
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                value={editingLocation?.building || ''}
                onChange={e => setEditingLocation(prev => ({ ...prev, building: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Área / Planta</label>
              <input 
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                value={editingLocation?.area || ''}
                onChange={e => setEditingLocation(prev => ({ ...prev, area: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Plantilla de Inventario</label>
            <div className="relative group">
              <LayoutGrid className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select 
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white appearance-none font-bold text-sm"
                value={editingLocation?.templateId || ''}
                onChange={e => setEditingLocation(prev => ({ ...prev, templateId: e.target.value }))}
              >
                <option value="">Sin plantilla (Uso general)</option>
                {INVENTORY_TEMPLATES.map(t => (
                  <option key={t.templateId} value={t.templateId}>
                    {t.templateId.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
              <span>Guardar Ubicación</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
