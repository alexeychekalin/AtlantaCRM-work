const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/role');

const router = express.Router();

// GET /api/clients
router.get('/', auth, async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM clients';
    let countQuery = 'SELECT COUNT(*) FROM clients';
    const params = [];
    const countParams = [];

    if (search) {
      query += ' WHERE name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1';
      countQuery += ' WHERE name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1';
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const [result, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, countParams),
    ]);

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('Ошибка получения клиентов:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// GET /api/clients/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Клиент не найден' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка получения клиента:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// POST /api/clients
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Название клиента обязательно' });
    }

    const result = await db.query(
      `INSERT INTO clients (name, phone, email, address, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, phone || null, email || null, address || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка создания клиента:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// PUT /api/clients/:id
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Название клиента обязательно' });
    }

    const result = await db.query(
      `UPDATE clients SET name = $1, phone = $2, email = $3, address = $4, notes = $5
       WHERE id = $6 RETURNING *`,
      [name, phone || null, email || null, address || null, notes || null, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Клиент не найден' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка обновления клиента:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// DELETE /api/clients/:id
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM clients WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Клиент не найден' });
    }
    res.json({ message: 'Клиент удалён' });
  } catch (err) {
    console.error('Ошибка удаления клиента:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
