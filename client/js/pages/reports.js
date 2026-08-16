/* Reports Page — Отчёты для принципала */
const ReportsPage = {
  async render() {
    const content = document.getElementById('content-area');

    const principalsRes = await API.get('/principals');
    const principals = principalsRes.data;

    // Default dates: last 30 days
    const today = new Date().toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    content.innerHTML = `
      <div class="report-filters">
        <div class="form-group">
          <label>Период с</label>
          <input type="date" class="form-control" id="report-from" value="${monthAgo}">
        </div>
        <div class="form-group">
          <label>Период по</label>
          <input type="date" class="form-control" id="report-to" value="${today}">
        </div>
        <div class="form-group">
          <label>Принципал</label>
          <select class="form-control" id="report-principal">
            <option value="">Все</option>
            ${principals.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-primary" onclick="ReportsPage.loadReport()">📊 Сформировать</button>
        <button class="btn btn-secondary" onclick="ReportsPage.exportExcel()">📥 Excel</button>
        <button class="btn btn-secondary" onclick="ReportsPage.exportPDF()">📄 PDF</button>
      </div>
      <div id="report-content">${Table.loading()}</div>
    `;

    this.loadReport();
  },

  getFilters() {
    return {
      date_from: document.getElementById('report-from')?.value || '',
      date_to: document.getElementById('report-to')?.value || '',
      principal_id: document.getElementById('report-principal')?.value || '',
    };
  },

  buildParams() {
    const f = this.getFilters();
    const params = new URLSearchParams();
    if (f.date_from) params.set('date_from', f.date_from);
    if (f.date_to) params.set('date_to', f.date_to);
    if (f.principal_id) params.set('principal_id', f.principal_id);
    return params.toString();
  },

  async loadReport() {
    const container = document.getElementById('report-content');
    container.innerHTML = Table.loading();

    try {
      const qs = this.buildParams();
      const [summary, byClient, byPrincipal, ordersDetail] = await Promise.all([
        API.get('/reports/summary?' + qs),
        API.get('/reports/by-client?' + qs),
        API.get('/reports/by-principal?' + qs),
        API.get('/reports/orders-detail?' + qs),
      ]);

      const s = summary.summary;

      container.innerHTML = `
        <!-- Сводные KPI -->
        <div class="kpi-grid mb-3">
          <div class="kpi-card">
            <div class="kpi-label">Всего заказов</div>
            <div class="kpi-value">${s.total_orders}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Сумма (без комиссии)</div>
            <div class="kpi-value">${Table.formatMoney(s.total_subtotal)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Комиссия агента</div>
            <div class="kpi-value">${Table.formatMoney(s.total_commission)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Итого</div>
            <div class="kpi-value">${Table.formatMoney(s.total_amount)}</div>
          </div>
        </div>

        <!-- Статусы -->
        <div class="card mb-3">
          <div class="card-header"><div class="card-title">Распределение по статусам</div></div>
          <div style="display:flex;gap:16px;flex-wrap:wrap;">
            <div class="badge badge-new" style="font-size:0.9rem;padding:8px 16px">Новые: ${s.new_count}</div>
            <div class="badge badge-in_progress" style="font-size:0.9rem;padding:8px 16px">В работе: ${s.in_progress_count}</div>
            <div class="badge badge-paid" style="font-size:0.9rem;padding:8px 16px">Оплачены: ${s.paid_count}</div>
            <div class="badge badge-completed" style="font-size:0.9rem;padding:8px 16px">Выполнены: ${s.completed_count}</div>
            <div class="badge badge-cancelled" style="font-size:0.9rem;padding:8px 16px">Отменены: ${s.cancelled_count}</div>
          </div>
        </div>

        <!-- По клиентам -->
        <div class="report-section">
          <div class="card">
            <div class="card-header"><div class="card-title">Отчёт по клиентам</div></div>
            ${byClient.data.length > 0 ? `
              <div class="table-wrapper">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Клиент</th>
                      <th class="text-right">Заказов</th>
                      <th class="text-right">Сумма</th>
                      <th class="text-right">Комиссия</th>
                      <th class="text-right">Итого</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${byClient.data.map(r => `
                      <tr>
                        <td><strong>${r.client_name || 'Не указан'}</strong></td>
                        <td class="text-right">${r.orders_count}</td>
                        <td class="text-right">${Table.formatMoney(r.total_subtotal)}</td>
                        <td class="text-right">${Table.formatMoney(r.total_commission)}</td>
                        <td class="text-right" style="font-weight:600">${Table.formatMoney(r.total_amount)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : Table.emptyState('Нет данных')}
          </div>
        </div>

        <!-- По принципалам -->
        <div class="report-section">
          <div class="card">
            <div class="card-header"><div class="card-title">Отчёт по принципалам</div></div>
            ${byPrincipal.data.length > 0 ? `
              <div class="table-wrapper">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Принципал</th>
                      <th class="text-right">% комиссии</th>
                      <th class="text-right">Заказов</th>
                      <th class="text-right">Сумма</th>
                      <th class="text-right">Комиссия</th>
                      <th class="text-right">Итого</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${byPrincipal.data.map(r => `
                      <tr>
                        <td><strong>${r.principal_name || 'Не указан'}</strong></td>
                        <td class="text-right">${r.agent_commission_pct}%</td>
                        <td class="text-right">${r.orders_count}</td>
                        <td class="text-right">${Table.formatMoney(r.total_subtotal)}</td>
                        <td class="text-right">${Table.formatMoney(r.total_commission)}</td>
                        <td class="text-right" style="font-weight:600">${Table.formatMoney(r.total_amount)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : Table.emptyState('Нет данных')}
          </div>
        </div>

        <!-- Детализация заказов -->
        <div class="report-section">
          <div class="card">
            <div class="card-header"><div class="card-title">Детализация заказов</div></div>
            ${ordersDetail.data.length > 0 ? `
              <div class="table-wrapper">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>№</th>
                      <th>Дата</th>
                      <th>Клиент</th>
                      <th>Принципал</th>
                      <th>Статус</th>
                      <th class="text-right">Сумма</th>
                      <th class="text-right">Комиссия</th>
                      <th class="text-right">Итого</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${ordersDetail.data.map(o => `
                      <tr>
                        <td class="font-mono">${o.order_number}</td>
                        <td>${Table.formatDate(o.order_date)}</td>
                        <td>${o.client_name || '—'}</td>
                        <td>${o.principal_name || '—'}</td>
                        <td>${Table.statusBadge(o.status)}</td>
                        <td class="text-right">${Table.formatMoney(o.subtotal)}</td>
                        <td class="text-right">${Table.formatMoney(o.commission_amount)}</td>
                        <td class="text-right" style="font-weight:600">${Table.formatMoney(o.total)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : Table.emptyState('Нет заказов за период')}
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-text">${err.message}</div></div>`;
    }
  },

  async exportExcel() {
    try {
      const blob = await API.getBlob('/reports/export/excel?' + this.buildParams());
      this._downloadBlob(blob, `report_${Date.now()}.xlsx`);
      Toast.success('Excel отчёт скачан');
    } catch (err) {
      Toast.error('Ошибка экспорта Excel');
    }
  },

  async exportPDF() {
    try {
      const blob = await API.getBlob('/reports/export/pdf?' + this.buildParams());
      this._downloadBlob(blob, `report_${Date.now()}.pdf`);
      Toast.success('PDF отчёт скачан');
    } catch (err) {
      Toast.error('Ошибка экспорта PDF');
    }
  },

  _downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
