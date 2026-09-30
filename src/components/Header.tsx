import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { ChevronDown, LogOut, UserCircle } from 'lucide-react';
import Clock from './Clock';

export default function Header() {
  const { profile, updateRole, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end w-full">
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <div className="flex items-center gap-2 bg-white/10 rounded-lg px-2 sm:px-3 py-1.5 border border-white/20 shadow-inner">
          <label className="hidden xl:inline text-[9px] font-black text-white/60 uppercase tracking-widest">Perfil:</label>
          <select 
            value={profile?.role} 
            onChange={(e) => updateRole(e.target.value as UserRole)}
            className="text-[10px] sm:text-xs bg-transparent border-none focus:ring-0 text-white font-bold cursor-pointer pr-8"
          >
            <option value="admin" className="text-slate-900">Administrador</option>
            <option value="inventory_manager" className="text-slate-900">Encargado Inventario</option>
            <option value="weapon_manager" className="text-slate-900">Encargado Armamento</option>
            <option value="vehicle_manager" className="text-slate-900">Encargado Vehículos</option>
            <option value="viewer" className="text-slate-900">Consulta</option>
          </select>
        </div>

        {/* Account Menu Dropdown */}
        <div className="relative border-l border-white/10 pl-3 sm:pl-4" ref={menuRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-label="Menú de cuenta"
            className="flex items-center gap-2.5 py-1 px-1.5 sm:px-2 rounded-xl hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50 text-white group"
          >
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white/20 flex items-center justify-center border border-white/30 shadow-sm shrink-0 overflow-hidden font-bold text-xs">
              {profile?.name ? profile.name.charAt(0) : <UserCircle className="h-5 w-5 text-white" />}
            </div>
            {/* Abbreviated/Short name on sm+, hidden on mobile */}
            <span className="hidden sm:inline-block text-xs font-bold tracking-tight truncate max-w-[120px]">
              {profile?.name ? profile.name.split(' ')[0] : 'Usuario'}
            </span>
            <ChevronDown className={`h-4 w-4 text-white/70 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-3 px-4 z-50 text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="mb-2">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Cuenta Actual</p>
                <p className="text-sm font-black text-slate-900 break-words leading-tight">{profile?.name || 'Usuario'}</p>
                <p className="text-xs text-slate-500 font-semibold capitalize mt-1">
                  {profile?.role ? profile.role.replace('_', ' ') : 'Sin Rol'}
                </p>
              </div>

              <hr className="my-2 border-slate-100" />

              <button
                onClick={() => {
                  setIsOpen(false);
                  signOut();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center border-l border-white/10 pl-2 sm:pl-4 shrink-0">
        <Clock />
      </div>
    </div>
  );
}
