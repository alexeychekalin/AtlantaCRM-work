/* =============================================
   App — Роутер и инициализация
   ============================================= */
const App = {
  currentPage: 'dashboard',

  pageMap: {
    dashboard: { title: 'Дашборд', render: () => DashboardPage.render() },
    orders: { title: 'Заказы', render: () => OrdersPage.render() },
    clients: { title: 'Клиенты', render: () => ClientsPage.render() },
    'client-profile': { title: 'Карточка клиента', render: (id) => ClientProfilePage.render(id), sidebarPage: 'clients' },
    products: { title: 'Товары и услуги', render: () => ProductsPage.render() },
    components: { title: 'Каталог компонентов', render: () => ComponentsCatalogPage.render() },
    calculator: { title: 'Калькулятор чертежей', render: () => CalculatorPage.render() },
    reports: { title: 'Отчёты', render: () => ReportsPage.render() },
    settings: { title: 'Настройки', render: () => SettingsPage.render() },
  },

  init() {
    Modal.init();
    LoginPage.init();

    // Проверяем авторизацию
    if (API.getToken()) {
      this.showApp();
    } else {
      this.showLogin();
    }

    // Навигация
    document.getElementById('sidebar-nav').addEventListener('click', (e) => {
      const navItem = e.target.closest('.nav-item');
      if (navItem) {
        e.preventDefault();
        const page = navItem.dataset.page;
        if (page) this.navigateTo(page);
      }
    });

    // Выход
    document.getElementById('btn-logout').addEventListener('click', () => {
      API.logout();
      this.showLogin();
    });

    // Toggle sidebar (mobile)
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    // Close sidebar on content click (mobile)
    document.querySelector('.main-content').addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('open');
    });

    // Mobile bottom nav
    document.getElementById('mobile-nav').addEventListener('click', (e) => {
      const item = e.target.closest('.mobile-nav-item');
      if (item && item.dataset.page !== 'more') {
        e.preventDefault();
        this.navigateTo(item.dataset.page);
      }
    });
  },

  showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-error').style.display = 'none';
  },

  showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';

    // Обновить инфо о пользователе
    const user = API.getUser();
    if (user) {
      document.getElementById('user-name').textContent = user.full_name;
      document.getElementById('user-role').textContent = user.role === 'admin' ? 'Администратор' : 'Просмотр';
      document.getElementById('user-avatar').textContent = user.full_name.charAt(0).toUpperCase();
    }

    this.navigateTo('dashboard');
  },

  navigateTo(page, param) {
    const pageConfig = this.pageMap[page];
    if (!pageConfig) return;

    this.currentPage = page;

    // Обновить заголовок
    document.getElementById('page-title').textContent = pageConfig.title;

    // Обновить активный пункт меню (sidebarPage для sub-pages)
    const sidebarPage = pageConfig.sidebarPage || page;
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === sidebarPage);
    });

    // Обновить мобильную навигацию
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === sidebarPage);
    });

    // Анимация контента
    const contentArea = document.getElementById('content-area');
    contentArea.style.animation = 'none';
    contentArea.offsetHeight; // reflow
    contentArea.style.animation = 'fadeIn 0.3s ease';

    // Рендер страницы
    pageConfig.render(param);
  },
};

// Запуск
document.addEventListener('DOMContentLoaded', () => App.init());
