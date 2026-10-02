import {validateState} from '../core/model.js';
import {executeCommand} from '../core/commands.js';
import {upgradeDemo} from '../core/upgrade.js';

// Keep the historical key so an upgrade preserves the user's demo; payload version is independent.
export const STATE_KEY = 'sagp_demo_state_v2';
export const SESSION_KEY = 'sagp_demo_session';
const legacyCollections = {
  bienes: 'assets', ubicaciones: 'locations', personas: 'people',
  usuarios: 'users', dormitorios: 'beds', mantenimientos: 'maintenance'
};

/** The only module allowed to read/write demo persistence. Storage is injectable for isolated tests. */
export function createLocalProvider(store, seedFactory, normalizeLegacy, sessionGetter) {
  let queue = Promise.resolve();

  function read() {
    try {
      const saved = store.getItem(STATE_KEY);
      if (saved) {
        const parsed=JSON.parse(saved),state=validateState(upgradeDemo(parsed));
        if(parsed.version!==state.version)store.setItem(STATE_KEY,JSON.stringify(state));
        return state;
      }
      const state = seedFactory();
      let legacy = false;
      for (const [oldName, newName] of Object.entries(legacyCollections)) {
        const data = store.getItem('sagp_demo_' + oldName);
        if (data !== null) {
          state[newName] = JSON.parse(data);
          legacy = true;
        }
      }
      if (legacy) {
        state.assignments = [];
        for(const name of ['enrollments','spaceUses','drivers','trips','incidents','attachments','funds','allocations','expenses'])state[name]=[];
        normalizeLegacy(state);
      }
      validateState(state);
      store.setItem(STATE_KEY, JSON.stringify(state));
      return state;
    } catch (error) {
      throw new Error(`No se pudieron leer los datos de demostración. ${error.message} Puedes exportar las claves del navegador o restablecer la demo desde Acceso.`);
    }
  }

  function persist(state) {
    try {
      store.setItem(STATE_KEY, JSON.stringify(state));
    } catch {
      throw new Error('No se pudo guardar: el almacenamiento del navegador está bloqueado o lleno.');
    }
    globalThis.window?.dispatchEvent(new Event('sagp:data-changed'));
  }

  // Coordinate this provider's writes and, in supported browsers, other tabs of the same origin.
  function enqueue(commit) {
    const run = () => globalThis.window && globalThis.navigator?.locks
      ? navigator.locks.request(STATE_KEY, commit)
      : commit();
    const pending = queue.then(run);
    queue = pending.catch(() => {});
    return pending;
  }

  return {
    async getState() {
      return structuredClone(read());
    },
    execute(command) {
      return enqueue(() => {
        const {state, result} = executeCommand(read(), command, sessionGetter());
        persist(state);
        return result;
      });
    },
    reset({recovery = false} = {}) {
      return enqueue(() => {
        if (!recovery) {
          const state = read();
          const session = sessionGetter();
          const user = state.users.find(user => user.id === session?.userId && user.status === 'active');
          if (!user || (session.role || user.role) !== 'admin') {
            throw new Error('Solo el administrador puede restablecer la demostración.');
          }
        }
        const state = validateState(seedFactory());
        persist(state);
        for (const oldName of Object.keys(legacyCollections)) store.removeItem('sagp_demo_' + oldName);
        store.removeItem('sagp_current_role');
        return state;
      });
    }
  };
}
