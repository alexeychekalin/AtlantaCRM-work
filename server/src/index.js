require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Статические файлы клиента
app.use(express.static(path.join(__dirname, '../../client')));

// Статические файлы загрузок (изображения компонентов, чертежи)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API-маршруты
app.use('/api/auth', require('./routes/auth'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/products', require('./routes/products'));
app.use('/api/principals', require('./routes/principals'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/component-categories', require('./routes/component-categories'));
app.use('/api/components', require('./routes/comp-catalog'));
app.use('/api/drawings', require('./routes/drawings'));
app.use('/api/clients/:id/timeline', require('./routes/client-timeline'));
app.use('/api/clients/:id/documents', require('./routes/client-documents'));

// SPA fallback: всё остальное → index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/index.html'));
});

// Обработчик ошибок
app.use((err, req, res, next) => {
  console.error('Серверная ошибка:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 CRM «Атланта» запущена на http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api`);
  console.log(`   Режим: ${process.env.NODE_ENV || 'development'}\n`);
});
