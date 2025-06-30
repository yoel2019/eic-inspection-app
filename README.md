# EIC Inspection App

Sistema de inspección y control de calidad desarrollado para EIC (Empresa de Inspección y Control).

## Descripción

Esta aplicación web permite gestionar inspecciones, generar reportes y mantener un control de calidad eficiente para los procesos de la empresa.

## Características Principales

- 🔍 Sistema de inspecciones
- 📊 Generación de reportes
- 👥 Gestión de usuarios
- 📱 Interfaz responsive
- 🔒 Sistema de autenticación
- 📈 Dashboard de métricas

## Tecnologías Utilizadas

- Frontend: HTML5, CSS3, JavaScript
- Backend: PHP/Node.js (según configuración)
- Base de datos: MySQL/PostgreSQL
- Servidor web: Apache/Nginx

## Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/yoel2019/eic-inspection-app.git
cd eic-inspection-app
```

2. Instalar dependencias (si aplica):
```bash
npm install
# o
composer install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

4. Ejecutar migraciones de base de datos (si aplica):
```bash
php artisan migrate
# o el comando correspondiente
```

## Uso

### Desarrollo
```bash
npm run dev
# o
php -S localhost:8000
```

### Producción
```bash
npm run build
npm start
```

## Estructura del Proyecto

```
eic-inspection-app/
├── src/                 # Código fuente
├── public/             # Archivos públicos
├── config/             # Configuraciones
├── docs/               # Documentación
├── tests/              # Pruebas
└── README.md
```

## Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## Branches

- `main`: Rama principal de producción
- `develop`: Rama de desarrollo
- `feature/*`: Ramas para nuevas características
- `hotfix/*`: Ramas para correcciones urgentes

## Versionado

Utilizamos [SemVer](http://semver.org/) para el versionado. Para las versiones disponibles, consulta los [tags en este repositorio](https://github.com/yoel2019/eic-inspection-app/tags).

## Licencia

Este proyecto es privado y pertenece a EIC (Empresa de Inspección y Control).

## Contacto

- Desarrollador: Yoel
- Email: [correo@empresa.com]
- Proyecto: [https://github.com/yoel2019/eic-inspection-app](https://github.com/yoel2019/eic-inspection-app)

## Changelog

### v1.0.0 (2025-06-30)
- Importación inicial del proyecto de producción
- Configuración de repositorio GitHub
- Implementación de estructura de branches
- Configuración de CI/CD básico
