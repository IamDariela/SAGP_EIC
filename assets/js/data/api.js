import {validateState} from '../core/model.js';

/** Official adapter uses PHP session cookies and never falls back to demo after an error. */
export function createApiProvider(baseUrl, fetcher = fetch) {
  async function request(endpoint, options = {}) {
    let response;
    try {
      response = await fetcher(baseUrl + 'api/' + endpoint, {credentials: 'same-origin', ...options});
    } catch {
      throw new Error('No se pudo conectar con la API. No se guardaron cambios.');
    }
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error('La API no devolvió JSON válido.');
    }
    if (!response.ok || !payload.ok) throw new Error(payload.error?.message || 'La API rechazó la operación.');
    return payload.data;
  }

  async function csrfHeaders() {
    const session = await request('sesion.php');
    if (!session?.csrfToken) throw new Error('La sesión oficial no incluye el token de seguridad requerido.');
    return {'X-CSRF-Token': session.csrfToken};
  }

  return {
    async getState() {
      return validateState(await request('datos.php'));
    },
    async getSession() {
      return request('sesion.php');
    },
    async execute(command) {
      return request('acciones.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', ...await csrfHeaders()},
        body: JSON.stringify(command)
      });
    },
    async signOut() {
      return request('sesion.php', {method: 'DELETE', headers: await csrfHeaders()});
    },
    async reset() {
      throw new Error('Los datos oficiales no se pueden restablecer desde la demostración.');
    }
  };
}
