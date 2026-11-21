# VROL V1.0

## Incluye
- Control de acceso Admin / GM / Jugador.
- Index público con banners, videos, publicaciones, contador de visitas, universos y mesas.
- Panel Admin para editar el contenido del index sin tocar HTML.
- Universos con GM principal, estado ACTIVE/INACTIVE/DELETED y creación condicionada por nivel GM.
- Personajes creados dentro de un universo, con código de personaje y sin nivel inicial.
- Mesas asociadas a universos y creadas por GM.
- Sesiones internas de mesa con inicio, término, duración, medio y módulo.
- Nivel jugador y nivel GM almacenados de 0 a 100.
- Configuración Admin del nivel GM mínimo para crear universos.
- Hojas separadas para preparar JO, SUR y FP.

## Instalación

1. Cree un Google Sheet.
2. Abra Extensiones > Apps Script.
3. Pegue `appscript/Code.gs`.
4. Ejecute `setupVROL()`.
5. Ejecute `createInitialAdmin()`.
6. Despliegue como Aplicación web, ejecutando como usted y con acceso para cualquiera.
7. Copie la URL `/exec`.
8. En `web/app.js`, reemplace `PEGAR_AQUI_URL_EXEC` por esa URL.
9. Suba la carpeta `web` a GitHub Pages.

Credenciales iniciales:
- usuario: `admin`
- contraseña: `change-me-1234`

**Cambie esta contraseña inmediatamente.** La autenticación de esta V1.0 es de prototipo. Para producción se recomienda OAuth/Google Identity/Firebase Auth/Supabase Auth u otro proveedor de identidad.

## Arquitectura

VROL Web → Apps Script API → Google Sheets.

El frontend no conoce el ID de la hoja. `SPREADSHEET_ID` queda en Apps Script, por lo que la base de datos puede sustituirse posteriormente sin rehacer la interfaz.

## Hojas
Settings, Users, Universes, UniverseGMs, Characters, Tables, TableMembers, Sessions, SessionInvites, Banners, Videos, Posts, Visits y AuditLog.

## Límite de contenido del index
- 5 banners activos.
- 4 videos activos.
- 1 publicación principal.
- Publicaciones secundarias sin límite práctico definido por la interfaz.

## Nota de alcance
La estructura de `TableMembers` y `SessionInvites` queda preparada para el siguiente incremento: incorporación de personajes mediante código y control contextual de energía, daño, efectos e inventario. No se implementa todavía la edición directa de stats del personaje, coherente con la regla de que el GM no debe modificar libremente la ficha del personaje.

SUR y FP quedan preparados como capas posteriores; V1.0 no implementa todavía sus reglas completas.
