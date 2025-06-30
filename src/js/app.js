
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { doc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { signInWithGoogle, signInWithEmail, signOutUser } from './auth.js';
import { UserManager } from './user-management.js';
import { EnhancedUserManager } from './user-management-enhanced.js';
import { RoleManager } from './role-management.js';
import { logger } from './logger.js';
import { validator } from './validator.js';

class EICApp {
  constructor() {
    this.currentUser = null;
    this.currentUserRole = null;
    this.currentView = 'login';
    this.reports = [];
    this.users = [];
    this.currentReport = null;
    this.currentReportFilter = null;
    this.sortBy = 'date';
    this.sortOrder = 'desc';
    this.userManager = new UserManager();
    this.enhancedUserManager = new EnhancedUserManager();
    this.roleManager = new RoleManager();
    this.dashboardStats = {
      totalInspections: 0,
      pendingReports: 0,
      complianceRate: 0,
      activeUsers: 0
    };
    
    // Make this instance globally available for role checking
    window.eicApp = this;
    
    this.init();
  }

  async init() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.currentUser = user;
        await this.fetchUserRole();
        this.currentView = this.currentUserRole === 'admin' || this.currentUserRole === 'superadmin' ? 'dashboard' : 'checklist';
      } else {
        this.currentUser = null;
        this.currentUserRole = null;
        this.currentView = 'login';
      }
      this.render();
    });
  }

  // Método para mostrar notificaciones elegantes
  showNotification(title, text, icon = 'info') {
    Swal.fire({
      title: title,
      text: text,
      icon: icon,
      confirmButtonText: 'OK',
      confirmButtonColor: '#dc2626',
      background: '#ffffff',
      color: '#374151',
      customClass: {
        popup: 'rounded-lg shadow-xl',
        title: 'text-lg font-semibold',
        content: 'text-sm',
        confirmButton: 'rounded-lg px-4 py-2'
      }
    });
  }

  // Método para navegar a vistas específicas con filtros
  navigateToView(view, filter = null) {
    this.currentView = view;
    if (filter && view === 'reports') {
      // Aplicar filtro específico a los reportes
      this.currentReportFilter = filter;
    }
    this.render();
  }

  async fetchUserRole() {
    if (!this.currentUser) return;
    try {
      const userRef = doc(db, "users", this.currentUser.uid);
      const userSnap = await getDoc(userRef);
      this.currentUserRole = userSnap.exists() ? userSnap.data().role : 'employee';
    } catch (error) {
      console.error('Error fetching user role:', error);
      this.currentUserRole = 'employee';
    }
  }

  async fetchReports() {
    try {
      const reportsRef = collection(db, "reports");
      const q = query(reportsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      this.reports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      this.sortReports();
    } catch (error) {
      console.error('Error fetching reports:', error);
      // Fallback to mock data if Firebase fails
      console.log('Using fallback mock data...');
      this.reports = [
        {
          id: '1',
          templateName: 'Closing Inspection',
          inspectorName: 'Megan S',
          status: 'approved',
          overallStatus: 'compliant',
          createdAt: { toDate: () => new Date('2025-06-25T14:30:00') },
          date: 'June 25, 2025, 2:30 PM'
        },
        {
          id: '2',
          templateName: 'Closing Inspection',
          inspectorName: 'Joel',
          status: 'pending',
          overallStatus: 'non-compliant',
          createdAt: { toDate: () => new Date('2025-06-25T13:15:00') },
          date: 'June 25, 2025, 1:15 PM'
        }
      ];
      this.sortReports();
    }
  }

  sortReports() {
    this.reports.sort((a, b) => {
      let aValue, bValue;
      
      switch (this.sortBy) {
        case 'date':
          aValue = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.date || 0);
          bValue = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.date || 0);
          break;
        case 'status':
          // Priority order: draft, pending, approved
          const statusPriority = { 'draft': 0, 'pending': 1, 'approved': 2 };
          aValue = statusPriority[a.status] || 3;
          bValue = statusPriority[b.status] || 3;
          break;
        case 'inspector':
          aValue = a.inspectorName || '';
          bValue = b.inspectorName || '';
          break;
        case 'compliance':
          // Priority order: non-compliant, pending, compliant
          const compliancePriority = { 'non-compliant': 0, 'pending': 1, 'compliant': 2 };
          aValue = compliancePriority[a.overallStatus] || 3;
          bValue = compliancePriority[b.overallStatus] || 3;
          break;
        default:
          return 0;
      }
      
      if (this.sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }

  async fetchUsers() {
    try {
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);
      this.users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }

  async fetchDashboardStats() {
    try {
      await this.fetchReports();
      await this.fetchUsers();

      const totalInspections = this.reports.length;
      const pendingReports = this.reports.filter(report => report.status === 'pending').length;
      const approvedReports = this.reports.filter(report => report.status === 'approved').length;
      const complianceRate = totalInspections > 0 ? Math.round((approvedReports / totalInspections) * 100) : 33;
      const activeUsers = this.users.length || 4;

      this.dashboardStats = {
        totalInspections: totalInspections || 6,
        pendingReports: pendingReports || 3,
        complianceRate: complianceRate || 33,
        activeUsers: activeUsers || 4
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      this.dashboardStats = {
        totalInspections: 6,
        pendingReports: 3,
        complianceRate: 33,
        activeUsers: 4
      };
    }
  }

  async saveDraft(reportData) {
    try {
      const draftData = {
        ...reportData,
        status: 'draft',
        createdAt: serverTimestamp(),
        inspectorId: this.currentUser.uid,
        inspectorName: this.currentUser.displayName || 'Unknown'
      };

      await addDoc(collection(db, "reports"), draftData);
      this.showNotification('¡Éxito!', 'Borrador guardado exitosamente', 'success');
    } catch (error) {
      console.error('Error saving draft:', error);
      this.showNotification('Error', 'Error al guardar borrador: ' + error.message, 'error');
    }
  }

  async deleteDraft(reportId) {
    if (!confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, "reports", reportId));
      this.showNotification('¡Éxito!', 'Borrador eliminado exitosamente', 'success');
      await this.fetchReports();
      this.render();
    } catch (error) {
      console.error('Error deleting draft:', error);
      this.showNotification('Error', 'Error al eliminar borrador: ' + error.message, 'error');
    }
  }

  getStatusIcon(status) {
    const icons = {
      'approved': '✓',
      'pending': '⏱',
      'draft': '📝',
      'rejected': '✗'
    };
    return icons[status] || '?';
  }

  getComplianceIcon(status) {
    const icons = {
      'compliant': '✓',
      'non-compliant': '⚠',
      'pending': '⏱'
    };
    return icons[status] || '?';
  }

  render() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    app.className = 'fade-in';

    switch (this.currentView) {
      case 'login':
        this.renderLogin();
        break;
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'admin-options':
        this.renderAdminOptions();
        break;
      case 'manage-users':
        this.renderManageUsers();
        break;
      case 'role-management':
        this.renderRoleManagement();
        break;
      case 'manage-templates':
        this.renderManageTemplates();
        break;
      case 'reports-list':
        this.renderReportsList();
        break;
      case 'report-details':
        this.renderReportDetails();
        break;
      case 'checklist':
        this.renderChecklist();
        break;
      case 'analytics':
        this.renderAnalytics();
        break;
    }
  }

  renderLogin() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="login-container">
        <div class="login-card">
          <div class="logo-container">
            <div class="logo">
              <i class="fas fa-shield-alt"></i>
            </div>
            <h1 class="text-2xl font-bold text-gray-800">EIC</h1>
            <p class="text-gray-600 text-sm">Food Safety Inspection</p>
          </div>

          <form id="login-form" class="space-y-4">
            <div>
              <input 
                type="email" 
                id="email" 
                placeholder="Email" 
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <input 
                type="password" 
                id="password" 
                placeholder="Password" 
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
            </div>
            <div class="flex justify-center">
              <button type="submit" class="eic-btn eic-btn-primary w-3/4 sm:w-2/3 md:w-1/2 max-w-xs flex items-center justify-center">
                Login
              </button>
            </div>
          </form>

          <div class="mt-4 text-center">
            <div class="text-gray-400 text-sm mb-2">or</div>
            <div class="flex justify-center">
              <button id="google-login" class="bg-white border border-gray-300 text-gray-700 p-2 rounded-lg hover:bg-gray-50 flex items-center justify-center w-12 h-12 transition-colors duration-200">
                <i class="fab fa-google text-red-500 text-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      try {
        await signInWithEmail(email, password);
      } catch (error) {
        this.showNotification('Error de Login', 'Error al iniciar sesión: ' + error.message, 'error');
      }
    });

    document.getElementById('google-login').addEventListener('click', async () => {
      try {
        await signInWithGoogle();
      } catch (error) {
        this.showNotification('Error de Login', 'Error al iniciar sesión con Google: ' + error.message, 'error');
      }
    });
  }

  async renderDashboard() {
    await this.fetchDashboardStats();
    
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="min-h-screen bg-white p-4 md:p-6">
        <div class="max-w-7xl mx-auto">
          <div class="modern-header">
            <div class="header-content">
              <div class="flex flex-col md:flex-row md:items-center md:justify-between">
                <div class="brand-section">
                  <div class="brand-logo">
                    <i class="fas fa-shield-alt"></i>
                  </div>
                  <div class="brand-text">
                    <h1>EIC Inspection</h1>
                    <p>Food Safety Management System</p>
                  </div>
                </div>
                <div class="flex items-center gap-4 mt-4 md:mt-0">
                  <div class="text-right hidden md:block">
                    <p class="text-sm text-secondary">Welcome back,</p>
                    <p class="font-semibold">${this.currentUser?.displayName || 'Administrator'}</p>
                  </div>
                  <button id="logout-btn" class="eic-btn eic-btn-secondary">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-card clickable" data-navigate="reports" data-filter="all">
              <div class="stat-content">
                <div class="stat-info">
                  <h3>Total Inspections</h3>
                  <div class="stat-number">${this.dashboardStats.totalInspections}</div>
                  <div class="stat-trend positive">
                    <i class="fas fa-arrow-up"></i>
                    <span>+12% from last month</span>
                  </div>
                </div>
                <div class="stat-icon blue">
                  <i class="fas fa-clipboard-check"></i>
                </div>
              </div>
            </div>

            <div class="stat-card clickable" data-navigate="reports" data-filter="pending">
              <div class="stat-content">
                <div class="stat-info">
                  <h3>Pending Reviews</h3>
                  <div class="stat-number">${this.dashboardStats.pendingReports}</div>
                  <div class="stat-trend ${this.dashboardStats.pendingReports > 5 ? 'negative' : 'positive'}">
                    <i class="fas fa-${this.dashboardStats.pendingReports > 5 ? 'arrow-down' : 'arrow-up'}"></i>
                    <span>${this.dashboardStats.pendingReports > 5 ? 'Needs attention' : 'Under control'}</span>
                  </div>
                </div>
                <div class="stat-icon orange">
                  <i class="fas fa-clock"></i>
                </div>
              </div>
            </div>

            <div class="stat-card clickable" data-navigate="reports" data-filter="approved">
              <div class="stat-content">
                <div class="stat-info">
                  <h3>Compliance Rate</h3>
                  <div class="stat-number">${this.dashboardStats.complianceRate}%</div>
                  <div class="stat-trend positive">
                    <i class="fas fa-arrow-up"></i>
                    <span>+3.2% this week</span>
                  </div>
                </div>
                <div class="stat-icon green">
                  <i class="fas fa-check-circle"></i>
                </div>
              </div>
            </div>

            <div class="stat-card clickable" data-navigate="users" data-filter="all">
              <div class="stat-content">
                <div class="stat-info">
                  <h3>Active Users</h3>
                  <div class="stat-number">${this.dashboardStats.activeUsers}</div>
                  <div class="stat-trend positive">
                    <i class="fas fa-arrow-up"></i>
                    <span>+2 new this month</span>
                  </div>
                </div>
                <div class="stat-icon purple">
                  <i class="fas fa-users"></i>
                </div>
              </div>
            </div>
          </div>

          <div class="function-cards">
            <div class="function-card" id="view-inspections">
              <div class="function-content">
                <div class="function-icon inspection">
                  <i class="fas fa-clipboard-check"></i>
                </div>
                <div class="function-info">
                  <h3>Perform New Inspection</h3>
                  <p>Start a comprehensive food safety inspection checklist with real-time validation and photo documentation capabilities.</p>
                </div>
              </div>
            </div>

            <div class="function-card" id="review-reports">
              <div class="function-content">
                <div class="function-icon reports">
                  <i class="fas fa-file-alt"></i>
                </div>
                <div class="function-info">
                  <h3>Review Submitted Reports</h3>
                  <p>Review, approve, and manage inspection reports with detailed analysis and compliance tracking.</p>
                </div>
              </div>
            </div>

            <div class="function-card" id="admin-options">
              <div class="function-content">
                <div class="function-icon admin">
                  <i class="fas fa-cog"></i>
                </div>
                <div class="function-info">
                  <h3>Administrator Options</h3>
                  <p>Manage user accounts, system settings, inspection templates, and organizational configurations.</p>
                </div>
              </div>
            </div>

            <div class="function-card" id="view-analytics">
              <div class="function-content">
                <div class="function-icon analytics">
                  <i class="fas fa-chart-bar"></i>
                </div>
                <div class="function-info">
                  <h3>View Analytics</h3>
                  <p>Access comprehensive analytics, trends, and insights about inspection performance and compliance metrics.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('logout-btn').addEventListener('click', async () => {
      await signOutUser();
    });

    document.getElementById('view-inspections').addEventListener('click', () => {
      this.currentView = 'checklist';
      this.render();
    });

    document.getElementById('review-reports').addEventListener('click', () => {
      this.currentView = 'reports-list';
      this.render();
    });

    document.getElementById('admin-options').addEventListener('click', () => {
      this.currentView = 'admin-options';
      this.render();
    });

    // Event listeners para las tarjetas de estadísticas clickeables
    document.querySelectorAll('.stat-card.clickable').forEach(card => {
      card.addEventListener('click', () => {
        const navigate = card.getAttribute('data-navigate');
        const filter = card.getAttribute('data-filter');
        
        if (navigate === 'reports') {
          this.currentView = 'reports-list';
          // Aplicar filtro si es necesario
          if (filter && filter !== 'all') {
            this.currentReportFilter = filter;
          } else {
            this.currentReportFilter = null;
          }
        } else if (navigate === 'users') {
          this.currentView = 'admin-options';
        }
        
        this.render();
      });
    });

    document.getElementById('view-analytics').addEventListener('click', () => {
      this.currentView = 'analytics';
      this.render();
    });
  }

  renderAdminOptions() {
    const app = document.getElementById('app');
    
    // Generate function cards based on user role
    const manageUsersCard = this.currentUserRole === 'superadmin' ? `
      <div class="function-card" id="manage-users">
        <div class="function-content">
          <div class="function-icon reports">
            <i class="fas fa-users"></i>
          </div>
          <div class="function-info">
            <h3>Manage Users</h3>
            <p>Add, edit, or remove user accounts. Assign roles and permissions for team members and administrators.</p>
          </div>
        </div>
      </div>
    ` : '';

    const roleManagementCard = this.currentUserRole === 'superadmin' ? `
      <div class="function-card" id="role-management">
        <div class="function-content">
          <div class="function-icon admin">
            <i class="fas fa-user-shield"></i>
          </div>
          <div class="function-info">
            <h3>Role Management</h3>
            <p>Create and configure custom roles with specific permissions. Define what each role can access and do in the system.</p>
          </div>
        </div>
      </div>
    ` : '';

    app.innerHTML = `
      <div class="min-h-screen bg-white p-4 md:p-6">
        <div class="max-w-6xl mx-auto">
          <div class="modern-header">
            <div class="header-content">
              <div class="flex flex-col md:flex-row md:items-center md:justify-between">
                <div class="brand-section">
                  <div class="brand-logo">
                    <i class="fas fa-cog"></i>
                  </div>
                  <div class="brand-text">
                    <h1>Administrator Options</h1>
                    <p>Manage system settings and configurations</p>
                  </div>
                </div>
                <button id="back-btn" class="eic-btn eic-btn-secondary mt-4 md:mt-0">
                  <i class="fas fa-arrow-left"></i>
                  <span>Back to Dashboard</span>
                </button>
              </div>
            </div>
          </div>

          <div class="function-cards">
            ${manageUsersCard}
            ${roleManagementCard}
            
            <div class="function-card" id="manage-templates">
              <div class="function-content">
                <div class="function-icon inspection">
                  <i class="fas fa-file-contract"></i>
                </div>
                <div class="function-info">
                  <h3>Manage Templates</h3>
                  <p>Create and edit inspection templates. Customize checklists and forms for different inspection types.</p>
                </div>
              </div>
            </div>
            
            ${this.currentUserRole !== 'superadmin' ? `
              <div class="function-card disabled">
                <div class="function-content">
                  <div class="function-icon reports opacity-50">
                    <i class="fas fa-users"></i>
                  </div>
                  <div class="function-info">
                    <h3 class="opacity-50">Manage Users</h3>
                    <p class="text-sm text-gray-500">Available only for Super Administrators</p>
                  </div>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    document.getElementById('back-btn').addEventListener('click', () => {
      this.currentView = 'dashboard';
      this.render();
    });

    // Only add manage-users event listener if user is superadmin
    if (this.currentUserRole === 'superadmin') {
      const manageUsersBtn = document.getElementById('manage-users');
      if (manageUsersBtn) {
        manageUsersBtn.addEventListener('click', () => {
          this.currentView = 'manage-users';
          this.render();
        });
      }

      const roleManagementBtn = document.getElementById('role-management');
      if (roleManagementBtn) {
        roleManagementBtn.addEventListener('click', () => {
          this.currentView = 'role-management';
          this.render();
        });
      }
    }

    document.getElementById('manage-templates').addEventListener('click', () => {
      this.currentView = 'manage-templates';
      this.render();
    });
  }

  async renderReportsList() {
    await this.fetchReports();

    // Aplicar filtro si existe
    let filteredReports = this.reports;
    if (this.currentReportFilter) {
      filteredReports = this.reports.filter(report => report.status === this.currentReportFilter);
    }

    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="reports-container">
        <div class="max-w-6xl mx-auto">
          <div class="reports-header">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between">
              <div class="brand-section">
                <div class="brand-logo">
                  <i class="fas fa-file-alt"></i>
                </div>
                <div class="brand-text">
                  <h1>Submitted Reports</h1>
                  <p>Review and manage inspection reports</p>
                  ${this.currentReportFilter ? `<div class="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    <i class="fas fa-filter mr-2"></i>
                    Filtered by: ${this.currentReportFilter}
                    <button class="ml-2 text-blue-600 hover:text-blue-800" onclick="window.eicApp.currentReportFilter = null; window.eicApp.render();">
                      <i class="fas fa-times"></i>
                    </button>
                  </div>` : ''}
                </div>
              </div>
              <button id="back-btn" class="eic-btn eic-btn-secondary mt-4 md:mt-0">
                <i class="fas fa-arrow-left"></i>
                <span>Back</span>
              </button>
            </div>
          </div>

          <div class="sort-controls">
            <span class="sort-label">Sort by:</span>
            <select id="sort-select" class="sort-select">
              <option value="date" ${this.sortBy === 'date' ? 'selected' : ''}>Date (Newest First)</option>
              <option value="status" ${this.sortBy === 'status' ? 'selected' : ''}>Status</option>
              <option value="inspector" ${this.sortBy === 'inspector' ? 'selected' : ''}>Inspector</option>
              <option value="compliance" ${this.sortBy === 'compliance' ? 'selected' : ''}>Compliance Status</option>
            </select>
            <button id="sort-order-btn" class="eic-btn eic-btn-outline">
              <i class="fas fa-sort-${this.sortOrder === 'asc' ? 'up' : 'down'}"></i>
              ${this.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            </button>
          </div>

          <div class="reports-list">
            ${filteredReports.map(report => `
              <div class="eic-report-card cursor-pointer report-item" data-report-id="${report.id}">
                <div class="eic-report-header">
                  <div class="flex-1">
                    <h3 class="eic-report-title">${report.templateName || 'Closing Inspection'}</h3>
                    <div class="eic-report-meta">
                      <p><strong>Inspector:</strong> ${report.inspectorName || 'Unknown'}</p>
                      <p><strong>Date:</strong> ${report.date || 'N/A'}</p>
                    </div>
                  </div>
                  <div class="eic-report-actions">
                    <div class="flex flex-col items-end gap-2">
                      <div class="flex items-center gap-2">
                        <span class="eic-status-badge eic-status-${report.status || 'pending'}">
                          <span>${this.getStatusIcon(report.status)}</span>
                          ${(report.status || 'pending').toUpperCase()}
                        </span>
                        ${report.status === 'draft' ? `
                          <button class="eic-btn eic-btn-danger delete-draft-btn" data-report-id="${report.id}" title="Delete Draft">
                            <i class="fas fa-trash"></i>
                          </button>
                        ` : ''}
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-sm text-secondary">Overall Status:</span>
                        <span class="eic-status-badge eic-status-${report.overallStatus === 'compliant' ? 'compliant' : 'non-compliant'}">
                          <span>${this.getComplianceIcon(report.overallStatus)}</span>
                          ${report.overallStatus === 'compliant' ? 'COMPLIANT' : 
                            report.overallStatus === 'non-compliant' ? 'NON-COMPLIANT' : 
                            'PENDING'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}

            ${this.reports.length === 0 ? `
              <div class="text-center py-12">
                <i class="fas fa-file-alt text-6xl text-gray-300 mb-4"></i>
                <p class="text-gray-500 text-lg">No reports found</p>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    document.getElementById('back-btn').addEventListener('click', () => {
      this.currentView = 'dashboard';
      this.render();
    });

    document.getElementById('sort-select').addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      this.sortReports();
      this.renderReportsList();
    });

    document.getElementById('sort-order-btn').addEventListener('click', () => {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
      this.sortReports();
      this.renderReportsList();
    });

    document.querySelectorAll('.report-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.closest('.delete-draft-btn')) {
          const reportId = item.dataset.reportId;
          this.currentReport = this.reports.find(r => r.id === reportId);
          this.currentView = 'report-details';
          this.render();
        }
      });
    });

    document.querySelectorAll('.delete-draft-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const reportId = btn.dataset.reportId;
        this.deleteDraft(reportId);
      });
    });
  }

  renderReportDetails() {
    if (!this.currentReport) {
      this.currentView = 'reports-list';
      this.render();
      return;
    }

    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="max-w-4xl mx-auto p-6 bg-white min-h-screen">
        <div class="report-detail">
          <div class="reports-header">
            <div class="flex justify-between items-center">
              <div class="brand-section">
                <div class="brand-logo">
                  <i class="fas fa-file-alt"></i>
                </div>
                <div class="brand-text">
                  <h1>Report Details</h1>
                  <p>${this.currentReport.templateName || 'Closing Inspection'}</p>
                </div>
              </div>
              <button id="back-btn" class="eic-btn eic-btn-secondary">
                <i class="fas fa-arrow-left"></i>
                <span>Back</span>
              </button>
            </div>
          </div>

          <div class="bg-white border border-light rounded-lg p-6">
            <div class="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 class="font-semibold text-secondary mb-2">Inspector Details</h3>
                <p><strong>Name:</strong> ${this.currentReport.inspectorName || 'Gustavo M. (Shift Leader)'}</p>
                <p><strong>Date & Time:</strong> ${this.currentReport.date || 'June 15, 2025, 2:30 PM'}</p>
              </div>
              <div>
                <h3 class="font-semibold text-secondary mb-2">Overall Status</h3>
                <span class="eic-status-badge eic-status-${this.currentReport.overallStatus === 'compliant' ? 'compliant' : 'non-compliant'}">
                  <span>${this.getComplianceIcon(this.currentReport.overallStatus)}</span>
                  ${this.currentReport.overallStatus === 'compliant' ? 'COMPLIANT' : 
                    this.currentReport.overallStatus === 'non-compliant' ? 'NON-COMPLIANT' : 
                    'PENDING REVIEW'}
                </span>
              </div>
            </div>

            <h3 class="text-lg font-semibold mb-4">Detailed Results</h3>
            <div class="space-y-4">
              ${this.renderChecklistResults()}
            </div>

            <div class="photo-placeholder mt-6">
              <i class="fas fa-camera text-4xl mb-2"></i>
              <p>Photo of Thermometer</p>
            </div>

            <div class="flex justify-end mt-6 space-x-4">
              ${this.currentReport.status === 'pending' ? `
                <button id="approve-btn" class="eic-btn eic-btn-success">
                  <i class="fas fa-check"></i>
                  <span>Approve & Archive</span>
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('back-btn').addEventListener('click', () => {
      this.currentView = 'reports-list';
      this.render();
    });

    const approveBtn = document.getElementById('approve-btn');
    if (approveBtn) {
      approveBtn.addEventListener('click', async () => {
        try {
          const reportRef = doc(db, "reports", this.currentReport.id);
          await updateDoc(reportRef, {
            status: 'approved',
            approvedAt: serverTimestamp(),
            approvedBy: this.currentUser.uid
          });
          this.showNotification('¡Éxito!', 'Reporte aprobado exitosamente', 'success');
          this.currentView = 'reports-list';
          this.render();
        } catch (error) {
          this.showNotification('Error', 'Error al aprobar reporte: ' + error.message, 'error');
        }
      });
    }
  }

  renderChecklistResults() {
    const checklistItems = [
      { text: "All items labeled (Sanitizers, lemon wedges, etc.)", status: "compliant", result: "Compliant" },
      { text: "Make sure all dispensers have their covers", status: "non-compliant", result: "Non-Compliant", note: "The chocolate syrup dispenser was missing its lid cover. A temporary lid has been placed." },
      { text: "Ensure ice cream machine spindles are clean from the top", status: "non-compliant", result: "Non-Compliant", note: "Mix residue was found on the right spindle. Requires additional cleaning at end of shift." },
      { text: "Ensure shake base dispensers are cut at 45 degree angle", status: "non-compliant", result: "Non-Compliant", note: "Strawberry shake base tube needs to be cut to ensure proper dispensing correctly." },
      { text: "Check for Temperatures (milks and all refrigerators)", status: "compliant", result: "Compliant" },
      { text: "Check Sanitizer buckets", status: "compliant", result: "Compliant" },
      { text: "ICE: All ice bins closed if not in use. Scoop in place.", status: "compliant", result: "Compliant" },
      { text: "MOPS and BROOMS must be hanging up", status: "compliant", result: "Compliant" },
      { text: "UNIFORMS: name tags, belts, shoes, hair, etc.", status: "compliant", result: "Compliant" }
    ];

    return checklistItems.map(item => `
      <div class="checklist-item ${item.status}">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <p class="font-medium text-primary">${item.text}</p>
            ${item.note ? `<div class="mt-2 p-3 bg-red-50 border-l-4 border-red-400 text-sm">
              <strong>Note:</strong> ${item.note}
            </div>` : ''}
          </div>
          <span class="eic-status-badge eic-status-${item.status} ml-4">
            <span>${this.getComplianceIcon(item.status)}</span>
            ${item.result.toUpperCase()}
          </span>
        </div>
      </div>
    `).join('');
  }

  renderChecklist() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="max-w-4xl mx-auto p-6 bg-white min-h-screen">
        <div class="reports-header">
          <div class="flex justify-between items-center">
            <div class="brand-section">
              <div class="brand-logo">
                <i class="fas fa-clipboard-check"></i>
              </div>
              <div class="brand-text">
                <h1>Closing Inspection</h1>
                <p>Complete the inspection checklist</p>
              </div>
            </div>
            <div class="flex space-x-2">
              <button id="back-btn" class="eic-btn eic-btn-secondary">
                <i class="fas fa-arrow-left"></i>
                <span>Back</span>
              </button>
              <button id="logout-btn" class="eic-btn eic-btn-danger">
                <i class="fas fa-sign-out-alt"></i>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-lg p-6 border border-light">
          <div class="mb-6">
            <h3 class="text-lg font-semibold mb-2">Inspector Information</h3>
            <input type="text" id="inspector-name" placeholder="Inspector Name" class="w-full px-4 py-2 border border-light rounded-lg mb-2" />
            <input type="datetime-local" id="inspection-date" class="w-full px-4 py-2 border border-light rounded-lg" />
          </div>

          <div id="checklist-items" class="space-y-4">
            ${this.renderChecklistItems()}
          </div>

          <div class="mt-6 flex justify-end space-x-4">
            <button id="save-draft" class="eic-btn eic-btn-secondary">
              <i class="fas fa-save"></i>
              <span>Save Draft</span>
            </button>
            <button id="submit-report" class="eic-btn eic-btn-primary">
              <i class="fas fa-paper-plane"></i>
              <span>Submit Report</span>
            </button>
          </div>
        </div>
      </div>
    `;

    const now = new Date();
    const dateInput = document.getElementById('inspection-date');
    dateInput.value = now.toISOString().slice(0, 16);

    document.getElementById('back-btn').addEventListener('click', () => {
      this.currentView = 'dashboard';
      this.render();
    });

    document.getElementById('logout-btn').addEventListener('click', async () => {
      await signOutUser();
    });

    document.getElementById('save-draft').addEventListener('click', async () => {
      const reportData = this.collectChecklistData();
      await this.saveDraft(reportData);
    });

    document.getElementById('submit-report').addEventListener('click', async () => {
      await this.submitReport();
    });

    this.addChecklistEventListeners();
  }

  renderChecklistItems() {
    const items = [
      "All items labeled (Sanitizers, lemon wedges, etc.)",
      "Make sure all dispensers have their covers",
      "Ensure ice cream machine spindles are clean from the top",
      "Ensure shake base dispensers are cut at 45 degree angle",
      "Check for Temperatures (milks and all refrigerators)",
      "Check Sanitizer buckets",
      "ICE: All ice bins closed if not in use. Scoop in place.",
      "MOPS and BROOMS must be hanging up",
      "UNIFORMS: name tags, belts, shoes, hair, etc."
    ];

    return items.map((item, index) => `
      <div class="checklist-item" data-index="${index}">
        <div class="flex justify-between items-start mb-2">
          <p class="font-medium flex-1 text-primary">${item}</p>
          <div class="flex space-x-2 ml-4">
            <button class="eic-btn eic-btn-success status-btn" data-status="compliant">
              <i class="fas fa-check"></i>
              Compliant
            </button>
            <button class="eic-btn eic-btn-danger status-btn" data-status="non-compliant">
              <i class="fas fa-times"></i>
              Non-Compliant
            </button>
            <button class="eic-btn eic-btn-secondary status-btn" data-status="photo">
              <i class="fas fa-camera"></i>
              Photo
            </button>
          </div>
        </div>
        <textarea class="notes-input w-full px-3 py-2 border border-light rounded-lg text-sm" placeholder="Add notes (optional)" style="display: none;"></textarea>
      </div>
    `).join('');
  }

  addChecklistEventListeners() {
    document.querySelectorAll('.status-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = e.target.closest('.checklist-item');
        const status = e.target.dataset.status;
        const notesInput = item.querySelector('.notes-input');

        item.querySelectorAll('.status-btn').forEach(b => {
          b.classList.remove('ring-2', 'ring-offset-2', 'ring-blue-500');
        });

        e.target.classList.add('ring-2', 'ring-offset-2', 'ring-blue-500');

        item.className = `checklist-item ${status}`;

        if (status === 'non-compliant') {
          notesInput.style.display = 'block';
        } else {
          notesInput.style.display = 'none';
        }

        if (status === 'photo') {
          this.handlePhotoUpload(item);
        }
      });
    });
  }

  collectChecklistData() {
    const inspectorName = document.getElementById('inspector-name').value;
    const inspectionDate = document.getElementById('inspection-date').value;
    const items = [];

    document.querySelectorAll('.checklist-item').forEach((item, index) => {
      const activeBtn = item.querySelector('.status-btn.ring-2');
      const notes = item.querySelector('.notes-input').value;
      
      if (activeBtn) {
        items.push({
          index,
          status: activeBtn.dataset.status,
          notes: notes || ''
        });
      }
    });

    return {
      inspectorName,
      inspectionDate,
      items,
      templateName: 'Closing Inspection'
    };
  }

  handlePhotoUpload(item) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        let photoContainer = item.querySelector('.photo-container');
        if (!photoContainer) {
          photoContainer = document.createElement('div');
          photoContainer.className = 'photo-container mt-2 p-2 bg-blue-50 border border-blue-200 rounded';
          item.appendChild(photoContainer);
        }
        
        photoContainer.innerHTML = `
          <div class="flex items-center space-x-2">
            <i class="fas fa-image text-blue-600"></i>
            <span class="text-sm text-blue-800">Photo: ${file.name}</span>
            <button class="text-red-600 hover:text-red-800 text-sm" onclick="this.parentElement.parentElement.remove()">
              <i class="fas fa-times"></i>
            </button>
          </div>
        `;
      }
    });
    
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  }

  async submitReport() {
    const reportData = this.collectChecklistData();
    
    if (!reportData.inspectorName) {
      this.showNotification('Campo Requerido', 'Por favor ingrese el nombre del inspector', 'warning');
      return;
    }

    if (reportData.items.length === 0) {
      this.showNotification('Lista Incompleta', 'Por favor complete al menos un elemento de la lista', 'warning');
      return;
    }

    try {
      const submissionData = {
        ...reportData,
        status: 'pending',
        overallStatus: reportData.items.some(item => item.status === 'non-compliant') ? 'non-compliant' : 'compliant',
        createdAt: serverTimestamp(),
        submittedAt: serverTimestamp(),
        inspectorId: this.currentUser.uid,
        date: new Date(reportData.inspectionDate).toLocaleString()
      };

      await addDoc(collection(db, "reports"), submissionData);
      this.showNotification('¡Éxito!', 'Reporte enviado exitosamente', 'success');
      this.currentView = 'dashboard';
      this.render();
    } catch (error) {
      console.error('Error submitting report:', error);
      this.showNotification('Error', 'Error al enviar reporte: ' + error.message, 'error');
    }
  }

  renderAnalytics() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="min-h-screen bg-white p-4 md:p-6">
        <div class="max-w-6xl mx-auto">
          <div class="reports-header">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between">
              <div class="brand-section">
                <div class="brand-logo">
                  <i class="fas fa-chart-bar"></i>
                </div>
                <div class="brand-text">
                  <h1>Analytics Dashboard</h1>
                  <p>Comprehensive inspection performance metrics</p>
                </div>
              </div>
              <button id="back-btn" class="eic-btn eic-btn-secondary mt-4 md:mt-0">
                <i class="fas fa-arrow-left"></i>
                <span>Back to Dashboard</span>
              </button>
            </div>
          </div>

          <div class="text-center py-12">
            <i class="fas fa-chart-line text-6xl text-gray-300 mb-4"></i>
            <h3 class="text-xl font-semibold text-gray-600 mb-2">Analytics Coming Soon</h3>
            <p class="text-gray-500">Advanced analytics and reporting features will be available in the next update.</p>
          </div>
        </div>
      </div>
    `;

    document.getElementById('back-btn').addEventListener('click', () => {
      this.currentView = 'dashboard';
      this.render();
    });
  }

  renderAccessDenied(feature) {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="min-h-screen bg-white p-4 md:p-6">
        <div class="max-w-4xl mx-auto">
          <div class="modern-header">
            <div class="header-content">
              <div class="flex flex-col md:flex-row md:items-center md:justify-between">
                <div class="brand-section">
                  <div class="brand-logo text-red-600">
                    <i class="fas fa-shield-alt"></i>
                  </div>
                  <div class="brand-text">
                    <h1>Access Denied</h1>
                    <p>Insufficient permissions to access this feature</p>
                  </div>
                </div>
                <button id="back-btn" class="eic-btn eic-btn-secondary mt-4 md:mt-0">
                  <i class="fas fa-arrow-left"></i>
                  <span>Go Back</span>
                </button>
              </div>
            </div>
          </div>

          <div class="mt-8 text-center">
            <div class="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md mx-auto">
              <div class="mb-4">
                <i class="fas fa-exclamation-triangle text-red-400 text-6xl"></i>
              </div>
              <h2 class="text-xl font-semibold text-gray-900 mb-4">
                ${feature ? `Access to ${feature} is restricted` : 'Access Restricted'}
              </h2>
              <p class="text-gray-600 mb-6">
                Only <strong>Super Administrators</strong> have permission to access this feature. 
                Please contact your system administrator if you need access to ${feature || 'this functionality'}.
              </p>
              <div class="flex flex-col sm:flex-row gap-3 justify-center">
                <button id="back-to-dashboard" class="eic-btn eic-btn-primary">
                  <i class="fas fa-home"></i>
                  <span>Back to Dashboard</span>
                </button>
                <button id="back-to-admin" class="eic-btn eic-btn-secondary">
                  <i class="fas fa-cog"></i>
                  <span>Admin Options</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Role Information -->
          <div class="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto">
            <h3 class="text-lg font-semibold text-blue-900 mb-3">
              <i class="fas fa-info-circle mr-2"></i>
              Your Current Role
            </h3>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-blue-700">
                  You are currently logged in as: 
                  <span class="font-semibold">${this.getRoleDisplayName(this.currentUserRole)}</span>
                </p>
                <p class="text-sm text-blue-600 mt-1">
                  ${this.getRoleDescription(this.currentUserRole)}
                </p>
              </div>
              <div class="text-3xl text-blue-400">
                ${this.getRoleIcon(this.currentUserRole)}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Event listeners
    document.getElementById('back-btn').addEventListener('click', () => {
      window.history.back();
    });

    document.getElementById('back-to-dashboard').addEventListener('click', () => {
      this.currentView = 'dashboard';
      this.render();
    });

    document.getElementById('back-to-admin').addEventListener('click', () => {
      this.currentView = 'admin-options';
      this.render();
    });
  }

  getRoleDisplayName(role) {
    const roleNames = {
      'employee': 'Employee',
      'manager': 'Manager', 
      'admin': 'Administrator',
      'superadmin': 'Super Administrator'
    };
    return roleNames[role] || 'Unknown';
  }

  getRoleDescription(role) {
    const descriptions = {
      'employee': 'Can perform inspections and submit reports',
      'manager': 'Can review reports and manage team inspections',
      'admin': 'Can access admin functions and manage templates',
      'superadmin': 'Full system access including user management'
    };
    return descriptions[role] || 'No description available';
  }

  getRoleIcon(role) {
    const icons = {
      'employee': '<i class="fas fa-user"></i>',
      'manager': '<i class="fas fa-user-tie"></i>',
      'admin': '<i class="fas fa-user-shield"></i>',
      'superadmin': '<i class="fas fa-crown"></i>'
    };
    return icons[role] || '<i class="fas fa-user"></i>';
  }

  async renderManageUsers() {
    // Check if user has permission to manage users - ONLY Super Admin
    if (!this.currentUserRole || this.currentUserRole !== 'superadmin') {
      this.renderAccessDenied('user management');
      return;
    }

    // Initialize enhanced user manager if not already done
    if (!this.enhancedUserManager.isInitialized) {
      try {
        await this.enhancedUserManager.init();
        // Set up real-time update callbacks
        this.enhancedUserManager.setUpdateCallbacks(
          (users) => this.updateUsersTable(),
          (roles) => this.updateRoleFilters()
        );
      } catch (error) {
        await logger.error('Failed to initialize enhanced user manager', error, 'USER_MANAGEMENT');
        this.showNotification('Error', 'Failed to initialize user management system', 'error');
        return;
      }
    }

    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="user-management-container">
        <div class="max-w-7xl mx-auto">
          <!-- Header -->
          <div class="modern-header">
            <div class="header-content">
              <div class="flex flex-col md:flex-row md:items-center md:justify-between">
                <div class="brand-section">
                  <div class="brand-logo">
                    <i class="fas fa-users"></i>
                  </div>
                  <div class="brand-text">
                    <h1>User Management</h1>
                    <p>Manage user accounts and permissions</p>
                  </div>
                </div>
                <button id="back-btn" class="eic-btn eic-btn-secondary mt-4 md:mt-0">
                  <i class="fas fa-arrow-left"></i>
                  <span>Back to Admin</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Controls -->
          <div class="user-controls">
            <div class="user-controls-row">
              <div class="search-container">
                <i class="fas fa-search search-icon"></i>
                <input 
                  type="text" 
                  id="user-search" 
                  class="search-input" 
                  placeholder="Search by name or email..."
                  value="${this.enhancedUserManager.searchTerm}"
                />
              </div>
              <div class="filter-group">
                <select id="role-filter" class="filter-select">
                  <option value="all" ${this.enhancedUserManager.roleFilter === 'all' ? 'selected' : ''}>All Roles</option>
                  <option value="employee" ${this.enhancedUserManager.roleFilter === 'employee' ? 'selected' : ''}>Employee</option>
                  <option value="manager" ${this.enhancedUserManager.roleFilter === 'manager' ? 'selected' : ''}>Manager</option>
                  <option value="admin" ${this.enhancedUserManager.roleFilter === 'admin' ? 'selected' : ''}>Administrator</option>
                  <option value="superadmin" ${this.enhancedUserManager.roleFilter === 'superadmin' ? 'selected' : ''}>Super Admin</option>
                </select>
                <button id="add-user-btn" class="eic-btn eic-btn-primary">
                  <i class="fas fa-plus"></i>
                  <span>Add User</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Loading State -->
          <div id="loading-state" class="loading-state">
            <div class="loading-spinner"></div>
            <p class="mt-4">Loading users...</p>
          </div>

          <!-- Users Table Container -->
          <div id="users-table-container" class="users-table-container hidden">
            <table class="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="users-table-body">
                <!-- Users will be populated here -->
              </tbody>
            </table>
            
            <!-- Pagination -->
            <div id="pagination-container" class="pagination-container">
              <div class="pagination-info">
                <span id="pagination-info-text">Showing 0 of 0 users</span>
              </div>
              <div class="pagination-controls">
                <button id="prev-page" class="pagination-btn">
                  <i class="fas fa-chevron-left"></i>
                </button>
                <div id="page-numbers">
                  <!-- Page numbers will be populated here -->
                </div>
                <button id="next-page" class="pagination-btn">
                  <i class="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div id="empty-state" class="empty-state hidden">
            <i class="fas fa-users"></i>
            <h3>No users found</h3>
            <p>No users match your current search criteria.</p>
          </div>
        </div>
      </div>

      <!-- User Modal -->
      <div id="user-modal" class="user-modal hidden">
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="modal-title">Add New User</h3>
            <button id="modal-close" class="modal-close">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <form id="user-form">
              <div class="form-group">
                <label for="user-name">Full Name *</label>
                <input type="text" id="user-name" required>
                <div class="form-error" id="name-error"></div>
              </div>
              <div class="form-group">
                <label for="user-email">Email Address *</label>
                <input type="email" id="user-email" required>
                <div class="form-error" id="email-error"></div>
              </div>
              <div class="form-group" id="password-group">
                <label for="user-password">Password *</label>
                <input type="password" id="user-password" required>
                <div class="form-error" id="password-error"></div>
              </div>
              <div class="form-group">
                <label for="user-role">Role *</label>
                <select id="user-role" required>
                  <option value="">Select a role</option>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  ${this.currentUserRole === 'superadmin' ? '<option value="admin">Administrator</option>' : ''}
                  ${this.currentUserRole === 'superadmin' ? '<option value="superadmin">Super Admin</option>' : ''}
                </select>
                <div class="form-error" id="role-error"></div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button id="modal-cancel" class="eic-btn eic-btn-secondary">Cancel</button>
            <button id="modal-save" class="eic-btn eic-btn-primary">
              <span id="save-text">Create User</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Confirmation Dialog -->
      <div id="confirmation-dialog" class="confirmation-dialog hidden">
        <div class="confirmation-content">
          <div class="confirmation-icon">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <h3>Delete User</h3>
          <p id="confirmation-message">Are you sure you want to delete this user? This action cannot be undone.</p>
          <div class="confirmation-actions">
            <button id="confirm-cancel" class="eic-btn eic-btn-secondary">Cancel</button>
            <button id="confirm-delete" class="eic-btn eic-btn-danger">
              <i class="fas fa-trash"></i>
              <span>Delete User</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Initialize event listeners
    this.initUserManagementEvents();
    
    // Load users
    await this.loadUsers();
  }

  initUserManagementEvents() {
    // Back button
    document.getElementById('back-btn').addEventListener('click', () => {
      this.currentView = 'admin-options';
      this.render();
    });

    // Search functionality
    document.getElementById('user-search').addEventListener('input', (e) => {
      this.enhancedUserManager.setSearchTerm(e.target.value);
      this.updateUsersDisplay();
    });

    // Role filter
    document.getElementById('role-filter').addEventListener('change', (e) => {
      this.enhancedUserManager.setRoleFilter(e.target.value);
      this.updateUsersDisplay();
    });

    // Add user button
    document.getElementById('add-user-btn').addEventListener('click', () => {
      this.openUserModal();
    });

    // Modal events
    document.getElementById('modal-close').addEventListener('click', () => {
      this.closeUserModal();
    });

    document.getElementById('modal-cancel').addEventListener('click', () => {
      this.closeUserModal();
    });

    document.getElementById('modal-save').addEventListener('click', () => {
      this.saveUser();
    });

    // Confirmation dialog events
    document.getElementById('confirm-cancel').addEventListener('click', () => {
      this.closeConfirmationDialog();
    });

    document.getElementById('confirm-delete').addEventListener('click', () => {
      this.confirmDeleteUser();
    });

    // Pagination events
    document.getElementById('prev-page').addEventListener('click', () => {
      const filteredData = this.enhancedUserManager.getFilteredUsers();
      if (filteredData.hasPrevPage) {
        this.enhancedUserManager.setCurrentPage(filteredData.currentPage - 1);
        this.updateUsersDisplay();
      }
    });

    document.getElementById('next-page').addEventListener('click', () => {
      const filteredData = this.enhancedUserManager.getFilteredUsers();
      if (filteredData.hasNextPage) {
        this.enhancedUserManager.setCurrentPage(filteredData.currentPage + 1);
        this.updateUsersDisplay();
      }
    });

    // Close modal when clicking outside
    document.getElementById('user-modal').addEventListener('click', (e) => {
      if (e.target.id === 'user-modal') {
        this.closeUserModal();
      }
    });

    document.getElementById('confirmation-dialog').addEventListener('click', (e) => {
      if (e.target.id === 'confirmation-dialog') {
        this.closeConfirmationDialog();
      }
    });
  }

  async loadUsers() {
    try {
      const loadingState = document.getElementById('loading-state');
      const tableContainer = document.getElementById('users-table-container');
      const emptyState = document.getElementById('empty-state');

      loadingState.classList.remove('hidden');
      tableContainer.classList.add('hidden');
      emptyState.classList.add('hidden');

      await this.enhancedUserManager.fetchUsers();
      this.updateUsersDisplay();

    } catch (error) {
      console.error('Error loading users:', error);
      this.showNotification('Error', 'Failed to load users: ' + error.message, 'error');
    }
  }

  updateUsersDisplay() {
    const filteredData = this.enhancedUserManager.getFilteredUsers();
    const loadingState = document.getElementById('loading-state');
    const tableContainer = document.getElementById('users-table-container');
    const emptyState = document.getElementById('empty-state');
    const tbody = document.getElementById('users-table-body');

    loadingState.classList.add('hidden');

    if (filteredData.users.length === 0) {
      tableContainer.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }

    tableContainer.classList.remove('hidden');
    emptyState.classList.add('hidden');

    // Populate users table
    tbody.innerHTML = filteredData.users.map(user => {
      const roleInfo = this.enhancedUserManager.getRoleInfo(user.role);
      const initials = user.displayName ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase() : user.email[0].toUpperCase();
      
      return `
        <tr>
          <td>
            <div class="user-info">
              <div class="user-avatar">${initials}</div>
              <div class="user-details">
                <h4>${user.displayName || 'Unknown'}</h4>
                <p>${user.email}</p>
              </div>
            </div>
          </td>
          <td>
            <span class="role-badge ${user.role}">
              <i class="${roleInfo.icon}"></i>
              ${roleInfo.label}
            </span>
          </td>
          <td>
            <span class="text-sm text-secondary">
              ${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
            </span>
          </td>
          <td>
            <span class="text-sm text-secondary">
              ${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
            </span>
          </td>
          <td>
            <div class="action-buttons">
              ${this.enhancedUserManager.canManageUser(this.currentUserRole, user.role) ? `
                <button class="action-btn edit" onclick="window.eicApp.editUser('${user.id}')" title="Edit User">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete" onclick="window.eicApp.deleteUser('${user.id}')" title="Delete User">
                  <i class="fas fa-trash"></i>
                </button>
              ` : `
                <span class="text-xs text-secondary">No access</span>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Update pagination
    this.updatePagination(filteredData);
  }

  updatePagination(filteredData) {
    const paginationInfo = document.getElementById('pagination-info-text');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageNumbers = document.getElementById('page-numbers');

    // Update info text
    const start = ((filteredData.currentPage - 1) * this.enhancedUserManager.usersPerPage) + 1;
    const end = Math.min(start + filteredData.users.length - 1, filteredData.totalUsers);
    paginationInfo.textContent = `Showing ${start}-${end} of ${filteredData.totalUsers} users`;

    // Update navigation buttons
    prevBtn.disabled = !filteredData.hasPrevPage;
    nextBtn.disabled = !filteredData.hasNextPage;

    // Update page numbers
    pageNumbers.innerHTML = '';
    for (let i = 1; i <= filteredData.totalPages; i++) {
      if (i === 1 || i === filteredData.totalPages || (i >= filteredData.currentPage - 1 && i <= filteredData.currentPage + 1)) {
        const button = document.createElement('button');
        button.className = `pagination-btn ${i === filteredData.currentPage ? 'active' : ''}`;
        button.textContent = i;
        button.addEventListener('click', () => {
          this.enhancedUserManager.setCurrentPage(i);
          this.updateUsersDisplay();
        });
        pageNumbers.appendChild(button);
      } else if (i === filteredData.currentPage - 2 || i === filteredData.currentPage + 2) {
        const span = document.createElement('span');
        span.textContent = '...';
        span.className = 'px-2 text-gray-400';
        pageNumbers.appendChild(span);
      }
    }
  }

  openUserModal(user = null) {
    const modal = document.getElementById('user-modal');
    const modalTitle = document.getElementById('modal-title');
    const saveText = document.getElementById('save-text');
    const passwordGroup = document.getElementById('password-group');
    const form = document.getElementById('user-form');

    if (user) {
      // Edit mode
      modalTitle.textContent = 'Edit User';
      saveText.textContent = 'Update User';
      passwordGroup.style.display = 'none';
      
      document.getElementById('user-name').value = user.displayName || '';
      document.getElementById('user-email').value = user.email || '';
      document.getElementById('user-email').disabled = true;
      document.getElementById('user-role').value = user.role || '';
      
      this.enhancedUserManager.currentEditingUser = user;
    } else {
      // Create mode
      modalTitle.textContent = 'Add New User';
      saveText.textContent = 'Create User';
      passwordGroup.style.display = 'block';
      
      form.reset();
      document.getElementById('user-email').disabled = false;
      this.enhancedUserManager.currentEditingUser = null;
    }

    // Clear previous errors
    this.clearFormErrors();
    
    modal.classList.remove('hidden');
  }

  closeUserModal() {
    document.getElementById('user-modal').classList.add('hidden');
    this.enhancedUserManager.currentEditingUser = null;
  }

  async saveUser() {
    const form = document.getElementById('user-form');
    const saveBtn = document.getElementById('modal-save');
    const originalText = document.getElementById('save-text').textContent;

    // Clear previous errors
    this.clearFormErrors();

    // Get form data
    const userData = {
      displayName: document.getElementById('user-name').value.trim(),
      email: document.getElementById('user-email').value.trim(),
      password: document.getElementById('user-password').value,
      role: document.getElementById('user-role').value
    };

    // Validate form
    if (!this.validateUserForm(userData)) {
      return;
    }

    try {
      // Show loading state
      saveBtn.disabled = true;
      document.getElementById('save-text').textContent = 'Saving...';

      if (this.enhancedUserManager.currentEditingUser) {
        // Update existing user
        await this.enhancedUserManager.updateUser(this.enhancedUserManager.currentEditingUser.id, userData);
        this.showNotification('Success', 'User updated successfully', 'success');
      } else {
        // Create new user
        await this.enhancedUserManager.createUser(userData);
        this.showNotification('Success', 'User created successfully', 'success');
      }

      this.closeUserModal();
      await this.loadUsers();

    } catch (error) {
      console.error('Error saving user:', error);
      this.showNotification('Error', error.message, 'error');
    } finally {
      saveBtn.disabled = false;
      document.getElementById('save-text').textContent = originalText;
    }
  }

  validateUserForm(userData) {
    let isValid = true;

    // Validate name
    if (!userData.displayName) {
      this.showFieldError('name-error', 'Full name is required');
      isValid = false;
    }

    // Validate email
    if (!userData.email) {
      this.showFieldError('email-error', 'Email address is required');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      this.showFieldError('email-error', 'Please enter a valid email address');
      isValid = false;
    }

    // Validate password (only for new users)
    if (!this.enhancedUserManager.currentEditingUser && !userData.password) {
      this.showFieldError('password-error', 'Password is required');
      isValid = false;
    } else if (!this.enhancedUserManager.currentEditingUser && userData.password.length < 6) {
      this.showFieldError('password-error', 'Password must be at least 6 characters long');
      isValid = false;
    }

    // Validate role
    if (!userData.role) {
      this.showFieldError('role-error', 'Please select a role');
      isValid = false;
    } else if (!this.enhancedUserManager.canAssignRole(this.currentUserRole, userData.role)) {
      this.showFieldError('role-error', 'You cannot assign this role');
      isValid = false;
    }

    return isValid;
  }

  showFieldError(errorId, message) {
    const errorElement = document.getElementById(errorId);
    const inputElement = errorElement.previousElementSibling;
    
    errorElement.textContent = message;
    inputElement.parentElement.classList.add('error');
  }

  clearFormErrors() {
    document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
    document.querySelectorAll('.form-group.error').forEach(el => el.classList.remove('error'));
  }

  editUser(userId) {
    const user = this.enhancedUserManager.getUserById(userId);
    if (user) {
      this.openUserModal(user);
    }
  }

  deleteUser(userId) {
    const user = this.enhancedUserManager.getUserById(userId);
    if (!user) return;

    // Prevent self-deletion
    if (user.id === this.currentUser.uid) {
      this.showNotification('Error', 'You cannot delete your own account', 'error');
      return;
    }

    // Check permissions
    if (!this.enhancedUserManager.canManageUser(this.currentUserRole, user.role)) {
      this.showNotification('Error', 'You do not have permission to delete this user', 'error');
      return;
    }

    const confirmationMessage = document.getElementById('confirmation-message');
    confirmationMessage.textContent = `Are you sure you want to delete ${user.displayName || user.email}? This action cannot be undone.`;
    
    this.userToDelete = userId;
    document.getElementById('confirmation-dialog').classList.remove('hidden');
  }

  closeConfirmationDialog() {
    document.getElementById('confirmation-dialog').classList.add('hidden');
    this.userToDelete = null;
  }

  // Callback methods for real-time updates
  updateUsersTable() {
    if (this.currentView === 'user_management') {
      this.updateUsersDisplay();
    }
  }

  updateRoleFilters() {
    if (this.currentView === 'user_management') {
      // Update role filter dropdown with dynamic roles
      const roleFilter = document.getElementById('role-filter');
      if (roleFilter && this.enhancedUserManager.roles) {
        const currentValue = roleFilter.value;
        const availableRoles = this.enhancedUserManager.getAvailableRoles();
        
        // Rebuild options
        roleFilter.innerHTML = `
          <option value="all">All Roles</option>
          ${availableRoles.map(role => 
            `<option value="${role.id}">${role.name}</option>`
          ).join('')}
        `;
        
        // Restore selected value if still valid
        if ([...roleFilter.options].some(option => option.value === currentValue)) {
          roleFilter.value = currentValue;
        }
      }
    }
  }

  async confirmDeleteUser() {
    if (!this.userToDelete) return;

    const confirmBtn = document.getElementById('confirm-delete');
    const originalText = confirmBtn.innerHTML;

    try {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<div class="loading-spinner"></div> Deleting...';

      await this.enhancedUserManager.deleteUser(this.userToDelete, true);
      
      this.showNotification('Success', 'User deleted successfully', 'success');
      this.closeConfirmationDialog();
      this.updateUsersDisplay();

    } catch (error) {
      console.error('Error deleting user:', error);
      this.showNotification('Error', 'Failed to delete user: ' + error.message, 'error');
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = originalText;
    }
  }

  renderManageTemplates() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="min-h-screen bg-white p-4 md:p-6">
        <div class="max-w-6xl mx-auto">
          <div class="reports-header">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between">
              <div class="brand-section">
                <div class="brand-logo">
                  <i class="fas fa-file-contract"></i>
                </div>
                <div class="brand-text">
                  <h1>Manage Templates</h1>
                  <p>Create and edit inspection templates</p>
                </div>
              </div>
              <button id="back-btn" class="eic-btn eic-btn-secondary mt-4 md:mt-0">
                <i class="fas fa-arrow-left"></i>
                <span>Back</span>
              </button>
            </div>
          </div>

          <div class="text-center py-12">
            <i class="fas fa-file-plus text-6xl text-gray-300 mb-4"></i>
            <h3 class="text-xl font-semibold text-gray-600 mb-2">Template Management Coming Soon</h3>
            <p class="text-gray-500">Template management features will be available in the next update.</p>
          </div>
        </div>
      </div>
    `;

    document.getElementById('back-btn').addEventListener('click', () => {
      this.currentView = 'admin-options';
      this.render();
    });
  }

  async renderRoleManagement() {
    // Validate Super Admin access
    if (this.currentUserRole !== 'superadmin') {
      this.showNotification('Access Denied', 'Only Super Administrators can access role management', 'error');
      this.currentView = 'admin-options';
      this.render();
      return;
    }

    try {
      // Initialize default roles and fetch all roles
      await this.roleManager.initializeDefaultRoles();
      await this.roleManager.fetchRoles();
    } catch (error) {
      console.error('Error loading roles:', error);
      this.showNotification('Error', 'Failed to load roles: ' + error.message, 'error');
    }

    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="role-management-container fade-in">
        <div class="max-w-7xl mx-auto">
          <!-- Header -->
          <div class="modern-header">
            <div class="header-content">
              <div class="flex flex-col md:flex-row md:items-center md:justify-between">
                <div class="brand-section">
                  <div class="brand-logo">
                    <i class="fas fa-user-shield"></i>
                  </div>
                  <div class="brand-text">
                    <h1>Role Management</h1>
                    <p>Manage roles and permissions</p>
                  </div>
                </div>
                <button id="back-btn" class="eic-btn eic-btn-secondary mt-4 md:mt-0">
                  <i class="fas fa-arrow-left"></i>
                  <span>Back to Admin</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Controls -->
          <div class="role-controls">
            <div class="role-controls-header">
              <div class="role-search-container">
                <i class="fas fa-search search-icon"></i>
                <input 
                  type="text" 
                  id="role-search" 
                  class="role-search-input" 
                  placeholder="Search roles by name or description..."
                  value="${this.roleManager.searchTerm}"
                />
              </div>
              <button id="create-role-btn" class="create-role-btn">
                <i class="fas fa-plus"></i>
                <span>Create New Role</span>
              </button>
            </div>
          </div>

          <!-- Roles Table -->
          <div class="role-table-container">
            <div id="roles-table-content">
              ${this.renderRolesTable()}
            </div>
          </div>
        </div>
      </div>

      <!-- Role Modal -->
      <div id="role-modal" class="role-modal" style="display: none;">
        <div class="role-modal-content slide-in">
          <div class="role-modal-header">
            <h2 id="role-modal-title">Create New Role</h2>
          </div>
          <div class="role-modal-body">
            <form id="role-form">
              <div class="role-form-group">
                <label class="role-form-label" for="role-name">Role Name *</label>
                <input 
                  type="text" 
                  id="role-name" 
                  class="role-form-input" 
                  placeholder="Enter role name (e.g., Inspector, Analyst)" 
                  required
                />
              </div>

              <div class="role-form-group">
                <label class="role-form-label" for="role-description">Description *</label>
                <textarea 
                  id="role-description" 
                  class="role-form-textarea" 
                  placeholder="Describe what this role is responsible for..."
                  required
                ></textarea>
              </div>

              <div class="role-form-group">
                <div class="permissions-matrix">
                  <div class="permissions-matrix-header">
                    <h3>Permissions Matrix</h3>
                    <p class="text-sm text-gray-500 mt-1">Select specific permissions for this role</p>
                  </div>
                  <div id="permissions-content">
                    ${this.renderPermissionsMatrix()}
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div class="role-modal-footer">
            <button type="button" id="cancel-role-btn" class="eic-btn eic-btn-outline">
              Cancel
            </button>
            <button type="submit" id="save-role-btn" class="eic-btn eic-btn-primary" form="role-form">
              <i class="fas fa-save"></i>
              <span>Save Role</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Event Listeners
    this.attachRoleManagementEventListeners();
  }

  renderRolesTable() {
    const { roles, totalRoles, totalPages, currentPage, hasNextPage, hasPrevPage } = this.roleManager.getFilteredRoles();

    if (roles.length === 0) {
      return `
        <div class="role-empty-state">
          <i class="fas fa-user-shield"></i>
          <h3>No roles found</h3>
          <p>No roles match your search criteria, or no roles have been created yet.</p>
          <button id="create-first-role-btn" class="create-role-btn">
            <i class="fas fa-plus"></i>
            <span>Create Your First Role</span>
          </button>
        </div>
      `;
    }

    return `
      <table class="role-table">
        <thead>
          <tr>
            <th>Role Name</th>
            <th>Description</th>
            <th>Permissions</th>
            <th>Users Assigned</th>
            <th>Type</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${roles.map(role => `
            <tr>
              <td>
                <div class="flex items-center gap-2">
                  <strong>${role.name}</strong>
                  ${role.isSystem ? '<span class="system-role-indicator"><i class="fas fa-lock text-xs"></i> System</span>' : ''}
                </div>
              </td>
              <td>
                <div class="role-description">${role.description}</div>
              </td>
              <td>
                <div class="permission-count">
                  <i class="fas fa-shield-alt"></i>
                  <span>${this.roleManager.countPermissions(role.permissions)} permissions</span>
                </div>
              </td>
              <td>
                <div class="users-count">
                  <i class="fas fa-users"></i>
                  <span>${role.usersAssigned || 0} users</span>
                </div>
              </td>
              <td>
                ${role.isSystem ? 
                  '<span class="role-badge system">System Role</span>' : 
                  '<span class="role-badge custom">Custom Role</span>'
                }
              </td>
              <td>
                <div class="action-buttons">
                  <button 
                    class="action-btn edit" 
                    data-role-id="${role.id}"
                    ${role.isSystem ? 'disabled title="System roles cannot be edited"' : ''}
                  >
                    <i class="fas fa-edit"></i>
                  </button>
                  <button 
                    class="action-btn delete" 
                    data-role-id="${role.id}"
                    ${role.isSystem || (role.usersAssigned && role.usersAssigned > 0) ? 'disabled' : ''}
                    title="${role.isSystem ? 'System roles cannot be deleted' : (role.usersAssigned && role.usersAssigned > 0) ? 'Cannot delete role with assigned users' : 'Delete role'}"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      ${totalPages > 1 ? `
        <div class="role-pagination">
          <div class="pagination-info">
            Showing ${((currentPage - 1) * this.roleManager.rolesPerPage) + 1} to ${Math.min(currentPage * this.roleManager.rolesPerPage, totalRoles)} of ${totalRoles} roles
          </div>
          <div class="pagination-buttons">
            <button 
              class="pagination-btn" 
              id="prev-page-btn"
              ${!hasPrevPage ? 'disabled' : ''}
            >
              <i class="fas fa-chevron-left"></i>
              Previous
            </button>
            
            ${Array.from({ length: totalPages }, (_, i) => i + 1).map(page => `
              <button 
                class="pagination-btn ${page === currentPage ? 'active' : ''}" 
                data-page="${page}"
              >
                ${page}
              </button>
            `).join('')}
            
            <button 
              class="pagination-btn" 
              id="next-page-btn"
              ${!hasNextPage ? 'disabled' : ''}
            >
              Next
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      ` : ''}
    `;
  }

  renderPermissionsMatrix(existingPermissions = {}) {
    const modules = this.roleManager.defaultPermissions;
    
    return Object.keys(modules).map(moduleKey => {
      const module = modules[moduleKey];
      const modulePermissions = existingPermissions[moduleKey] || {};

      return `
        <div class="permission-module">
          <div class="permission-module-header">
            <h4 class="permission-module-title">
              <i class="fas fa-${this.getModuleIcon(moduleKey)} permission-module-icon"></i>
              ${module.label}
            </h4>
          </div>
          <div class="permission-module-content">
            ${Object.keys(module.permissions).map(permissionKey => `
              <div class="permission-checkbox-group">
                <label 
                  for="permission-${moduleKey}-${permissionKey}" 
                  class="permission-checkbox-label"
                >
                  ${module.permissions[permissionKey]}
                </label>
                <label class="toggle-switch">
                  <input 
                    type="checkbox" 
                    id="permission-${moduleKey}-${permissionKey}"
                    class="permission-checkbox"
                    data-module="${moduleKey}"
                    data-permission="${permissionKey}"
                    ${modulePermissions[permissionKey] ? 'checked' : ''}
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  getModuleIcon(moduleKey) {
    const icons = {
      dashboard: 'tachometer-alt',
      inspections: 'clipboard-check',
      reports: 'file-alt',
      analytics: 'chart-bar',
      user_management: 'users',
      role_management: 'user-shield',
      templates: 'file-contract',
      settings: 'cog'
    };
    return icons[moduleKey] || 'shield-alt';
  }

  attachRoleManagementEventListeners() {
    // Back button
    document.getElementById('back-btn').addEventListener('click', () => {
      this.currentView = 'admin-options';
      this.render();
    });

    // Search functionality
    document.getElementById('role-search').addEventListener('input', (e) => {
      this.roleManager.setSearchTerm(e.target.value);
      this.refreshRolesTable();
    });

    // Create role button
    document.getElementById('create-role-btn').addEventListener('click', () => {
      this.openRoleModal();
    });

    // Create first role button (if shown)
    const createFirstRoleBtn = document.getElementById('create-first-role-btn');
    if (createFirstRoleBtn) {
      createFirstRoleBtn.addEventListener('click', () => {
        this.openRoleModal();
      });
    }

    // Edit role buttons
    document.querySelectorAll('.action-btn.edit').forEach(btn => {
      if (!btn.disabled) {
        btn.addEventListener('click', () => {
          const roleId = btn.dataset.roleId;
          this.openRoleModal(roleId);
        });
      }
    });

    // Delete role buttons
    document.querySelectorAll('.action-btn.delete').forEach(btn => {
      if (!btn.disabled) {
        btn.addEventListener('click', () => {
          const roleId = btn.dataset.roleId;
          this.deleteRole(roleId);
        });
      }
    });

    // Pagination buttons
    document.querySelectorAll('.pagination-btn[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page);
        this.roleManager.setCurrentPage(page);
        this.refreshRolesTable();
      });
    });

    const prevBtn = document.getElementById('prev-page-btn');
    if (prevBtn && !prevBtn.disabled) {
      prevBtn.addEventListener('click', () => {
        this.roleManager.setCurrentPage(this.roleManager.currentPage - 1);
        this.refreshRolesTable();
      });
    }

    const nextBtn = document.getElementById('next-page-btn');
    if (nextBtn && !nextBtn.disabled) {
      nextBtn.addEventListener('click', () => {
        this.roleManager.setCurrentPage(this.roleManager.currentPage + 1);
        this.refreshRolesTable();
      });
    }

    // Modal event listeners
    this.attachModalEventListeners();
  }

  attachModalEventListeners() {
    // Close modal when clicking outside
    document.getElementById('role-modal').addEventListener('click', (e) => {
      if (e.target.id === 'role-modal') {
        this.closeRoleModal();
      }
    });

    // Cancel button
    document.getElementById('cancel-role-btn').addEventListener('click', () => {
      this.closeRoleModal();
    });

    // Form submission
    document.getElementById('role-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveRole();
    });
  }

  openRoleModal(roleId = null) {
    const modal = document.getElementById('role-modal');
    const title = document.getElementById('role-modal-title');
    const form = document.getElementById('role-form');
    
    // Reset form
    form.reset();
    
    // Clear all checkboxes
    document.querySelectorAll('.permission-checkbox').forEach(checkbox => {
      checkbox.checked = false;
    });

    if (roleId) {
      // Edit mode
      const role = this.roleManager.getRoleById(roleId);
      if (!role) {
        this.showNotification('Error', 'Role not found', 'error');
        return;
      }

      title.textContent = `Edit Role: ${role.name}`;
      document.getElementById('role-name').value = role.name;
      document.getElementById('role-description').value = role.description;
      
      // Set permissions
      Object.keys(role.permissions || {}).forEach(moduleKey => {
        Object.keys(role.permissions[moduleKey] || {}).forEach(permissionKey => {
          if (role.permissions[moduleKey][permissionKey]) {
            const checkbox = document.getElementById(`permission-${moduleKey}-${permissionKey}`);
            if (checkbox) {
              checkbox.checked = true;
            }
          }
        });
      });

      this.roleManager.currentEditingRole = roleId;
    } else {
      // Create mode
      title.textContent = 'Create New Role';
      this.roleManager.currentEditingRole = null;
    }

    modal.style.display = 'flex';
  }

  closeRoleModal() {
    const modal = document.getElementById('role-modal');
    modal.style.display = 'none';
    this.roleManager.currentEditingRole = null;
  }

  async saveRole() {
    try {
      const name = document.getElementById('role-name').value.trim();
      const description = document.getElementById('role-description').value.trim();
      
      if (!name || !description) {
        this.showNotification('Validation Error', 'Please fill in all required fields', 'error');
        return;
      }

      // Collect permissions
      const permissions = {};
      document.querySelectorAll('.permission-checkbox').forEach(checkbox => {
        if (checkbox.checked) {
          const module = checkbox.dataset.module;
          const permission = checkbox.dataset.permission;
          
          if (!permissions[module]) {
            permissions[module] = {};
          }
          permissions[module][permission] = true;
        }
      });

      const roleData = { name, description, permissions };

      if (this.roleManager.currentEditingRole) {
        // Update existing role
        await this.roleManager.updateRole(this.roleManager.currentEditingRole, roleData);
        this.showNotification('Success', 'Role updated successfully', 'success');
      } else {
        // Create new role
        await this.roleManager.createRole(roleData);
        this.showNotification('Success', 'Role created successfully', 'success');
      }

      this.closeRoleModal();
      this.refreshRolesTable();

    } catch (error) {
      console.error('Error saving role:', error);
      this.showNotification('Error', error.message, 'error');
    }
  }

  async deleteRole(roleId) {
    try {
      const role = this.roleManager.getRoleById(roleId);
      if (!role) {
        this.showNotification('Error', 'Role not found', 'error');
        return;
      }

      const result = await Swal.fire({
        title: 'Delete Role',
        text: `Are you sure you want to delete the role "${role.name}"? This action cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, delete it',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        await this.roleManager.deleteRole(roleId);
        this.showNotification('Success', 'Role deleted successfully', 'success');
        this.refreshRolesTable();
      }

    } catch (error) {
      console.error('Error deleting role:', error);
      this.showNotification('Error', error.message, 'error');
    }
  }

  async refreshRolesTable() {
    try {
      await this.roleManager.fetchRoles();
      
      // Update users assigned count for all roles
      for (const role of this.roleManager.roles) {
        await this.roleManager.updateRoleUsersCount(role.id);
      }
      
      const tableContent = document.getElementById('roles-table-content');
      if (tableContent) {
        tableContent.innerHTML = this.renderRolesTable();
        this.attachRoleManagementEventListeners();
      }
    } catch (error) {
      console.error('Error refreshing roles table:', error);
      this.showNotification('Error', 'Failed to refresh roles table', 'error');
    }
  }
}

// Initialize the app
window.addEventListener('DOMContentLoaded', () => {
  window.eicApp = new EICApp();
});
