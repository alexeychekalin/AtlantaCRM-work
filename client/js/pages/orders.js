/* Orders Page — расширенная версия */
const OrdersPage = {
  filters: { status: '', client_id: '', search: '', page: 1, groupBy: '' },
  clients: [],
  principals: [],
  products: [],
  searchTimeout: null,

  async render() {
    const content = document.getElementById('content-area');
    const isAdmin = API.isAdmin();

    // Загрузить справочники
    const [clientsRes, principalsRes, productsRes] = await Promise.all([
      API.get('/clients?limit=1000'),
      API.get('/principals'),
      API.get('/products?active=true'),
    ]);
    this.clients = clientsRes.data;
    this.principals = principalsRes.data;
    this.products = productsRes.data;

    content.innerHTML = `
      <div class="toolbar">
        <div class="search-input">
          <input type="text" id="orders-search" placeholder="Поиск по номеру или клиенту..." value="${this.filters.search}">
        </div>
        <div class="filter-group">
          <select class="filter-select" id="orders-status-filter">
            <option value="">Все статусы</option>
            <option value="new" ${this.filters.status === 'new' ? 'selected' : ''}>Новый</option>
            <option value="in_progress" ${this.filters.status === 'in_progress' ? 'selected' : ''}>В работе</option>
            <option value="paid" ${this.filters.status === 'paid' ? 'selected' : ''}>Оплачен</option>
            <option value="completed" ${this.filters.status === 'completed' ? 'selected' : ''}>Выполнен</option>
            <option value="cancelled" ${this.filters.status === 'cancelled' ? 'selected' : ''}>Отменён</option>
          </select>
          <select class="filter-select" id="orders-client-filter">
            <option value="">Все клиенты</option>
            ${this.clients.map(c => `<option value="${c.id}" ${this.filters.client_id == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
          <select class="filter-select" id="orders-group-filter">
            <option value="">Без группировки</option>
            <option value="client" ${this.filters.groupBy === 'client' ? 'selected' : ''}>По клиенту</option>
          </select>
        </div>
        ${isAdmin ? '<button class="btn btn-primary" onclick="OrdersPage.openCreateModal()">+ Новый заказ</button>' : ''}
      </div>
      <div id="orders-table-container">${Table.loading()}</div>
    `;

    document.getElementById('orders-search').addEventListener('input', (e) => {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.filters.search = e.target.value;
        this.filters.page = 1;
        this.loadOrders();
      }, 300);
    });

    document.getElementById('orders-status-filter').addEventListener('change', (e) => {
      this.filters.status = e.target.value;
      this.filters.page = 1;
      this.loadOrders();
    });

    document.getElementById('orders-client-filter').addEventListener('change', (e) => {
      this.filters.client_id = e.target.value;
      this.filters.page = 1;
      this.loadOrders();
    });

    document.getElementById('orders-group-filter').addEventListener('change', (e) => {
      this.filters.groupBy = e.target.value;
      this.loadOrders();
    });

    this.loadOrders();
  },

  async loadOrders() {
    const container = document.getElementById('orders-table-container');
    const isAdmin = API.isAdmin();

    try {
      const params = new URLSearchParams();
      if (this.filters.status) params.set('status', this.filters.status);
      if (this.filters.client_id) params.set('client_id', this.filters.client_id);
      if (this.filters.search) params.set('search', this.filters.search);
      params.set('page', this.filters.page);
      params.set('limit', 200);

      const res = await API.get('/orders?' + params.toString());
      const orders = res.data;

      if (orders.length === 0) {
        container.innerHTML = Table.emptyState('Нет заказов');
        return;
      }

      // Группировка
      if (this.filters.groupBy === 'client') {
        container.innerHTML = this._renderGroupedByClient(orders, isAdmin);
      } else {
        container.innerHTML = this._renderFlatTable(orders, res.total, isAdmin);
      }
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">${err.message}</div></div>`;
    }
  },

  _renderFlatTable(orders, total, isAdmin) {
    return `
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>№ заказа</th>
              <th>Дата</th>
              <th>Клиент</th>
              <th>Принципал</th>
              <th>Статус</th>
              <th class="text-right">Сумма</th>
              <th class="text-right">Комиссия</th>
              <th class="text-right">Итого</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(o => `
              <tr>
                <td class="font-mono">${o.order_number}</td>
                <td>${Table.formatDate(o.order_date)}</td>
                <td><a href="#" onclick="App.navigateTo('client-profile',${o.client_id});return false" class="client-link">${o.client_name || '—'}</a></td>
                <td>${o.principal_name || '—'}</td>
                <td>${Table.statusBadge(o.status)}</td>
                <td class="text-right">${Table.formatMoney(o.subtotal)}</td>
                <td class="text-right">${Table.formatMoney(o.commission_amount)}</td>
                <td class="text-right" style="font-weight:600">${Table.formatMoney(o.total)}</td>
                <td>
                  <div class="table-actions">
                    ${Table.actionBtn(Table.viewIcon, 'Просмотр', `OrdersPage.viewOrder(${o.id})`)}
                    ${isAdmin ? Table.actionBtn(Table.editIcon, 'Редактировать', `OrdersPage.openEditModal(${o.id})`) : ''}
                    ${isAdmin ? Table.actionBtn(Table.deleteIcon, 'Удалить', `OrdersPage.deleteOrder(${o.id})`, 'btn-danger') : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="pagination">
        <span class="pagination-info">Показано ${orders.length} из ${total}</span>
        <div class="pagination-buttons">
          <button class="pagination-btn" ${this.filters.page <= 1 ? 'disabled' : ''} onclick="OrdersPage.changePage(${this.filters.page - 1})">← Назад</button>
          <button class="pagination-btn active">${this.filters.page}</button>
          <button class="pagination-btn" ${orders.length < 200 ? 'disabled' : ''} onclick="OrdersPage.changePage(${this.filters.page + 1})">Вперёд →</button>
        </div>
      </div>
    `;
  },

  _renderGroupedByClient(orders, isAdmin) {
    // Группируем по клиенту
    const groups = {};
    orders.forEach(o => {
      const key = o.client_id || 0;
      if (!groups[key]) groups[key] = { name: o.client_name || 'Без клиента', client_id: o.client_id, orders: [], totalAmount: 0, totalCommission: 0 };
      groups[key].orders.push(o);
      groups[key].totalAmount += parseFloat(o.total) || 0;
      groups[key].totalCommission += parseFloat(o.commission_amount) || 0;
    });

    const sorted = Object.values(groups).sort((a, b) => b.totalAmount - a.totalAmount);

    return sorted.map(group => `
      <div class="card mb-2">
        <div class="flex items-center justify-between mb-1">
          <div>
            <a href="#" onclick="App.navigateTo('client-profile',${group.client_id});return false" class="client-link" style="font-size:1.1rem"><strong>${group.name}</strong></a>
            <span style="color:var(--text-muted);font-size:0.85rem;margin-left:8px">${group.orders.length} заказ(ов)</span>
          </div>
          <div style="text-align:right">
            <div style="font-size:0.8rem;color:var(--text-muted)">Итого</div>
            <div style="font-weight:700;color:var(--accent-teal)">${Table.formatMoney(group.totalAmount)}</div>
          </div>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>№ заказа</th>
                <th>Дата</th>
                <th>Статус</th>
                <th class="text-right">Сумма</th>
                <th class="text-right">Комиссия</th>
                <th class="text-right">Итого</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              ${group.orders.map(o => `
                <tr>
                  <td class="font-mono">${o.order_number}</td>
                  <td>${Table.formatDate(o.order_date)}</td>
                  <td>${Table.statusBadge(o.status)}</td>
                  <td class="text-right">${Table.formatMoney(o.subtotal)}</td>
                  <td class="text-right">${Table.formatMoney(o.commission_amount)}</td>
                  <td class="text-right" style="font-weight:600">${Table.formatMoney(o.total)}</td>
                  <td>
                    <div class="table-actions">
                      ${Table.actionBtn(Table.viewIcon, 'Просмотр', `OrdersPage.viewOrder(${o.id})`)}
                      ${isAdmin ? Table.actionBtn(Table.editIcon, 'Ред.', `OrdersPage.openEditModal(${o.id})`) : ''}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `).join('');
  },

  changePage(page) {
    this.filters.page = page;
    this.loadOrders();
  },

  async viewOrder(id) {
    try {
      const order = await API.get(`/orders/${id}`);
      Modal.open({
        title: `Заказ ${order.order_number}`,
        wide: true,
        body: `
          <div class="grid-2 mb-2">
            <div><strong>Клиент:</strong> ${order.client_name || '—'}</div>
            <div><strong>Принципал:</strong> ${order.principal_name || '—'}</div>
            <div><strong>Дата:</strong> ${Table.formatDate(order.order_date)}</div>
            <div><strong>Статус:</strong> ${Table.statusBadge(order.status)}</div>
          </div>
          ${order.comment ? `<div class="mb-2"><strong>Комментарий:</strong> ${order.comment}</div>` : ''}
          <h4 class="mb-1" style="color:var(--text-secondary)">Позиции заказа</h4>
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr><th>Товар/услуга</th><th class="text-right">Цена</th><th class="text-right">Кол-во</th><th class="text-right">Сумма</th></tr></thead>
              <tbody>
                ${(order.items || []).map(item => `
                  <tr>
                    <td>${item.product_name}${item.is_drawing ? ' 📎' : ''}</td>
                    <td class="text-right">${Table.formatMoney(item.unit_price)}</td>
                    <td class="text-right">${item.quantity}</td>
                    <td class="text-right">${Table.formatMoney(item.line_total)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="mt-2" style="text-align:right">
            <div>Сумма без комиссии: <strong>${Table.formatMoney(order.subtotal)}</strong></div>
            <div>Комиссия (${order.commission_pct}%): <strong>${Table.formatMoney(order.commission_amount)}</strong></div>
            <div style="font-size:1.15rem;margin-top:8px">Итого: <strong style="color:var(--accent-teal)">${Table.formatMoney(order.total)}</strong></div>
          </div>
        `,
        footer: '<button class="btn btn-secondary" onclick="Modal.close()">Закрыть</button>',
      });
    } catch (err) {
      Toast.error(err.message);
    }
  },

  openCreateModal() {
    this._openOrderModal(null);
  },

  async openEditModal(id) {
    try {
      const order = await API.get(`/orders/${id}`);
      this._openOrderModal(order);
    } catch (err) {
      Toast.error(err.message);
    }
  },

  _clientDrawings: [],

  _openOrderModal(order) {
    const isEdit = !!order;
    const title = isEdit ? `Редактировать ${order.order_number}` : 'Новый заказ';
    const items = isEdit && order.items ? order.items : [{ product_id: '', product_name: '', unit_price: 0, quantity: 1 }];

    // Принципал по умолчанию — Атланта (ищем по имени)
    const defaultPrincipal = this.principals.find(p => p.name.toLowerCase().includes('атланта'));
    const defaultPrincipalId = isEdit ? order.principal_id : (defaultPrincipal ? defaultPrincipal.id : '');

    this._clientDrawings = [];

    Modal.open({
      title,
      wide: true,
      body: `
        <form id="order-form">
          <div class="form-row">
            <div class="form-group">
              <label>Клиент *</label>
              <select class="form-control" id="order-client" required>
                <option value="">Выберите клиента</option>
                ${this.clients.map(c => `<option value="${c.id}" ${isEdit && order.client_id == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Принципал *</label>
              <select class="form-control" id="order-principal" required>
                <option value="">Выберите принципала</option>
                ${this.principals.map(p => `<option value="${p.id}" data-comm="${p.agent_commission_pct}" ${p.id == defaultPrincipalId ? 'selected' : ''}>${p.name} (${p.agent_commission_pct}%)</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Дата заказа</label>
              <input type="date" class="form-control" id="order-date" value="${isEdit ? order.order_date.split('T')[0] : new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
              <label>Статус</label>
              <select class="form-control" id="order-status">
                <option value="new" ${isEdit && order.status === 'new' ? 'selected' : ''}>Новый</option>
                <option value="in_progress" ${isEdit && order.status === 'in_progress' ? 'selected' : ''}>В работе</option>
                <option value="paid" ${isEdit && order.status === 'paid' ? 'selected' : ''}>Оплачен</option>
                <option value="completed" ${isEdit && order.status === 'completed' ? 'selected' : ''}>Выполнен</option>
                <option value="cancelled" ${isEdit && order.status === 'cancelled' ? 'selected' : ''}>Отменён</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Комментарий</label>
            <textarea class="form-control" id="order-comment" rows="2">${isEdit ? (order.comment || '') : ''}</textarea>
          </div>

          <h4 class="mb-1 mt-2" style="color:var(--text-secondary)">Позиции заказа</h4>
          <div id="order-items-list">
            ${items.map((item, i) => this._renderItemRow(item, i)).join('')}
          </div>

          <div class="flex gap-1 mt-1" style="flex-wrap:wrap">
            <button type="button" class="btn btn-secondary btn-sm" onclick="OrdersPage.addItemRow()">+ Товар из каталога</button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-add-drawing" style="display:none" onclick="OrdersPage.openDrawingPicker()">📎 Добавить чертёж</button>
          </div>

          <div class="mt-2" id="order-totals" style="text-align:right; font-size:0.95rem;"></div>
        </form>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close()">Отмена</button>
        <button class="btn btn-primary" onclick="OrdersPage.saveOrder(${isEdit ? order.id : 'null'})">${isEdit ? 'Сохранить' : 'Создать'}</button>
      `,
    });

    // Bind events
    document.getElementById('order-principal').addEventListener('change', () => this.recalcTotals());
    document.getElementById('order-client').addEventListener('change', () => this._onClientChange());

    // Если клиент уже выбран (редактирование), загрузить чертежи
    if (isEdit && order.client_id) {
      this._onClientChange();
    }

    this.recalcTotals();
  },

  async _onClientChange() {
    const clientId = document.getElementById('order-client').value;
    const drawingBtn = document.getElementById('btn-add-drawing');

    if (!clientId) {
      this._clientDrawings = [];
      if (drawingBtn) drawingBtn.style.display = 'none';
      return;
    }

    // Загрузить чертежи клиента из калькулятора
    try {
      const res = await API.get(`/clients/${clientId}/documents/calculations`);
      this._clientDrawings = res.data || [];
      if (drawingBtn) drawingBtn.style.display = this._clientDrawings.length > 0 ? '' : 'none';
    } catch (e) {
      this._clientDrawings = [];
      if (drawingBtn) drawingBtn.style.display = 'none';
    }
  },

  openDrawingPicker() {
    if (this._clientDrawings.length === 0) {
      Toast.error('У клиента нет рассчитанных чертежей');
      return;
    }

    // Показать список чертежей для добавления
    const list = this._clientDrawings.map(d => `
      <div class="file-card" style="cursor:pointer" onclick="OrdersPage.addDrawingItem(${d.id})">
        <div class="file-icon">📎</div>
        <div class="file-info">
          <div class="file-name">${d.name}</div>
          <div class="file-desc">${d.components_count} компонентов · Базовая стоимость: ${Table.formatMoney(d.base_cost)}</div>
          <div class="file-meta">${new Date(d.created_at).toLocaleDateString('ru-RU')}</div>
        </div>
      </div>
    `).join('');

    // Используем вложенный контейнер поверх текущей модалки
    const overlay = document.createElement('div');
    overlay.id = 'drawing-picker-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:16px;max-width:500px;width:100%;max-height:80vh;overflow-y:auto;padding:24px;">
        <div class="flex items-center justify-between mb-2">
          <h3 style="color:var(--text-primary)">Выберите чертёж</h3>
          <button class="btn btn-icon btn-sm" onclick="document.getElementById('drawing-picker-overlay').remove()">✕</button>
        </div>
        <div class="file-grid" style="grid-template-columns:1fr">${list}</div>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  addDrawingItem(drawingId) {
    const drawing = this._clientDrawings.find(d => d.id === drawingId);
    if (!drawing) return;

    // Удалить overlay пикера
    const overlay = document.getElementById('drawing-picker-overlay');
    if (overlay) overlay.remove();

    // Добавить как позицию заказа
    const container = document.getElementById('order-items-list');
    const idx = container.children.length;
    container.insertAdjacentHTML('beforeend', this._renderDrawingItemRow(drawing, idx));
    this.recalcTotals();
    Toast.success(`Чертёж «${drawing.name}» добавлен`);
  },

  _renderDrawingItemRow(drawing, index) {
    return `
      <div class="form-row mb-1" data-item-row="${index}" style="grid-template-columns: 2fr 1fr 80px auto; align-items:end;">
        <div class="form-group" style="margin-bottom:0">
          ${index === 0 ? '<label>Товар/услуга</label>' : ''}
          <div class="form-control" style="display:flex;align-items:center;gap:8px;background:var(--bg-tertiary);border-color:var(--accent-teal)33">
            📎 <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${drawing.name}</span>
            <span style="font-size:0.75rem;color:var(--text-muted)">${drawing.components_count} комп.</span>
          </div>
          <input type="hidden" class="item-product" value="drawing_${drawing.id}">
          <input type="hidden" class="item-name" value="Чертёж: ${drawing.name}">
          <input type="hidden" class="item-is-drawing" value="1">
        </div>
        <div class="form-group" style="margin-bottom:0">
          ${index === 0 ? '<label>Цена</label>' : ''}
          <input type="number" class="form-control item-price" value="${parseFloat(drawing.base_cost) || 0}" min="0" step="0.01" onchange="OrdersPage.recalcTotals()">
        </div>
        <div class="form-group" style="margin-bottom:0">
          ${index === 0 ? '<label>Кол-во</label>' : ''}
          <input type="number" class="form-control item-qty" value="1" min="1" step="1" onchange="OrdersPage.recalcTotals()">
        </div>
        <div style="padding-bottom:2px;">
          <button type="button" class="btn btn-icon btn-sm btn-danger" onclick="OrdersPage.removeItemRow(${index})" title="Удалить">✕</button>
        </div>
      </div>
    `;
  },

  _itemIndex: 0,

  _renderItemRow(item, index) {
    const idx = index !== undefined ? index : this._itemIndex++;
    return `
      <div class="form-row mb-1" data-item-row="${idx}" style="grid-template-columns: 2fr 1fr 80px auto; align-items:end;">
        <div class="form-group" style="margin-bottom:0">
          ${idx === 0 ? '<label>Товар/услуга</label>' : ''}
          <select class="form-control item-product" onchange="OrdersPage.onProductSelect(this, ${idx})">
            <option value="">Выбрать из каталога...</option>
            ${this.products.map(p => `<option value="${p.id}" data-price="${p.base_price}" data-name="${p.name}" ${item.product_id == p.id ? 'selected' : ''}>${p.name} (${Table.formatMoney(p.base_price)})</option>`).join('')}
            <option value="custom" ${item.product_id === null && item.product_name ? 'selected' : ''}>Другое...</option>
          </select>
          <input type="text" class="form-control item-name mt-1 ${item.product_id !== null && !item.product_name ? 'hidden' : ''}" placeholder="Название" value="${item.product_name || ''}" style="${item.product_id ? 'display:none' : ''}">
        </div>
        <div class="form-group" style="margin-bottom:0">
          ${idx === 0 ? '<label>Цена</label>' : ''}
          <input type="number" class="form-control item-price" value="${item.unit_price || 0}" min="0" step="0.01" onchange="OrdersPage.recalcTotals()">
        </div>
        <div class="form-group" style="margin-bottom:0">
          ${idx === 0 ? '<label>Кол-во</label>' : ''}
          <input type="number" class="form-control item-qty" value="${item.quantity || 1}" min="0.001" step="1" onchange="OrdersPage.recalcTotals()">
        </div>
        <div style="padding-bottom:2px;">
          <button type="button" class="btn btn-icon btn-sm btn-danger" onclick="OrdersPage.removeItemRow(${idx})" title="Удалить">✕</button>
        </div>
      </div>
    `;
  },

  addItemRow() {
    const container = document.getElementById('order-items-list');
    const idx = container.children.length;
    container.insertAdjacentHTML('beforeend', this._renderItemRow({ product_id: '', product_name: '', unit_price: 0, quantity: 1 }, idx));
  },

  removeItemRow(idx) {
    const row = document.querySelector(`[data-item-row="${idx}"]`);
    if (row) {
      row.remove();
      this.recalcTotals();
    }
  },

  onProductSelect(selectEl, idx) {
    const option = selectEl.selectedOptions[0];
    const row = selectEl.closest('[data-item-row]');
    const priceInput = row.querySelector('.item-price');
    const nameInput = row.querySelector('.item-name');

    if (option.value && option.value !== 'custom') {
      priceInput.value = option.dataset.price || 0;
      nameInput.style.display = 'none';
      nameInput.value = option.dataset.name || '';
    } else if (option.value === 'custom') {
      nameInput.style.display = '';
      nameInput.value = '';
      nameInput.focus();
    } else {
      nameInput.style.display = 'none';
    }
    this.recalcTotals();
  },

  recalcTotals() {
    const rows = document.querySelectorAll('[data-item-row]');
    let subtotal = 0;

    rows.forEach(row => {
      const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
      const qty = parseFloat(row.querySelector('.item-qty')?.value) || 0;
      subtotal += price * qty;
    });

    const principalSelect = document.getElementById('order-principal');
    const selectedOption = principalSelect?.selectedOptions[0];
    const commPct = parseFloat(selectedOption?.dataset?.comm) || 0;
    const commission = subtotal * commPct / 100;
    const total = subtotal + commission;

    const totalsEl = document.getElementById('order-totals');
    if (totalsEl) {
      totalsEl.innerHTML = `
        <div>Сумма: <strong>${Table.formatMoney(subtotal)}</strong></div>
        <div>Комиссия (${commPct}%): <strong>${Table.formatMoney(commission)}</strong></div>
        <div style="font-size:1.1rem;margin-top:4px;">Итого: <strong style="color:var(--accent-teal)">${Table.formatMoney(total)}</strong></div>
      `;
    }
  },

  async saveOrder(id) {
    const client_id = document.getElementById('order-client').value;
    const principal_id = document.getElementById('order-principal').value;
    const order_date = document.getElementById('order-date').value;
    const status = document.getElementById('order-status').value;
    const comment = document.getElementById('order-comment').value;

    if (!client_id || !principal_id) {
      Toast.error('Выберите клиента и принципала');
      return;
    }

    const rows = document.querySelectorAll('[data-item-row]');
    const items = [];
    rows.forEach(row => {
      const productInput = row.querySelector('.item-product');
      const nameInput = row.querySelector('.item-name');
      const priceInput = row.querySelector('.item-price');
      const qtyInput = row.querySelector('.item-qty');
      const isDrawing = row.querySelector('.item-is-drawing');

      let product_id = null;
      let product_name = '';

      if (productInput.tagName === 'SELECT') {
        product_id = productInput.value && productInput.value !== 'custom' ? productInput.value : null;
        product_name = product_id ? productInput.selectedOptions[0].dataset.name : nameInput.value;
      } else {
        // Hidden input for drawings
        product_name = nameInput.value;
      }

      if (product_name && parseFloat(priceInput.value) > 0) {
        items.push({
          product_id,
          product_name,
          unit_price: parseFloat(priceInput.value),
          quantity: parseFloat(qtyInput.value) || 1,
          is_drawing: isDrawing ? true : false,
        });
      }
    });

    if (items.length === 0) {
      Toast.error('Добавьте хотя бы одну позицию');
      return;
    }

    try {
      if (id) {
        await API.put(`/orders/${id}`, { client_id, principal_id, order_date, status, comment, items });
        Toast.success('Заказ обновлён');
      } else {
        await API.post('/orders', { client_id, principal_id, order_date, status, comment, items });
        Toast.success('Заказ создан');
      }
      Modal.close();
      this.loadOrders();
    } catch (err) {
      Toast.error(err.message);
    }
  },

  async deleteOrder(id) {
    if (!confirm('Удалить этот заказ?')) return;
    try {
      await API.del(`/orders/${id}`);
      Toast.success('Заказ удалён');
      this.loadOrders();
    } catch (err) {
      Toast.error(err.message);
    }
  },
};
