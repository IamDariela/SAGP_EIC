/** Provider selection. Screens never access localStorage, mocks or SQL directly. */
import {createApiProvider} from './data/api.js';
import {createLocalProvider, SESSION_KEY} from './data/local.js';

export async function createService(config, store) {
  if (config.dataMode === 'api') return createApiProvider(config.baseUrl);
  if (config.dataMode !== 'demo') throw new Error('Modo de datos desconocido.');
  store ??= globalThis.localStorage;
  const {createDemoState, normalizeDemo} = await import('../../data/mock/index.js');
  return createLocalProvider(store, createDemoState, normalizeDemo, () => JSON.parse(store.getItem(SESSION_KEY) || 'null'));
}
