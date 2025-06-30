
# Guía de Mantenimiento - EIC Inspection App

## 📋 Índice
1. [Arquitectura del Sistema](#arquitectura-del-sistema)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Configuración del Entorno](#configuración-del-entorno)
4. [Procedimientos de Mantenimiento](#procedimientos-de-mantenimiento)
5. [Troubleshooting](#troubleshooting)
6. [Monitoreo y Logs](#monitoreo-y-logs)
7. [Backup y Recuperación](#backup-y-recuperación)
8. [Actualizaciones y Despliegues](#actualizaciones-y-despliegues)

---

## 🏗️ Arquitectura del Sistema

### Visión General
La aplicación EIC es una Single Page Application (SPA) construida con:
- **Frontend:** HTML5, CSS3, JavaScript ES6+, Tailwind CSS
- **Backend:** Firebase (Authentication, Firestore Database)
- **Hosting:** Servidor Node.js simple para desarrollo
- **Versionado:** Git con GitHub

### Diagrama de Arquitectura
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │    │   EIC App       │    │   Firebase      │
│                 │◄──►│   (Frontend)    │◄──►│   Services      │
│ - HTML/CSS/JS   │    │ - Authentication│    │ - Auth          │
│ - Tailwind CSS  │    │ - Role Mgmt     │    │ - Firestore     │
│ - SweetAlert2   │    │ - Inspections   │    │ - Hosting       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Componentes Principales

#### 1. EICApp (app.js)
- **Responsabilidad:** Controlador principal de la aplicación
- **Funciones clave:**
  - Gestión de estados de la aplicación
  - Enrutamiento de vistas
  - Coordinación entre módulos
  - Manejo de autenticación

#### 2. Authentication (auth.js)
- **Responsabilidad:** Gestión de autenticación de usuarios
- **Funciones clave:**
  - Login con Google y email
  - Logout de usuarios
  - Validación de sesiones

#### 3. User Management (user-management.js)
- **Responsabilidad:** Administración de usuarios
- **Funciones clave:**
  - CRUD de usuarios
  - Asignación de roles
  - Validación de permisos

#### 4. Role Management (role-management.js)
- **Responsabilidad:** Control de acceso basado en roles
- **Funciones clave:**
  - Definición de permisos
  - Validación de acceso
  - Gestión de roles

---

## 📁 Estructura del Proyecto

```
eic-inspection-app/
├── 📄 index.html                 # Página principal
├── 📄 simple-server.js          # Servidor de desarrollo
├── 📄 package.json              # Dependencias del proyecto
├── 📄 tailwind.config.js        # Configuración de Tailwind
├── 📁 src/
│   ├── 📁 js/
│   │   ├── 📄 app.js            # Aplicación principal
│   │   ├── 📄 auth.js           # Autenticación
│   │   ├── 📄 firebase-config.js # Configuración Firebase
│   │   ├── 📄 role-management.js # Gestión de roles
│   │   └── 📄 user-management.js # Gestión de usuarios
│   └── 📁 css/
│       ├── 📄 styles.css        # Estilos principales
│       ├── 📄 eic-colors.css    # Paleta de colores
│       ├── 📄 role-management.css
│       └── 📄 user-management.css
├── 📁 .github/
│   └── 📁 ISSUE_TEMPLATE/       # Templates para issues
├── 📄 README.md                 # Documentación principal
├── 📄 CHANGELOG.md              # Registro de cambios
├── 📄 BUGFIX_LOG.md             # Registro de errores
├── 📄 MERGE_PLAN.md             # Plan de fusión
└── 📄 MAINTENANCE_GUIDE.md      # Esta guía
```

---

## ⚙️ Configuración del Entorno

### Requisitos Previos
- Node.js (v14 o superior)
- npm (v6 o superior)
- Git
- Navegador web moderno
- Cuenta de Firebase

### Instalación Local
```bash
# 1. Clonar el repositorio
git clone https://github.com/yoel2019/eic-inspection-app.git
cd eic-inspection-app

# 2. Instalar dependencias
npm install

# 3. Configurar Firebase
# Editar src/js/firebase-config.js con tus credenciales

# 4. Iniciar servidor de desarrollo
node simple-server.js

# 5. Abrir en navegador
# http://localhost:3000
```

### Variables de Entorno
Crear archivo `.env` (no incluir en git):
```env
FIREBASE_API_KEY=tu_api_key
FIREBASE_AUTH_DOMAIN=tu_auth_domain
FIREBASE_PROJECT_ID=tu_project_id
FIREBASE_STORAGE_BUCKET=tu_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
FIREBASE_APP_ID=tu_app_id
```

---

## 🔧 Procedimientos de Mantenimiento

### Mantenimiento Diario
- [ ] Verificar logs de errores en Firebase Console
- [ ] Revisar métricas de uso de la aplicación
- [ ] Comprobar estado de los servicios de Firebase
- [ ] Verificar backups automáticos

### Mantenimiento Semanal
- [ ] Revisar y actualizar dependencias de npm
- [ ] Analizar reportes de errores de usuarios
- [ ] Verificar rendimiento de la aplicación
- [ ] Revisar y cerrar issues resueltos en GitHub

### Mantenimiento Mensual
- [ ] Actualizar documentación técnica
- [ ] Revisar y optimizar consultas a Firestore
- [ ] Analizar métricas de rendimiento
- [ ] Planificar actualizaciones de seguridad
- [ ] Revisar y actualizar roles y permisos

### Mantenimiento Trimestral
- [ ] Auditoría completa de seguridad
- [ ] Revisión de arquitectura y refactoring
- [ ] Actualización de dependencias mayores
- [ ] Revisión de estrategia de backup
- [ ] Capacitación del equipo en nuevas funcionalidades

---

## 🔍 Troubleshooting

### Problemas Comunes

#### 1. Error de Autenticación
**Síntomas:**
- Usuario no puede iniciar sesión
- Error "Firebase Auth not initialized"

**Diagnóstico:**
```javascript
// Verificar en consola del navegador
console.log('Firebase Auth:', auth);
console.log('Firebase Config:', firebaseConfig);
```

**Soluciones:**
1. Verificar configuración de Firebase en `firebase-config.js`
2. Comprobar que el dominio esté autorizado en Firebase Console
3. Verificar que las APIs estén habilitadas

#### 2. Problemas de Permisos
**Síntomas:**
- Usuario no puede acceder a ciertas funciones
- Error "Insufficient permissions"

**Diagnóstico:**
```javascript
// Verificar rol del usuario
console.log('User Role:', eicApp.currentUserRole);
console.log('User Data:', eicApp.currentUser);
```

**Soluciones:**
1. Verificar asignación de roles en Firestore
2. Comprobar lógica de validación de permisos
3. Revisar reglas de seguridad de Firestore

#### 3. Problemas de Rendimiento
**Síntomas:**
- Carga lenta de la aplicación
- Timeouts en consultas

**Diagnóstico:**
```javascript
// Medir tiempos de carga
console.time('App Load');
// ... código de inicialización
console.timeEnd('App Load');
```

**Soluciones:**
1. Optimizar consultas a Firestore
2. Implementar paginación en listas grandes
3. Usar índices compuestos en Firestore
4. Implementar caché local

#### 4. Errores de JavaScript
**Síntomas:**
- Funcionalidades no responden
- Errores en consola del navegador

**Diagnóstico:**
1. Abrir DevTools (F12)
2. Revisar pestaña Console
3. Revisar pestaña Network para errores de carga

**Soluciones:**
1. Verificar sintaxis de JavaScript
2. Comprobar importaciones de módulos
3. Validar referencias a elementos DOM

### Herramientas de Diagnóstico

#### Firebase Console
- **URL:** https://console.firebase.google.com
- **Uso:** Monitorear autenticación, base de datos, errores
- **Métricas clave:** Usuarios activos, consultas por segundo, errores

#### Browser DevTools
```javascript
// Comandos útiles en consola
// Verificar estado de la aplicación
window.eicApp

// Verificar usuario actual
window.eicApp.currentUser

// Verificar datos cargados
window.eicApp.reports
window.eicApp.users

// Forzar recarga de datos
window.eicApp.fetchReports()
window.eicApp.fetchUsers()
```

---

## 📊 Monitoreo y Logs

### Métricas Clave
1. **Usuarios Activos:** Diarios, semanales, mensuales
2. **Tiempo de Respuesta:** Carga inicial, navegación
3. **Errores:** Tasa de errores, tipos de errores
4. **Uso de Funcionalidades:** Inspecciones creadas, reportes generados

### Sistema de Logs
```javascript
// Implementar logger centralizado
class Logger {
  static log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      user: eicApp?.currentUser?.email || 'anonymous'
    };
    
    console.log(`[${level}] ${message}`, data);
    
    // Enviar a Firebase Analytics si es necesario
    if (level === 'ERROR') {
      this.reportError(logEntry);
    }
  }
  
  static error(message, data) { this.log('ERROR', message, data); }
  static warn(message, data) { this.log('WARN', message, data); }
  static info(message, data) { this.log('INFO', message, data); }
  static debug(message, data) { this.log('DEBUG', message, data); }
}
```

---

## 💾 Backup y Recuperación

### Estrategia de Backup
1. **Firestore:** Backup automático diario configurado en Firebase
2. **Código:** Versionado en GitHub con tags de release
3. **Configuración:** Documentada en este archivo

### Procedimiento de Recuperación
```bash
# 1. Restaurar desde backup de Firestore
# (Usar Firebase Console o CLI)

# 2. Restaurar código desde tag específico
git checkout v1.0.0-stable

# 3. Verificar configuración
npm install
node simple-server.js

# 4. Verificar funcionalidad
# - Login de usuarios
# - Creación de inspecciones
# - Generación de reportes
```

### Plan de Contingencia
1. **Fallo de Firebase:** Migrar a backup de base de datos
2. **Fallo de código:** Revertir a última versión estable
3. **Fallo de servidor:** Desplegar en servidor alternativo

---

## 🚀 Actualizaciones y Despliegues

### Proceso de Actualización
```bash
# 1. Crear rama para nueva funcionalidad
git checkout -b feature/nueva-funcionalidad

# 2. Desarrollar y probar
# ... desarrollo ...

# 3. Crear Pull Request
# Usar template de GitHub

# 4. Revisión de código
# Al menos 1 aprobación requerida

# 5. Merge a main
git checkout main
git merge feature/nueva-funcionalidad

# 6. Crear tag de versión
git tag v1.1.0
git push origin v1.1.0

# 7. Desplegar a producción
# Seguir checklist de despliegue
```

### Checklist de Despliegue
- [ ] Tests pasando
- [ ] Documentación actualizada
- [ ] Backup realizado
- [ ] Configuración verificada
- [ ] Rollback plan preparado
- [ ] Monitoreo activado
- [ ] Equipo notificado

### Versionado Semántico
- **MAJOR (X.0.0):** Cambios incompatibles
- **MINOR (0.X.0):** Nuevas funcionalidades compatibles
- **PATCH (0.0.X):** Correcciones de errores

---

## 📞 Contactos y Escalación

### Equipo de Desarrollo
- **Desarrollador Principal:** [email]
- **DevOps:** [email]
- **QA:** [email]

### Escalación de Incidentes
1. **Nivel 1:** Desarrollador asignado
2. **Nivel 2:** Lead Developer
3. **Nivel 3:** CTO/Technical Director

### Horarios de Soporte
- **Horario normal:** Lunes a Viernes, 9:00 - 18:00
- **Emergencias:** 24/7 para incidentes críticos
- **Tiempo de respuesta:** 
  - Crítico: 1 hora
  - Alto: 4 horas
  - Medio: 24 horas
  - Bajo: 72 horas

---

## 📚 Referencias Adicionales

### Documentación Externa
- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [MDN Web Docs](https://developer.mozilla.org/)

### Herramientas Recomendadas
- **IDE:** Visual Studio Code
- **Extensions:** 
  - Firebase Explorer
  - Tailwind CSS IntelliSense
  - GitLens
  - Live Server

### Recursos de Aprendizaje
- [JavaScript ES6+ Features](https://es6-features.org/)
- [Firebase Best Practices](https://firebase.google.com/docs/guides)
- [Web Performance Optimization](https://web.dev/performance/)

---

*Última actualización: 30 de Junio, 2025*
*Versión del documento: 1.0*
*Mantenido por: Equipo de Desarrollo EIC*
