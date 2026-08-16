/* Calculator Page — Калькулятор чертежей */
const CalculatorPage = {
  principals: [],
  clients: [],
  categories: [],
  components: [],
  drawings: [],
  bomItems: [],
  drawingFile: null,

  async render() {
    const content = document.getElementById('content-area');

    // Загрузить справочники
    const [principalsRes, clientsRes, catRes, compRes, drawRes] = await Promise.all([
      API.get('/principals'),
      API.get('/clients?limit=1000'),
      API.get('/component-categories'),
      API.get('/components?active=true'),
      API.get('/drawings'),
    ]);
    this.principals = principalsRes.data;
    this.clients = clientsRes.data;
    this.categories = catRes.data;
    this.components = compRes.data;
    this.drawings = drawRes.data;
    this.bomItems = [];
    this.drawingFile = null;

    content.innerHTML = `
      <div class="calc-layout">
        <!-- Левая колонка -->
        <div class="calc-left">
          <!-- Чертёж -->
          <div class="card mb-2">
            <div class="card-header">
              <div class="card-title">📐 Чертёж</div>
              ${this.drawings.length > 0 ? `
                <select class="filter-select" id="calc-template" style="width:auto" onchange="CalculatorPage.loadTemplate(this.value)">
                  <option value="">Загрузить шаблон...</option>
                  ${this.drawings.map(d => `<option value="${d.id}">${d.name} (${d.components_count} комп.)</option>`).join('')}
                </select>
              ` : ''}
            </div>
            <div class="upload-zone" id="calc-drawing-zone" style="min-height:100px">
              <div id="calc-drawing-preview">
                <div style="padding:20px;text-align:center;color:var(--text-muted)">
                  <div style="font-size:2rem;margin-bottom:8px">📎</div>
                  Перетащите чертёж (PDF/изображение) или нажмите для выбора
                </div>
              </div>
              <input type="file" id="calc-drawing-input" accept=".pdf,.jpg,.jpeg,.png,.webp,.tiff" style="display:none">
            </div>
            <input type="hidden" id="calc-drawing-path" value="">
            <input type="hidden" id="calc-drawing-type" value="">
          </div>

          <!-- Контрагент -->
          <div class="card mb-2">
            <div class="card-header"><div class="card-title">👤 Контрагент</div></div>
            <div class="form-row" style="padding:0">
              <div class="form-group">
                <label>Клиент</label>
                <select class="form-control" id="calc-client">
                  <option value="">Не выбран</option>
                  ${this.clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label>Принципал</label>
                <select class="form-control" id="calc-principal">
                  ${this.principals.map(p => `<option value="${p.id}" data-comm="${p.agent_commission_pct}">${p.name} (${p.agent_commission_pct}%)</option>`).join('')}
                </select>
              </div>
            </div>
          </div>

          <!-- BOM — Компоненты -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">🔩 Компоненты (BOM)</div>
              <button class="btn btn-primary btn-sm" onclick="CalculatorPage.openAddComponentModal()">+ Добавить</button>
            </div>
            <div id="calc-bom-list">
              ${Table.emptyState('Добавьте компоненты из каталога')}
            </div>
          </div>
        </div>

        <!-- Правая колонка — Расчёт -->
        <div class="calc-right">
          <div class="calc-summary-card">
            <h3 style="font-size:1.05rem;margin-bottom:16px;color:var(--text-secondary)">Расчёт стоимости</h3>
            <div id="calc-totals">
              <div class="calc-summary-row">
                <span class="label">Сумма компонентов</span>
                <span class="value" id="calc-base">0,00 ₽</span>
              </div>
              <div class="calc-summary-row">
                <span class="label">Наценки позиций</span>
                <span class="value" id="calc-item-markup">+0,00 ₽</span>
              </div>
              <div class="calc-summary-row" style="border-top:1px solid var(--border);padding-top:8px;margin-top:8px">
                <span class="label">Подитог</span>
                <span class="value" id="calc-subtotal" style="font-weight:600">0,00 ₽</span>
              </div>
            </div>

            <div style="margin-top:16px">
              <label style="font-size:0.85rem;color:var(--text-secondary);display:block;margin-bottom:6px">Общая наценка</label>
              <div class="form-row" style="gap:8px">
                <div class="form-group" style="margin-bottom:0">
                  <div style="display:flex;align-items:center;gap:4px">
                    <input type="number" class="form-control" id="calc-markup-pct" value="0" min="0" step="0.1" style="width:80px" onchange="CalculatorPage.recalc()">
                    <span style="color:var(--text-muted)">%</span>
                  </div>
                </div>
                <div class="form-group" style="margin-bottom:0">
                  <div style="display:flex;align-items:center;gap:4px">
                    <input type="number" class="form-control" id="calc-markup-rub" value="0" min="0" step="1" style="width:100px" onchange="CalculatorPage.recalc()">
                    <span style="color:var(--text-muted)">₽</span>
                  </div>
                </div>
              </div>
            </div>

            <div id="calc-final" style="margin-top:16px;padding-top:12px;border-top:2px solid var(--accent-teal)">
              <div class="calc-summary-row total">
                <span class="label">ИТОГО</span>
                <span class="value" id="calc-total" style="font-size:1.3rem">0,00 ₽</span>
              </div>
            </div>

            <div style="margin-top:20px;display:flex;flex-direction:column;gap:8px">
              ${API.isAdmin() ? `
                <button class="btn btn-primary btn-full" onclick="CalculatorPage.saveAsDrawing()">💾 Сохранить как шаблон</button>
                <button class="btn btn-secondary btn-full" onclick="CalculatorPage.saveAsOrder()">📋 Сохранить как заказ</button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;

    // Drawing upload events
    const zone = document.getElementById('calc-drawing-zone');
    const input = document.getElementById('calc-drawing-input');
    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('drag-over'); if (e.dataTransfer.files[0]) this.uploadDrawing(e.dataTransfer.files[0]); });
    input.addEventListener('change', (e) => { if (e.target.files[0]) this.uploadDrawing(e.target.files[0]); });
  },

  // === Загрузка чертежа ===
  async uploadDrawing(file) {
    const preview = document.getElementById('calc-drawing-preview');
    preview.innerHTML = '<div style="padding:20px;text-align:center">⏳ Загрузка...</div>';
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await API.upload('/upload/drawing', formData);
      document.getElementById('calc-drawing-path').value = res.path;
      document.getElementById('calc-drawing-type').value = res.file_type;
      this.drawingFile = res;

      if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(res.file_type)) {
        preview.innerHTML = `<img src="${res.path}" style="max-height:200px;border-radius:8px;display:block;margin:8px auto">`;
      } else {
        preview.innerHTML = `
          <div style="padding:16px;text-align:center">
            <div style="font-size:2rem;margin-bottom:8px">📄</div>
            <div style="color:var(--text-primary)">${res.originalname}</div>
            <a href="${res.path}" target="_blank" style="color:var(--accent-teal);font-size:0.85rem">Открыть PDF →</a>
          </div>`;
      }
      Toast.success('Чертёж загружен');
    } catch (err) {
      preview.innerHTML = '<div style="padding:20px;text-align:center;color:var(--error)">Ошибка загрузки</div>';
      Toast.error(err.message);
    }
  },

  // === Загрузка шаблона ===
  async loadTemplate(drawingId) {
    if (!drawingId) return;
    try {
      const drawing = await API.get(`/drawings/${drawingId}`);
      this.bomItems = (drawing.components || []).map(c => ({
        component_id: c.component_id,
        article: c.article,
        name: c.component_name,
        category_name: c.category_name,
        price: parseFloat(c.price),
        image_path: c.image_path,
        quantity: parseFloat(c.quantity),
        item_markup_pct: parseFloat(c.item_markup_pct),
        item_markup_rub: parseFloat(c.item_markup_rub),
      }));

      if (drawing.file_path) {
        document.getElementById('calc-drawing-path').value = drawing.file_path;
        document.getElementById('calc-drawing-type').value = drawing.file_type || '';
        const preview = document.getElementById('calc-drawing-preview');
        if (['jpg', 'jpeg', 'png', 'webp'].includes(drawing.file_type)) {
          preview.innerHTML = `<img src="${drawing.file_path}" style="max-height:200px;border-radius:8px;display:block;margin:8px auto">`;
        } else if (drawing.file_type === 'pdf') {
          preview.innerHTML = `<div style="padding:16px;text-align:center"><div style="font-size:2rem">📄</div><a href="${drawing.file_path}" target="_blank" style="color:var(--accent-teal)">Открыть PDF →</a></div>`;
        }
      }

      this.renderBom();
      this.recalc();
      Toast.success(`Шаблон «${drawing.name}» загружен`);
    } catch (err) { Toast.error(err.message); }
  },

  // === BOM — добавление компонента ===
  openAddComponentModal() {
    let filterCat = '';
    let filterSearch = '';

    const renderList = () => {
      let filtered = this.components;
      if (filterCat) filtered = filtered.filter(c => c.category_id == filterCat);
      if (filterSearch) {
        const s = filterSearch.toLowerCase();
        filtered = filtered.filter(c => c.article.toLowerCase().includes(s) || c.name.toLowerCase().includes(s));
      }

      return filtered.length > 0 ? `
        <div class="table-wrapper" style="max-height:300px;overflow-y:auto">
          <table class="data-table">
            <thead><tr><th></th><th>Артикул</th><th>Название</th><th>Категория</th><th class="text-right">Цена</th><th></th></tr></thead>
            <tbody>
              ${filtered.map(c => {
                const already = this.bomItems.some(b => b.component_id === c.id);
                return `
                  <tr style="${already ? 'opacity:0.5' : ''}">
                    <td>${c.image_path ? `<img src="${c.image_path}" style="width:32px;height:32px;object-fit:cover;border-radius:4px">` : '📦'}</td>
                    <td class="font-mono" style="color:var(--accent-teal)">${c.article}</td>
                    <td>${c.name}</td>
                    <td><span class="badge badge-in_progress" style="font-size:0.7rem">${c.category_name || '—'}</span></td>
                    <td class="text-right">${Table.formatMoney(c.price)}</td>
                    <td>${already ? '✓' : `<button class="btn btn-primary btn-sm" onclick="CalculatorPage.addComponent(${c.id})">+</button>`}</td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : Table.emptyState('Компоненты не найдены');
    };

    Modal.open({
      title: 'Добавить компонент',
      wide: true,
      body: `
        <div class="form-row mb-2">
          <div class="form-group" style="margin-bottom:0">
            <input type="text" class="form-control" id="add-comp-search" placeholder="Поиск по артикулу/названию...">
          </div>
          <div class="form-group" style="margin-bottom:0">
            <select class="form-control" id="add-comp-category">
              <option value="">Все категории</option>
              ${this.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div id="add-comp-list">${renderList()}</div>
      `,
      footer: '<button class="btn btn-secondary" onclick="Modal.close()">Закрыть</button>',
    });

    document.getElementById('add-comp-search').addEventListener('input', (e) => {
      filterSearch = e.target.value;
      document.getElementById('add-comp-list').innerHTML = renderList();
    });
    document.getElementById('add-comp-category').addEventListener('change', (e) => {
      filterCat = e.target.value;
      document.getElementById('add-comp-list').innerHTML = renderList();
    });
  },

  addComponent(compId) {
    const comp = this.components.find(c => c.id === compId);
    if (!comp || this.bomItems.some(b => b.component_id === compId)) return;

    this.bomItems.push({
      component_id: comp.id,
      article: comp.article,
      name: comp.name,
      category_name: comp.category_name,
      price: parseFloat(comp.price),
      image_path: comp.image_path,
      quantity: 1,
      item_markup_pct: 0,
      item_markup_rub: 0,
    });

    Modal.close();
    this.renderBom();
    this.recalc();
    Toast.success(`${comp.name} добавлен`);
  },

  removeComponent(idx) {
    this.bomItems.splice(idx, 1);
    this.renderBom();
    this.recalc();
  },

  renderBom() {
    const container = document.getElementById('calc-bom-list');
    if (this.bomItems.length === 0) {
      container.innerHTML = Table.emptyState('Добавьте компоненты из каталога');
      return;
    }

    container.innerHTML = `
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Компонент</th>
              <th style="width:70px">Кол-во</th>
              <th style="width:100px" class="text-right">Цена</th>
              <th style="width:70px">+%</th>
              <th style="width:80px">+₽</th>
              <th style="width:110px" class="text-right">Итого</th>
              <th style="width:40px"></th>
            </tr>
          </thead>
          <tbody>
            ${this.bomItems.map((item, i) => {
              const base = item.price * item.quantity;
              const mPct = base * (item.item_markup_pct || 0) / 100;
              const mRub = item.item_markup_rub || 0;
              const lineTotal = base + mPct + mRub;
              return `
                <tr>
                  <td>${item.image_path ? `<img src="${item.image_path}" style="width:28px;height:28px;object-fit:cover;border-radius:4px">` : '📦'}</td>
                  <td>
                    <div style="font-weight:600;font-size:0.85rem">${item.name}</div>
                    <div style="font-size:0.75rem;color:var(--accent-teal)" class="font-mono">${item.article}</div>
                  </td>
                  <td><input type="number" class="form-control" value="${item.quantity}" min="0.001" step="1" style="font-size:0.8rem;padding:4px 6px" onchange="CalculatorPage.updateBomItem(${i},'quantity',this.value)"></td>
                  <td class="text-right" style="font-size:0.85rem">${Table.formatMoney(item.price)}</td>
                  <td><input type="number" class="form-control" value="${item.item_markup_pct}" min="0" step="0.1" style="font-size:0.8rem;padding:4px 6px" onchange="CalculatorPage.updateBomItem(${i},'item_markup_pct',this.value)"></td>
                  <td><input type="number" class="form-control" value="${item.item_markup_rub}" min="0" step="1" style="font-size:0.8rem;padding:4px 6px" onchange="CalculatorPage.updateBomItem(${i},'item_markup_rub',this.value)"></td>
                  <td class="text-right" style="font-weight:600;font-size:0.85rem">${Table.formatMoney(lineTotal)}</td>
                  <td><button class="btn btn-icon btn-sm btn-danger" onclick="CalculatorPage.removeComponent(${i})">✕</button></td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  updateBomItem(idx, field, value) {
    this.bomItems[idx][field] = parseFloat(value) || 0;
    this.renderBom();
    this.recalc();
  },

  // === Пересчёт ===
  recalc() {
    let baseTotal = 0;
    let itemMarkupTotal = 0;

    this.bomItems.forEach(item => {
      const base = item.price * item.quantity;
      const mPct = base * (item.item_markup_pct || 0) / 100;
      const mRub = item.item_markup_rub || 0;
      baseTotal += base;
      itemMarkupTotal += mPct + mRub;
    });

    const subtotal = baseTotal + itemMarkupTotal;
    const totalMarkupPct = parseFloat(document.getElementById('calc-markup-pct')?.value) || 0;
    const totalMarkupRub = parseFloat(document.getElementById('calc-markup-rub')?.value) || 0;
    const totalMarkup = subtotal * totalMarkupPct / 100 + totalMarkupRub;
    const total = subtotal + totalMarkup;

    document.getElementById('calc-base').textContent = Table.formatMoney(baseTotal);
    document.getElementById('calc-item-markup').textContent = '+' + Table.formatMoney(itemMarkupTotal);
    document.getElementById('calc-subtotal').textContent = Table.formatMoney(subtotal);
    document.getElementById('calc-total').textContent = Table.formatMoney(total);
  },

  // === Сохранить как шаблон чертежа ===
  async saveAsDrawing() {
    if (this.bomItems.length === 0) { Toast.error('Добавьте хотя бы один компонент'); return; }

    const defaultName = 'Чертёж ' + new Date().toLocaleDateString('ru-RU');
    const name = prompt('Название шаблона чертежа:', defaultName);
    if (!name) return;

    try {
      await API.post('/drawings', {
        name,
        file_path: document.getElementById('calc-drawing-path').value || null,
        file_type: document.getElementById('calc-drawing-type').value || null,
        description: '',
        components: this.bomItems.map(item => ({
          component_id: item.component_id,
          quantity: item.quantity,
          item_markup_pct: item.item_markup_pct,
          item_markup_rub: item.item_markup_rub,
        })),
      });
      Toast.success('Шаблон чертежа сохранён!');
      // Обновить список шаблонов
      const drawRes = await API.get('/drawings');
      this.drawings = drawRes.data;
    } catch (err) { Toast.error(err.message); }
  },

  // === Сохранить как заказ ===
  async saveAsOrder() {
    const client_id = document.getElementById('calc-client').value;
    const principal_id = document.getElementById('calc-principal').value;
    if (!client_id) { Toast.error('Выберите клиента'); return; }
    if (this.bomItems.length === 0) { Toast.error('Добавьте компоненты'); return; }

    const totalMarkupPct = parseFloat(document.getElementById('calc-markup-pct')?.value) || 0;
    const totalMarkupRub = parseFloat(document.getElementById('calc-markup-rub')?.value) || 0;

    // Собираем позиции заказа из BOM
    const items = this.bomItems.map(item => {
      const base = item.price * item.quantity;
      const mPct = base * (item.item_markup_pct || 0) / 100;
      const mRub = item.item_markup_rub || 0;
      const unitPrice = (base + mPct + mRub) / item.quantity;
      return {
        product_id: null,
        product_name: `${item.name} (${item.article})`,
        unit_price: unitPrice,
        quantity: item.quantity,
      };
    });

    // Если есть общая наценка — добавить как отдельную позицию
    let subtotal = 0;
    this.bomItems.forEach(item => {
      const base = item.price * item.quantity;
      subtotal += base + base * (item.item_markup_pct || 0) / 100 + (item.item_markup_rub || 0);
    });
    const totalMarkup = subtotal * totalMarkupPct / 100 + totalMarkupRub;
    if (totalMarkup > 0) {
      items.push({
        product_id: null,
        product_name: `Наценка (${totalMarkupPct}% + ${totalMarkupRub}₽)`,
        unit_price: totalMarkup,
        quantity: 1,
      });
    }

    try {
      await API.post('/orders', {
        client_id,
        principal_id,
        order_date: new Date().toISOString().split('T')[0],
        status: 'new',
        comment: 'Создан из калькулятора чертежей',
        items,
      });
      Toast.success('Заказ создан из калькулятора!');
      App.navigateTo('orders');
    } catch (err) { Toast.error(err.message); }
  },
};
