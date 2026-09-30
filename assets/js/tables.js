/**
 * Filtrado y búsqueda genérica de tablas en Vanilla JS
 */

function setupTableSearch(searchInputId, tableId) {
  const input = document.getElementById(searchInputId);
  const table = document.getElementById(tableId);

  if (!input || !table) return;

  input.addEventListener('keyup', () => {
    const filter = input.value.toLowerCase().trim();
    const rows = table.querySelectorAll('tbody tr');

    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      if (text.includes(filter)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  });
}
