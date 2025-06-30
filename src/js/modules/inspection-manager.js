
/**
 * Módulo de gestión de inspecciones
 * Maneja toda la lógica relacionada con inspecciones
 */

import logger from '../utils/logger.js';
import validator from '../utils/validator.js';
import { INSPECTION_STATUS, FIREBASE_COLLECTIONS, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../utils/constants.js';

class InspectionManager {
  constructor(db, auth) {
    this.db = db;
    this.auth = auth;
    this.inspections = [];
    this.currentInspection = null;
    this.listeners = [];
    
    logger.info('InspectionManager initialized', {}, 'INSPECTION_MANAGER');
  }

  /**
   * Obtener todas las inspecciones del usuario actual
   */
  async fetchInspections() {
    try {
      logger.debug('Fetching inspections', {}, 'INSPECTION_MANAGER');
      
      const { collection, query, orderBy, where, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js');
      
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Determinar qué inspecciones puede ver el usuario
      let q;
      const userRole = await this.getUserRole(user.uid);
      
      if (userRole === 'admin' || userRole === 'superadmin') {
        // Admins pueden ver todas las inspecciones
        q = query(
          collection(this.db, FIREBASE_COLLECTIONS.INSPECTIONS),
          orderBy('date', 'desc')
        );
      } else {
        // Inspectores solo ven sus propias inspecciones
        q = query(
          collection(this.db, FIREBASE_COLLECTIONS.INSPECTIONS),
          where('inspectorId', '==', user.uid),
          orderBy('date', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      this.inspections = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.() || new Date(doc.data().date)
      }));

      logger.info('Inspections fetched successfully', { count: this.inspections.length }, 'INSPECTION_MANAGER');
      return this.inspections;

    } catch (error) {
      logger.error('Error fetching inspections', { error: error.message }, 'INSPECTION_MANAGER');
      throw new Error(ERROR_MESSAGES.LOAD_ERROR);
    }
  }

  /**
   * Crear una nueva inspección
   */
  async createInspection(inspectionData) {
    try {
      logger.debug('Creating new inspection', { establishmentName: inspectionData.establishmentName }, 'INSPECTION_MANAGER');

      // Validar datos de inspección
      const validationResult = validator.validateInspectionData(inspectionData);
      if (!validationResult.isValid) {
        logger.warn('Validation failed for new inspection', { errors: validationResult.errors }, 'INSPECTION_MANAGER');
        throw new Error(validationResult.errors.map(e => e.message).join(', '));
      }

      const { addDoc, collection, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js');
      
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const newInspection = {
        ...inspectionData,
        inspectorId: user.uid,
        inspectorEmail: user.email,
        status: INSPECTION_STATUS.DRAFT,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        date: new Date(inspectionData.date)
      };

      const docRef = await addDoc(collection(this.db, FIREBASE_COLLECTIONS.INSPECTIONS), newInspection);
      
      const createdInspection = {
        id: docRef.id,
        ...newInspection,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.inspections.unshift(createdInspection);
      this.currentInspection = createdInspection;

      logger.info('Inspection created successfully', { id: docRef.id }, 'INSPECTION_MANAGER');
      
      // Disparar evento personalizado
      this.dispatchEvent('inspectionCreated', createdInspection);
      
      return createdInspection;

    } catch (error) {
      logger.error('Error creating inspection', { error: error.message }, 'INSPECTION_MANAGER');
      throw new Error(error.message || ERROR_MESSAGES.SAVE_ERROR);
    }
  }

  /**
   * Actualizar una inspección existente
   */
  async updateInspection(inspectionId, updateData) {
    try {
      logger.debug('Updating inspection', { id: inspectionId }, 'INSPECTION_MANAGER');

      const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js');
      
      // Verificar permisos
      const canEdit = await this.canEditInspection(inspectionId);
      if (!canEdit) {
        throw new Error(ERROR_MESSAGES.PERMISSION_DENIED);
      }

      const updatedData = {
        ...updateData,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(this.db, FIREBASE_COLLECTIONS.INSPECTIONS, inspectionId), updatedData);

      // Actualizar en memoria
      const index = this.inspections.findIndex(inspection => inspection.id === inspectionId);
      if (index !== -1) {
        this.inspections[index] = {
          ...this.inspections[index],
          ...updatedData,
          updatedAt: new Date()
        };
      }

      logger.info('Inspection updated successfully', { id: inspectionId }, 'INSPECTION_MANAGER');
      
      // Disparar evento personalizado
      this.dispatchEvent('inspectionUpdated', this.inspections[index]);
      
      return this.inspections[index];

    } catch (error) {
      logger.error('Error updating inspection', { error: error.message, id: inspectionId }, 'INSPECTION_MANAGER');
      throw new Error(error.message || ERROR_MESSAGES.SAVE_ERROR);
    }
  }

  /**
   * Eliminar una inspección
   */
  async deleteInspection(inspectionId) {
    try {
      logger.debug('Deleting inspection', { id: inspectionId }, 'INSPECTION_MANAGER');

      const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js');
      
      // Verificar permisos
      const canDelete = await this.canDeleteInspection(inspectionId);
      if (!canDelete) {
        throw new Error(ERROR_MESSAGES.PERMISSION_DENIED);
      }

      await deleteDoc(doc(this.db, FIREBASE_COLLECTIONS.INSPECTIONS, inspectionId));

      // Remover de memoria
      this.inspections = this.inspections.filter(inspection => inspection.id !== inspectionId);

      logger.info('Inspection deleted successfully', { id: inspectionId }, 'INSPECTION_MANAGER');
      
      // Disparar evento personalizado
      this.dispatchEvent('inspectionDeleted', { id: inspectionId });

    } catch (error) {
      logger.error('Error deleting inspection', { error: error.message, id: inspectionId }, 'INSPECTION_MANAGER');
      throw new Error(error.message || ERROR_MESSAGES.SAVE_ERROR);
    }
  }

  /**
   * Obtener una inspección específica
   */
  async getInspection(inspectionId) {
    try {
      // Buscar primero en memoria
      let inspection = this.inspections.find(i => i.id === inspectionId);
      
      if (!inspection) {
        // Si no está en memoria, buscar en Firestore
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js');
        
        const docRef = doc(this.db, FIREBASE_COLLECTIONS.INSPECTIONS, inspectionId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          inspection = {
            id: docSnap.id,
            ...docSnap.data(),
            date: docSnap.data().date?.toDate?.() || new Date(docSnap.data().date)
          };
        } else {
          throw new Error(ERROR_MESSAGES.INSPECTION_NOT_FOUND);
        }
      }

      // Verificar permisos de lectura
      const canView = await this.canViewInspection(inspection);
      if (!canView) {
        throw new Error(ERROR_MESSAGES.PERMISSION_DENIED);
      }

      this.currentInspection = inspection;
      return inspection;

    } catch (error) {
      logger.error('Error getting inspection', { error: error.message, id: inspectionId }, 'INSPECTION_MANAGER');
      throw new Error(error.message || ERROR_MESSAGES.LOAD_ERROR);
    }
  }

  /**
   * Cambiar estado de una inspección
   */
  async changeInspectionStatus(inspectionId, newStatus) {
    try {
      logger.debug('Changing inspection status', { id: inspectionId, status: newStatus }, 'INSPECTION_MANAGER');

      // Validar que el estado sea válido
      if (!Object.values(INSPECTION_STATUS).includes(newStatus)) {
        throw new Error('Estado de inspección inválido');
      }

      // Verificar permisos para cambiar estado
      const canChangeStatus = await this.canChangeInspectionStatus(inspectionId, newStatus);
      if (!canChangeStatus) {
        throw new Error(ERROR_MESSAGES.PERMISSION_DENIED);
      }

      await this.updateInspection(inspectionId, { status: newStatus });

      logger.info('Inspection status changed successfully', { id: inspectionId, status: newStatus }, 'INSPECTION_MANAGER');

    } catch (error) {
      logger.error('Error changing inspection status', { error: error.message, id: inspectionId }, 'INSPECTION_MANAGER');
      throw error;
    }
  }

  /**
   * Calcular estadísticas de cumplimiento para una inspección
   */
  calculateComplianceStats(inspection) {
    if (!inspection.checklist) {
      return {
        totalItems: 0,
        completedItems: 0,
        compliancePercentage: 0,
        nonCompliantItems: []
      };
    }

    const checklist = inspection.checklist;
    const totalItems = Object.keys(checklist).length;
    let completedItems = 0;
    const nonCompliantItems = [];

    for (const [itemId, response] of Object.entries(checklist)) {
      if (response.compliant === true) {
        completedItems++;
      } else if (response.compliant === false) {
        nonCompliantItems.push({
          id: itemId,
          description: response.description || itemId,
          notes: response.notes
        });
      }
    }

    const compliancePercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return {
      totalItems,
      completedItems,
      compliancePercentage,
      nonCompliantItems
    };
  }

  /**
   * Obtener inspecciones filtradas
   */
  getFilteredInspections(filters = {}) {
    let filtered = [...this.inspections];

    if (filters.status) {
      filtered = filtered.filter(inspection => inspection.status === filters.status);
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(inspection => inspection.date >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // Final del día
      filtered = filtered.filter(inspection => inspection.date <= toDate);
    }

    if (filters.establishmentName) {
      const searchTerm = filters.establishmentName.toLowerCase();
      filtered = filtered.filter(inspection => 
        inspection.establishmentName.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.inspectorId) {
      filtered = filtered.filter(inspection => inspection.inspectorId === filters.inspectorId);
    }

    return filtered;
  }

  /**
   * Verificar si el usuario puede editar una inspección
   */
  async canEditInspection(inspectionId) {
    try {
      const user = this.auth.currentUser;
      if (!user) return false;

      const userRole = await this.getUserRole(user.uid);
      
      // Superadmins y admins pueden editar cualquier inspección
      if (userRole === 'superadmin' || userRole === 'admin') {
        return true;
      }

      // Inspectores solo pueden editar sus propias inspecciones
      const inspection = await this.getInspection(inspectionId);
      return inspection.inspectorId === user.uid;

    } catch (error) {
      logger.error('Error checking edit permissions', { error: error.message, id: inspectionId }, 'INSPECTION_MANAGER');
      return false;
    }
  }

  /**
   * Verificar si el usuario puede ver una inspección
   */
  async canViewInspection(inspection) {
    try {
      const user = this.auth.currentUser;
      if (!user) return false;

      const userRole = await this.getUserRole(user.uid);
      
      // Superadmins y admins pueden ver cualquier inspección
      if (userRole === 'superadmin' || userRole === 'admin') {
        return true;
      }

      // Inspectores solo pueden ver sus propias inspecciones
      return inspection.inspectorId === user.uid;

    } catch (error) {
      logger.error('Error checking view permissions', { error: error.message }, 'INSPECTION_MANAGER');
      return false;
    }
  }

  /**
   * Verificar si el usuario puede eliminar una inspección
   */
  async canDeleteInspection(inspectionId) {
    try {
      const user = this.auth.currentUser;
      if (!user) return false;

      const userRole = await this.getUserRole(user.uid);
      
      // Solo superadmins pueden eliminar inspecciones
      if (userRole === 'superadmin') {
        return true;
      }

      // Admins pueden eliminar inspecciones en estado draft
      if (userRole === 'admin') {
        const inspection = await this.getInspection(inspectionId);
        return inspection.status === INSPECTION_STATUS.DRAFT;
      }

      return false;

    } catch (error) {
      logger.error('Error checking delete permissions', { error: error.message, id: inspectionId }, 'INSPECTION_MANAGER');
      return false;
    }
  }

  /**
   * Verificar si el usuario puede cambiar el estado de una inspección
   */
  async canChangeInspectionStatus(inspectionId, newStatus) {
    try {
      const user = this.auth.currentUser;
      if (!user) return false;

      const userRole = await this.getUserRole(user.uid);
      const inspection = await this.getInspection(inspectionId);

      // Superadmins pueden cambiar cualquier estado
      if (userRole === 'superadmin') {
        return true;
      }

      // Admins pueden cambiar la mayoría de estados
      if (userRole === 'admin') {
        return [
          INSPECTION_STATUS.IN_PROGRESS,
          INSPECTION_STATUS.COMPLETED,
          INSPECTION_STATUS.REVIEWED,
          INSPECTION_STATUS.APPROVED,
          INSPECTION_STATUS.REJECTED
        ].includes(newStatus);
      }

      // Inspectores solo pueden cambiar sus propias inspecciones a ciertos estados
      if (userRole === 'inspector' && inspection.inspectorId === user.uid) {
        return [
          INSPECTION_STATUS.IN_PROGRESS,
          INSPECTION_STATUS.COMPLETED
        ].includes(newStatus);
      }

      return false;

    } catch (error) {
      logger.error('Error checking status change permissions', { error: error.message, id: inspectionId }, 'INSPECTION_MANAGER');
      return false;
    }
  }

  /**
   * Obtener rol del usuario
   */
  async getUserRole(userId) {
    try {
      const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js');
      
      const userDoc = await getDoc(doc(this.db, FIREBASE_COLLECTIONS.USERS, userId));
      return userDoc.exists() ? userDoc.data().role : 'inspector';
    } catch (error) {
      logger.error('Error getting user role', { error: error.message, userId }, 'INSPECTION_MANAGER');
      return 'inspector';
    }
  }

  /**
   * Configurar listeners en tiempo real
   */
  setupRealtimeListeners() {
    try {
      const { collection, query, orderBy, where, onSnapshot } = import('https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js').then(module => module);
      
      const user = this.auth.currentUser;
      if (!user) return;

      // Listener para inspecciones del usuario
      this.getUserRole(user.uid).then(userRole => {
        let q;
        
        if (userRole === 'admin' || userRole === 'superadmin') {
          q = query(
            collection(this.db, FIREBASE_COLLECTIONS.INSPECTIONS),
            orderBy('date', 'desc')
          );
        } else {
          q = query(
            collection(this.db, FIREBASE_COLLECTIONS.INSPECTIONS),
            where('inspectorId', '==', user.uid),
            orderBy('date', 'desc')
          );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
          this.inspections = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date?.toDate?.() || new Date(doc.data().date)
          }));

          this.dispatchEvent('inspectionsUpdated', this.inspections);
        });

        this.listeners.push(unsubscribe);
      });

    } catch (error) {
      logger.error('Error setting up realtime listeners', { error: error.message }, 'INSPECTION_MANAGER');
    }
  }

  /**
   * Limpiar listeners
   */
  cleanup() {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners = [];
    logger.debug('InspectionManager cleanup completed', {}, 'INSPECTION_MANAGER');
  }

  /**
   * Disparar evento personalizado
   */
  dispatchEvent(eventName, data) {
    const event = new CustomEvent(eventName, { detail: data });
    window.dispatchEvent(event);
  }
}

export default InspectionManager;
