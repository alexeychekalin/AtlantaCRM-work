/* Settings Page — Настройки */
const SettingsPage = {
  async render() {
    const content = document.getElementById('content-area');
    const isAdmin = API.isAdmin();

    if (!isAdmin) {
      content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔒</div><div class="empty-state-text">Доступ только для администраторов</div></div>`;
      return;
    }

    content.innerHTML = `
      <div class="settings-grid">
        <div>
          <div class="card">
            <div class="card-header">
              <div class="card-title">Принципалы</div>
              <button class="btn btn-primary btn-sm" onclick="SettingsPage.openPrincipalModal()">+ Добавить</button>
            </div>
            <div id="principals-list">${Table.loading()}</div>
          </div>
        </div>
        <div>
          <div class="card">
            <div class="card-header">
              <div class="card-title">Пользователи</div>
            </div>
            <div id="users-list">
              <div style="padding:16px;color:var(--text-secondary);font-size:0.9rem;">
                <p>Текущий пользователь:</p>
                <div class="mt-1">
                  <strong>${API.getUser()?.full_name || '—'}</strong><br>
                  <span class="text-muted">Логин: ${API.getUser()?.username || '—'}</span><br>
                  <span class="text-muted">Роль: ${API.getUser()?.role || '—'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.loadPrincipals();
  },

  async loadPrincipals() {
    const container = document.getElementById('principals-list');
    try {
      const res = await API.get('/principals');
      const principals = res.data;

      if (principals.length === 0) {
        container.innerHTML = Table.emptyState('Нет принципалов');
        return;
      }

      container.innerHTML = `
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>Название</th><th class="text-right">Комиссия</th><th>Действия</th></tr></thead>
            <tbody>
              ${principals.map(p => `
                <tr>
                  <td><strong>${p.name}</strong></td>
                  <td class="text-right text-accent">${p.agent_commission_pct}%</td>
                  <td>
                    <div class="table-actions">
                      ${Table.actionBtn(Table.editIcon, 'Редактировать', `SettingsPage.openPrincipalModal(${p.id})`)}
                      ${Table.actionBtn(Table.deleteIcon, 'Удалить', `SettingsPage.deletePrincipal(${p.id})`, 'btn-danger')}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-text">${err.message}</div></div>`;
    }
  },

  async openPrincipalModal(id = null) {
    let principal = null;
    if (id) {
      try {
        principal = await API.get(`/principals/${id}`);
      } catch (err) {
        Toast.error(err.message);
        return;
      }
    }

    const isEdit = !!principal;
    Modal.open({
      title: isEdit ? 'Редактировать принципала' : 'Новый принципал',
      body: `
        <form>
          <div class="form-group">
            <label>Название *</label>
            <input type="text" class="form-control" id="principal-name" value="${isEdit ? principal.name : ''}" required>
          </div>
          <div class="form-group">
            <label>Комиссия агента (%)</label>
            <input type="number" class="form-control" id="principal-comm" value="${isEdit ? principal.agent_commission_pct : 10}" min="0" max="100" step="0.1">
            <div class="form-hint">Процент, который получает агент от суммы заказа</div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Телефон</label>
              <input type="text" class="form-control" id="principal-phone" value="${isEdit ? (principal.phone || '') : ''}">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" class="form-control" id="principal-email" value="${isEdit ? (principal.email || '') : ''}">
            </div>
          </div>
          <div class="form-group">
            <label>Примечание</label>
            <textarea class="form-control" id="principal-notes" rows="2">${isEdit ? (principal.notes || '') : ''}</textarea>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close()">Отмена</button>
        <button class="btn btn-primary" onclick="SettingsPage.savePrincipal(${isEdit ? principal.id : 'null'})">${isEdit ? 'Сохранить' : 'Создать'}</button>
      `,
    });
  },

  async savePrincipal(id) {
    const data = {
      name: document.getElementById('principal-name').value.trim(),
      agent_commission_pct: parseFloat(document.getElementById('principal-comm').value) || 10,
      phone: document.getElementById('principal-phone').value.trim(),
      email: document.getElementById('principal-email').value.trim(),
      notes: document.getElementById('principal-notes').value.trim(),
    };

    if (!data.name) {
      Toast.error('Введите название принципала');
      return;
    }

    try {
      if (id) {
        await API.put(`/principals/${id}`, data);
        Toast.success('Принципал обновлён');
      } else {
        await API.post('/principals', data);
        Toast.success('Принципал создан');
      }
      Modal.close();
      this.loadPrincipals();
    } catch (err) {
      Toast.error(err.message);
    }
  },

  async deletePrincipal(id) {
    if (!confirm('Удалить принципала?')) return;
    try {
      await API.del(`/principals/${id}`);
      Toast.success('Принципал удалён');
      this.loadPrincipals();
    } catch (err) {
      Toast.error(err.message);
    }
  },
};
