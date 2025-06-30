
# Guía de Resolución de Problemas - EIC Inspection App

## 🚨 Problemas Críticos

### 1. Aplicación No Carga / Pantalla Blanca

#### Síntomas
- Página en blanco al acceder a la aplicación
- Error en consola: "Cannot read property of undefined"
- Spinner de carga infinito

#### Diagnóstico
```javascript
// Abrir DevTools (F12) y ejecutar en consola:
console.log('Firebase initialized:', typeof firebase !== 'undefined');
console.log('EIC App:', window.eicApp);
console.log('Current errors:', window.onerror);
```

#### Soluciones
1. **Verificar configuración de Firebase:**
   ```javascript
   // Revisar src/js/firebase-config.js
   const firebaseConfig = {
     apiKey: "...", // No debe estar vacío
     authDomain: "...", // Debe terminar en .firebaseapp.com
     projectId: "...", // ID del proyecto Firebase
     // ... resto de configuración
   };
   ```

2. **Verificar carga de scripts:**
   ```html
   <!-- En index.html, verificar orden de scripts -->
   <script type="module" src="src/js/firebase-config.js"></script>
   <script type="module" src="src/js/auth.js"></script>
   <script type="module" src="src/js/app.js"></script>
   ```

3. **Limpiar caché del navegador:**
   - Chrome: Ctrl+Shift+R
   - Firefox: Ctrl+F5
   - Safari: Cmd+Shift+R

### 2. Error de Autenticación

#### Síntomas
- "Firebase Auth not initialized"
- "Invalid API key"
- Login no funciona

#### Diagnóstico
```javascript
// Verificar estado de autenticación
import { auth } from './firebase-config.js';
console.log('Auth instance:', auth);
console.log('Current user:', auth.currentUser);
```

#### Soluciones
1. **Verificar API Key:**
   - Ir a Firebase Console > Project Settings > General
   - Copiar Web API Key correcta
   - Actualizar en firebase-config.js

2. **Verificar dominios autorizados:**
   - Firebase Console > Authentication > Settings > Authorized domains
   - Añadir localhost:3000 para desarrollo
   - Añadir dominio de producción

3. **Verificar proveedores habilitados:**
   - Firebase Console > Authentication > Sign-in method
   - Habilitar Google y Email/Password

### 3. Problemas de Base de Datos

#### Síntomas
- "Permission denied" al leer/escribir datos
- Datos no se cargan
- Error "Insufficient permissions"

#### Diagnóstico
```javascript
// Verificar conexión a Firestore
import { db } from './firebase-config.js';
import { collection, getDocs } from 'firebase/firestore';

async function testConnection() {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    console.log('Connection OK, docs:', snapshot.size);
  } catch (error) {
    console.error('Connection failed:', error);
  }
}
testConnection();
```

#### Soluciones
1. **Verificar reglas de Firestore:**
   ```javascript
   // Firebase Console > Firestore Database > Rules
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

2. **Verificar índices:**
   - Firebase Console > Firestore Database > Indexes
   - Crear índices necesarios para consultas complejas

---

## ⚠️ Problemas Comunes

### 1. Roles de Usuario No Funcionan

#### Síntomas
- Usuario no puede acceder a funciones de admin
- Rol no se actualiza después de cambio
- Error "Role not found"

#### Diagnóstico
```javascript
// Verificar rol del usuario actual
console.log('Current user role:', window.eicApp?.currentUserRole);
console.log('User data:', window.eicApp?.currentUser);

// Verificar en Firestore
import { doc, getDoc } from 'firebase/firestore';
async function checkUserRole(userId) {
  const userDoc = await getDoc(doc(db, 'users', userId));
  console.log('User role in DB:', userDoc.data()?.role);
}
```

#### Soluciones
1. **Verificar documento de usuario en Firestore:**
   - Ir a Firestore Console
   - Navegar a collection 'users'
   - Verificar que el documento del usuario tenga campo 'role'

2. **Forzar actualización de rol:**
   ```javascript
   // En consola del navegador
   await window.eicApp.fetchUserRole();
   window.eicApp.render();
   ```

3. **Crear usuario manualmente en Firestore:**
   ```javascript
   // Estructura correcta del documento
   {
     email: "usuario@ejemplo.com",
     role: "admin", // o "inspector", "superadmin"
     createdAt: new Date(),
     active: true
   }
   ```

### 2. Inspecciones No Se Guardan

#### Síntomas
- Formulario se envía pero no aparece en la lista
- Error "Failed to save inspection"
- Datos se pierden al recargar

#### Diagnóstico
```javascript
// Verificar datos del formulario
const formData = new FormData(document.getElementById('inspection-form'));
for (let [key, value] of formData.entries()) {
  console.log(key, value);
}

// Verificar función de guardado
console.log('Save function:', window.eicApp.saveInspection);
```

#### Soluciones
1. **Verificar validación de formulario:**
   ```javascript
   // Revisar campos requeridos
   const requiredFields = ['establishmentName', 'inspectorId', 'date'];
   requiredFields.forEach(field => {
     const element = document.getElementById(field);
     console.log(`${field}:`, element?.value);
   });
   ```

2. **Verificar permisos de escritura:**
   - Usuario debe estar autenticado
   - Rol debe tener permisos de escritura
   - Reglas de Firestore deben permitir la operación

### 3. Reportes No Se Generan

#### Síntomas
- Botón "Generar Reporte" no responde
- PDF no se descarga
- Error "Report generation failed"

#### Diagnóstico
```javascript
// Verificar datos para el reporte
console.log('Reports data:', window.eicApp.reports);
console.log('Selected filters:', window.eicApp.currentReportFilter);
```

#### Soluciones
1. **Verificar datos de inspecciones:**
   ```javascript
   // Debe haber inspecciones para generar reporte
   if (window.eicApp.reports.length === 0) {
     console.log('No inspections found for report');
   }
   ```

2. **Verificar librerías de PDF:**
   - Comprobar que jsPDF esté cargado
   - Verificar versión compatible

### 4. Interfaz No Responde

#### Síntomas
- Botones no funcionan
- Formularios no se envían
- Navegación no funciona

#### Diagnóstico
```javascript
// Verificar event listeners
console.log('Event listeners attached:', document.querySelectorAll('[onclick]').length);

// Verificar errores de JavaScript
window.addEventListener('error', (e) => {
  console.error('JavaScript error:', e.error);
});
```

#### Soluciones
1. **Verificar carga completa de la aplicación:**
   ```javascript
   // Esperar a que la app esté inicializada
   if (window.eicApp && window.eicApp.currentView) {
     console.log('App initialized correctly');
   } else {
     console.log('App not initialized');
   }
   ```

2. **Re-inicializar event listeners:**
   ```javascript
   // Forzar re-renderizado
   window.eicApp.render();
   ```

---

## 🔧 Herramientas de Diagnóstico

### 1. Consola del Navegador

#### Comandos Útiles
```javascript
// Estado general de la aplicación
window.eicApp

// Usuario actual
window.eicApp.currentUser

// Rol del usuario
window.eicApp.currentUserRole

// Vista actual
window.eicApp.currentView

// Datos cargados
window.eicApp.reports
window.eicApp.users

// Forzar recarga de datos
window.eicApp.fetchReports()
window.eicApp.fetchUsers()

// Cambiar vista manualmente
window.eicApp.currentView = 'dashboard'
window.eicApp.render()
```

### 2. Firebase Console

#### Verificaciones Importantes
1. **Authentication:**
   - Usuarios registrados
   - Proveedores habilitados
   - Dominios autorizados

2. **Firestore:**
   - Documentos en collections
   - Reglas de seguridad
   - Índices creados

3. **Usage:**
   - Cuota de lecturas/escrituras
   - Errores recientes

### 3. Network Tab (DevTools)

#### Qué Revisar
- Requests fallidos (status 4xx, 5xx)
- Tiempos de respuesta altos
- Recursos no encontrados (404)
- Errores CORS

---

## 📱 Problemas Específicos por Dispositivo

### Mobile

#### Problemas Comunes
1. **Teclado virtual oculta campos:**
   ```css
   /* Solución CSS */
   .form-container {
     padding-bottom: 300px; /* Espacio para teclado */
   }
   ```

2. **Touch events no funcionan:**
   ```javascript
   // Añadir event listeners para touch
   element.addEventListener('touchstart', handleTouch);
   element.addEventListener('click', handleClick);
   ```

### Tablet

#### Problemas Comunes
1. **Layout roto en orientación landscape:**
   ```css
   @media (orientation: landscape) and (max-height: 768px) {
     .container {
       flex-direction: row;
     }
   }
   ```

### Desktop

#### Problemas Comunes
1. **Resoluciones muy altas:**
   ```css
   @media (min-width: 1920px) {
     .container {
       max-width: 1400px;
       margin: 0 auto;
     }
   }
   ```

---

## 🚀 Optimización de Rendimiento

### Problemas de Rendimiento

#### 1. Carga Lenta Inicial
**Síntomas:** Aplicación tarda >5 segundos en cargar

**Soluciones:**
```javascript
// Lazy loading de módulos
async function loadModule(moduleName) {
  const module = await import(`./modules/${moduleName}.js`);
  return module.default;
}

// Preload de recursos críticos
<link rel="preload" href="src/js/app.js" as="script">
<link rel="preload" href="src/css/styles.css" as="style">
```

#### 2. Consultas Lentas a Firestore
**Síntomas:** Listas tardan en cargar, timeouts

**Soluciones:**
```javascript
// Paginación
const q = query(
  collection(db, 'inspections'),
  orderBy('date', 'desc'),
  limit(20)
);

// Índices compuestos
// Crear en Firebase Console para consultas complejas

// Cache local
const cache = new Map();
function getCachedData(key) {
  if (cache.has(key)) {
    return cache.get(key);
  }
  // Fetch from Firestore
}
```

#### 3. Memoria Alta
**Síntomas:** Navegador se vuelve lento, crashes

**Soluciones:**
```javascript
// Cleanup de listeners
class ComponentManager {
  constructor() {
    this.listeners = [];
  }
  
  addListener(element, event, handler) {
    element.addEventListener(event, handler);
    this.listeners.push({ element, event, handler });
  }
  
  cleanup() {
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];
  }
}
```

---

## 📞 Escalación de Problemas

### Nivel 1: Auto-resolución
- Limpiar caché del navegador
- Recargar la página
- Verificar conexión a internet
- Revisar consola de errores

### Nivel 2: Soporte Técnico
- Problemas persisten después de Nivel 1
- Errores específicos de configuración
- Problemas de permisos

### Nivel 3: Desarrollo
- Bugs en el código
- Problemas de arquitectura
- Nuevas funcionalidades requeridas

### Información para Reportar
```markdown
**Problema:** Descripción breve
**Pasos para reproducir:**
1. Paso 1
2. Paso 2
3. Paso 3

**Comportamiento esperado:** Qué debería pasar
**Comportamiento actual:** Qué está pasando

**Entorno:**
- Navegador: Chrome 91.0.4472.124
- OS: Windows 10
- Dispositivo: Desktop
- URL: https://ejemplo.com/path

**Errores de consola:**
```
Error message here
```

**Capturas de pantalla:** [Adjuntar si es relevante]
```

---

## 📚 Recursos Adicionales

### Documentación
- [Firebase Troubleshooting](https://firebase.google.com/docs/web/troubleshooting)
- [Chrome DevTools Guide](https://developers.google.com/web/tools/chrome-devtools)
- [JavaScript Debugging](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/debugger)

### Herramientas
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Web Vitals Extension](https://chrome.google.com/webstore/detail/web-vitals/ahfhijdlegdabablpippeagghigmibma)

---

*Guía de troubleshooting v1.0*
*Última actualización: 30 de Junio, 2025*
