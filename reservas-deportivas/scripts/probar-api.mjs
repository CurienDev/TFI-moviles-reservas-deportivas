// Prueba de humo contra la API de la cátedra: recorre los endpoints que usa la app con los
// usuarios de demo y dice OK o FALLA en cada paso. No modifica nada salvo una reserva de
// prueba de nuevo@demo.ar, que crea y cancela.
//
// Uso:  node scripts/probar-api.mjs http://localhost:3000   (API corriendo en esta PC)

const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/+$/, '');
const CONTRASENA = 'villaguay2026';
let fallas = 0;

async function pedir(metodo, ruta, { token, cuerpo } = {}) {
  const resp = await fetch(base + ruta, {
    method: metodo,
    headers: {
      Accept: 'application/json',
      ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const texto = resp.status === 204 ? '' : await resp.text();
  return { status: resp.status, cuerpo: texto ? JSON.parse(texto) : null };
}

async function paso(nombre, fn) {
  try {
    const detalle = await fn();
    console.log(`OK     ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  } catch (e) {
    fallas++;
    console.log(`FALLA  ${nombre} — ${e.message}`);
  }
}

function exigir(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}

const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
let espacios = [];
const tokens = {};

console.log(`Probando ${base} (hoy: ${hoy})\n`);

await paso('GET /salud', async () => {
  const r = await pedir('GET', '/salud');
  exigir(r.status === 200 && r.cuerpo.datos.estado === 'ok', `status ${r.status}`);
  return `API ${r.cuerpo.datos.version}, ${r.cuerpo.datos.motor}`;
});
await paso('GET /deportes', async () => {
  const r = await pedir('GET', '/deportes?porPagina=100');
  exigir(Array.isArray(r.cuerpo?.datos), `status ${r.status}`);
  return `${r.cuerpo.datos.length} deportes`;
});
await paso('GET /espacios', async () => {
  const r = await pedir('GET', '/espacios?porPagina=100');
  exigir(Array.isArray(r.cuerpo?.datos), `status ${r.status}`);
  espacios = r.cuerpo.datos;
  return `${espacios.length} espacios`;
});
await paso('GET /espacios/esp-02/turnos (hoy)', async () => {
  const r = await pedir('GET', `/espacios/esp-02/turnos?fecha=${hoy}`);
  exigir(r.cuerpo?.datos?.length === 16, `se esperaban 16 turnos, status ${r.status}`);
  return r.cuerpo.datos.map((t) => t.estado[0]).join('');
});
for (const email of ['emiliano@mail.com', 'nuevo@demo.ar', 'marcelo@villaguay.demo.ar', 'nahuel@villaguay.demo.ar']) {
  await paso(`POST /auth/ingreso ${email}`, async () => {
    const r = await pedir('POST', '/auth/ingreso', { cuerpo: { email, contrasena: CONTRASENA } });
    exigir(r.status === 200 && r.cuerpo.datos.token, `status ${r.status} ${JSON.stringify(r.cuerpo?.error ?? '')}`);
    tokens[email] = r.cuerpo.datos.token;
    return r.cuerpo.datos.usuario.rol;
  });
}
await paso('GET /yo/reservas (próximas y pasadas)', async () => {
  const t = tokens['emiliano@mail.com'];
  const p = await pedir('GET', '/yo/reservas?cuando=proximas&porPagina=100', { token: t });
  const q = await pedir('GET', '/yo/reservas?cuando=pasadas&porPagina=100', { token: t });
  exigir(p.status === 200 && q.status === 200, `status ${p.status}/${q.status}`);
  return `${p.cuerpo.datos.length} próximas, ${q.cuerpo.datos.length} pasadas`;
});
await paso('Reservar y cancelar (nuevo@demo.ar)', async () => {
  const t = tokens['nuevo@demo.ar'];
  const manana = new Date(Date.now() + 86_400_000);
  const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(manana);
  for (const e of espacios) {
    const g = await pedir('GET', `/espacios/${e.id}/turnos?fecha=${fecha}`);
    const libre = g.cuerpo?.datos?.find((x) => x.estado === 'libre');
    if (!libre) continue;
    const r = await pedir('POST', '/reservas', { token: t, cuerpo: { turnoId: libre.id, cantidadPersonas: 1 } });
    exigir(r.status === 201 || r.status === 200, `reservar: ${r.status} ${JSON.stringify(r.cuerpo?.error ?? '')}`);
    const c = await pedir('POST', `/reservas/${r.cuerpo.datos.id}/cancelacion`, { token: t, cuerpo: {} });
    exigir(c.status === 200 && c.cuerpo.datos.estado === 'cancelada', `cancelar: ${c.status}`);
    return `${libre.id} → ${r.cuerpo.datos.codigoQr} → cancelada`;
  }
  throw new Error('no hay turnos libres mañana');
});
await paso('Favorito PUT y DELETE', async () => {
  const t = tokens['nuevo@demo.ar'];
  const a = await pedir('PUT', '/yo/espacios-favoritos/esp-02', { token: t });
  const b = await pedir('DELETE', '/yo/espacios-favoritos/esp-02', { token: t });
  exigir(a.status === 200 && b.status === 204, `status ${a.status}/${b.status}`);
});
await paso('Personal: /agenda, /reservas, /fijas, /bloqueos', async () => {
  const t = tokens['marcelo@villaguay.demo.ar'];
  const [ag, re, fi, bl] = await Promise.all([
    pedir('GET', `/agenda?fecha=${hoy}&porPagina=500`, { token: t }),
    pedir('GET', `/reservas?fecha=${hoy}&porPagina=100`, { token: t }),
    pedir('GET', '/fijas?porPagina=100', { token: t }),
    pedir('GET', `/bloqueos?desde=${hoy}&porPagina=100`, { token: t }),
  ]);
  exigir([ag, re, fi, bl].every((x) => x.status === 200), `status ${ag.status}/${re.status}/${fi.status}/${bl.status}`);
  return `${ag.cuerpo.datos.length} turnos, ${re.cuerpo.datos.length} reservas hoy, ${fi.cuerpo.datos.length} fijas, ${bl.cuerpo.datos.length} bloqueos`;
});
await paso('Ingreso con código inexistente → CODIGO_INVALIDO', async () => {
  const r = await pedir('POST', '/ingresos', { token: tokens['marcelo@villaguay.demo.ar'], cuerpo: { codigoQr: 'VGY-0000-00-XXXXXX', espacioId: 'esp-02' } });
  exigir(r.cuerpo?.error?.codigo === 'CODIGO_INVALIDO', `recibido ${r.status} ${r.cuerpo?.error?.codigo}`);
});
await paso('Jugador en endpoint del personal → SIN_PERMISO', async () => {
  const r = await pedir('GET', `/agenda?fecha=${hoy}`, { token: tokens['emiliano@mail.com'] });
  exigir(r.cuerpo?.error?.codigo === 'SIN_PERMISO', `recibido ${r.status}`);
});

console.log(fallas === 0 ? '\nTodo OK: la app puede usar esta API.' : `\n${fallas} paso(s) con falla.`);
process.exit(fallas === 0 ? 0 : 1);
