import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  MapPin, 
  ShieldAlert, 
  Car, 
  History, 
  Wrench, 
  FileText, 
  Users,
  LogOut,
  Info,
  X,
  BedDouble
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { isDemoMode } from '../lib/storage';

const navigation = [
  { name: 'Panel Principal', href: '/', icon: LayoutDashboard, roles: ['admin', 'inventory_manager', 'weapon_manager', 'vehicle_manager', 'viewer', 'supervisor', 'conductor', 'maintenance_staff', 'buyer'] },
  { name: 'Inventario General', href: '/inventory', icon: Package, roles: ['admin', 'inventory_manager', 'viewer'] },
  { name: 'Ubicaciones', href: '/locations', icon: MapPin, roles: ['admin', 'inventory_manager', 'viewer'] },
  { name: 'Control de Dormitorios', href: '/dormitories', icon: BedDouble, roles: ['admin', 'inventory_manager', 'supervisor', 'viewer'] },
  { name: 'Planificación de Cupos', href: '/planning', icon: FileText, roles: ['admin', 'inventory_manager', 'supervisor', 'viewer'] },
  { name: 'Control de Armas', href: '/weapons', icon: ShieldAlert, roles: ['admin', 'weapon_manager', 'supervisor'] },
  { name: 'Control de Vehículos', href: '/vehicles', icon: Car, roles: ['admin', 'vehicle_manager', 'conductor'] },
  { name: 'Mantenimiento', href: '/maintenance', icon: Wrench, roles: ['admin', 'inventory_manager', 'maintenance_staff'] },
  { name: 'Proyectos de Compra', href: '/projects', icon: Package, roles: ['admin', 'buyer', 'viewer'] },
  { name: 'Personas', href: '/people', icon: Users, roles: ['admin', 'inventory_manager'] },
  { name: 'Bitácora', href: '/history', icon: History, roles: ['admin', 'inventory_manager', 'viewer'] },
  { name: 'Reportes', href: '/reports', icon: FileText, roles: ['admin', 'inventory_manager', 'viewer'] },
  { name: 'Notificaciones', href: '/notifications', icon: Info, roles: ['admin', 'inventory_manager', 'weapon_manager', 'vehicle_manager', 'supervisor', 'conductor', 'maintenance_staff', 'buyer', 'viewer'] },
  { name: 'Usuarios', href: '/users', icon: Users, roles: ['admin'] },
];

export default function Sidebar({ onClose, isCollapsed }: { onClose?: () => void; isCollapsed?: boolean }) {
  const { profile, signOut } = useAuth();

  const filteredNavigation = navigation.filter(item => 
    profile && item.roles.includes(profile.role)
  );

  return (
    <div className={cn(
      "flex h-full flex-col bg-primary text-white transition-all duration-300",
      isCollapsed ? "w-20" : "w-64"
    )}>
      <div className={cn(
        "flex h-24 flex-col items-center justify-center border-b border-white/10 px-4 py-4 relative overflow-hidden",
        isCollapsed && "px-0"
      )}>
        <div className={cn(
          "flex items-center gap-3 transition-all duration-300",
          isCollapsed ? "opacity-0 -translate-x-full invisible" : "opacity-100 translate-x-0 visible"
        )}>
          {/* Logo Container */}
          <div className="h-14 w-14 flex items-center justify-center shrink-0">
            <img 
              src="/assets/logo_eic.png" 
              alt="Escuela de Investigación Criminal" 
              className="h-full w-full object-contain" 
            />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tighter leading-none italic text-white">SAGP</span>
            <span className="text-[8px] font-bold text-accent uppercase tracking-widest mt-1">EIC Honduras</span>
          </div>
        </div>
        
        {/* Mobile Close Button */}
        <button 
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 p-1 text-white hover:bg-white/10 rounded"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
        {filteredNavigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            onClick={onClose}
            title={isCollapsed ? item.name : undefined}
            className={({ isActive }) =>
              cn(
                'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-all',
                isCollapsed ? 'justify-center px-0' : '',
                isActive
                  ? 'bg-accent text-primary shadow-sm'
                  : 'text-slate-200 hover:bg-white/10 hover:text-white'
              )
            }
          >
            <item.icon className={cn(
              "h-5 w-5 flex-shrink-0 transition-colors",
              isCollapsed ? "" : "mr-3",
              "group-hover:text-white"
            )} aria-hidden="true" />
            {!isCollapsed && <span className="truncate">{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      {isDemoMode() && !isCollapsed && (
        <div className="p-4 border-t border-white/10">
          <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2">
            <Info className="h-4 w-4 text-accent shrink-0" />
            <span className="text-xs font-medium text-slate-300">Modo Demostración</span>
          </div>
        </div>
      )}
    </div>
  );
}
