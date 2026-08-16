const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/role');

const router = express.Router();

// GET /api/drawings — список чертежей
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT d.*,
        u.full_name AS author_name,
        COUNT(dc.id) AS components_count,
        COALESCE(SUM(comp.price * dc.quantity), 0) AS base_cost
      FROM drawings d
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN drawing_components dc ON d.id = dc.drawing_id
      LEFT JOIN components comp ON dc.component_id = comp.id
      GROUP BY d.id, u.full_name
      ORDER BY d.created_at DESC
    `);
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/drawings/:id — детали чертежа с BOM
router.get('/:id', auth, async (req, res) => {
  try {
    const drawingRes = await db.query(
      `SELECT d.*, u.full_name AS author_name
       FROM drawings d
       LEFT JOIN users u ON d.created_by = u.id
       WHERE d.id = $1`,
      [req.params.id]
    );
    if (drawingRes.rows.length === 0) return res.status(404).json({ error: 'Чертёж не найден' });

    const drawing = drawingRes.rows[0];

    // BOM — компоненты чертежа
    const bomRes = await db.query(`
      SELECT dc.*, c.article, c.name AS component_name, c.price, c.image_path,
             cc.name AS category_name
      FROM drawing_components dc
      JOIN components c ON dc.component_id = c.id
      LEFT JOIN component_categories cc ON c.category_id = cc.id
      WHERE dc.drawing_id = $1
      ORDER BY cc.sort_order, c.name
    `, [req.params.id]);

    drawing.components = bomRes.rows;
    res.json(drawing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/drawings — создать чертёж с компонентами
router.post('/', auth, adminOnly, async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { name, file_path, file_type, description, components, client_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Укажите название чертежа' });

    const drawingRes = await client.query(
      `INSERT INTO drawings (name, file_path, file_type, description, created_by, client_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, file_path || null, file_type || null, description || null, req.user.id, client_id || null]
    );
    const drawing = drawingRes.rows[0];

    // Добавить компоненты
    if (components && components.length > 0) {
      for (const comp of components) {
        await client.query(
          `INSERT INTO drawing_components (drawing_id, component_id, quantity, item_markup_pct, item_markup_rub)
           VALUES ($1, $2, $3, $4, $5)`,
          [drawing.id, comp.component_id, comp.quantity || 1, comp.item_markup_pct || 0, comp.item_markup_rub || 0]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(drawing);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/drawings/:id — обновить чертёж
router.put('/:id', auth, adminOnly, async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { name, file_path, file_type, description, components, client_id } = req.body;

    const drawingRes = await client.query(
      `UPDATE drawings SET
        name = COALESCE($1, name),
        file_path = COALESCE($2, file_path),
        file_type = COALESCE($3, file_type),
        description = $4,
        client_id = $5
       WHERE id = $6
       RETURNING *`,
      [name, file_path, file_type, description, client_id || null, req.params.id]
    );
    if (drawingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Чертёж не найден' });
    }

    // Пересоздать BOM если переданы компоненты
    if (components !== undefined) {
      await client.query('DELETE FROM drawing_components WHERE drawing_id = $1', [req.params.id]);
      if (components && components.length > 0) {
        for (const comp of components) {
          await client.query(
            `INSERT INTO drawing_components (drawing_id, component_id, quantity, item_markup_pct, item_markup_rub)
             VALUES ($1, $2, $3, $4, $5)`,
            [req.params.id, comp.component_id, comp.quantity || 1, comp.item_markup_pct || 0, comp.item_markup_rub || 0]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json(drawingRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/drawings/:id
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM drawings WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/drawings/:id/calculate — расчёт стоимости
router.post('/:id/calculate', auth, async (req, res) => {
  try {
    const { total_markup_pct, total_markup_rub } = req.body;

    const bomRes = await db.query(`
      SELECT dc.*, c.price, c.name AS component_name, c.article
      FROM drawing_components dc
      JOIN components c ON dc.component_id = c.id
      WHERE dc.drawing_id = $1
    `, [req.params.id]);

    let subtotal = 0;
    const lines = bomRes.rows.map(item => {
      const base = parseFloat(item.price) * parseFloat(item.quantity);
      const markupPct = base * (parseFloat(item.item_markup_pct) || 0) / 100;
      const markupRub = parseFloat(item.item_markup_rub) || 0;
      const lineTotal = base + markupPct + markupRub;
      subtotal += lineTotal;

      return {
        component_name: item.component_name,
        article: item.article,
        price: parseFloat(item.price),
        quantity: parseFloat(item.quantity),
        base,
        item_markup_pct: parseFloat(item.item_markup_pct),
        item_markup_rub: parseFloat(item.item_markup_rub),
        markup_amount: markupPct + markupRub,
        line_total: lineTotal,
      };
    });

    const tMarkupPct = subtotal * (parseFloat(total_markup_pct) || 0) / 100;
    const tMarkupRub = parseFloat(total_markup_rub) || 0;
    const total = subtotal + tMarkupPct + tMarkupRub;

    res.json({
      lines,
      subtotal,
      total_markup_pct: parseFloat(total_markup_pct) || 0,
      total_markup_rub: tMarkupRub,
      total_markup_amount: tMarkupPct + tMarkupRub,
      total,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
