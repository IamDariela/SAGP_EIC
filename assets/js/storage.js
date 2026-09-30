/**
 * Gestor de Almacenamiento Local y Simulación de API para SAGP
 * EIC - Honduras
 */

(function() {
  const STORAGE_KEY_PREFIX = 'sagp_demo_';
  const CURRENT_ROLE_KEY = 'sagp_current_role';

  // Inicializar colecciones de prueba si no existen
  function initStorage() {
    if (!localStorage.getItem(STORAGE_KEY_PREFIX + 'bienes') && window.MOCK_BIENES) {
      localStorage.setItem(STORAGE_KEY_PREFIX + 'bienes', JSON.stringify(window.MOCK_BIENES));
    }
    if (!localStorage.getItem(STORAGE_KEY_PREFIX + 'ubicaciones') && window.MOCK_UBICACIONES) {
      localStorage.setItem(STORAGE_KEY_PREFIX + 'ubicaciones', JSON.stringify(window.MOCK_UBICACIONES));
    }
    if (!localStorage.getItem(STORAGE_KEY_PREFIX + 'personas') && window.MOCK_PERSONAS) {
      localStorage.setItem(STORAGE_KEY_PREFIX + 'personas', JSON.stringify(window.MOCK_PERSONAS));
    }
    if (!localStorage.getItem(STORAGE_KEY_PREFIX + 'usuarios') && window.MOCK_USUARIOS) {
      localStorage.setItem(STORAGE_KEY_PREFIX + 'usuarios', JSON.stringify(window.MOCK_USUARIOS));
    }
    if (!localStorage.getItem(STORAGE_KEY_PREFIX + 'dormitorios') && window.MOCK_DORMITORIOS) {
      localStorage.setItem(STORAGE_KEY_PREFIX + 'dormitorios', JSON.stringify(window.MOCK_DORMITORIOS));
    }
    if (!localStorage.getItem(STORAGE_KEY_PREFIX + 'mantenimientos') && window.MOCK_MANTENIMIENTOS) {
      localStorage.setItem(STORAGE_KEY_PREFIX + 'mantenimientos', JSON.stringify(window.MOCK_MANTENIMIENTOS));
    }
    if (!localStorage.getItem(CURRENT_ROLE_KEY)) {
      localStorage.setItem(CURRENT_ROLE_KEY, 'admin');
    }
  }

  initStorage();

  window.SAGPStorage = {
    getCollection(name) {
      const data = localStorage.getItem(STORAGE_KEY_PREFIX + name);
      return data ? JSON.parse(data) : [];
    },

    saveCollection(name, data) {
      localStorage.setItem(STORAGE_KEY_PREFIX + name, JSON.stringify(data));
      window.dispatchEvent(new Event('sagp_storage_update'));
    },

    addItem(name, item) {
      const items = this.getCollection(name);
      item.id = item.id || 'id-' + Math.random().toString(36).substring(2, 9);
      items.push(item);
      this.saveCollection(name, items);
      return item;
    },

    updateItem(name, id, updatedFields) {
      const items = this.getCollection(name);
      const index = items.findIndex(i => i.id === id);
      if (index !== -1) {
        items[index] = { ...items[index], ...updatedFields };
        this.saveCollection(name, items);
        return items[index];
      }
      return null;
    },

    deleteItem(name, id) {
      const items = this.getCollection(name);
      const filtered = items.filter(i => i.id !== id);
      this.saveCollection(name, filtered);
    },

    getCurrentRole() {
      return localStorage.getItem(CURRENT_ROLE_KEY) || 'admin';
    },

    setCurrentRole(role) {
      localStorage.setItem(CURRENT_ROLE_KEY, role);
      window.dispatchEvent(new Event('sagp_role_change'));
    }
  };
})();
