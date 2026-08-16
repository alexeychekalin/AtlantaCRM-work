/* Client Profile Page — Карточка клиента */
const ClientProfilePage = {
  clientId: null,
  client: null,
  stats: null,
  activeTab: 'orders',

  eventTypes: {
    call: { icon: '📞', label: 'Звонок', color: '#3b82f6' },
    negotiation: { icon: '💬', label: 'Переговоры', color: '#8b5cf6' },
    price_change: { icon: '💰', label: 'Изменение цены', color: '#f59e0b' },
    deferral: { icon: '⏳', label: 'Отсрочка', color: '#f97316' },
    order: { icon: '📋', label: 'Заказ', color: '#14b8a6' },
    document: { icon: '📎', label: 'Документ', color: '#6366f1' },
    payment: { icon: '✅', label: 'Оплата', color: '#22c55e' },
    issue: { icon: '⚠️', label: 'Проблема', color: '#ef4444' },
    note: { icon: '📝', label: 'Заметка', color: '#64748b' },
  },

  async render(clientId) {
    this.clientId = clientId;
    const content = document.getElementById('content-area');
    content.innerHTML = Table.loading();

    try {
      const [clientRes, statsRes] = await Promise.all([
        API.get(`/clients/${clientId}`),
        API.get(`/clients/${clientId}/documents/stats`),
      ]);
      this.client = clientRes;
      this.stats = statsRes;
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><div class="empty-state-text">Ошибка: ${err.message}</div></div>`;
      return;
    }

    const c = this.client;
    const s = this.stats;
    const isAdmin = API.isAdmin();

    content.innerHTML = `
      <!-- Кнопка назад -->
      <button class="btn btn-secondary btn-sm mb-2" onclick="App.navigateTo('clients')" style="gap:6px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
        К списку клиентов
      </button>

      <!-- Профиль-хедер -->
      <div class="profile-header">
        <div class="profile-avatar">${(c.name || '?').charAt(0).toUpperCase()}</div>
        <div class="profile-info">
          <h2 class="profile-name">${c.name}</h2>
          <div class="profile-contacts">
            ${c.phone ? `<span class="profile-contact-item">📞 ${c.phone}</span>` : ''}
            ${c.email ? `<span class="profile-contact-item">✉️ ${c.email}</span>` : ''}
            ${c.address ? `<span class="profile-contact-item">📍 ${c.address}</span>` : ''}
          </div>
        </div>
        ${isAdmin ? `<button class="btn btn-secondary btn-sm" onclick="ClientProfilePage.editClient()">✏️ Редактировать</button>` : ''}
      </div>

      <!-- KPI -->
      <div class="profile-kpi">
        <div class="kpi-card">
          <div class="kpi-value">${s.total_orders}</div>
          <div class="kpi-label">Заказов</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${Table.formatMoney(s.total_amount)}</div>
          <div class="kpi-label">Общая сумма</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${Table.formatMoney(s.total_commission)}</div>
          <div class="kpi-label">Комиссия</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${s.drawings_count}</div>
          <div class="kpi-label">Чертежей</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${s.timeline_count}</div>
          <div class="kpi-label">Событий</div>
        </div>
      </div>

      <!-- Табы -->
      <div class="tabs-header" style="margin-top:24px">
        <button class="tab-btn active" data-tab="orders" onclick="ClientProfilePage.switchTab('orders')">Заказы</button>
        <button class="tab-btn" data-tab="drawings" onclick="ClientProfilePage.switchTab('drawings')">Чертежи</button>
        <button class="tab-btn" data-tab="calculations" onclick="ClientProfilePage.switchTab('calculations')">Расчёты</button>
        <button class="tab-btn" data-tab="timeline" onclick="ClientProfilePage.switchTab('timeline')">Таймлайн</button>
        <button class="tab-btn" data-tab="documents" onclick="ClientProfilePage.switchTab('documents')">Документы</button>
      </div>

      <div id="profile-tab-content"></div>
    `;

    this.switchTab('orders');
  },

  switchTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    const container = document.getElementById('profile-tab-content');
    container.innerHTML = Table.loading();

    switch (tab) {
      case 'orders': this.loadOrders(container); break;
      case 'drawings': this.loadDrawings(container); break;
      case 'calculations': this.loadCalculations(container); break;
      case 'timeline': this.loadTimeline(container); break;
      case 'documents': this.loadDocuments(container); break;
    }
  },

  // =================== ЗАКАЗЫ ===================
  async loadOrders(container) {
    try {
      const res = await API.get(`/orders?client_id=${this.clientId}&limit=100`);
      const orders = res.data;
      if (orders.length === 0) { container.innerHTML = Table.emptyState('Нет заказов'); return; }

      container.innerHTML = `
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>Номер</th><th>Дата</th><th>Статус</th><th class="text-right">Сумма</th><th class="text-right">Комиссия</th><th class="text-right">Итого</th></tr></thead>
            <tbody>
              ${orders.map(o => `
                <tr>
                  <td><strong>${o.order_number}</strong></td>
                  <td>${new Date(o.order_date).toLocaleDateString('ru-RU')}</td>
                  <td>${Table.statusBadge(o.status)}</td>
                  <td class="text-right">${Table.formatMoney(o.subtotal)}</td>
                  <td class="text-right">${Table.formatMoney(o.commission_amount)}</td>
                  <td class="text-right" style="font-weight:600">${Table.formatMoney(o.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) { container.innerHTML = `<div class="empty-state"><div class="empty-state-text">${err.message}</div></div>`; }
  },

  // =================== ЧЕРТЕЖИ ===================
  async loadDrawings(container) {
    const isAdmin = API.isAdmin();
    try {
      const res = await API.get(`/clients/${this.clientId}/documents/drawings`);
      const drawings = res.data;

      container.innerHTML = `
        ${isAdmin ? `
          <div class="toolbar">
            <div></div>
            <button class="btn btn-primary btn-sm" onclick="ClientProfilePage.uploadDrawing()">📎 Загрузить чертёж</button>
          </div>
        ` : ''}
        ${drawings.length === 0 ? Table.emptyState('Нет чертежей') : `
          <div class="file-grid">
            ${drawings.map(d => `
              <div class="file-card">
                <div class="file-icon">${this.getFileIcon(d.file_type)}</div>
                <div class="file-info">
                  <div class="file-name">${d.name}</div>
                  ${d.description ? `<div class="file-desc">${d.description}</div>` : ''}
                  <div class="file-meta">${new Date(d.created_at).toLocaleDateString('ru-RU')} · ${d.uploaded_by_name || ''}</div>
                </div>
                <div class="file-actions">
                  <a href="${d.file_path}" target="_blank" class="btn btn-secondary btn-sm">Открыть</a>
                  ${isAdmin ? `<button class="btn btn-icon btn-sm btn-danger" onclick="ClientProfilePage.deleteDrawing(${d.id})">✕</button>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      `;
    } catch (err) { container.innerHTML = `<div class="empty-state"><div class="empty-state-text">${err.message}</div></div>`; }
  },

  // =================== РАСЧЁТЫ ===================
  async loadCalculations(container) {
    try {
      const res = await API.get(`/clients/${this.clientId}/documents/calculations`);
      const calcs = res.data;
      if (calcs.length === 0) { container.innerHTML = Table.emptyState('Нет расчётов из калькулятора'); return; }

      container.innerHTML = `
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>Шаблон</th><th>Компонентов</th><th class="text-right">Базовая стоимость</th><th>Дата</th><th>Автор</th></tr></thead>
            <tbody>
              ${calcs.map(c => `
                <tr>
                  <td>
                    <strong>${c.name}</strong>
                    ${c.file_path ? `<a href="${c.file_path}" target="_blank" style="font-size:0.8rem;color:var(--accent-teal);margin-left:8px">📎</a>` : ''}
                  </td>
                  <td>${c.components_count} шт.</td>
                  <td class="text-right" style="font-weight:600">${Table.formatMoney(c.base_cost)}</td>
                  <td>${new Date(c.created_at).toLocaleDateString('ru-RU')}</td>
                  <td>${c.author_name || '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) { container.innerHTML = `<div class="empty-state"><div class="empty-state-text">${err.message}</div></div>`; }
  },

  // =================== ТАЙМЛАЙН ===================
  async loadTimeline(container) {
    const isAdmin = API.isAdmin();
    try {
      const res = await API.get(`/clients/${this.clientId}/timeline`);
      const events = res.data;

      container.innerHTML = `
        ${isAdmin ? `
          <div class="toolbar">
            <div></div>
            <button class="btn btn-primary btn-sm" onclick="ClientProfilePage.openTimelineModal()">+ Добавить событие</button>
          </div>
        ` : ''}
        ${events.length === 0 ? Table.emptyState('Нет событий') : `
          <div class="timeline">
            ${events.map(e => {
              const type = this.eventTypes[e.event_type] || this.eventTypes.note;
              return `
                <div class="timeline-item">
                  <div class="timeline-marker" style="background:${type.color}">${type.icon}</div>
                  <div class="timeline-content">
                    <div class="timeline-header">
                      <span class="timeline-title">${e.title}</span>
                      <span class="timeline-date">${new Date(e.event_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      ${isAdmin ? `
                        <div class="timeline-actions">
                          <button class="btn btn-icon btn-sm" onclick="ClientProfilePage.openTimelineModal(${e.id})" title="Ред.">✏️</button>
                          <button class="btn btn-icon btn-sm btn-danger" onclick="ClientProfilePage.deleteTimelineEvent(${e.id})" title="Удалить">✕</button>
                        </div>
                      ` : ''}
                    </div>
                    <div class="timeline-badge" style="background:${type.color}20;color:${type.color}">${type.label}</div>
                    ${e.description ? `<div class="timeline-desc">${e.description}</div>` : ''}
                    ${e.author_name ? `<div class="timeline-author">${e.author_name}</div>` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      `;
    } catch (err) { container.innerHTML = `<div class="empty-state"><div class="empty-state-text">${err.message}</div></div>`; }
  },

  // =================== ДОКУМЕНТЫ ===================
  async loadDocuments(container) {
    const isAdmin = API.isAdmin();
    try {
      const res = await API.get(`/clients/${this.clientId}/documents`);
      const docs = res.data;

      container.innerHTML = `
        ${isAdmin ? `
          <div class="toolbar">
            <div></div>
            <button class="btn btn-primary btn-sm" onclick="ClientProfilePage.uploadDocument()">📎 Загрузить документ</button>
          </div>
        ` : ''}
        ${docs.length === 0 ? Table.emptyState('Нет документов') : `
          <div class="file-grid">
            ${docs.map(d => `
              <div class="file-card">
                <div class="file-icon">${this.getFileIcon(d.file_type)}</div>
                <div class="file-info">
                  <div class="file-name">${d.name}</div>
                  ${d.description ? `<div class="file-desc">${d.description}</div>` : ''}
                  <div class="file-meta">${new Date(d.created_at).toLocaleDateString('ru-RU')} · ${d.uploaded_by_name || ''}</div>
                </div>
                <div class="file-actions">
                  <a href="${d.file_path}" target="_blank" class="btn btn-secondary btn-sm">Открыть</a>
                  ${isAdmin ? `<button class="btn btn-icon btn-sm btn-danger" onclick="ClientProfilePage.deleteDocument(${d.id})">✕</button>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      `;
    } catch (err) { container.innerHTML = `<div class="empty-state"><div class="empty-state-text">${err.message}</div></div>`; }
  },

  // =================== МОДАЛКИ ===================

  // Редактирование клиента
  async editClient() {
    const c = this.client;
    Modal.open({
      title: 'Редактировать клиента',
      body: `
        <div class="form-group"><label>Название *</label><input type="text" class="form-control" id="prof-name" value="${c.name}" required></div>
        <div class="form-row">
          <div class="form-group"><label>Телефон</label><input type="text" class="form-control" id="prof-phone" value="${c.phone || ''}"></div>
          <div class="form-group"><label>Email</label><input type="email" class="form-control" id="prof-email" value="${c.email || ''}"></div>
        </div>
        <div class="form-group"><label>Адрес</label><input type="text" class="form-control" id="prof-address" value="${c.address || ''}"></div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close()">Отмена</button>
        <button class="btn btn-primary" onclick="ClientProfilePage.saveClient()">Сохранить</button>
      `,
    });
  },

  async saveClient() {
    const data = {
      name: document.getElementById('prof-name').value.trim(),
      phone: document.getElementById('prof-phone').value.trim(),
      email: document.getElementById('prof-email').value.trim(),
      address: document.getElementById('prof-address').value.trim(),
    };
    if (!data.name) { Toast.error('Укажите название'); return; }
    try {
      await API.put(`/clients/${this.clientId}`, data);
      Toast.success('Клиент обновлён');
      Modal.close();
      this.render(this.clientId);
    } catch (err) { Toast.error(err.message); }
  },

  // Таймлайн — добавить/редактировать событие
  async openTimelineModal(eventId = null) {
    let event = null;
    if (eventId) {
      try {
        const res = await API.get(`/clients/${this.clientId}/timeline`);
        event = res.data.find(e => e.id === eventId);
      } catch (e) {}
    }
    const isEdit = !!event;

    const typeOptions = Object.entries(this.eventTypes).map(([key, val]) =>
      `<option value="${key}" ${isEdit && event.event_type === key ? 'selected' : ''}>${val.icon} ${val.label}</option>`
    ).join('');

    Modal.open({
      title: isEdit ? 'Редактировать событие' : 'Новое событие',
      body: `
        <div class="form-row">
          <div class="form-group">
            <label>Тип события</label>
            <select class="form-control" id="tl-type">${typeOptions}</select>
          </div>
          <div class="form-group">
            <label>Дата</label>
            <input type="date" class="form-control" id="tl-date" value="${isEdit ? new Date(event.event_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}">
          </div>
        </div>
        <div class="form-group"><label>Заголовок *</label><input type="text" class="form-control" id="tl-title" value="${isEdit ? event.title : ''}" required></div>
        <div class="form-group"><label>Описание</label><textarea class="form-control" id="tl-desc" rows="3">${isEdit ? (event.description || '') : ''}</textarea></div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close()">Отмена</button>
        <button class="btn btn-primary" onclick="ClientProfilePage.saveTimelineEvent(${isEdit ? event.id : 'null'})">${isEdit ? 'Сохранить' : 'Добавить'}</button>
      `,
    });
  },

  async saveTimelineEvent(eventId) {
    const data = {
      event_type: document.getElementById('tl-type').value,
      title: document.getElementById('tl-title').value.trim(),
      description: document.getElementById('tl-desc').value.trim(),
      event_date: document.getElementById('tl-date').value,
    };
    if (!data.title) { Toast.error('Укажите заголовок'); return; }
    try {
      if (eventId) { await API.put(`/clients/${this.clientId}/timeline/${eventId}`, data); }
      else { await API.post(`/clients/${this.clientId}/timeline`, data); }
      Toast.success(eventId ? 'Событие обновлено' : 'Событие добавлено');
      Modal.close();
      this.switchTab('timeline');
    } catch (err) { Toast.error(err.message); }
  },

  async deleteTimelineEvent(eventId) {
    if (!confirm('Удалить событие?')) return;
    try {
      await API.del(`/clients/${this.clientId}/timeline/${eventId}`);
      Toast.success('Удалено');
      this.switchTab('timeline');
    } catch (err) { Toast.error(err.message); }
  },

  // Загрузка чертежа
  uploadDrawing() {
    this._uploadFile('Загрузить чертёж', 'drawing', async (fileRes, name, desc) => {
      await API.post(`/clients/${this.clientId}/documents/drawings`, {
        name, file_path: fileRes.path, file_type: fileRes.file_type || fileRes.path.split('.').pop(), description: desc,
      });
      Toast.success('Чертёж загружен');
      Modal.close();
      this.switchTab('drawings');
    });
  },

  // Загрузка документа
  uploadDocument() {
    this._uploadFile('Загрузить документ', 'drawing', async (fileRes, name, desc) => {
      await API.post(`/clients/${this.clientId}/documents`, {
        name, file_path: fileRes.path, file_type: fileRes.file_type || fileRes.path.split('.').pop(), description: desc,
      });
      Toast.success('Документ загружен');
      Modal.close();
      this.switchTab('documents');
    });
  },

  _uploadFile(title, uploadType, onSave) {
    Modal.open({
      title,
      body: `
        <div class="form-group"><label>Название *</label><input type="text" class="form-control" id="upload-name"></div>
        <div class="form-group"><label>Описание</label><input type="text" class="form-control" id="upload-desc"></div>
        <div class="form-group">
          <label>Файл *</label>
          <div class="upload-zone" id="upload-file-zone" style="padding:20px;text-align:center">
            <div id="upload-file-status" style="color:var(--text-muted)">📎 Нажмите для выбора файла</div>
            <input type="file" id="upload-file-input" style="display:none">
          </div>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close()">Отмена</button>
        <button class="btn btn-primary" id="upload-save-btn" disabled>Загрузить</button>
      `,
    });

    let uploadedFile = null;
    const zone = document.getElementById('upload-file-zone');
    const input = document.getElementById('upload-file-input');
    const status = document.getElementById('upload-file-status');

    zone.addEventListener('click', () => input.click());
    input.addEventListener('change', async (e) => {
      if (!e.target.files[0]) return;
      status.textContent = '⏳ Загрузка...';
      try {
        const formData = new FormData();
        formData.append('file', e.target.files[0]);
        uploadedFile = await API.upload(`/upload/${uploadType}`, formData);
        status.textContent = `✅ ${uploadedFile.originalname}`;
        document.getElementById('upload-save-btn').disabled = false;
        if (!document.getElementById('upload-name').value) {
          document.getElementById('upload-name').value = e.target.files[0].name.replace(/\.[^.]+$/, '');
        }
      } catch (err) {
        status.textContent = '❌ Ошибка загрузки';
        Toast.error(err.message);
      }
    });

    document.getElementById('upload-save-btn').addEventListener('click', async () => {
      const name = document.getElementById('upload-name').value.trim();
      if (!name) { Toast.error('Укажите название'); return; }
      if (!uploadedFile) { Toast.error('Выберите файл'); return; }
      try { await onSave(uploadedFile, name, document.getElementById('upload-desc').value.trim()); }
      catch (err) { Toast.error(err.message); }
    });
  },

  async deleteDrawing(id) {
    if (!confirm('Удалить чертёж?')) return;
    try { await API.del(`/clients/${this.clientId}/documents/drawings/${id}`); Toast.success('Удалено'); this.switchTab('drawings'); }
    catch (err) { Toast.error(err.message); }
  },

  async deleteDocument(id) {
    if (!confirm('Удалить документ?')) return;
    try { await API.del(`/clients/${this.clientId}/documents/${id}`); Toast.success('Удалено'); this.switchTab('documents'); }
    catch (err) { Toast.error(err.message); }
  },

  getFileIcon(type) {
    const icons = { pdf: '📄', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', webp: '🖼️', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊' };
    return icons[type] || '📁';
  },
};
