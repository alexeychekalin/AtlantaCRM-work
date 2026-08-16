const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard
router.get('/', auth, async (req, res) => {
  try {
    // KPI: общие показатели
    const kpiQuery = `
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(subtotal), 0) as total_subtotal,
        COALESCE(SUM(commission_amount), 0) as total_commission,
        COALESCE(SUM(total), 0) as total_amount,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_orders,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_orders,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_orders,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
      FROM orders
    `;

    // Количество клиентов
    const clientsQuery = 'SELECT COUNT(*) as total_clients FROM clients';

    // Заказы по месяцам (последние 12 месяцев)
    const monthlyQuery = `
      SELECT
        TO_CHAR(order_date, 'YYYY-MM') as month,
        TO_CHAR(order_date, 'Mon YYYY') as month_label,
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as amount
      FROM orders
      WHERE order_date >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(order_date, 'YYYY-MM'), TO_CHAR(order_date, 'Mon YYYY')
      ORDER BY month
    `;

    // Последние 5 заказов
    const recentQuery = `
      SELECT o.id, o.order_number, o.order_date, o.status, o.total,
             c.name as client_name
      FROM orders o
      LEFT JOIN clients c ON o.client_id = c.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `;

    const [kpiResult, clientsResult, monthlyResult, recentResult] = await Promise.all([
      db.query(kpiQuery),
      db.query(clientsQuery),
      db.query(monthlyQuery),
      db.query(recentQuery),
    ]);

    res.json({
      kpi: {
        ...kpiResult.rows[0],
        total_clients: clientsResult.rows[0].total_clients,
      },
      monthly: monthlyResult.rows,
      recent_orders: recentResult.rows,
    });
  } catch (err) {
    console.error('Ошибка получения дашборда:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
