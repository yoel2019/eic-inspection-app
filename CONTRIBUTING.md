
# Guía de Contribución - EIC Inspection App

## Flujo de Trabajo

### Estructura de Branches

- **main**: Rama principal de producción
- **develop**: Rama de desarrollo e integración
- **feature/**: Ramas para nuevas características
- **hotfix/**: Ramas para correcciones urgentes
- **release/**: Ramas para preparar releases

### Proceso de Desarrollo

1. **Crear una nueva feature**:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/nombre-de-la-feature
   ```

2. **Desarrollar y hacer commits**:
   ```bash
   git add .
   git commit -m "feat: descripción de la característica"
   ```

3. **Sincronizar con develop**:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout feature/nombre-de-la-feature
   git rebase develop
   ```

4. **Crear Pull Request**:
   - Push de la rama feature
   - Crear PR hacia develop
   - Solicitar revisión de código

### Convenciones de Commits

Utilizamos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nueva característica
- `fix:` Corrección de bug
- `docs:` Cambios en documentación
- `style:` Cambios de formato (no afectan funcionalidad)
- `refactor:` Refactorización de código
- `test:` Agregar o modificar tests
- `chore:` Tareas de mantenimiento

### Estándares de Código

- Usar indentación de 2 espacios
- Nombres de variables en camelCase
- Nombres de archivos en kebab-case
- Comentarios en español para lógica de negocio
- Documentación técnica en inglés

### Testing

- Escribir tests para nuevas funcionalidades
- Mantener cobertura de código > 80%
- Ejecutar tests antes de hacer push

### Revisión de Código

- Todo código debe ser revisado antes de merge
- Mínimo 1 aprobación requerida
- Resolver todos los comentarios antes del merge

## Configuración del Entorno de Desarrollo

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/yoel2019/eic-inspection-app.git
   cd eic-inspection-app
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:
   ```bash
   cp .env.example .env
   # Editar .env con las configuraciones locales
   ```

4. **Ejecutar en modo desarrollo**:
   ```bash
   npm run dev
   ```

## Reportar Issues

- Usar las plantillas de issues disponibles
- Incluir pasos para reproducir el problema
- Agregar capturas de pantalla si es relevante
- Etiquetar apropiadamente (bug, enhancement, question)

## Contacto

Para dudas sobre el proceso de contribución, contactar al equipo de desarrollo.
