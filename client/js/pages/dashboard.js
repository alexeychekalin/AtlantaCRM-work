/* Dashboard Page */
const DashboardPage = {
  async render() {
    const content = document.getElementById('content-area');
    content.innerHTML = Table.loading();

    try {
      const data = await API.get('/dashboard');
      const kpi = data.kpi;

      content.innerHTML = `
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Всего заказов</div>
            <div class="kpi-value">${kpi.total_orders}</div>
            <div class="kpi-sub">Активных: ${parseInt(kpi.new_orders) + parseInt(kpi.in_progress_orders)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Общая сумма</div>
            <div class="kpi-value">${Table.formatMoney(kpi.total_amount)}</div>
            <div class="kpi-sub">Без комиссии: ${Table.formatMoney(kpi.total_subtotal)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Комиссия агента</div>
            <div class="kpi-value">${Table.formatMoney(kpi.total_commission)}</div>
            <div class="kpi-sub">Заработано агентом</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Клиенты</div>
            <div class="kpi-value">${kpi.total_clients}</div>
            <div class="kpi-sub">Всего в базе</div>
          </div>
        </div>

        <div class="charts-grid">
          <div class="card">
            <div class="card-header">
              <div class="card-title">Заказы по месяцам</div>
            </div>
            <div class="chart-container">
              <canvas id="chart-monthly"></canvas>
            </div>
          </div>
          <div class="card">
            <div class="card-header">
              <div class="card-title">Статусы заказов</div>
            </div>
            <div class="chart-container">
              <canvas id="chart-statuses"></canvas>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">Последние заказы</div>
          </div>
          ${data.recent_orders.length > 0 ? `
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>№ заказа</th>
                    <th>Дата</th>
                    <th>Клиент</th>
                    <th>Статус</th>
                    <th class="text-right">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.recent_orders.map(o => `
                    <tr style="cursor:pointer" onclick="App.navigateTo('orders')">
                      <td class="font-mono">${o.order_number}</td>
                      <td>${Table.formatDate(o.order_date)}</td>
                      <td>${o.client_name || '—'}</td>
                      <td>${Table.statusBadge(o.status)}</td>
                      <td class="text-right">${Table.formatMoney(o.total)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : Table.emptyState('Нет заказов')}
        </div>
      `;

      // Рисуем графики
      if (data.monthly.length > 0) {
        Charts.drawBarChart('chart-monthly', data.monthly.map(m => ({
          label: m.month_label || m.month,
          value: parseFloat(m.amount),
        })));
      }

      const statusData = [
        { key: 'new', label: 'Новые', value: parseInt(kpi.new_orders) },
        { key: 'in_progress', label: 'В работе', value: parseInt(kpi.in_progress_orders) },
        { key: 'paid', label: 'Оплачены', value: parseInt(kpi.paid_orders) },
        { key: 'completed', label: 'Выполнены', value: parseInt(kpi.completed_orders) },
        { key: 'cancelled', label: 'Отменены', value: parseInt(kpi.cancelled_orders) },
      ].filter(d => d.value > 0);

      if (statusData.length > 0) {
        Charts.drawDonutChart('chart-statuses', statusData);
      }

    } catch (err) {
      content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">${err.message}</div></div>`;
    }
  },
};
