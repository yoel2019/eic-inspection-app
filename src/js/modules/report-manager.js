
/**
 * Módulo de gestión de reportes
 * Maneja la generación, exportación y gestión de reportes
 */

import logger from '../utils/logger.js';
import { FIREBASE_COLLECTIONS, EXPORT_FORMATS, SUCCESS_MESSAGES, ERROR_MESSAGES, COMPLIANCE_LEVELS, UTILS } from '../utils/constants.js';

class ReportManager {
  constructor(db, auth) {
    this.db = db;
    this.auth = auth;
    this.reports = [];
    this.currentReport = null;
    
    logger.info('ReportManager initialized', {}, 'REPORT_MANAGER');
  }

  /**
   * Generar reporte de inspecciones
   */
  async generateInspectionReport(filters = {}) {
    try {
      logger.debug('Generating inspection report', { filters }, 'REPORT_MANAGER');

      // Obtener inspecciones según filtros
      const inspections = await this.getFilteredInspections(filters);
      
      if (inspections.length === 0) {
        throw new Error('No se encontraron inspecciones para los filtros especificados');
      }

      // Calcular estadísticas
      const stats = this.calculateReportStatistics(inspections);
      
      // Crear reporte
      const report = {
        id: this.generateReportId(),
        title: this.generateReportTitle(filters),
        type: 'inspection_summary',
        filters,
        generatedAt: new Date(),
        generatedBy: this.auth.currentUser?.email || 'unknown',
        inspections,
        statistics: stats,
        summary: this.generateReportSummary(stats)
      };

      // Guardar reporte en Firestore
      await this.saveReport(report);
      
      this.currentReport = report;
      this.reports.unshift(report);

      logger.info('Inspection report generated successfully', { 
        id: report.id, 
        inspectionCount: inspections.length 
      }, 'REPORT_MANAGER');

      return report;

    } catch (error) {
      logger.error('Error generating inspection report', { error: error.message }, 'REPORT_MANAGER');
      throw new Error(error.message || ERROR_MESSAGES.SAVE_ERROR);
    }
  }

  /**
   * Generar reporte de cumplimiento
   */
  async generateComplianceReport(filters = {}) {
    try {
      logger.debug('Generating compliance report', { filters }, 'REPORT_MANAGER');

      const inspections = await this.getFilteredInspections(filters);
      
      if (inspections.length === 0) {
        throw new Error('No se encontraron inspecciones para los filtros especificados');
      }

      // Calcular métricas de cumplimiento
      const complianceData = this.calculateComplianceMetrics(inspections);
      
      const report = {
        id: this.generateReportId(),
        title: `Reporte de Cumplimiento - ${this.formatDateRange(filters)}`,
        type: 'compliance_analysis',
        filters,
        generatedAt: new Date(),
        generatedBy: this.auth.currentUser?.email || 'unknown',
        complianceData,
        recommendations: this.generateComplianceRecommendations(complianceData)
      };

      await this.saveReport(report);
      
      this.currentReport = report;
      this.reports.unshift(report);

      logger.info('Compliance report generated successfully', { id: report.id }, 'REPORT_MANAGER');

      return report;

    } catch (error) {
      logger.error('Error generating compliance report', { error: error.message }, 'REPORT_MANAGER');
      throw new Error(error.message || ERROR_MESSAGES.SAVE_ERROR);
    }
  }

  /**
   * Exportar reporte en formato específico
   */
  async exportReport(reportId, format = EXPORT_FORMATS.PDF) {
    try {
      logger.debug('Exporting report', { id: reportId, format }, 'REPORT_MANAGER');

      const report = await this.getReport(reportId);
      
      switch (format) {
        case EXPORT_FORMATS.PDF:
          return await this.exportToPDF(report);
        case EXPORT_FORMATS.EXCEL:
          return await this.exportToExcel(report);
        case EXPORT_FORMATS.CSV:
          return await this.exportToCSV(report);
        case EXPORT_FORMATS.JSON:
          return await this.exportToJSON(report);
        default:
          throw new Error(`Formato de exportación no soportado: ${format}`);
      }

    } catch (error) {
      logger.error('Error exporting report', { error: error.message, id: reportId }, 'REPORT_MANAGER');
      throw new Error(error.message || 'Error al exportar el reporte');
    }
  }

  /**
   * Exportar a PDF
   */
  async exportToPDF(report) {
    try {
      // Importar jsPDF dinámicamente
      const { jsPDF } = await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;
      let yPosition = margin;

      // Función para añadir texto con salto de línea automático
      const addText = (text, fontSize = 12, isBold = false) => {
        doc.setFontSize(fontSize);
        if (isBold) doc.setFont(undefined, 'bold');
        else doc.setFont(undefined, 'normal');
        
        const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
        doc.text(lines, margin, yPosition);
        yPosition += lines.length * (fontSize * 0.5) + 5;
        
        // Verificar si necesitamos nueva página
        if (yPosition > doc.internal.pageSize.height - margin) {
          doc.addPage();
          yPosition = margin;
        }
      };

      // Encabezado
      addText(report.title, 18, true);
      addText(`Generado: ${report.generatedAt.toLocaleString()}`, 10);
      addText(`Por: ${report.generatedBy}`, 10);
      yPosition += 10;

      // Resumen estadístico
      if (report.statistics) {
        addText('RESUMEN ESTADÍSTICO', 14, true);
        addText(`Total de inspecciones: ${report.statistics.totalInspections}`, 12);
        addText(`Promedio de cumplimiento: ${report.statistics.averageCompliance}%`, 12);
        addText(`Inspecciones completadas: ${report.statistics.completedInspections}`, 12);
        yPosition += 10;
      }

      // Datos de cumplimiento
      if (report.complianceData) {
        addText('ANÁLISIS DE CUMPLIMIENTO', 14, true);
        
        Object.entries(report.complianceData.byLevel).forEach(([level, count]) => {
          addText(`${level}: ${count} inspecciones`, 12);
        });
        yPosition += 10;
      }

      // Lista de inspecciones
      if (report.inspections && report.inspections.length > 0) {
        addText('DETALLE DE INSPECCIONES', 14, true);
        
        report.inspections.forEach((inspection, index) => {
          if (index >= 20) { // Limitar a 20 inspecciones para evitar PDFs muy largos
            addText('... (lista truncada)', 10);
            return;
          }
          
          addText(`${index + 1}. ${inspection.establishmentName}`, 12, true);
          addText(`   Fecha: ${inspection.date.toLocaleDateString()}`, 10);
          addText(`   Estado: ${inspection.status}`, 10);
          
          if (inspection.checklist) {
            const stats = this.calculateInspectionCompliance(inspection);
            addText(`   Cumplimiento: ${stats.compliancePercentage}%`, 10);
          }
          yPosition += 5;
        });
      }

      // Recomendaciones
      if (report.recommendations && report.recommendations.length > 0) {
        addText('RECOMENDACIONES', 14, true);
        report.recommendations.forEach((rec, index) => {
          addText(`${index + 1}. ${rec}`, 12);
        });
      }

      // Descargar PDF
      const fileName = `${report.title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
      doc.save(fileName);

      logger.info('Report exported to PDF successfully', { fileName }, 'REPORT_MANAGER');
      return fileName;

    } catch (error) {
      logger.error('Error exporting to PDF', { error: error.message }, 'REPORT_MANAGER');
      throw new Error('Error al generar PDF');
    }
  }

  /**
   * Exportar a Excel/CSV
   */
  async exportToExcel(report) {
    try {
      // Crear datos para Excel
      const worksheetData = [];
      
      // Encabezados
      worksheetData.push([
        'Establecimiento',
        'Fecha',
        'Inspector',
        'Estado',
        'Cumplimiento (%)',
        'Items Totales',
        'Items Cumplidos',
        'Observaciones'
      ]);

      // Datos de inspecciones
      if (report.inspections) {
        report.inspections.forEach(inspection => {
          const stats = this.calculateInspectionCompliance(inspection);
          worksheetData.push([
            inspection.establishmentName,
            inspection.date.toLocaleDateString(),
            inspection.inspectorEmail || inspection.inspectorId,
            inspection.status,
            stats.compliancePercentage,
            stats.totalItems,
            stats.completedItems,
            inspection.notes || ''
          ]);
        });
      }

      // Convertir a CSV
      const csvContent = worksheetData.map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n');

      // Descargar archivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const fileName = `${report.title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv`;
      
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();

      logger.info('Report exported to CSV successfully', { fileName }, 'REPORT_MANAGER');
      return fileName;

    } catch (error) {
      logger.error('Error exporting to Excel/CSV', { error: error.message }, 'REPORT_MANAGER');
      throw new Error('Error al generar archivo Excel/CSV');
    }
  }

  /**
   * Exportar a JSON
   */
  async exportToJSON(report) {
    try {
      const jsonData = JSON.stringify(report, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const link = document.createElement('a');
      const fileName = `${report.title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json`;
      
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();

      logger.info('Report exported to JSON successfully', { fileName }, 'REPORT_MANAGER');
      return fileName;

    } catch (error) {
      logger.error('Error exporting to JSON', { error: error.message }, 'REPORT_MANAGER');
      throw new Error('Error al generar archivo JSON');
    }
  }

  /**
   * Calcular estadísticas del reporte
   */
  calculateReportStatistics(inspections) {
    const stats = {
      totalInspections: inspections.length,
      completedInspections: 0,
      averageCompliance: 0,
      byStatus: {},
      byMonth: {},
      topEstablishments: [],
      complianceDistribution: {
        excellent: 0,
        good: 0,
        satisfactory: 0,
        needsImprovement: 0,
        poor: 0
      }
    };

    let totalCompliance = 0;
    const establishmentStats = new Map();

    inspections.forEach(inspection => {
      // Contar por estado
      stats.byStatus[inspection.status] = (stats.byStatus[inspection.status] || 0) + 1;
      
      // Contar por mes
      const month = inspection.date.toISOString().substring(0, 7); // YYYY-MM
      stats.byMonth[month] = (stats.byMonth[month] || 0) + 1;

      // Calcular cumplimiento
      const complianceStats = this.calculateInspectionCompliance(inspection);
      totalCompliance += complianceStats.compliancePercentage;

      if (inspection.status === 'completed') {
        stats.completedInspections++;
      }

      // Distribución de cumplimiento
      const level = UTILS.getComplianceLevel(complianceStats.compliancePercentage);
      switch (level) {
        case COMPLIANCE_LEVELS.EXCELLENT:
          stats.complianceDistribution.excellent++;
          break;
        case COMPLIANCE_LEVELS.GOOD:
          stats.complianceDistribution.good++;
          break;
        case COMPLIANCE_LEVELS.SATISFACTORY:
          stats.complianceDistribution.satisfactory++;
          break;
        case COMPLIANCE_LEVELS.NEEDS_IMPROVEMENT:
          stats.complianceDistribution.needsImprovement++;
          break;
        case COMPLIANCE_LEVELS.POOR:
          stats.complianceDistribution.poor++;
          break;
      }

      // Estadísticas por establecimiento
      const estName = inspection.establishmentName;
      if (!establishmentStats.has(estName)) {
        establishmentStats.set(estName, {
          name: estName,
          inspections: 0,
          totalCompliance: 0
        });
      }
      
      const estStats = establishmentStats.get(estName);
      estStats.inspections++;
      estStats.totalCompliance += complianceStats.compliancePercentage;
    });

    // Calcular promedio de cumplimiento
    stats.averageCompliance = inspections.length > 0 ? 
      Math.round(totalCompliance / inspections.length) : 0;

    // Top establecimientos por cumplimiento
    stats.topEstablishments = Array.from(establishmentStats.values())
      .map(est => ({
        ...est,
        averageCompliance: Math.round(est.totalCompliance / est.inspections)
      }))
      .sort((a, b) => b.averageCompliance - a.averageCompliance)
      .slice(0, 10);

    return stats;
  }

  /**
   * Calcular métricas de cumplimiento
   */
  calculateComplianceMetrics(inspections) {
    const metrics = {
      overall: {
        totalInspections: inspections.length,
        averageCompliance: 0,
        trend: 'stable'
      },
      byLevel: {
        [COMPLIANCE_LEVELS.EXCELLENT]: 0,
        [COMPLIANCE_LEVELS.GOOD]: 0,
        [COMPLIANCE_LEVELS.SATISFACTORY]: 0,
        [COMPLIANCE_LEVELS.NEEDS_IMPROVEMENT]: 0,
        [COMPLIANCE_LEVELS.POOR]: 0
      },
      byCategory: {},
      problemAreas: [],
      improvements: []
    };

    let totalCompliance = 0;
    const categoryStats = new Map();
    const problemItems = new Map();

    inspections.forEach(inspection => {
      const complianceStats = this.calculateInspectionCompliance(inspection);
      totalCompliance += complianceStats.compliancePercentage;

      // Clasificar por nivel
      const level = UTILS.getComplianceLevel(complianceStats.compliancePercentage);
      metrics.byLevel[level]++;

      // Analizar checklist por categorías
      if (inspection.checklist) {
        Object.entries(inspection.checklist).forEach(([itemId, response]) => {
          const category = this.getItemCategory(itemId);
          
          if (!categoryStats.has(category)) {
            categoryStats.set(category, { total: 0, compliant: 0 });
          }
          
          const catStats = categoryStats.get(category);
          catStats.total++;
          
          if (response.compliant === true) {
            catStats.compliant++;
          } else if (response.compliant === false) {
            // Contar problemas frecuentes
            const problemKey = `${category}:${itemId}`;
            problemItems.set(problemKey, (problemItems.get(problemKey) || 0) + 1);
          }
        });
      }
    });

    // Calcular promedio general
    metrics.overall.averageCompliance = inspections.length > 0 ? 
      Math.round(totalCompliance / inspections.length) : 0;

    // Calcular cumplimiento por categoría
    categoryStats.forEach((stats, category) => {
      metrics.byCategory[category] = {
        total: stats.total,
        compliant: stats.compliant,
        percentage: Math.round((stats.compliant / stats.total) * 100)
      };
    });

    // Identificar áreas problemáticas
    metrics.problemAreas = Array.from(problemItems.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => {
        const [category, itemId] = key.split(':');
        return {
          category,
          item: itemId,
          occurrences: count,
          percentage: Math.round((count / inspections.length) * 100)
        };
      });

    return metrics;
  }

  /**
   * Generar recomendaciones basadas en datos de cumplimiento
   */
  generateComplianceRecommendations(complianceData) {
    const recommendations = [];

    // Recomendaciones basadas en cumplimiento general
    if (complianceData.overall.averageCompliance < 60) {
      recommendations.push('Se requiere una revisión integral de los procesos de seguridad alimentaria');
      recommendations.push('Implementar programa de capacitación intensiva para todo el personal');
    } else if (complianceData.overall.averageCompliance < 80) {
      recommendations.push('Reforzar las áreas de menor cumplimiento identificadas');
      recommendations.push('Establecer revisiones más frecuentes de los procedimientos');
    }

    // Recomendaciones por categorías problemáticas
    Object.entries(complianceData.byCategory).forEach(([category, stats]) => {
      if (stats.percentage < 70) {
        recommendations.push(`Mejorar procedimientos en ${category} (${stats.percentage}% cumplimiento)`);
      }
    });

    // Recomendaciones por problemas frecuentes
    complianceData.problemAreas.slice(0, 3).forEach(problem => {
      if (problem.percentage > 30) {
        recommendations.push(`Atención prioritaria a ${problem.item} en ${problem.category} (${problem.percentage}% de incidencia)`);
      }
    });

    return recommendations;
  }

  /**
   * Calcular cumplimiento de una inspección individual
   */
  calculateInspectionCompliance(inspection) {
    if (!inspection.checklist) {
      return {
        totalItems: 0,
        completedItems: 0,
        compliancePercentage: 0
      };
    }

    const checklist = inspection.checklist;
    const totalItems = Object.keys(checklist).length;
    let completedItems = 0;

    Object.values(checklist).forEach(response => {
      if (response.compliant === true) {
        completedItems++;
      }
    });

    return {
      totalItems,
      completedItems,
      compliancePercentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
    };
  }

  /**
   * Obtener inspecciones filtradas
   */
  async getFilteredInspections(filters) {
    try {
      const { collection, query, where, orderBy, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js');
      
      let q = query(collection(this.db, FIREBASE_COLLECTIONS.INSPECTIONS));

      // Aplicar filtros
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }

      if (filters.inspectorId) {
        q = query(q, where('inspectorId', '==', filters.inspectorId));
      }

      // Ordenar por fecha
      q = query(q, orderBy('date', 'desc'));

      const snapshot = await getDocs(q);
      let inspections = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.() || new Date(doc.data().date)
      }));

      // Filtros adicionales que no se pueden hacer en Firestore
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        inspections = inspections.filter(inspection => inspection.date >= fromDate);
      }

      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        inspections = inspections.filter(inspection => inspection.date <= toDate);
      }

      if (filters.establishmentName) {
        const searchTerm = filters.establishmentName.toLowerCase();
        inspections = inspections.filter(inspection => 
          inspection.establishmentName.toLowerCase().includes(searchTerm)
        );
      }

      return inspections;

    } catch (error) {
      logger.error('Error getting filtered inspections', { error: error.message }, 'REPORT_MANAGER');
      throw new Error(ERROR_MESSAGES.LOAD_ERROR);
    }
  }

  /**
   * Guardar reporte en Firestore
   */
  async saveReport(report) {
    try {
      const { addDoc, collection } = await import('https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js');
      
      const reportData = {
        ...report,
        // Serializar datos complejos
        inspections: report.inspections?.map(inspection => ({
          ...inspection,
          date: inspection.date
        })) || []
      };

      await addDoc(collection(this.db, FIREBASE_COLLECTIONS.REPORTS), reportData);
      
    } catch (error) {
      logger.error('Error saving report', { error: error.message }, 'REPORT_MANAGER');
      // No lanzar error aquí para no interrumpir la generación del reporte
    }
  }

  /**
   * Obtener reporte por ID
   */
  async getReport(reportId) {
    const report = this.reports.find(r => r.id === reportId);
    if (!report) {
      throw new Error('Reporte no encontrado');
    }
    return report;
  }

  /**
   * Generar ID único para reporte
   */
  generateReportId() {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generar título del reporte
   */
  generateReportTitle(filters) {
    let title = 'Reporte de Inspecciones';
    
    if (filters.dateFrom || filters.dateTo) {
      title += ` - ${this.formatDateRange(filters)}`;
    }
    
    if (filters.status) {
      title += ` - Estado: ${filters.status}`;
    }
    
    return title;
  }

  /**
   * Formatear rango de fechas
   */
  formatDateRange(filters) {
    if (filters.dateFrom && filters.dateTo) {
      return `${new Date(filters.dateFrom).toLocaleDateString()} - ${new Date(filters.dateTo).toLocaleDateString()}`;
    } else if (filters.dateFrom) {
      return `Desde ${new Date(filters.dateFrom).toLocaleDateString()}`;
    } else if (filters.dateTo) {
      return `Hasta ${new Date(filters.dateTo).toLocaleDateString()}`;
    }
    return 'Todas las fechas';
  }

  /**
   * Generar resumen del reporte
   */
  generateReportSummary(stats) {
    return {
      totalInspections: stats.totalInspections,
      averageCompliance: stats.averageCompliance,
      completionRate: Math.round((stats.completedInspections / stats.totalInspections) * 100),
      topPerformer: stats.topEstablishments[0]?.name || 'N/A',
      mainConcerns: stats.complianceDistribution.poor + stats.complianceDistribution.needsImprovement
    };
  }

  /**
   * Obtener categoría de un item del checklist
   */
  getItemCategory(itemId) {
    // Mapeo básico de items a categorías
    // En una implementación real, esto vendría de la configuración del checklist
    const categoryMap = {
      'food_temp': 'Temperatura de Alimentos',
      'hygiene': 'Higiene Personal',
      'cleaning': 'Limpieza y Sanitización',
      'storage': 'Almacenamiento',
      'equipment': 'Equipamiento',
      'documentation': 'Documentación',
      'pest_control': 'Control de Plagas',
      'waste': 'Manejo de Residuos'
    };

    // Buscar coincidencia parcial
    for (const [key, category] of Object.entries(categoryMap)) {
      if (itemId.toLowerCase().includes(key)) {
        return category;
      }
    }

    return 'General';
  }
}

export default ReportManager;
