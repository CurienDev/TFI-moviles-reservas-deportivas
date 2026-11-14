# TFI Desarrollo Móvil — Reservas Deportivas (Villaguay)

App móvil para reservar los espacios deportivos municipales de Villaguay, hecha con React Native + Expo
y conectada a la API de la cátedra.

| Carpeta | Contenido |
|---|---|
| [`reservas-deportivas/`](reservas-deportivas/) | La app: código, pruebas y documentación ([README](reservas-deportivas/README.md)). |
| [`capturas/`](capturas/) | Capturas de la app probada en el emulador contra la API local. |

El APK se descarga desde **Releases** de este repositorio.

## Instalación

### 1. Levantar la API en la PC

Se necesita **Node 24**. En la carpeta `api-reservas-deportivas` del repositorio de la cátedra:

```bash
corepack enable
pnpm install
copy .env.example .env
pnpm db:reiniciar
pnpm dev
```

- La primera vez se corren todos; las siguientes alcanza con `pnpm dev`.
- `pnpm db:reiniciar` vuelve los datos de demo al estado inicial (conviene correrlo el día de la prueba).
- Para comprobar que anda: <http://localhost:3000/salud> tiene que responder `"estado":"ok"`.
- No hagas clic dentro de la ventana de `pnpm dev`: se pausa (Esc la reanuda).

### 2. Instalar la app

- **Emulador** (Android Studio): arrastrá el APK sobre la ventana del emulador. Poné el emulador en hora de
  Argentina (Settings › System › Date & time), porque la API valida los ingresos con la hora de la PC.
- **Celular Android:** pasá el APK al celular, abrilo y permití instalar apps de origen desconocido.

### 3. Conectar la app con la API

En la app: **Perfil › Servidor** › escribir la dirección › **Probar** › **Guardar**.

| Dónde corre la app | Dirección |
|---|---|
| Emulador | `http://10.0.2.2:3000` |
| Celular por Wi-Fi (misma red que la PC) | `http://<IP de la PC>:3000` (la IP sale de `ipconfig`) |
| Celular por cable USB | `http://localhost:3000`, después de correr `adb reverse tcp:3000 tcp:3000` |

Para el celular por Wi-Fi hay que permitir el puerto 3000 en el firewall de Windows (PowerShell como
administrador):

```bash
netsh advfirewall firewall add rule name="API reservas 3000" dir=in action=allow protocol=TCP localport=3000 profile=private,public
```

### 4. Usuarios de prueba

Contraseña de todos: `villaguay2026`.

| Usuario | Rol |
|---|---|
| `emiliano@mail.com` | Jugador con reservas |
| `lleno@demo.ar` | Jugador con 3 reservas (límite) |
| `nuevo@demo.ar` | Jugador sin reservas |
| `marcelo@villaguay.demo.ar` | Encargado |
| `nahuel@villaguay.demo.ar` | Administrador |

Para compilar el APK o correr las pruebas, ver el [README de la app](reservas-deportivas/README.md).
