import { useState, useEffect } from 'react';
import { storage } from '../lib/storage';
import { useAuth } from '../context/AuthContext';
import { Bell, Check, CheckCheck, Info, ShieldAlert, Sparkles, Smartphone, Mail } from 'lucide-react';
import { formatDateTime, cn } from '../lib/utils';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  priority: 'low' | 'normal' | 'high';
  read: boolean;
  timestamp: any;
  role?: string;
  userId?: string;
}

export default function Notifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushStatus, setPushStatus] = useState<'default' | 'granted' | 'denied'>('default');

  useEffect(() => {
    setLoading(true);
    const unsub = storage.subscribe('notifications', (data) => {
      let filtered = data as NotificationItem[];
      // Filter persistent notifications by user's role or specifically for their UID
      if (profile) {
        filtered = filtered.filter(n => !n.role || n.role === profile.role || n.userId === profile.uid);
      }
      // Sort chronologically
      filtered.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setNotifications(filtered);
      setLoading(false);
    });

    // Check browser Web Push/PWA permission
    if ('Notification' in window) {
      setPushStatus(Notification.permission as any);
    }

    return () => unsub();
  }, [profile]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await storage.updateDocument('notifications', id, {
        read: true
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => storage.updateDocument('notifications', n.id, { read: true })));
      alert('Todas las notificaciones marcadas como leídas.');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnablePush = async () => {
    if (!('Notification' in window)) {
      alert('Este navegador no soporta notificaciones de escritorio / Web Push.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushStatus(permission);
      if (permission === 'granted') {
        alert('¡Excelente! Las notificaciones Push / PWA han sido activadas para su dispositivo.');
        
        // Setup Service Worker registration if service worker is active
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification('SAGP — Honduras', {
              body: 'Dispositivo vinculado correctamente al centro de notificaciones.',
              icon: '/assets/logo_eic.png',
              badge: '/assets/logo_eic.png',
              tag: 'sagp-welcome'
            });
          });
        }
      } else {
        alert('Permiso de notificaciones denegado. Puede activarlo en los ajustes del candado del navegador.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800 flex items-center gap-2 uppercase tracking-tight">
            <Bell className="h-6 w-6 text-primary" />
            Centro de Notificaciones Tácticas
          </h2>
          <p className="text-xs lg:text-sm text-slate-500 font-medium italic">Avisos y alertas críticas de SAGP</p>
        </div>

        {/* Mark as read */}
        {notifications.some(n => !n.read) && (
          <button
            onClick={handleMarkAllAsRead}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase rounded-xl tracking-wider transition-colors shadow-sm"
          >
            Marcar todo leído
          </button>
        )}
      </div>

      {/* Web Push/PWA Promotion Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-6 justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-primary/5 text-primary rounded-2xl flex items-center justify-center shrink-0">
            <Smartphone className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Vincular Teléfono (Web Push / PWA)</h3>
            <p className="text-xs text-slate-500 font-medium">Reciba alertas en pantalla bloqueada sobre armas retrasadas, incidentes de vehículos o reparaciones validadas.</p>
          </div>
        </div>

        <button
          onClick={handleEnablePush}
          className={cn(
            "px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shrink-0 active:scale-95 shadow-md",
            pushStatus === 'granted' 
              ? "bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-default" 
              : "bg-accent text-primary hover:brightness-105"
          )}
        >
          {pushStatus === 'granted' ? 'Dispositivo Vinculado ✔' : 'Activar en este Dispositivo'}
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <CheckCheck className="h-16 w-16 mx-auto text-emerald-100 mb-4" />
            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Bandeja de Entrada Limpia</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">No hay alertas pendientes para su nivel de responsabilidad.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <div 
                key={n.id} 
                className={cn(
                  "py-4 flex items-start gap-4 transition-colors",
                  !n.read ? "bg-slate-50/50 -mx-6 px-6" : ""
                )}
              >
                <div className="shrink-0 mt-1">
                  {n.priority === 'high' ? (
                    <div className="h-9 w-9 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                  ) : n.priority === 'low' ? (
                    <div className="h-9 w-9 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                      <Info className="h-5 w-5" />
                    </div>
                  ) : (
                    <div className="h-9 w-9 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                      <Sparkles className="h-5 w-5" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className={cn(
                      "text-sm font-bold text-slate-800",
                      !n.read ? "text-primary" : ""
                    )}>
                      {n.title}
                    </h4>
                    <span className="text-[9px] font-mono text-slate-400 shrink-0">{formatDateTime(n.timestamp)}</span>
                  </div>
                  <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">{n.body}</p>
                </div>

                {!n.read && (
                  <button
                    onClick={() => handleMarkAsRead(n.id)}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors shrink-0"
                    title="Marcar como leído"
                  >
                    <Check className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
