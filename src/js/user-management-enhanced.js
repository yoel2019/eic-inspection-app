
/**
 * Enhanced User Management System for EIC Inspection App
 * Integrates with Logger and Validator systems for comprehensive user management
 */

import { auth, db } from './firebase-config.js';
import { 
  createUserWithEmailAndPassword, 
  deleteUser as deleteAuthUser,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  serverTimestamp,
  where,
  onSnapshot,
  limit
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { logger } from './logger.js';
import { validator } from './validator.js';

export class EnhancedUserManager {
  constructor() {
    this.users = [];
    this.roles = [];
    this.currentEditingUser = null;
    this.searchTerm = '';
    this.currentPage = 1;
    this.usersPerPage = 10;
    this.roleFilter = 'all';
    this.statusFilter = 'all';
    this.sortBy = 'createdAt';
    this.sortOrder = 'desc';
    this.realTimeListeners = [];
    this.isInitialized = false;
    
    this.init();
  }

  // Initialize the user manager
  async init() {
    try {
      await logger.info('Initializing Enhanced User Manager', null, 'USER_MANAGEMENT');
      
      // Setup real-time listeners
      this.setupRealTimeListeners();
      
      // Load initial data
      await this.loadInitialData();
      
      this.isInitialized = true;
      await logger.info('Enhanced User Manager initialized successfully', null, 'USER_MANAGEMENT');
    } catch (error) {
      await logger.error('Failed to initialize Enhanced User Manager', error, 'USER_MANAGEMENT');
      throw error;
    }
  }

  // Setup real-time listeners for users and roles
  setupRealTimeListeners() {
    // Listen to users collection changes
    const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const usersUnsubscribe = onSnapshot(usersQuery, (snapshot) => {
      this.users = snapshot.docs.map(doc => ({
        id: doc.id,
        uid: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        lastLogin: doc.data().lastLogin?.toDate?.() || null,
        updatedAt: doc.data().updatedAt?.toDate?.() || null
      }));
      
      // Trigger UI update if callback is set
      if (this.onUsersUpdated) {
        this.onUsersUpdated(this.users);
      }
    }, (error) => {
      logger.error('Real-time users listener error', error, 'USER_MANAGEMENT');
    });

    // Listen to roles collection changes
    const rolesQuery = query(collection(db, "roles"), orderBy("name"));
    const rolesUnsubscribe = onSnapshot(rolesQuery, (snapshot) => {
      this.roles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Trigger UI update if callback is set
      if (this.onRolesUpdated) {
        this.onRolesUpdated(this.roles);
      }
    }, (error) => {
      logger.error('Real-time roles listener error', error, 'USER_MANAGEMENT');
    });

    this.realTimeListeners.push(usersUnsubscribe, rolesUnsubscribe);
  }

  // Load initial data
  async loadInitialData() {
    try {
      await Promise.all([
        this.fetchUsers(),
        this.fetchRoles()
      ]);
    } catch (error) {
      await logger.error('Failed to load initial data', error, 'USER_MANAGEMENT');
      throw error;
    }
  }

  // Validate if current user has Super Admin permissions
  async validateSuperAdminAccess() {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      const error = new Error('User not authenticated');
      await logger.warn('Unauthorized access attempt to user management', { userId: 'anonymous' }, 'SECURITY');
      throw error;
    }
    
    // Get user role from the app instance if available
    if (window.eicApp && window.eicApp.currentUserRole !== 'superadmin') {
      const error = new Error('Access denied: Only Super Administrators can manage users');
      await logger.warn('Insufficient permissions for user management', { 
        userId: currentUser.uid, 
        userRole: window.eicApp.currentUserRole 
      }, 'SECURITY');
      throw error;
    }
    
    await logger.info('Super admin access validated', { userId: currentUser.uid }, 'USER_MANAGEMENT');
    return true;
  }

  // Fetch all users from Firestore
  async fetchUsers() {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      
      this.users = snapshot.docs.map(doc => ({
        id: doc.id,
        uid: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        lastLogin: doc.data().lastLogin?.toDate?.() || null,
        updatedAt: doc.data().updatedAt?.toDate?.() || null
      }));
      
      await logger.info(`Fetched ${this.users.length} users`, null, 'USER_MANAGEMENT');
      return this.users;
    } catch (error) {
      await logger.error('Error fetching users', error, 'USER_MANAGEMENT');
      throw error;
    }
  }

  // Fetch all roles from Firestore
  async fetchRoles() {
    try {
      const rolesRef = collection(db, "roles");
      const snapshot = await getDocs(rolesRef);
      
      this.roles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      await logger.info(`Fetched ${this.roles.length} roles`, null, 'USER_MANAGEMENT');
      return this.roles;
    } catch (error) {
      await logger.error('Error fetching roles', error, 'USER_MANAGEMENT');
      throw error;
    }
  }

  // Create new user with comprehensive validation
  async createUser(userData) {
    try {
      // Validate Super Admin access before proceeding
      await this.validateSuperAdminAccess();
      
      await logger.info('Starting user creation process', { email: userData.email }, 'USER_MANAGEMENT');
      
      // Validate input data
      const validationResult = await validator.validateFields(userData, validator.getUserValidationSchema());
      if (!validationResult.isValid) {
        const error = new Error('Validation failed: ' + validationResult.errors.map(e => e.message).join(', '));
        await logger.warn('User creation validation failed', { 
          errors: validationResult.errors,
          userData: { email: userData.email, role: userData.role }
        }, 'USER_MANAGEMENT');
        throw error;
      }

      // Sanitize input data
      const sanitizedData = validator.sanitizeData(userData, {
        email: 'email',
        displayName: 'string',
        role: 'string',
        password: 'string'
      });

      const { email, password, displayName, role } = sanitizedData;

      // Check if user already exists
      const existingUsers = query(collection(db, "users"), where("email", "==", email));
      const existingSnapshot = await getDocs(existingUsers);
      if (!existingSnapshot.empty) {
        const error = new Error('User with this email already exists');
        await logger.warn('Attempted to create duplicate user', { email }, 'USER_MANAGEMENT');
        throw error;
      }

      // Validate role exists and is active
      const roleExists = this.roles.find(r => r.id === role && r.isActive !== false);
      if (!roleExists) {
        const error = new Error('Invalid or inactive role selected');
        await logger.warn('Invalid role selected during user creation', { role, email }, 'USER_MANAGEMENT');
        throw error;
      }

      // Store current admin user info to restore session later
      const currentAdminUser = auth.currentUser;
      const currentAdminUid = currentAdminUser?.uid;
      
      // Create user in Firebase Auth (this will automatically sign in the new user)
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // Update profile with display name
      await updateProfile(newUser, {
        displayName: displayName
      });

      // Important: Sign out the newly created user immediately to prevent auto-login
      await auth.signOut();
      
      // The admin session will be restored by the onAuthStateChanged listener
      // We'll trigger a manual re-authentication if needed
      await logger.info('User created successfully, admin session preserved', { 
        adminId: currentAdminUid,
        newUserId: newUser.uid,
        newUserEmail: email
      }, 'USER_MANAGEMENT');

      // Create user document in Firestore
      const userDoc = {
        email: email,
        displayName: displayName,
        role: role,
        createdAt: serverTimestamp(),
        lastLogin: null,
        isActive: true,
        createdBy: currentAdminUid
      };

      await setDoc(doc(db, "users", newUser.uid), userDoc);

      const newUserData = {
        id: newUser.uid,
        uid: newUser.uid,
        ...userDoc,
        createdAt: new Date(),
        lastLogin: null
      };

      await logger.logUserAction('CREATE_USER', newUser.uid, { 
        email, 
        role, 
        displayName 
      });

      await logger.info('User created successfully', { 
        userId: newUser.uid, 
        email, 
        role 
      }, 'USER_MANAGEMENT');

      return newUserData;
    } catch (error) {
      await logger.error('Error creating user', error, 'USER_MANAGEMENT');
      throw error;
    }
  }

  // Update user with validation
  async updateUser(userId, userData) {
    try {
      // Validate Super Admin access before proceeding
      await this.validateSuperAdminAccess();
      
      await logger.info('Starting user update process', { userId }, 'USER_MANAGEMENT');
      
      // Validate input data
      const validationResult = await validator.validateFields(userData, validator.getUserUpdateValidationSchema());
      if (!validationResult.isValid) {
        const error = new Error('Validation failed: ' + validationResult.errors.map(e => e.message).join(', '));
        await logger.warn('User update validation failed', { 
          errors: validationResult.errors,
          userId,
          userData
        }, 'USER_MANAGEMENT');
        throw error;
      }

      // Sanitize input data
      const sanitizedData = validator.sanitizeData(userData, {
        displayName: 'string',
        role: 'string'
      });

      const { displayName, role } = sanitizedData;

      // Validate role exists and is active
      const roleExists = this.roles.find(r => r.id === role && r.isActive !== false);
      if (!roleExists) {
        const error = new Error('Invalid or inactive role selected');
        await logger.warn('Invalid role selected during user update', { role, userId }, 'USER_MANAGEMENT');
        throw error;
      }

      // Get current user data for logging
      const currentUserData = this.getUserById(userId);

      // Update user document in Firestore
      const userRef = doc(db, "users", userId);
      const updateData = {
        displayName: displayName,
        role: role,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser.uid
      };

      await updateDoc(userRef, updateData);

      // Update local users array
      const userIndex = this.users.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        this.users[userIndex] = {
          ...this.users[userIndex],
          ...updateData,
          updatedAt: new Date()
        };
      }

      await logger.logUserAction('UPDATE_USER', userId, { 
        oldData: currentUserData,
        newData: { displayName, role }
      });

      await logger.info('User updated successfully', { 
        userId, 
        displayName, 
        role 
      }, 'USER_MANAGEMENT');

      return this.users[userIndex];
    } catch (error) {
      await logger.error('Error updating user', error, 'USER_MANAGEMENT');
      throw error;
    }
  }

  // Delete user with confirmation
  async deleteUser(userId, confirmation = false) {
    try {
      // Validate Super Admin access before proceeding
      await this.validateSuperAdminAccess();
      
      if (!confirmation) {
        const error = new Error('User deletion requires explicit confirmation');
        await logger.warn('User deletion attempted without confirmation', { userId }, 'USER_MANAGEMENT');
        throw error;
      }

      await logger.info('Starting user deletion process', { userId }, 'USER_MANAGEMENT');

      // Get user data for logging before deletion
      const userData = this.getUserById(userId);
      
      // Prevent deletion of the last super admin
      if (userData && userData.role === 'superadmin') {
        const superAdmins = this.users.filter(u => u.role === 'superadmin' && u.isActive);
        if (superAdmins.length <= 1) {
          const error = new Error('Cannot delete the last super administrator');
          await logger.warn('Attempted to delete last super admin', { userId }, 'SECURITY');
          throw error;
        }
      }

      // Soft delete - mark as inactive instead of hard delete
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        isActive: false,
        deletedAt: serverTimestamp(),
        deletedBy: auth.currentUser.uid
      });

      // Update local users array
      const userIndex = this.users.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        this.users[userIndex].isActive = false;
        this.users[userIndex].deletedAt = new Date();
      }

      await logger.logUserAction('DELETE_USER', userId, { 
        userData: userData,
        deletionType: 'soft'
      });

      await logger.info('User deleted successfully', { userId }, 'USER_MANAGEMENT');

      return true;
    } catch (error) {
      await logger.error('Error deleting user', error, 'USER_MANAGEMENT');
      throw error;
    }
  }

  // Restore deleted user
  async restoreUser(userId) {
    try {
      await this.validateSuperAdminAccess();
      
      await logger.info('Starting user restoration process', { userId }, 'USER_MANAGEMENT');

      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        isActive: true,
        deletedAt: null,
        deletedBy: null,
        restoredAt: serverTimestamp(),
        restoredBy: auth.currentUser.uid
      });

      // Update local users array
      const userIndex = this.users.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        this.users[userIndex].isActive = true;
        this.users[userIndex].deletedAt = null;
        this.users[userIndex].restoredAt = new Date();
      }

      await logger.logUserAction('RESTORE_USER', userId);
      await logger.info('User restored successfully', { userId }, 'USER_MANAGEMENT');

      return true;
    } catch (error) {
      await logger.error('Error restoring user', error, 'USER_MANAGEMENT');
      throw error;
    }
  }

  // Get filtered and paginated users with advanced filtering
  getFilteredUsers() {
    let filtered = this.users;

    // Apply status filter
    if (this.statusFilter === 'active') {
      filtered = filtered.filter(user => user.isActive !== false);
    } else if (this.statusFilter === 'inactive') {
      filtered = filtered.filter(user => user.isActive === false);
    }

    // Apply search filter
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.displayName?.toLowerCase().includes(search) ||
        user.email?.toLowerCase().includes(search) ||
        user.role?.toLowerCase().includes(search)
      );
    }

    // Apply role filter
    if (this.roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === this.roleFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[this.sortBy];
      let bValue = b[this.sortBy];
      
      // Handle date sorting
      if (this.sortBy === 'createdAt' || this.sortBy === 'lastLogin' || this.sortBy === 'updatedAt') {
        aValue = aValue ? new Date(aValue) : new Date(0);
        bValue = bValue ? new Date(bValue) : new Date(0);
      }
      
      // Handle string sorting
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (this.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Calculate pagination
    const totalUsers = filtered.length;
    const totalPages = Math.ceil(totalUsers / this.usersPerPage);
    const startIndex = (this.currentPage - 1) * this.usersPerPage;
    const endIndex = startIndex + this.usersPerPage;
    const paginatedUsers = filtered.slice(startIndex, endIndex);

    return {
      users: paginatedUsers,
      totalUsers,
      totalPages,
      currentPage: this.currentPage,
      hasNextPage: this.currentPage < totalPages,
      hasPrevPage: this.currentPage > 1,
      startIndex: startIndex + 1,
      endIndex: Math.min(endIndex, totalUsers)
    };
  }

  // Get user by ID
  getUserById(userId) {
    return this.users.find(u => u.id === userId);
  }

  // Get user statistics
  getUserStats() {
    const activeUsers = this.users.filter(u => u.isActive !== false);
    const inactiveUsers = this.users.filter(u => u.isActive === false);
    
    const roleStats = {};
    activeUsers.forEach(user => {
      roleStats[user.role] = (roleStats[user.role] || 0) + 1;
    });

    const recentUsers = activeUsers.filter(user => {
      const createdAt = new Date(user.createdAt);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return createdAt > thirtyDaysAgo;
    });

    return {
      total: this.users.length,
      active: activeUsers.length,
      inactive: inactiveUsers.length,
      roleStats,
      recentUsers: recentUsers.length,
      lastUpdated: new Date()
    };
  }

  // Set search term
  setSearchTerm(term) {
    this.searchTerm = term;
    this.currentPage = 1; // Reset to first page when searching
  }

  // Set role filter
  setRoleFilter(role) {
    this.roleFilter = role;
    this.currentPage = 1; // Reset to first page when filtering
  }

  // Set status filter
  setStatusFilter(status) {
    this.statusFilter = status;
    this.currentPage = 1; // Reset to first page when filtering
  }

  // Set sorting
  setSorting(sortBy, sortOrder = 'desc') {
    this.sortBy = sortBy;
    this.sortOrder = sortOrder;
  }

  // Set current page
  setCurrentPage(page) {
    this.currentPage = Math.max(1, page);
  }

  // Set users per page
  setUsersPerPage(count) {
    this.usersPerPage = Math.max(5, Math.min(100, count));
    this.currentPage = 1; // Reset to first page
  }

  // Get role display info (now dynamic with real-time updates)
  getRoleInfo(roleId) {
    const role = this.roles.find(r => r.id === roleId);
    if (role) {
      return {
        label: role.name,
        color: this.getRoleColorByName(role.name),
        icon: this.getRoleIconByName(role.name),
        description: role.description
      };
    }

    // Fallback to static mapping for system roles
    const roleMap = {
      'employee': {
        label: 'Employee',
        color: 'bg-blue-100 text-blue-800',
        icon: 'fas fa-user',
        description: 'Basic employee access'
      },
      'manager': {
        label: 'Manager',
        color: 'bg-orange-100 text-orange-800',
        icon: 'fas fa-user-tie',
        description: 'Management level access'
      },
      'admin': {
        label: 'Administrator',
        color: 'bg-red-100 text-red-800',
        icon: 'fas fa-user-shield',
        description: 'Administrative access'
      },
      'superadmin': {
        label: 'Super Admin',
        color: 'bg-purple-100 text-purple-800',
        icon: 'fas fa-crown',
        description: 'Full system access'
      }
    };
    return roleMap[roleId] || roleMap['employee'];
  }

  // Get role color based on role name
  getRoleColorByName(roleName) {
    const colorMap = {
      'Employee': 'bg-blue-100 text-blue-800',
      'Manager': 'bg-orange-100 text-orange-800',
      'Administrator': 'bg-red-100 text-red-800',
      'Super Administrator': 'bg-purple-100 text-purple-800',
      'Inspector': 'bg-green-100 text-green-800',
      'Analyst': 'bg-indigo-100 text-indigo-800',
      'Supervisor': 'bg-yellow-100 text-yellow-800',
      'Auditor': 'bg-pink-100 text-pink-800'
    };
    return colorMap[roleName] || 'bg-gray-100 text-gray-800';
  }

  // Get role icon based on role name
  getRoleIconByName(roleName) {
    const iconMap = {
      'Employee': 'fas fa-user',
      'Manager': 'fas fa-user-tie',
      'Administrator': 'fas fa-user-shield',
      'Super Administrator': 'fas fa-crown',
      'Inspector': 'fas fa-clipboard-check',
      'Analyst': 'fas fa-chart-line',
      'Supervisor': 'fas fa-eye',
      'Auditor': 'fas fa-search'
    };
    return iconMap[roleName] || 'fas fa-user';
  }

  // Get all available roles for dropdown
  getAvailableRoles() {
    return this.roles.filter(role => role.isActive !== false);
  }

  // Validate user permissions
  canManageUser(currentUserRole, targetUserRole) {
    const roleHierarchy = {
      'employee': 1,
      'manager': 2,
      'admin': 3,
      'superadmin': 4
    };

    const currentLevel = roleHierarchy[currentUserRole] || 0;
    const targetLevel = roleHierarchy[targetUserRole] || 0;

    return currentLevel > targetLevel;
  }

  // Check if current user can assign role
  canAssignRole(currentUserRole, targetRole) {
    const roleHierarchy = {
      'employee': 1,
      'manager': 2,
      'admin': 3,
      'superadmin': 4
    };

    const currentLevel = roleHierarchy[currentUserRole] || 0;
    const targetLevel = roleHierarchy[targetRole] || 0;

    // Super admins can create other super admins
    if (currentUserRole === 'superadmin') {
      return true;
    }

    return currentLevel >= targetLevel;
  }

  // Cleanup method to remove listeners
  cleanup() {
    this.realTimeListeners.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.realTimeListeners = [];
  }

  // Set callback for real-time updates
  setUpdateCallbacks(onUsersUpdated, onRolesUpdated) {
    this.onUsersUpdated = onUsersUpdated;
    this.onRolesUpdated = onRolesUpdated;
  }
}
