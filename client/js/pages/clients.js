/* Clients Page */
const ClientsPage = {
  searchTimeout: null,

  async render() {
    const content = document.getElementById('content-area');
    const isAdmin = API.isAdmin();

    content.innerHTML = `
      <div class="toolbar">
        <div class="search-input">
          <input type="text" id="clients-search" placeholder="Поиск клиентов...">
        </div>
        ${isAdmin ? '<button class="btn btn-primary" onclick="ClientsPage.openCreateModal()">+ Новый клиент</button>' : ''}
      </div>
      <div id="clients-table-container">${Table.loading()}</div>
    `;

    document.getElementById('clients-search').addEventListener('input', (e) => {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => this.loadClients(e.target.value), 300);
    });

    this.loadClients();
  },

  async loadClients(search = '') {
    const container = document.getElementById('clients-table-container');
    const isAdmin = API.isAdmin();

    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await API.get('/clients' + params);
      const clients = res.data;

      if (clients.length === 0) {
        container.innerHTML = Table.emptyState('Нет клиентов');
        return;
      }

      container.innerHTML = `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Телефон</th>
                <th>Email</th>
                <th>Адрес</th>
                <th>Примечание</th>
                ${isAdmin ? '<th>Действия</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${clients.map(c => `
                <tr>
                  <td><a href="#" onclick="App.navigateTo('client-profile',${c.id});return false" class="client-link"><strong>${c.name}</strong></a></td>
                  <td>${c.phone || '—'}</td>
                  <td>${c.email || '—'}</td>
                  <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">${c.address || '—'}</td>
                  <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis">${c.notes || '—'}</td>
                  ${isAdmin ? `
                    <td>
                      <div class="table-actions">
                        ${Table.actionBtn('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>', 'Карточка', `App.navigateTo('client-profile',${c.id})`)}
                        ${Table.actionBtn(Table.editIcon, 'Редактировать', `ClientsPage.openEditModal(${c.id})`)}
                        ${Table.actionBtn(Table.deleteIcon, 'Удалить', `ClientsPage.deleteClient(${c.id})`, 'btn-danger')}
                      </div>
                    </td>
                  ` : ''}
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

  openCreateModal() {
    this._openModal(null);
  },

  async openEditModal(id) {
    try {
      const client = await API.get(`/clients/${id}`);
      this._openModal(client);
    } catch (err) {
      Toast.error(err.message);
    }
  },

  _openModal(client) {
    const isEdit = !!client;
    Modal.open({
      title: isEdit ? 'Редактировать клиента' : 'Новый клиент',
      body: `
        <form id="client-form">
          <div class="form-group">
            <label>Название *</label>
            <input type="text" class="form-control" id="client-name" value="${isEdit ? client.name : ''}" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Телефон</label>
              <input type="text" class="form-control" id="client-phone" value="${isEdit ? (client.phone || '') : ''}">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" class="form-control" id="client-email" value="${isEdit ? (client.email || '') : ''}">
            </div>
          </div>
          <div class="form-group">
            <label>Адрес</label>
            <input type="text" class="form-control" id="client-address" value="${isEdit ? (client.address || '') : ''}">
          </div>
          <div class="form-group">
            <label>Примечание</label>
            <textarea class="form-control" id="client-notes" rows="2">${isEdit ? (client.notes || '') : ''}</textarea>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close()">Отмена</button>
        <button class="btn btn-primary" onclick="ClientsPage.saveClient(${isEdit ? client.id : 'null'})">${isEdit ? 'Сохранить' : 'Создать'}</button>
      `,
    });
  },

  async saveClient(id) {
    const data = {
      name: document.getElementById('client-name').value.trim(),
      phone: document.getElementById('client-phone').value.trim(),
      email: document.getElementById('client-email').value.trim(),
      address: document.getElementById('client-address').value.trim(),
      notes: document.getElementById('client-notes').value.trim(),
    };

    if (!data.name) {
      Toast.error('Введите название клиента');
      return;
    }

    try {
      if (id) {
        await API.put(`/clients/${id}`, data);
        Toast.success('Клиент обновлён');
      } else {
        await API.post('/clients', data);
        Toast.success('Клиент создан');
      }
      Modal.close();
      this.loadClients();
    } catch (err) {
      Toast.error(err.message);
    }
  },

  async deleteClient(id) {
    if (!confirm('Удалить клиента?')) return;
    try {
      await API.del(`/clients/${id}`);
      Toast.success('Клиент удалён');
      this.loadClients();
    } catch (err) {
      Toast.error(err.message);
    }
  },
};
