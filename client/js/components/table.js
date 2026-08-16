/* Table — компонент таблицы (утилиты) */
const Table = {
  statusLabels: {
    'new': 'Новый',
    'in_progress': 'В работе',
    'paid': 'Оплачен',
    'completed': 'Выполнен',
    'cancelled': 'Отменён',
  },

  statusBadge(status) {
    const label = this.statusLabels[status] || status;
    return `<span class="badge badge-${status}">${label}</span>`;
  },

  formatMoney(amount) {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  },

  formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ru-RU');
  },

  formatDateTime(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('ru-RU');
  },

  emptyState(text = 'Нет данных') {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-text">${text}</div>
      </div>
    `;
  },

  loading() {
    return `<div class="loading-spinner"><div class="spinner"></div></div>`;
  },

  actionBtn(icon, title, onclick, className = '') {
    return `<button class="btn btn-icon btn-sm ${className}" title="${title}" onclick="${onclick}">${icon}</button>`;
  },

  editIcon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,

  deleteIcon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,

  viewIcon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
};
