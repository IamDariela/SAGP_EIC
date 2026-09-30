import { useEffect, useState } from 'react';
import { storage } from '../lib/storage';
import { 
  Package, 
  ShieldAlert, 
  Car, 
  MapPin, 
  AlertTriangle, 
  Wrench,
  CheckCircle2,
  Database,
  RefreshCcw,
  Plus,
  Info
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalAssets: 0,
    weapons: 0,
    vehicles: 0,
    locations: 0,
    badCondition: 0,
    regularCondition: 0,
    inMaintenance: 0,
    bodega: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const assets = await storage.getCollection<any>('assets');
      const locations = await storage.getCollection<any>('locations');
      
      const activeAssets = assets.filter(a => a.status !== 'decommissioned');
      
      setStats({
        totalAssets: activeAssets.length,
        weapons: activeAssets.filter(a => a.type === 'weapon').length,
        vehicles: activeAssets.filter(a => a.type === 'vehicle').length,
        locations: locations.length,
        badCondition: activeAssets.filter(a => a.status === 'bad').length,
        regularCondition: activeAssets.filter(a => a.status === 'regular').length,
        inMaintenance: activeAssets.filter(a => a.status === 'maintenance').length,
        bodega: activeAssets.filter(a => a.status === 'bodega').length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Subscribe to changes
    const unsubscribe = storage.subscribe('assets', () => {
      fetchStats();
    });
    return unsubscribe;
  }, []);

  const statCards = [
    { name: 'Total de Bienes', value: stats.totalAssets, icon: Package, color: 'text-primary', bg: 'bg-primary/5' },
    { name: 'Armamento', value: stats.weapons, icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50' },
    { name: 'Vehículos', value: stats.vehicles, icon: Car, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: 'Ubicaciones', value: stats.locations, icon: MapPin, color: 'text-primary', bg: 'bg-primary/5' },
  ];

  const statusCards = [
    { name: 'En Bodega (Almacenados)', value: stats.bodega, icon: Database, color: 'text-indigo-600', barColor: 'bg-indigo-500' },
    { name: 'En Mal Estado', value: stats.badCondition, icon: AlertTriangle, color: 'text-amber-600', barColor: 'bg-accent' },
    { name: 'En Estado Regular (Legacy)', value: stats.regularCondition, icon: Info, color: 'text-blue-400', barColor: 'bg-blue-400' },
    { name: 'En Mantenimiento', value: stats.inMaintenance, icon: Wrench, color: 'text-blue-500', barColor: 'bg-blue-500' },
    { name: 'En Buen Estado', value: stats.totalAssets - stats.badCondition - stats.regularCondition - stats.inMaintenance - stats.bodega, icon: CheckCircle2, color: 'text-emerald-500', barColor: 'bg-emerald-500' },
  ];

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800">Resumen Institucional</h2>
          <p className="text-slate-500 text-xs lg:text-sm">Estado actual de los bienes de la EIC</p>
        </div>
        
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 text-slate-600 hover:text-primary px-4 py-2 rounded-xl border border-slate-200 bg-white shadow-sm transition-all text-sm font-medium"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-white p-5 lg:p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`p-3 rounded-xl ${stat.bg}`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.name}</p>
              <p className="text-xl lg:text-2xl font-extrabold text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-800">Estado Físico de Bienes</h3>
            <div className="px-2 py-1 bg-accent/10 rounded text-[10px] font-bold text-primary uppercase">Datos Actualizados</div>
          </div>
          <div className="space-y-8">
            {statusCards.map((status) => (
              <div key={status.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <status.icon className={`h-5 w-5 ${status.color}`} />
                    <span className="text-sm font-bold text-slate-700">{status.name}</span>
                  </div>
                  <span className="text-sm font-black text-slate-800">{status.value}</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${status.barColor} transition-all duration-1000`} 
                    style={{ width: `${stats.totalAssets ? (status.value / stats.totalAssets) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-primary p-6 rounded-2xl shadow-lg border border-primary/20 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Package className="h-32 w-32" />
          </div>
          <h3 className="text-lg font-bold mb-6 relative z-10">Acciones Rápidas</h3>
          <div className="space-y-3 relative z-10">
            <button className="w-full text-left px-4 py-3 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 transition-all flex items-center justify-between group/btn">
              <span className="text-sm font-bold">Registrar Bien</span>
              <Plus className="h-4 w-4 text-accent" />
            </button>
            <button className="w-full text-left px-4 py-3 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 transition-all flex items-center justify-between group/btn">
              <span className="text-sm font-bold">Asignar Armas</span>
              <ShieldAlert className="h-4 w-4 text-accent" />
            </button>
            <button className="w-full text-left px-4 py-3 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 transition-all flex items-center justify-between group/btn">
              <span className="text-sm font-bold">Control Vehicular</span>
              <Car className="h-4 w-4 text-accent" />
            </button>
          </div>
          <div className="mt-8 pt-8 border-t border-white/10">
            <div className="bg-accent rounded-xl p-4 text-primary">
              <p className="text-[10px] font-black uppercase tracking-widest mb-1">Aviso</p>
              <p className="text-xs font-bold leading-relaxed">Existen {stats.badCondition} bienes reportados en mal estado que requieren atención inmediata.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
