import {SESSION_KEY} from '../data/local.js';
import {ROLES} from './model.js';

/** Demo identity is separate from demo records. Official identity is supplied exclusively by PHP. */
export function createSession(config, service, store) {
  if (config.dataMode === 'demo') store ??= globalThis.localStorage;
  return {
    async current(state) {
      if (config.dataMode === 'api') {
        const session=await service.getSession();
        return session?{...session,id:session.userId || session.id}:null;
      }
      let session;
      try {
        session = JSON.parse(store.getItem(SESSION_KEY) || 'null');
      } catch {
        return null;
      }
      const user = state.users.find(user => user.id === session?.userId && user.status === 'active');
      return user && ROLES[session.role] ? {...user, role: session.role, userId: user.id} : null;
    },
    async login(user) {
      if (config.dataMode !== 'demo') throw new Error('Autenticación oficial pendiente.');
      if (!user || user.status !== 'active' || !ROLES[user.role]) throw new Error('Selecciona un perfil activo.');
      store.setItem(SESSION_KEY, JSON.stringify({userId: user.id, role: user.role}));
    },
    async setRole(role) {
      if (config.dataMode !== 'demo' || !ROLES[role]) throw new Error('Cambio de rol no disponible.');
      const session = JSON.parse(store.getItem(SESSION_KEY) || 'null');
      if (!session) throw new Error('Inicia sesión primero.');
      const state=await service.getState(),user=state.users.find(u=>u.role===role && u.status==='active');
      if(!user)throw new Error('No hay un perfil activo para esa función. Regístralo en Usuarios.');
      store.setItem(SESSION_KEY, JSON.stringify({userId:user.id,role}));
    },
    async logout() {
      if (config.dataMode === 'api') await service.signOut();
      else store.removeItem(SESSION_KEY);
    }
  };
}
