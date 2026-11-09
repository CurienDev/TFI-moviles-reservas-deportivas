# Checklist de pruebas y verificaciones — Reservas Deportivas

Lista para ir probando la app **mientras se usa**, en el emulador o en un celular. Marcá cada prueba
cuando el resultado coincida con lo esperado. Si algo no coincide, anotá qué pasó (y en qué dispositivo).

> **Para marcar:** imprimí el PDF, o copiá este archivo y cambiá `☐` por `✅` (bien) o `❌` (falla).

| Quién prueba | Dispositivo (marca, modelo, Android) | Fecha | Versión del APK |
|---|---|---|---|
| | | | |

---

## 0. Antes de empezar

| ✓ | Verificación |
|---|---|
| ☐ | La API está corriendo (`pnpm dev`) y <http://localhost:3000/salud> responde `"estado":"ok"`. |
| ☐ | La base de la API se reinició **hoy** (`pnpm db:reiniciar`), así los datos de demo coinciden con estas pruebas. |
| ☐ | En el emulador: hora de **Argentina** (Settings › System › Date & time). |
| ☐ | En la app: **Perfil › Servidor** con la dirección correcta, **Probar** dice "Conectado" y se tocó **Guardar**. |
| ☐ | Pruebas automáticas en la PC: `npm test` (38 OK), `npm run typecheck` y `npm run lint` sin errores. |

**Usuarios** (contraseña de todos: `villaguay2026`): `emiliano@mail.com`, `lleno@demo.ar`, `nuevo@demo.ar`
(jugadores) · `marcelo@villaguay.demo.ar` (encargado) · `nahuel@villaguay.demo.ar` (administrador).

**Situaciones que ya trae la API de demo:**

| Situación | Dónde verla |
|---|---|
| Día entero bloqueado por lluvia | **Pasado mañana**, canchas descubiertas: "Cancha anegada" |
| Grilla sin ningún turno libre | Espacio **esp-04** (un básquet), **mañana** |
| Reserva fija semanal | Cancha 2, **martes de 21 a 22** ("Grupo de los martes") |
| Bloqueo parcial | Espacio esp-09, de 10 a 12 |
| Espacio sin video | Todos (la API de demo no trae videos) |

---

## 1. Visitante (sin cuenta)

| # | ✓ | Prueba | Pasos | Resultado esperado |
|---|---|---|---|---|
| 1 | ☐ | Mirar sin cuenta | Abrir la app sin ingresar y recorrer **Espacios**. | Lista con foto, deporte, superficie, luz y precio. No pide cuenta. |
| 2 | ☐ | Filtros | Tocar un deporte y un complejo; volver a "Todos". | La lista y el contador cambian. Los espacios sueltos aparecen como **"Otros espacios"** (nunca un "—"). |
| 3 | ☐ | Ficha | Abrir un espacio y deslizar las fotos. | Galería, características, precio, reglas, video (o "todavía no tiene video") y ubicación. |
| 4 | ☐ | Mapa | Pestaña **Mapa** › permitir ubicación › tocar un marcador › "Cómo llegar". | Mapa de Villaguay, tu punto, "Más cerca: …". Abre la app de mapas. |
| 5 | ☐ | Sin permiso de ubicación | Negar la ubicación (o quitarla en Ajustes) y volver al Mapa. | Avisa que no hay permiso; todo lo demás funciona. |
| 6 | ☐ | Grilla | Un espacio › **Ver disponibilidad** › recorrer los 7 días. | Turnos de 8 a 24 h: Libre / Ocupado / Fijo / Mantenimiento. Los de hoy ya pasados: "Ya pasó". |
| 7 | ☐ | Casos especiales | Ver pasado mañana (lluvia), esp-04 mañana y Cancha 2 el martes 21 h. | "Día bloqueado: Cancha anegada"; "No quedan turnos libres este día"; turno "Fijo". |
| 8 | ☐ | Reservar sin cuenta | Tocar un turno libre. | Ofrece "Ingresar para reservar". |

## 2. Jugador

| # | ✓ | Prueba | Pasos | Resultado esperado |
|---|---|---|---|---|
| 9 | ☐ | Registro | **Perfil › Crear cuenta** con email, teléfono y contraseña de 8+ caracteres. Probar también datos inválidos. | Entra a la app. Con datos inválidos, el error aparece al lado de cada campo. |
| 10 | ☐ | Ingresar | Ingresar con `nuevo@demo.ar`. | Entra; pide permiso de notificaciones. |
| 11 | ☐ | Reservar en dos toques | Tocar un turno libre (1) › **Confirmar reserva** (2). | Vibra y abre **Mi reserva** con el QR y "¡Reserva confirmada!". |
| 12 | ☐ | Turno ocupado | Con dos dispositivos, reservar el mismo turno casi a la vez. | Uno reserva; el otro recibe "Ese turno ya fue reservado." y la grilla se actualiza. |
| 13 | ☐ | Límite de 3 | Ingresar con `lleno@demo.ar` e intentar reservar. | "Ya tenés tres reservas activas. Cancelá una para reservar otra." |
| 14 | ☐ | Mis reservas | Con `emiliano@mail.com`, pestaña **Mis reservas**. | "Próximas (x de 3)" y "Pasadas y canceladas" (cancelada, asistió, no se presentó). |
| 15 | ☐ | Cancelar a tiempo | Abrir una reserva de mañana › **Cancelar**. | Explica "Se puede cancelar sin aviso hasta las…"; queda Cancelada y su QR "ya no es válido". |
| 16 | ☐ | Cancelar tarde | Reservar un turno de hoy que empiece en menos de 4 h y abrirlo. | No hay botón de cancelar: "Faltan menos de cuatro horas: avisale al encargado". |
| 17 | ☐ | Recordatorio | Reservar un turno que empiece en algo más de 2 h y esperar. | Llega la notificación "En 2 horas: …" aun con la app cerrada. |
| 18 | ☐ | Reserva a menos de 2 h | Reservar el turno de la próxima hora. | El mensaje dice "Tu turno es en menos de 2 horas" (no promete recordatorio). |
| 19 | ☐ | Favorito | En una ficha, tocar la ⭐. Salir y volver a entrar. | Queda marcado como favorito. |
| 20 | ☐ | Reingreso | Cerrar la app desde Recientes y volver a abrirla. | **Antes de mostrar nada** pide huella o rostro; "Usar contraseña" permite entrar con la contraseña. |
| 21 | ☐ | Contraseña incorrecta | En el reingreso, escribir una contraseña equivocada. | La rechaza y no entra. |
| 22 | ☐ | Cerrar sesión | **Perfil › Cerrar sesión**. | Vuelve a modo visitante; no quedan reservas visibles. |

## 3. Encargado

Ingresar como `marcelo@villaguay.demo.ar`. Aparece la pestaña **Gestión**.

**Cómo escanear un QR:**
- **Con dos dispositivos:** en uno el jugador abre "Mi reserva"; en el otro el encargado escanea.
- **Con uno solo:** sacá captura del QR, abrila en la PC y escaneá la pantalla. O escribí el código que
  aparece debajo del QR (por ejemplo `VGY-1110-19-6H25ZY`) en **"¿No lee el código?"**.
- El ingreso se acepta **desde 30 minutos antes del turno hasta que termina**: para un ingreso válido,
  reservá con `nuevo@demo.ar` el turno de la próxima hora.

| # | ✓ | Prueba | Pasos | Resultado esperado |
|---|---|---|---|---|
| 23 | ☐ | Identidad antes de escanear | **Gestión › Escanear ingreso**. | Pide huella o rostro; si se cancela, ofrece la contraseña. |
| 24 | ☐ | Ingreso válido | Elegir la cancha de la reserva y escanear dentro del horario. | Verde **"INGRESO VÁLIDO"**, vibración corta, nombre y hora de llegada. |
| 25 | ☐ | Códigos inválidos | Escanear de nuevo el mismo; uno de mañana; uno de otra cancha; uno de más tarde. | Rojo con el mensaje de la API ("ya ingresó", "no es para hoy", "es para otra cancha", "todavía no es el horario"). Vibración larga. |
| 26 | ☐ | Código inexistente | Escribir `VGY-0000-00-XXXXXX`. | **CÓDIGO INVÁLIDO**: "Ese código no es de una reserva." |
| 27 | ☐ | Agenda del día | **Gestión › Agenda**; cambiar de día y filtrar por complejo. | Turnos ocupados, fijos (con titular) y bloqueados, agrupados por hora. |
| 28 | ☐ | No se presentó | En una reserva que empezó hace más de 15 min, tocar **"No se presentó"**. | Pasa a "No se presentó" y el jugador suma una ausencia. |
| 29 | ☐ | Cancelar como encargado | En la agenda, **Cancelar** una reserva de hoy que empiece en menos de 4 h. | Se cancela y el jugador suma una cancelación tardía. |
| 30 | ☐ | Bloqueo por lluvia | **Gestión › Bloqueos** › una cancha con reserva › mañana › Día completo › motivo "Lluvia" › **Bloquear**. | Confirma; la grilla muestra Mantenimiento con el motivo. |
| 31 | ☐ | Quitar el bloqueo | En la lista de bloqueos, tocar **Quitar** en el recién creado. | Desaparece y los turnos vuelven a quedar libres (las reservas canceladas siguen canceladas). |
| 32 | ☐ | Aviso de suspensión | Abrir la app con el jugador de la reserva bloqueada. | Notificación "Turno suspendido … Motivo: Lluvia", aviso en la pestaña **Avisos** y la reserva figura Cancelada. |
| 33 | ☐ | Turno liberado (favorito) | Jugador A marca un espacio como favorito. Jugador B cancela una reserva de ese espacio. A abre la app. | A recibe "Se liberó un turno en …". |
| 34 | ☐ | Fotos de cancha | **Gestión › Fotos** › elegir espacio › agregar una foto. | Queda "Subida" y se ve en la ficha ("Estado actual de la cancha"). |
| 35 | ☐ | Jugadores | **Gestión › Jugadores**. | Jugadores de la semana con cancelaciones tardías, ausencias y "Marcado". |
| 36 | ☐ | El personal no reserva | Tocar un turno libre. | Explica que las cuentas del personal no reservan. |
| 37 | ☐ | Sin permisos de admin | Abrir **Reservas fijas**. | Ve la lista pero no puede crear ni editar; no ve **Precios**. |

## 4. Administrador

Ingresar como `nahuel@villaguay.demo.ar`.

| # | ✓ | Prueba | Pasos | Resultado esperado |
|---|---|---|---|---|
| 38 | ☐ | Crear fija | **Gestión › Reservas fijas › Nueva** › espacio, titular, día, horario › **Crear**. | Aparece en la lista ("Todos los sábados", etc.); en la grilla, "Fijo" todas las semanas. |
| 39 | ☐ | Fija con conflicto | Crear una fija que pise reservas confirmadas u otra fija. | Mensaje claro; no se crea. |
| 40 | ☐ | Dar de baja una fija | Abrir la fija › **Dar de baja la reserva fija**; después **Volver a activarla**. | Pasa a inactiva y vuelve a activa. |
| 41 | ☐ | Precio | **Gestión › Precios** › cambiar un espacio › **Guardar**. | La ficha y la grilla muestran el precio nuevo. (Después volvelo al original.) |

## 5. Sin conexión, errores, tema y sensores

| # | ✓ | Prueba | Pasos | Resultado esperado |
|---|---|---|---|---|
| 42 | ☐ | Aviso de red | Activar **Modo avión** con la app abierta. | Aparece arriba la franja "Sin conexión…"; al volver la red, desaparece. |
| 43 | ☐ | QR sin señal | Con red, abrir Mis reservas. Activar Modo avión y abrir una reserva. | Se ve el QR y "estás viendo los datos guardados". |
| 44 | ☐ | Abrir sin conexión | Con Modo avión, cerrar la app y volver a abrirla; confirmar con huella o contraseña. | La contraseña correcta se acepta **sin red**; muestra espacios y reservas guardados. |
| 45 | ☐ | Acción sin señal | Con Modo avión, intentar reservar o cancelar. | "No hay conexión con el servidor…" y botón **Reintentar**. |
| 46 | ☐ | API apagada | Cortar `pnpm dev` en la PC y deslizar para actualizar. | Mensaje de error con Reintentar (en menos de 30 s); al volver a levantar la API, funciona. |
| 47 | ☐ | Error del servidor | **Perfil › Probar errores › "Error del servidor"**; abrir una grilla; volver a **Normal**. | Error con Reintentar; con Normal vuelve a andar. |
| 48 | ☐ | Respuesta lenta | **Perfil › Probar errores › "Respuesta lenta"** y navegar. | Se ven los indicadores de carga. |
| 49 | ☐ | Modo oscuro | **Perfil › Apariencia › Oscuro**. | Toda la app en oscuro; el QR sigue negro sobre blanco. |
| 50 | ☐ | Según la luz | **Perfil › Apariencia › "Según la luz"** (si el celular tiene sensor). Tapar el sensor de arriba de la pantalla. | Con poca luz pasa a oscuro; al destapar vuelve a claro. |
| 51 | ☐ | Letra grande | Ajustes del celular › tamaño de fuente al máximo. | Los textos crecen sin romper las pantallas. |
| 52 | ☐ | Recordatorio tras reiniciar | Con una reserva para dentro de más de 2 h, reiniciar el celular. | El recordatorio llega igual (con batería "Sin restricciones"). |
| 53 | ☐ | Tocar una notificación | Tocar un recordatorio o un aviso. | Abre la reserva o la pestaña Avisos. |

---

## 6. Resumen de la prueba

| | Cantidad |
|---|---|
| Pruebas OK | |
| Pruebas con falla | |
| No se pudieron probar (y por qué) | |

## 7. Cómo reportar una falla

Abrí un **Issue** en el repositorio de GitHub con:

1. **Número de prueba** de esta lista y título corto.
2. **Dispositivo:** emulador o celular (marca, modelo, versión de Android).
3. **Usuario** con el que estabas ingresado.
4. **Pasos** exactos para que vuelva a pasar.
5. **Qué esperabas** y **qué pasó** (con captura de pantalla).
