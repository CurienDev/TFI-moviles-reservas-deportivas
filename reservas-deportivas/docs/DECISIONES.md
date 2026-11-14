# Decisiones, huecos y desvíos

El PRD y la consigna piden avisar los huecos en lugar de decidir en silencio. Acá queda todo
lo que se decidió, por qué, y qué conviene confirmar con la cátedra antes de la entrega.

## 1. Integración con la API de la cátedra

La app consume la API `api-reservas-deportivas` (repo `franco-ruisdias-uner/api-proyectos-mobile`)
detrás de la capa de servicios `src/servicios/` (`cliente.ts`, `reservas.ts`, `espacios.ts`,
`usuarios.ts`, `avisos.ts`, `medios.ts`). Ninguna pantalla llama a `fetch` directamente.

| Tema | Cómo quedó |
|---|---|
| Dirección del servidor | `EXPO_PUBLIC_API_URL` en `eas.json` (se fija al compilar) y editable en **Perfil › Servidor** (con botón "Probar" que llama a `/salud`). |
| Sesión | `POST /auth/ingreso` y `/auth/registro` (`contrasena`). Token en **expo-secure-store**; usuario en **kv-store**. La API no tiene logout: se olvida el token. Si la API responde `NO_AUTENTICADO`, la app cierra la sesión. |
| Reingreso | Al volver a abrir la app con sesión guardada se pide **huella/rostro** (expo-local-authentication). Si el teléfono no tiene biometría ni bloqueo, se confirma con la **contraseña** (alternativa del TFI). Sin red, la contraseña se compara con una huella SHA-256 iterada y con sal guardada en SecureStore al ingresar (nunca la contraseña en claro), para que el jugador pueda abrir la app y mostrar su QR sin señal. El escáner del encargado vuelve a pedir la identidad. |
| Sin conexión | `expo-network` muestra una franja "Sin conexión" en toda la app. Catálogo, mis reservas (con QR), avisos, fotos de cancha y grillas de favoritos se guardan en **expo-sqlite** y se muestran sin red. |
| Tiempo de espera | La API corre en la PC (local): timeout de 30 s y estados de carga visibles; si la dirección está mal, el error aparece rápido y sugiere revisar Perfil › Servidor. |
| Errores | Se muestra el `mensaje` de la API tal cual y se decide por el `codigo` (por ejemplo `TURNO_OCUPADO` recarga la grilla). |
| Espacios sin complejo | La API usa `complejo: "—"` para los espacios sueltos (su decisión M1-1). La app no muestra el guion: los agrupa como «Otros espacios» en los filtros y, en el mapa, cada uno tiene su propio marcador. |
| Probar errores | Perfil › Probar errores manda la cabecera `X-Simular: error-500` o `demora-3000`. |

## 2. Reglas que fija la API (y que cambiaron respecto de la versión con datos inventados)

| Tema | Regla de la API | Efecto en la app |
|---|---|---|
| Deporte en la reserva (D11) | `Reserva` no lleva deporte: lo define el espacio. | Se quitó el selector de deporte; la hoja de reserva muestra el deporte del espacio. |
| Cancelar tarde (D3) | El jugador **no** puede cancelar después de `cancelableHasta` (`CANCELACION_FUERA_DE_PLAZO`): tiene que avisarle al encargado. El encargado sí puede, y le suma una cancelación tardía al jugador. | "Mi reserva" muestra el aviso; la Agenda del personal tiene "Cancelar". |
| Mover turnos (D9) | No existe: solo suspender. | Se quitó la pantalla "Mover turno". |
| Roles (D6) | Encargado: agenda, ingresos, ausentes, bloqueos, cancelar. Administrador: además fijas y precios. Solo los jugadores reservan. | El menú de Gestión y las pantallas respetan esos permisos. |
| Fija con reservas (D4) | Se rechaza con `CONFLICTO_CON_RESERVAS`; también `FIJA_SUPERPUESTA`. Dar de baja = `activa: false`. | Mensajes claros; botón "Dar de baja" y "Volver a activarla". |
| Ingreso (D10) | De 30 min antes del inicio hasta el fin del turno; "no se presentó" desde 15 min después del inicio. | La app lo explica y habilita los botones en esos momentos. |
| Titular de la fija | El `Turno` no trae el titular (`motivoBloqueo` es null en fijos). | El jugador ve "Reserva fija semanal"; el personal ve el titular cruzando con `GET /fijas`. |
| QR | Formato `VGY-0919-19-K3X9QM` (D2). | Se muestra tal cual y se valida en la API. |

## 3. Huecos que quedan (conviene consultarlos con la cátedra)

| # | Hueco | Qué hace hoy la app |
|---|---|---|
| 1 | **Avisos push**: la API decide cuándo avisar, pero guardar tokens de Expo y enviar las push "lo programan ustedes" (`/dispositivos` responde 501). Además, en un APK de Android las push de Expo requieren credenciales de Firebase. | La app **detecta** los mismos hechos al sincronizar (una reserva confirmada que aparece cancelada sin que la haya cancelado el usuario = suspensión, con el motivo leído de la grilla; un turno de un favorito que pasa de reservado a libre = turno liberado) y dispara una **notificación local** que queda en la pestaña Avisos. Funciona con la app abierta o al volver a abrirla. |
| 2 | **Fotos de cancha**: `POST /archivos` sube la foto pero no hay endpoint para asociarla a un espacio. | La foto se achica, se guarda en el teléfono (expo-file-system) y se sube; la ficha del espacio la muestra en el teléfono que la cargó. |
| 3 | **Video**: la API trae `videoUrl: null` en todos los espacios y no hay forma de cargarlo. | El reproductor (expo-video, con controles y descarga para ver sin datos) está listo; con los datos de demo se ve "Este espacio todavía no tiene video". Para mostrarlo en la defensa habría que cargar un `videoUrl` en la semilla de la API del grupo. |
| 4 | **Listado de usuarios**: no hay `GET /usuarios`. | "Jugadores" se arma con las reservas de los próximos 7 días y `GET /usuarios/<id>`. |
| 5 | "Repetidas veces" (cancelaciones tardías) no está cuantificado. | Se marca a partir de 2 (solo informativo). |
| 6 | ¿A quién llama el jugador para "avisar"? El PRD no da un teléfono de la Dirección. | Se muestra el mensaje de la API; no hay botón de llamada para el jugador. |

## 4. Desvíos respecto de la consigna del TFI

| Requisito | Desvío | Motivo |
|---|---|---|
| 5. Ubicación y mapas con **react-native-maps** | Se usa **MapLibre React Native + OpenStreetMap** (decisión del grupo). | En Android, react-native-maps usa Google Maps y necesita una API key de Google Cloud, que exige asociar una cuenta de facturación. MapLibre es libre y gratuito y cubre lo mismo: complejos en el mapa, ubicación del usuario, complejo más cercano y "Cómo llegar". Si se niega la ubicación, la app sigue siendo usable. **Conviene avisarlo a la cátedra antes de la entrega.** |
| 1. Build con **EAS** | El repo tiene `eas.json` listo (`preview` = APK). El APK de prueba se compiló localmente con Gradle porque EAS requiere la cuenta de Expo del grupo. | Para la entrega: `npx eas-cli@latest build --platform android --profile preview` con la cuenta del grupo. |

## 5. Cómo se corre la API (modo local)

La cátedra permite correr la API en la computadora del grupo, sin publicarla. En la carpeta
`api-reservas-deportivas`: `pnpm install`, `pnpm db:reiniciar` y `pnpm dev` (o `docker compose up`);
debe responder `http://localhost:3000/salud`. Verificación del contrato:
`node scripts/probar-api.mjs http://localhost:3000`.

En la app, **Perfil › Servidor** (Probar → Guardar):

- **Emulador**: `http://10.0.2.2:3000`.
- **Celular por Wi-Fi**: `http://<IP de la PC>:3000` (IP con `ipconfig`, misma red, puerto 3000 habilitado en el firewall).
- **Celular por cable**: `adb reverse tcp:3000 tcp:3000` y `http://localhost:3000`.

El APK no trae una dirección fija (`EXPO_PUBLIC_API_URL` queda con el texto de ejemplo y la app pide
configurarla), así que el mismo APK sirve en cualquier PC. Consecuencia: la app necesita que la PC
con la API esté encendida y en la misma red (o conectada por cable); sin eso funciona en modo sin
conexión con lo guardado. Si más adelante se quisiera publicar la API, el README de la API explica
cómo (sección 11) y alcanza con poner la dirección en Perfil › Servidor o en `eas.json`.

Probado el 9/11/2026 en el emulador (Pixel, Android 15) contra la API local. Instalación: ver el README.
