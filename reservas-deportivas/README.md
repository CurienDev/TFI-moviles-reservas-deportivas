# Reservas Deportivas — Villaguay

App móvil (Android / iPhone) para reservar los once espacios deportivos municipales de Villaguay:
ver qué hay libre sin cuenta, reservar en dos toques, recibir recordatorios, cancelar con un botón y entrar
mostrando un QR que el encargado escanea en la puerta. Incluye la gestión municipal (agenda del día,
ingresos y ausentes, bloqueos por lluvia, reservas fijas, precios, fotos de las canchas).

## Guías para el grupo

En la carpeta [`guias/`](guias/) (en Markdown y PDF):

1. [Guía de estudio](guias/01-guia-de-estudio.md): cómo está armada la app y preguntas para la defensa.
2. [Guía de instalación](guias/02-guia-de-instalacion.md): API en la PC, emulador, celular y compilación.
3. [Checklist de pruebas](guias/03-checklist-de-pruebas.md): 53 pruebas para ir marcando mientras se usa la app.

El APK no está en el repositorio (supera el límite de 100 MB de GitHub): se publica en **Releases**.

**Stack:** React Native 0.86 · Expo SDK 57 · TypeScript · Expo Router · StyleSheet.
Consume la **API de la cátedra** (`api-reservas-deportivas`) detrás de `src/servicios/`.

## Requisitos del TFI y dónde están

| Requisito | Implementación |
|---|---|
| Pantallas y navegación | Expo Router (`src/app/`): pestañas + pila, rutas dinámicas `espacio/[id]`, `disponibilidad/[id]`, `reserva/[id]`. |
| Autenticación | Registro e ingreso contra la API; token en expo-secure-store; reingreso con huella/rostro (expo-local-authentication) y contraseña como alternativa. |
| Consumo de la API | `src/servicios/` (cliente + servicios por dominio); estados de carga, vacío y error en todas las pantallas. |
| Cámara y archivos | expo-camera (QR del ingreso), expo-image-picker (fotos de cancha), expo-file-system `File`/`Directory`/`Paths`. |
| Ubicación y mapas | expo-location + **MapLibre** (ver `docs/DECISIONES.md`, desvío justificado). |
| Notificaciones locales | Recordatorio 2 h antes de cada reserva; avisos de suspensión y de turno liberado de un favorito. |
| Persistencia y red | expo-sqlite (catálogo, reservas, avisos, fotos), kv-store (preferencias y sesión), expo-network (franja "Sin conexión"). |
| Sensores / háptica | expo-haptics (vibración distinta para QR válido/inválido, reservar, cancelar) y expo-sensors (tema "Según la luz"). |
| Multimedia | expo-video con controles y descarga para ver sin datos (la API de demo no trae videos). |
| Identidad | Nombre "Reservas Deportivas", ícono 1024×1024 sin transparencia y splash propios. |

## Uso

```bash
npm ci
npm test               # 38 pruebas unitarias
npm run typecheck
npx expo lint
```

### Correr la API en la PC (modo local, permitido por la cátedra)

La API no se publica: corre en la computadora del grupo y el teléfono o el emulador se conecta a ella.
En la carpeta `api-reservas-deportivas` del repo de la cátedra (Node 24 + pnpm 10, o Docker):

```bash
pnpm install
pnpm db:reiniciar
pnpm dev
```

(o `docker compose up`). Debe responder `http://localhost:3000/salud`. Prueba de humo del contrato:

```bash
node scripts/probar-api.mjs http://localhost:3000
```

En la app, **Perfil › Servidor** → escribir la dirección → **Probar** → **Guardar**:

| Dónde corre la app | Dirección |
|---|---|
| Emulador de Android Studio | `http://10.0.2.2:3000` (10.0.2.2 es la PC vista desde el emulador) |
| Celular por Wi-Fi (misma red que la PC) | `http://<IP de la PC>:3000` (la IP sale de `ipconfig`; permitir el puerto 3000 en el firewall de Windows) |
| Celular por cable USB | `adb reverse tcp:3000 tcp:3000` y después `http://localhost:3000` |

El emulador tiene que estar en la zona horaria de Argentina (Settings › System › Date & time), porque la API
valida los ingresos con la hora local de la PC. `EXPO_PUBLIC_API_URL` en `eas.json` es opcional: si queda el
texto de ejemplo, la app pide configurar la dirección.

Build de entrega (cuenta de Expo del grupo):

```bash
npx eas-cli@latest build --platform android --profile preview
```

Build local (Windows: desde una ruta **corta y sin espacios**, p. ej. `C:\rd\reservas-deportivas`):

```bash
npx expo prebuild --platform android --clean
cd android && gradlew assembleRelease
```

## Usuarios de demo (de la API)

Todos con la contraseña `villaguay2026`: `emiliano@mail.com` (jugador), `lleno@demo.ar` (jugador con 3 reservas),
`nuevo@demo.ar` (jugador sin nada), `marcelo@villaguay.demo.ar` (encargado), `nahuel@villaguay.demo.ar` (administrador).

## Estructura

```
src/app/            pantallas (Expo Router)
src/componentes/    UI reutilizable (base, dominio, formularios, verificación de identidad, estado de red)
src/contexto/       sesión, tema, catálogo
src/servicios/      cliente de la API y servicios (reservas.ts, espacios.ts, usuarios.ts, avisos.ts, medios.ts)
src/logica/         fechas, ids de turno, reglas y detección de avisos (funciones puras, con pruebas)
src/tipos/          tipos del PRD (literales) + los que agrega la API + los propios de la app
src/almacenamiento/ SQLite (datos), kv-store (preferencias/sesión), SecureStore (token)
src/notificaciones/ recordatorios y avisos locales
scripts/            probar-api.mjs (prueba de humo contra la API)
__tests__/          pruebas Jest
docs/               DECISIONES.md
guias/              guías de estudio, instalación y pruebas (Markdown + PDF)
```
