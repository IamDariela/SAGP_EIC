import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { Menu, X } from 'lucide-react';

const titleMap: Record<string, string> = {
  '/': 'Panel Principal',
  '/inventory': 'Inventario General',
  '/locations': 'Gestión de Ubicaciones',
  '/dormitories': 'Control de Dormitorios',
  '/planning': 'Planificación de Cupos',
  '/weapons': 'Control de Armamento',
  '/vehicles': 'Control de Vehículos',
  '/maintenance': 'Mantenimiento de Bienes',
  '/projects': 'Proyectos de Compra',
  '/people': 'Personal Responsable',
  '/reports': 'Reportes y Estadísticas',
  '/notifications': 'Centro de Notificaciones',
};

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();
  const title = titleMap[location.pathname] || 'SAGP';

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop always visible, Mobile animated */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
      `}>
        <Sidebar 
          isCollapsed={isSidebarCollapsed}
          onClose={() => setIsSidebarOpen(false)} 
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-primary shadow-sm min-h-16 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 p-4 lg:px-8 border-b border-white/10 shrink-0 relative z-30">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="flex items-center gap-4 shrink-0">
              {/* Mobile Menu Toggle */}
              <button 
                className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </button>

              {/* Desktop Menu Toggle */}
              <button 
                className="hidden lg:flex p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                title={isSidebarCollapsed ? "Expandir menú" : "Colapsar menú"}
              >
                <Menu className="h-6 w-6" />
              </button>
              
              {/* Header Logo - Only visible if sidebar is collapsed (desktop) or hidden (mobile) */}
              {(isSidebarCollapsed || (!isSidebarOpen)) && (
                <div className={`h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center shrink-0 transition-all ${!isSidebarCollapsed ? 'lg:hidden' : 'lg:flex'}`}>
                  <img src="/assets/logo_eic.png" alt="Escuela de Investigación Criminal" className="h-full w-full object-contain" />
                </div>
              )}
            </div>

            <h1 className="text-sm sm:text-base lg:text-lg font-black text-white uppercase tracking-tight truncate max-w-[150px] sm:max-w-none">{title}</h1>
          </div>
          
          <div className="flex-1 min-w-0 flex justify-end">
            <Header />
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
