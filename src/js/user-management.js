
import { auth, db } from './firebase-config.js';
import { 
  createUserWithEmailAndPassword, 
  deleteUser as deleteAuthUser,
  updateProfile
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
  where
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

export class UserManager {
  constructor() {
    this.users = [];
    this.currentEditingUser = null;
    this.searchTerm = '';
    this.currentPage = 1;
    this.usersPerPage = 10;
    this.roleFilter = 'all';
  }

  // Validate if current user has Super Admin permissions
  validateSuperAdminAccess() {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Get user role from the app instance if available
    if (window.eicApp && window.eicApp.currentUserRole !== 'superadmin') {
      throw new Error('Access denied: Only Super Administrators can manage users');
    }
    
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
        lastLogin: doc.data().lastLogin?.toDate?.() || new Date()
      }));
      
      return this.users;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  // Create new user
  async createUser(userData) {
    try {
      // Validate Super Admin access before proceeding
      this.validateSuperAdminAccess();
      
      const { email, password, displayName, role } = userData;
      
      // Validate required fields
      if (!email || !password || !displayName || !role) {
        throw new Error('All fields are required');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      // Validate password strength
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Check if user already exists
      const existingUsers = query(collection(db, "users"), where("email", "==", email));
      const existingSnapshot = await getDocs(existingUsers);
      if (!existingSnapshot.empty) {
        throw new Error('User with this email already exists');
      }

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update profile with display name
      await updateProfile(user, {
        displayName: displayName
      });

      // Create user document in Firestore
      const userDoc = {
        email: email,
        displayName: displayName,
        role: role,
        createdAt: serverTimestamp(),
        lastLogin: null,
        isActive: true
      };

      await setDoc(doc(db, "users", user.uid), userDoc);

      return {
        id: user.uid,
        uid: user.uid,
        ...userDoc,
        createdAt: new Date(),
        lastLogin: null
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Update user
  async updateUser(userId, userData) {
    try {
      // Validate Super Admin access before proceeding
      this.validateSuperAdminAccess();
      
      const { displayName, role } = userData;
      
      if (!displayName || !role) {
        throw new Error('Display name and role are required');
      }

      // Update user document in Firestore
      const userRef = doc(db, "users", userId);
      const updateData = {
        displayName: displayName,
        role: role,
        updatedAt: serverTimestamp()
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

      return this.users[userIndex];
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Delete user
  async deleteUser(userId) {
    try {
      // Validate Super Admin access before proceeding
      this.validateSuperAdminAccess();
      
      // Delete user document from Firestore
      await deleteDoc(doc(db, "users", userId));

      // Remove from local users array
      this.users = this.users.filter(u => u.id !== userId);

      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Get filtered and paginated users
  getFilteredUsers() {
    let filtered = this.users;

    // Apply search filter
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.displayName?.toLowerCase().includes(search) ||
        user.email?.toLowerCase().includes(search)
      );
    }

    // Apply role filter
    if (this.roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === this.roleFilter);
    }

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
      hasPrevPage: this.currentPage > 1
    };
  }

  // Get user by ID
  getUserById(userId) {
    return this.users.find(u => u.id === userId);
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

  // Set current page
  setCurrentPage(page) {
    this.currentPage = page;
  }

  // Get role display info (now dynamic)
  async getRoleInfo(role) {
    try {
      // Get role from Firestore
      const roleRef = doc(db, "roles", role);
      const roleSnap = await getDoc(roleRef);
      
      if (roleSnap.exists()) {
        const roleData = roleSnap.data();
        return {
          label: roleData.name,
          color: this.getRoleColorByName(roleData.name),
          icon: this.getRoleIconByName(roleData.name)
        };
      }
    } catch (error) {
      console.error('Error fetching role info:', error);
    }

    // Fallback to static mapping for system roles
    const roleMap = {
      'employee': {
        label: 'Employee',
        color: 'bg-blue-100 text-blue-800',
        icon: 'fas fa-user'
      },
      'manager': {
        label: 'Manager',
        color: 'bg-orange-100 text-orange-800',
        icon: 'fas fa-user-tie'
      },
      'admin': {
        label: 'Administrator',
        color: 'bg-red-100 text-red-800',
        icon: 'fas fa-user-shield'
      },
      'superadmin': {
        label: 'Super Admin',
        color: 'bg-purple-100 text-purple-800',
        icon: 'fas fa-crown'
      }
    };
    return roleMap[role] || roleMap['employee'];
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
      'Supervisor': 'bg-yellow-100 text-yellow-800'
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
      'Supervisor': 'fas fa-eye'
    };
    return iconMap[roleName] || 'fas fa-user';
  }

  // Get all available roles for dropdown
  async getAvailableRoles() {
    try {
      const rolesRef = collection(db, "roles");
      const snapshot = await getDocs(rolesRef);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        description: doc.data().description,
        isActive: doc.data().isActive !== false
      })).filter(role => role.isActive);
    } catch (error) {
      console.error('Error fetching available roles:', error);
      // Fallback to system roles
      return [
        { id: 'employee', name: 'Employee', description: 'Basic employee role' },
        { id: 'manager', name: 'Manager', description: 'Manager role' },
        { id: 'admin', name: 'Administrator', description: 'Administrator role' },
        { id: 'superadmin', name: 'Super Administrator', description: 'Super Administrator role' }
      ];
    }
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
}
