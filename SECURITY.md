
# Política de Seguridad

## Versiones Soportadas

| Versión | Soporte de Seguridad |
| ------- | -------------------- |
| 1.0.x   | ✅ Soportada         |

## Reportar una Vulnerabilidad

Si descubres una vulnerabilidad de seguridad en EIC Inspection App, por favor repórtala de manera responsable:

### Proceso de Reporte

1. **NO** crear un issue público en GitHub
2. Enviar un email a: security@eic.com (o al contacto designado)
3. Incluir la siguiente información:
   - Descripción detallada de la vulnerabilidad
   - Pasos para reproducir el problema
   - Impacto potencial
   - Versión afectada
   - Cualquier información adicional relevante

### Qué Esperar

- **Confirmación**: Respuesta inicial dentro de 48 horas
- **Evaluación**: Evaluación completa dentro de 7 días
- **Resolución**: Corrección y release dentro de 30 días (dependiendo de la severidad)
- **Reconocimiento**: Crédito en el changelog si lo deseas

### Mejores Prácticas de Seguridad

#### Para Desarrolladores

- Nunca commitear credenciales o API keys
- Usar variables de entorno para información sensible
- Validar todas las entradas de usuario
- Implementar autenticación y autorización apropiadas
- Mantener dependencias actualizadas
- Realizar revisiones de código de seguridad

#### Para Usuarios

- Usar contraseñas fuertes y únicas
- Habilitar autenticación de dos factores cuando esté disponible
- Mantener el navegador actualizado
- No compartir credenciales de acceso
- Reportar actividad sospechosa inmediatamente

### Configuraciones de Seguridad

#### Variables de Entorno Sensibles

Las siguientes variables deben mantenerse seguras:

- `FIREBASE_API_KEY`
- `JWT_SECRET`
- `SESSION_SECRET`
- `DB_PASSWORD`
- Cualquier API key externa

#### Headers de Seguridad Recomendados

```
Content-Security-Policy: default-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

### Actualizaciones de Seguridad

- Las actualizaciones de seguridad se publican tan pronto como sea posible
- Se notifica a los usuarios a través de releases de GitHub
- Se recomienda actualizar inmediatamente cuando hay parches de seguridad

### Contacto

Para consultas relacionadas con seguridad:
- Email: security@eic.com
- Respuesta esperada: 48 horas
