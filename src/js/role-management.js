
import { auth, db } from './firebase-config.js';
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
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

export class RoleManager {
  constructor() {
    this.roles = [];
    this.permissions = [];
    this.currentEditingRole = null;
    this.searchTerm = '';
    this.currentPage = 1;
    this.rolesPerPage = 10;
    this.realTimeListeners = [];
    this.onRolesUpdated = null;
    
    // Initialize default permissions structure
    this.initializePermissions();
    
    // Setup real-time listener for roles
    this.setupRealTimeListener();
  }

  // Setup real-time listener for roles collection
  setupRealTimeListener() {
    try {
      const rolesQuery = query(collection(db, "roles"), orderBy("createdAt", "desc"));
      const rolesUnsubscribe = onSnapshot(rolesQuery, (snapshot) => {
        this.roles = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate?.() || new Date()
        }));
        
        // Trigger UI update if callback is set
        if (this.onRolesUpdated) {
          this.onRolesUpdated(this.roles);
        }
      }, (error) => {
        console.error('Real-time roles listener error:', error);
      });

      this.realTimeListeners.push(rolesUnsubscribe);
    } catch (error) {
      console.error('Error setting up real-time listener:', error);
    }
  }

  // Initialize default permissions that can be assigned to roles
  initializePermissions() {
    this.defaultPermissions = {
      dashboard: {
        label: 'Dashboard',
        permissions: {
          view: 'View Dashboard',
          manage_stats: 'Manage Statistics'
        }
      },
      inspections: {
        label: 'Inspections',
        permissions: {
          view: 'View Inspections',
          create: 'Create Inspections',
          edit: 'Edit Inspections',
          delete: 'Delete Inspections',
          approve: 'Approve Inspections',
          perform: 'Perform Inspections'
        }
      },
      reports: {
        label: 'Reports',
        permissions: {
          view: 'View Reports',
          create: 'Create Reports',
          edit: 'Edit Reports',
          delete: 'Delete Reports',
          approve: 'Approve Reports',
          export: 'Export Reports'
        }
      },
      analytics: {
        label: 'Analytics',
        permissions: {
          view: 'View Analytics',
          export: 'Export Analytics',
          advanced: 'Advanced Analytics'
        }
      },
      user_management: {
        label: 'User Management',
        permissions: {
          view: 'View Users',
          create: 'Create Users',
          edit: 'Edit Users',
          delete: 'Delete Users',
          assign_roles: 'Assign Roles'
        }
      },
      role_management: {
        label: 'Role Management',
        permissions: {
          view: 'View Roles',
          create: 'Create Roles',
          edit: 'Edit Roles',
          delete: 'Delete Roles',
          manage_permissions: 'Manage Permissions'
        }
      },
      templates: {
        label: 'Templates',
        permissions: {
          view: 'View Templates',
          create: 'Create Templates',
          edit: 'Edit Templates',
          delete: 'Delete Templates'
        }
      },
      settings: {
        label: 'System Settings',
        permissions: {
          view: 'View Settings',
          edit: 'Edit Settings',
          backup: 'Backup System',
          restore: 'Restore System'
        }
      }
    };
  }

  // Validate if current user has Super Admin permissions
  validateSuperAdminAccess() {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    if (window.eicApp && window.eicApp.currentUserRole !== 'superadmin') {
      throw new Error('Access denied: Only Super Administrators can manage roles');
    }
    
    return true;
  }

  // Initialize default roles in Firestore if they don't exist
  async initializeDefaultRoles() {
    try {
      const defaultRoles = [
        {
          id: 'employee',
          name: 'Employee',
          description: 'Basic employee with limited access to perform inspections',
          isSystem: true,
          permissions: {
            dashboard: { view: true },
            inspections: { view: true, perform: true },
            reports: { view: true, create: true }
          },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'manager',
          name: 'Manager',
          description: 'Manager with additional permissions to approve reports and view analytics',
          isSystem: true,
          permissions: {
            dashboard: { view: true, manage_stats: true },
            inspections: { view: true, create: true, edit: true, perform: true, approve: true },
            reports: { view: true, create: true, edit: true, approve: true },
            analytics: { view: true },
            templates: { view: true }
          },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'admin',
          name: 'Administrator',
          description: 'Administrator with full access except role management',
          isSystem: true,
          permissions: {
            dashboard: { view: true, manage_stats: true },
            inspections: { view: true, create: true, edit: true, delete: true, approve: true, perform: true },
            reports: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
            analytics: { view: true, export: true, advanced: true },
            user_management: { view: true, create: true, edit: true, delete: true, assign_roles: true },
            templates: { view: true, create: true, edit: true, delete: true },
            settings: { view: true, edit: true }
          },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'superadmin',
          name: 'Super Administrator',
          description: 'Super Administrator with complete system access',
          isSystem: true,
          permissions: {
            dashboard: { view: true, manage_stats: true },
            inspections: { view: true, create: true, edit: true, delete: true, approve: true, perform: true },
            reports: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
            analytics: { view: true, export: true, advanced: true },
            user_management: { view: true, create: true, edit: true, delete: true, assign_roles: true },
            role_management: { view: true, create: true, edit: true, delete: true, manage_permissions: true },
            templates: { view: true, create: true, edit: true, delete: true },
            settings: { view: true, edit: true, backup: true, restore: true }
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      for (const role of defaultRoles) {
        const roleRef = doc(db, "roles", role.id);
        const roleSnap = await getDoc(roleRef);
        
        if (!roleSnap.exists()) {
          await setDoc(roleRef, {
            ...role,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      }
    } catch (error) {
      console.error('Error initializing default roles:', error);
    }
  }

  // Fetch all roles from Firestore
  async fetchRoles() {
    try {
      const rolesRef = collection(db, "roles");
      const q = query(rolesRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      
      this.roles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date()
      }));
      
      return this.roles;
    } catch (error) {
      console.error('Error fetching roles:', error);
      throw error;
    }
  }

  // Create new role
  async createRole(roleData) {
    try {
      this.validateSuperAdminAccess();
      
      const { name, description, permissions } = roleData;
      
      if (!name || !description) {
        throw new Error('Role name and description are required');
      }

      // Generate role ID from name (lowercase, replace spaces with underscores)
      const roleId = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      
      if (!roleId) {
        throw new Error('Invalid role name');
      }

      // Check if role already exists
      const roleRef = doc(db, "roles", roleId);
      const roleSnap = await getDoc(roleRef);
      if (roleSnap.exists()) {
        throw new Error('Role with this name already exists');
      }

      // Create role document
      const roleDoc = {
        name: name.trim(),
        description: description.trim(),
        permissions: permissions || {},
        isSystem: false,
        isActive: true,
        usersAssigned: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(roleRef, roleDoc);

      const newRole = {
        id: roleId,
        ...roleDoc,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.roles.push(newRole);
      return newRole;
    } catch (error) {
      console.error('Error creating role:', error);
      throw error;
    }
  }

  // Update existing role
  async updateRole(roleId, roleData) {
    try {
      this.validateSuperAdminAccess();
      
      const { name, description, permissions } = roleData;
      
      if (!name || !description) {
        throw new Error('Role name and description are required');
      }

      // Check if role exists
      const roleRef = doc(db, "roles", roleId);
      const roleSnap = await getDoc(roleRef);
      if (!roleSnap.exists()) {
        throw new Error('Role not found');
      }

      const currentRole = roleSnap.data();
      
      // Prevent editing system roles
      if (currentRole.isSystem) {
        throw new Error('System roles cannot be modified');
      }

      // Update role document
      const updateData = {
        name: name.trim(),
        description: description.trim(),
        permissions: permissions || currentRole.permissions,
        updatedAt: serverTimestamp()
      };

      await updateDoc(roleRef, updateData);

      // Update local roles array
      const roleIndex = this.roles.findIndex(r => r.id === roleId);
      if (roleIndex !== -1) {
        this.roles[roleIndex] = {
          ...this.roles[roleIndex],
          ...updateData,
          updatedAt: new Date()
        };
      }

      return this.roles[roleIndex];
    } catch (error) {
      console.error('Error updating role:', error);
      throw error;
    }
  }

  // Delete role
  async deleteRole(roleId) {
    try {
      this.validateSuperAdminAccess();
      
      // Check if role exists
      const roleRef = doc(db, "roles", roleId);
      const roleSnap = await getDoc(roleRef);
      if (!roleSnap.exists()) {
        throw new Error('Role not found');
      }

      const currentRole = roleSnap.data();
      
      // Prevent deleting system roles
      if (currentRole.isSystem) {
        throw new Error('System roles cannot be deleted');
      }

      // Check if any users are assigned to this role
      const usersRef = collection(db, "users");
      const usersWithRole = query(usersRef, where("role", "==", roleId));
      const usersSnapshot = await getDocs(usersWithRole);
      
      if (!usersSnapshot.empty) {
        throw new Error(`Cannot delete role: ${usersSnapshot.docs.length} user(s) are assigned to this role`);
      }

      // Delete role document
      await deleteDoc(roleRef);

      // Remove from local roles array
      this.roles = this.roles.filter(r => r.id !== roleId);

      return true;
    } catch (error) {
      console.error('Error deleting role:', error);
      throw error;
    }
  }

  // Get role by ID
  getRoleById(roleId) {
    return this.roles.find(r => r.id === roleId);
  }

  // Get all available roles for assignment
  getAvailableRoles() {
    return this.roles.filter(role => role.isActive !== false);
  }

  // Check if user has specific permission
  async hasPermission(userId, module, permission) {
    try {
      // Get user's role
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        return false;
      }

      const userRole = userSnap.data().role;
      
      // Super admin has all permissions
      if (userRole === 'superadmin') {
        return true;
      }

      // Get role permissions
      const roleRef = doc(db, "roles", userRole);
      const roleSnap = await getDoc(roleRef);
      
      if (!roleSnap.exists()) {
        return false;
      }

      const roleData = roleSnap.data();
      const rolePermissions = roleData.permissions || {};
      
      return rolePermissions[module]?.[permission] === true;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  // Get user permissions
  async getUserPermissions(userId) {
    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        return {};
      }

      const userRole = userSnap.data().role;
      
      // Super admin has all permissions
      if (userRole === 'superadmin') {
        const allPermissions = {};
        Object.keys(this.defaultPermissions).forEach(module => {
          allPermissions[module] = {};
          Object.keys(this.defaultPermissions[module].permissions).forEach(permission => {
            allPermissions[module][permission] = true;
          });
        });
        return allPermissions;
      }

      // Get role permissions
      const roleRef = doc(db, "roles", userRole);
      const roleSnap = await getDoc(roleRef);
      
      if (!roleSnap.exists()) {
        return {};
      }

      return roleSnap.data().permissions || {};
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return {};
    }
  }

  // Update users count for a role
  async updateRoleUsersCount(roleId) {
    try {
      const usersRef = collection(db, "users");
      const usersWithRole = query(usersRef, where("role", "==", roleId));
      const usersSnapshot = await getDocs(usersWithRole);
      
      const roleRef = doc(db, "roles", roleId);
      await updateDoc(roleRef, {
        usersAssigned: usersSnapshot.docs.length,
        updatedAt: serverTimestamp()
      });
      
      // Update local data
      const roleIndex = this.roles.findIndex(r => r.id === roleId);
      if (roleIndex !== -1) {
        this.roles[roleIndex].usersAssigned = usersSnapshot.docs.length;
      }
      
    } catch (error) {
      console.error('Error updating role users count:', error);
    }
  }

  // Get filtered roles
  getFilteredRoles() {
    let filtered = this.roles;

    // Apply search filter
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(role => 
        role.name?.toLowerCase().includes(search) ||
        role.description?.toLowerCase().includes(search)
      );
    }

    // Calculate pagination
    const totalRoles = filtered.length;
    const totalPages = Math.ceil(totalRoles / this.rolesPerPage);
    const startIndex = (this.currentPage - 1) * this.rolesPerPage;
    const endIndex = startIndex + this.rolesPerPage;
    const paginatedRoles = filtered.slice(startIndex, endIndex);

    return {
      roles: paginatedRoles,
      totalRoles,
      totalPages,
      currentPage: this.currentPage,
      hasNextPage: this.currentPage < totalPages,
      hasPrevPage: this.currentPage > 1
    };
  }

  // Set search term
  setSearchTerm(term) {
    this.searchTerm = term;
    this.currentPage = 1;
  }

  // Set current page
  setCurrentPage(page) {
    this.currentPage = page;
  }

  // Generate role badge HTML
  getRoleBadgeHTML(role) {
    const colors = {
      'employee': 'bg-blue-100 text-blue-800',
      'manager': 'bg-orange-100 text-orange-800',
      'admin': 'bg-red-100 text-red-800',
      'superadmin': 'bg-purple-100 text-purple-800'
    };
    
    const color = colors[role.id] || 'bg-gray-100 text-gray-800';
    const systemBadge = role.isSystem ? '<span class="ml-1 text-xs">(System)</span>' : '';
    
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}">
      ${role.name}${systemBadge}
    </span>`;
  }

  // Count permissions for a role
  countPermissions(permissions) {
    let count = 0;
    Object.values(permissions || {}).forEach(modulePerms => {
      Object.values(modulePerms || {}).forEach(permission => {
        if (permission === true) count++;
      });
    });
    return count;
  }

  // Set callback for real-time updates
  setUpdateCallback(onRolesUpdated) {
    this.onRolesUpdated = onRolesUpdated;
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
}
