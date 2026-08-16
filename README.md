# CRM «Атланта»

CRM система «Атланта» — платформа для расчёта агентских заявок, учёта заказов и формирования отчётов для принципала.

## Структура проекта

```
├── client/          # Фронтенд (HTML, CSS, JavaScript)
│   ├── css/         # Стили
│   ├── js/          # Клиентская логика
│   ├── icons/       # Иконки приложения
│   ├── index.html   # Главная страница
│   ├── manifest.json # PWA манифест
│   ├── sw.js        # Service Worker
│   └── offline.html # Страница офлайн-режима
│
└── server/          # Бэкенд (Node.js + Express)
    ├── src/
    │   ├── db/      # Работа с базой данных
    │   ├── middleware/ # Промежуточное ПО
    │   ├── routes/  # API маршруты
    │   ├── db.js    # Подключение к БД
    │   └── index.js # Точка входа
    ├── .env         # Переменные окружения
    └── package.json # Зависимости Node.js
```

## Технологии

### Фронтенд
- HTML5, CSS3, Vanilla JavaScript
- PWA (Progressive Web App) с поддержкой офлайн-режима
- Google Fonts (Inter)

### Бэкенд
- Node.js
- Express.js
- PostgreSQL (через pg)
- JWT для аутентификации
- bcryptjs для хеширования паролей
- ExcelJS и PDFKit для экспорта данных

## Установка и запуск

### Требования
- Node.js (версия 18+)
- PostgreSQL
- npm или yarn

### Настройка базы данных

1. Создайте базу данных PostgreSQL:
```bash
createdb atlanta_crm
```

2. Настройте переменные окружения в файле `server/.env`:
```env
DATABASE_URL=postgresql://username@localhost:5432/atlanta_crm
JWT_SECRET=your-secret-key
PORT=3000
```

### Установка зависимостей

```bash
# Установка зависимостей сервера
cd server
npm install

# Инициализация базы данных
npm run db:init
```

### Запуск проекта

#### Сервер
```bash
cd server

# Режим разработки (с авто-перезагрузкой)
npm run dev

# Продакшен режим
npm start
```

#### Фронтенд
Откройте файл `client/index.html` в браузере или настройте статическую раздачу через веб-сервер.

## API

Сервер предоставляет REST API для:
- Аутентификации пользователей
- Управления заказами
- Расчёта агентских заявок
- Генерации отчётов (Excel, PDF)

## Функциональность

- 🔐 Система аутентификации с JWT
- 📊 Учёт и управление заказами
- 🧮 Расчёт агентских вознаграждений
- 📑 Экспорт данных в Excel и PDF
- 📱 PWA с поддержкой офлайн-режима
- 🎨 Современный адаптивный интерфейс

## Лицензия

Проект является собственностью компании «Атланта».

---

## Развёртывание на VDS-сервере

### 1. Подготовка сервера

Подключитесь к серверу по SSH:
```bash
ssh user@your-server-ip
```

Обновите пакеты и установите необходимое ПО:
```bash
# Для Ubuntu/Debian
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs npm postgresql nginx git curl

# Для CentOS/RHEL
sudo yum update -y
sudo yum install -y nodejs npm postgresql-server nginx git curl
```

Проверьте версии:
```bash
node --version  # Должна быть 18+
npm --version
psql --version
```

Если версия Node.js ниже 18, установите актуальную через nvm:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

### 2. Настройка PostgreSQL

Запустите и настройте PostgreSQL:
```bash
# Для Ubuntu/Debian
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Для CentOS/RHEL
sudo systemctl initdb-postgresql
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

Создайте базу данных и пользователя:
```bash
sudo -u postgres psql
```

В интерактивном режиме выполните:
```sql
CREATE DATABASE atlanta_crm;
CREATE USER crm_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE atlanta_crm TO crm_user;
\q
```

### 3. Клонирование проекта

Склонируйте репозиторий в домашнюю директорию или `/var/www`:
```bash
cd /var/www
sudo git clone <your-repository-url> atlanta-crm
sudo chown -R $USER:$USER atlanta-crm
cd atlanta-crm
```

### 4. Настройка бэкенда

Перейдите в директорию сервера и установите зависимости:
```bash
cd server
npm install --production
```

Создайте файл `.env` с параметрами для продакшена:
```bash
nano .env
```

Содержимое `.env`:
```env
DATABASE_URL=postgresql://crm_user:your_secure_password@localhost:5432/atlanta_crm
JWT_SECRET=your-very-secure-jwt-secret-key-change-this-in-production
PORT=3000
NODE_ENV=production
```

Инициализируйте базу данных:
```bash
npm run db:init
```

### 5. Настройка PM2 (Process Manager)

Установите PM2 для управления процессом Node.js:
```bash
sudo npm install -g pm2
```

Запустите приложение через PM2:
```bash
cd /var/www/atlanta-crm/server
pm2 start src/index.js --name atlanta-crm
pm2 save
pm2 startup
```

Выполните команду, которую выведет `pm2 startup` (для автозагрузки при перезагрузке сервера).

Проверьте статус:
```bash
pm2 status
pm2 logs atlanta-crm
```

### 6. Настройка Nginx

Создайте конфигурационный файл Nginx:
```bash
sudo nano /etc/nginx/sites-available/atlanta-crm
```

Добавьте конфигурацию:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Замените на ваш домен или IP

    # Фронтенд (статические файлы)
    location / {
        root /var/www/atlanta-crm/client;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Кэширование статических файлов
        location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API проксирование на бэкенд
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket поддержка (если используется)
    location /ws {
        proxy_pass http://localhost:3000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

Активируйте конфигурацию:
```bash
sudo ln -s /etc/nginx/sites-available/atlanta-crm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 7. Настройка HTTPS (рекомендуется)

Установите Certbot:
```bash
sudo apt install -y certbot python3-certbot-nginx  # Ubuntu/Debian
# или
sudo yum install -y certbot python3-certbot-nginx  # CentOS/RHEL
```

Получите SSL-сертификат:
```bash
sudo certbot --nginx -d your-domain.com
```

Certbot автоматически обновит конфигурацию Nginx и настроит редирект с HTTP на HTTPS.

### 8. Настройка файрвола

Откройте необходимые порты:
```bash
# Для UFW (Ubuntu)
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Для firewalld (CentOS)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 9. Проверка работы

1. Откройте браузер и перейдите по адресу `http://your-domain.com` или `https://your-domain.com`
2. Проверьте работу API через `https://your-domain.com/api/health` (если есть endpoint)
3. Убедитесь, что PWA работает корректно

### 10. Мониторинг и обслуживание

**Просмотр логов:**
```bash
# Логи приложения
pm2 logs atlanta-crm

# Логи Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Логи PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*.log
```

**Перезапуск сервисов:**
```bash
pm2 restart atlanta-crm
sudo systemctl restart nginx
sudo systemctl restart postgresql
```

**Обновление приложения:**
```bash
cd /var/www/atlanta-crm
git pull
cd server
npm install --production
pm2 restart atlanta-crm
```

**Резервное копирование БД:**
```bash
# Создать дамп
pg_dump -U crm_user atlanta_crm > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановить из дампа
psql -U crm_user atlanta_crm < backup_YYYYMMDD_HHMMSS.sql
```

### 11. Опционально: настройка автоматического бэкапа

Создайте скрипт для ежедневного бэкапа:
```bash
sudo nano /usr/local/bin/backup-atlanta.sh
```

Содержимое скрипта:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/atlanta-crm"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
pg_dump -U crm_user atlanta_crm > $BACKUP_DIR/backup_$DATE.sql
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

Сделайте скрипт исполняемым и добавьте в cron:
```bash
sudo chmod +x /usr/local/bin/backup-atlanta.sh
sudo crontab -e
```

Добавьте строку для ежедневного выполнения в 3:00:
```cron
0 3 * * * /usr/local/bin/backup-atlanta.sh
```

---
