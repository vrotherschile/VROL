# VROL V1.0 — FUNCIONAL

Esta entrega es una implementación funcional de VROL V1.0, no un mockup de texto.

## Estructura

- `web/index.html` — Index público y panel modal.
- `web/styles.css` — interfaz responsive.
- `web/app.js` — frontend y consumo real de API.
- `appscript/Code.gs` — API/persistencia real sobre Google Sheets.
- `README.md` — instalación.

## Funcionalidad implementada

### Identidad
- Login real contra Apps Script.
- Sesión con token.
- Roles ADMIN / GM / PLAYER.
- Player Level 0–100.
- GM Level 0–100.
- Autorización en backend.

### Universos
- Admin crea universos.
- GM puede crear universo cuando alcanza el GM Level configurado.
- Admin puede asignar GM principal aunque no cumpla el requisito.
- GM principal.
- UniverseGMs.
- ACTIVE / INACTIVE / DELETED.
- Eliminación lógica.

### Personajes
- Nacen dentro de un universo.
- Código único.
- Jugador propietario.
- No tienen Character Level en VROL Core.

### Mesas
- Pertenecen a un universo.
- Creación restringida a GM/Admin.
- GM responsable.
- TableMembers preparado para incorporación por código.

### Sesiones
- Pertenecen a una mesa.
- Inicio, término y duración.
- Online / presencial.
- Módulo/capítulo.
- SessionInvites preparado.

### Index / CMS
- 5 banners.
- 4 videos YouTube.
- Publicación destacada única.
- Publicaciones adicionales.
- Estadísticas públicas.
- Visitas persistidas.
- Universos y mesas activas visibles públicamente.

### Auditoría
- Login.
- Creación de usuarios.
- Universos.
- Personajes.
- Mesas.
- Sesiones.
- CMS.
- Configuración.

## Instalación

1. Crea un Google Sheet.
2. Abre `Extensiones > Apps Script`.
3. Copia el contenido de `appscript/Code.gs`.
4. Ejecuta `setupVROL()`.
5. Ejecuta `createInitialAdmin()`.
6. Publica como `Aplicación web`.
7. Ejecuta como tu cuenta.
8. Permite acceso según el alcance de tu despliegue; para el Index público debe ser accesible mediante `/exec`.
9. Copia la URL `/exec`.
10. En `web/app.js`, reemplaza `PEGAR_URL_APPS_SCRIPT_AQUI` por la URL.
11. Publica `web/` en GitHub Pages.

## Credenciales iniciales

Usuario: `admin`
Contraseña: `change-me-1234`

Cambia la contraseña inmediatamente. La autenticación incluida está diseñada para V1.0/prototipo. Antes de uso comercial masivo se recomienda migrar identidad a OAuth/Google Identity/Firebase/Supabase u otro proveedor robusto.

## Importante

El frontend no contiene el ID del Google Sheet. Solo conoce la URL de la API.

Arquitectura:

Web → Apps Script API → Google Sheets

La estructura deja separadas las bases para JO, SUR y FP. SUR y FP todavía no contienen sus reglas completas en esta V1.0.
