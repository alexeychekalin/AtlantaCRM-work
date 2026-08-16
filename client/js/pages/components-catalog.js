/* Components Catalog Page — Каталог компонентов */
const ComponentsCatalogPage = {
  activeTab: 'components',
  categories: [],
  searchTimeout: null,

  async render() {
    const content = document.getElementById('content-area');
    const isAdmin = API.isAdmin();

    content.innerHTML = `
      <div class="tabs-header">
        <button class="tab-btn active" data-tab="components" onclick="ComponentsCatalogPage.switchTab('components')">Компоненты</button>
        <button class="tab-btn" data-tab="categories" onclick="ComponentsCatalogPage.switchTab('categories')">Категории</button>
      </div>
      <div id="tab-components" class="tab-content active">
        <div class="toolbar">
          <div class="search-input">
            <input type="text" id="comp-search" placeholder="Поиск по артикулу или названию...">
          </div>
          <div class="filter-group">
            <select class="filter-select" id="comp-category-filter">
              <option value="">Все категории</option>
            </select>
          </div>
          ${isAdmin ? '<button class="btn btn-primary" onclick="ComponentsCatalogPage.openComponentModal()">+ Новый компонент</button>' : ''}
        </div>
        <div id="components-table">${Table.loading()}</div>
      </div>
      <div id="tab-categories" class="tab-content" style="display:none">
        <div class="toolbar">
          ${isAdmin ? '<button class="btn btn-primary" onclick="ComponentsCatalogPage.openCategoryModal()">+ Новая категория</button>' : ''}
        </div>
        <div id="categories-table">${Table.loading()}</div>
      </div>
    `;

    document.getElementById('comp-search').addEventListener('input', (e) => {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => this.loadComponents(), 300);
    });
    document.getElementById('comp-category-filter').addEventListener('change', () => this.loadComponents());

    await this.loadCategories();
    this.loadComponents();
  },

  switchTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.getElementById(`tab-${tab}`).style.display = '';

    if (tab === 'categories') this.loadCategoriesTable();
  },

  // === КАТЕГОРИИ ===
  async loadCategories() {
    try {
      const res = await API.get('/component-categories');
      this.categories = res.data;
      const select = document.getElementById('comp-category-filter');
      if (select) {
        const val = select.value;
        select.innerHTML = '<option value="">Все категории</option>' +
          this.categories.map(c => `<option value="${c.id}" ${val == c.id ? 'selected' : ''}>${c.name}</option>`).join('');
      }
    } catch (err) {
      console.error(err);
    }
  },

  async loadCategoriesTable() {
    const container = document.getElementById('categories-table');
    const isAdmin = API.isAdmin();
    try {
      const res = await API.get('/component-categories');
      this.categories = res.data;
      if (this.categories.length === 0) {
        container.innerHTML = Table.emptyState('Нет категорий');
        return;
      }
      container.innerHTML = `
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>Название</th><th class="text-right">Порядок</th>${isAdmin ? '<th>Действия</th>' : ''}</tr></thead>
            <tbody>
              ${this.categories.map(c => `
                <tr>
                  <td><strong>${c.name}</strong></td>
                  <td class="text-right">${c.sort_order}</td>
                  ${isAdmin ? `<td>
                    <div class="table-actions">
                      ${Table.actionBtn(Table.editIcon, 'Редактировать', `ComponentsCatalogPage.openCategoryModal(${c.id})`)}
                      ${Table.actionBtn(Table.deleteIcon, 'Удалить', `ComponentsCatalogPage.deleteCategory(${c.id})`, 'btn-danger')}
                    </div>
                  </td>` : ''}
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

  async openCategoryModal(id = null) {
    let cat = null;
    if (id) {
      cat = this.categories.find(c => c.id === id);
    }
    const isEdit = !!cat;
    Modal.open({
      title: isEdit ? 'Редактировать категорию' : 'Новая категория',
      body: `
        <div class="form-group"><label>Название *</label>
          <input type="text" class="form-control" id="cat-name" value="${isEdit ? cat.name : ''}" required></div>
        <div class="form-group"><label>Порядок сортировки</label>
          <input type="number" class="form-control" id="cat-sort" value="${isEdit ? cat.sort_order : 0}" min="0"></div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close()">Отмена</button>
        <button class="btn btn-primary" onclick="ComponentsCatalogPage.saveCategory(${isEdit ? cat.id : 'null'})">${isEdit ? 'Сохранить' : 'Создать'}</button>
      `,
    });
  },

  async saveCategory(id) {
    const data = {
      name: document.getElementById('cat-name').value.trim(),
      sort_order: parseInt(document.getElementById('cat-sort').value) || 0,
    };
    if (!data.name) { Toast.error('Введите название'); return; }
    try {
      if (id) { await API.put(`/component-categories/${id}`, data); Toast.success('Категория обновлена'); }
      else { await API.post('/component-categories', data); Toast.success('Категория создана'); }
      Modal.close();
      await this.loadCategories();
      this.loadCategoriesTable();
    } catch (err) { Toast.error(err.message); }
  },

  async deleteCategory(id) {
    if (!confirm('Удалить категорию?')) return;
    try {
      await API.del(`/component-categories/${id}`);
      Toast.success('Категория удалена');
      await this.loadCategories();
      this.loadCategoriesTable();
    } catch (err) { Toast.error(err.message); }
  },

  // === КОМПОНЕНТЫ ===
  async loadComponents() {
    const container = document.getElementById('components-table');
    const isAdmin = API.isAdmin();
    const search = document.getElementById('comp-search')?.value || '';
    const category_id = document.getElementById('comp-category-filter')?.value || '';

    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category_id) params.set('category_id', category_id);

      const res = await API.get('/components?' + params.toString());
      const comps = res.data;

      if (comps.length === 0) {
        container.innerHTML = Table.emptyState('Нет компонентов');
        return;
      }

      container.innerHTML = `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:50px"></th>
                <th>Артикул</th>
                <th>Название</th>
                <th>Категория</th>
                <th class="text-right">Цена</th>
                <th>Статус</th>
                ${isAdmin ? '<th>Действия</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${comps.map(c => `
                <tr>
                  <td>
                    ${c.image_path
                      ? `<img src="${c.image_path}" alt="" style="width:40px;height:40px;object-fit:cover;border-radius:6px;border:1px solid var(--border)">`
                      : '<div style="width:40px;height:40px;border-radius:6px;background:var(--bg-secondary);display:flex;align-items:center;justify-content:center;font-size:16px">📦</div>'}
                  </td>
                  <td class="font-mono" style="color:var(--accent-teal)">${c.article}</td>
                  <td><strong>${c.name}</strong>${c.description ? `<div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px">${c.description.substring(0, 60)}</div>` : ''}</td>
                  <td><span class="badge badge-in_progress">${c.category_name || '—'}</span></td>
                  <td class="text-right" style="font-weight:600">${Table.formatMoney(c.price)}</td>
                  <td>${c.is_active ? '<span class="badge badge-completed">Активен</span>' : '<span class="badge badge-cancelled">Неактивен</span>'}</td>
                  ${isAdmin ? `<td>
                    <div class="table-actions">
                      ${Table.actionBtn(Table.editIcon, 'Редактировать', `ComponentsCatalogPage.openComponentModal(${c.id})`)}
                      ${Table.actionBtn(Table.deleteIcon, 'Удалить', `ComponentsCatalogPage.deleteComponent(${c.id})`, 'btn-danger')}
                    </div>
                  </td>` : ''}
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

  async openComponentModal(id = null) {
    let comp = null;
    if (id) {
      try { comp = await API.get(`/components/${id}`); } catch (e) { Toast.error(e.message); return; }
    }
    const isEdit = !!comp;

    Modal.open({
      title: isEdit ? 'Редактировать компонент' : 'Новый компонент',
      wide: true,
      body: `
        <form id="comp-form">
          <div class="form-row">
            <div class="form-group">
              <label>Категория</label>
              <select class="form-control" id="comp-category">
                <option value="">Без категории</option>
                ${this.categories.map(c => `<option value="${c.id}" ${isEdit && comp.category_id == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Артикул *</label>
              <input type="text" class="form-control" id="comp-article" value="${isEdit ? comp.article : ''}" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Название *</label>
              <input type="text" class="form-control" id="comp-name" value="${isEdit ? comp.name : ''}" required>
            </div>
            <div class="form-group">
              <label>Цена (₽)</label>
              <input type="number" class="form-control" id="comp-price" value="${isEdit ? comp.price : 0}" min="0" step="0.01">
            </div>
          </div>
          <div class="form-group">
            <label>Изображение</label>
            <div class="upload-zone" id="comp-upload-zone">
              <div id="comp-image-preview">
                ${isEdit && comp.image_path
                  ? `<img src="${comp.image_path}" style="max-height:120px;border-radius:8px">`
                  : '<div style="padding:24px;text-align:center;color:var(--text-muted)">📷 Перетащите изображение или нажмите для выбора</div>'}
              </div>
              <input type="file" id="comp-image-input" accept="image/*" style="display:none">
            </div>
            <input type="hidden" id="comp-image-path" value="${isEdit && comp.image_path ? comp.image_path : ''}">
          </div>
          <div class="form-group">
            <label>Описание</label>
            <textarea class="form-control" id="comp-description" rows="2">${isEdit ? (comp.description || '') : ''}</textarea>
          </div>
          <div class="form-group">
            <label>Комментарий</label>
            <textarea class="form-control" id="comp-comment" rows="2">${isEdit ? (comp.comment || '') : ''}</textarea>
          </div>
          <div class="form-group">
            <label><input type="checkbox" id="comp-active" ${!isEdit || comp.is_active ? 'checked' : ''}> Активен</label>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close()">Отмена</button>
        <button class="btn btn-primary" onclick="ComponentsCatalogPage.saveComponent(${isEdit ? comp.id : 'null'})">${isEdit ? 'Сохранить' : 'Создать'}</button>
      `,
    });

    // Upload zone events
    const zone = document.getElementById('comp-upload-zone');
    const input = document.getElementById('comp-image-input');
    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('drag-over'); if (e.dataTransfer.files[0]) this.uploadImage(e.dataTransfer.files[0]); });
    input.addEventListener('change', (e) => { if (e.target.files[0]) this.uploadImage(e.target.files[0]); });
  },

  async uploadImage(file) {
    const preview = document.getElementById('comp-image-preview');
    preview.innerHTML = '<div style="padding:24px;text-align:center">Загрузка...</div>';
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await API.upload('/upload/image', formData);
      document.getElementById('comp-image-path').value = res.path;
      preview.innerHTML = `<img src="${res.path}" style="max-height:120px;border-radius:8px">`;
      Toast.success('Изображение загружено');
    } catch (err) {
      preview.innerHTML = '<div style="padding:24px;text-align:center;color:var(--error)">Ошибка загрузки</div>';
      Toast.error(err.message);
    }
  },

  async saveComponent(id) {
    const data = {
      category_id: document.getElementById('comp-category').value || null,
      article: document.getElementById('comp-article').value.trim(),
      name: document.getElementById('comp-name').value.trim(),
      price: parseFloat(document.getElementById('comp-price').value) || 0,
      image_path: document.getElementById('comp-image-path').value || null,
      description: document.getElementById('comp-description').value.trim(),
      comment: document.getElementById('comp-comment').value.trim(),
      is_active: document.getElementById('comp-active').checked,
    };
    if (!data.article || !data.name) { Toast.error('Заполните артикул и название'); return; }
    try {
      if (id) { await API.put(`/components/${id}`, data); Toast.success('Компонент обновлён'); }
      else { await API.post('/components', data); Toast.success('Компонент создан'); }
      Modal.close();
      this.loadComponents();
    } catch (err) { Toast.error(err.message); }
  },

  async deleteComponent(id) {
    if (!confirm('Удалить компонент?')) return;
    try {
      await API.del(`/components/${id}`);
      Toast.success('Компонент удалён');
      this.loadComponents();
    } catch (err) { Toast.error(err.message); }
  },
};
