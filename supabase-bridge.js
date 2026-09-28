/* ====================================================================
   IMPORTANTE — ANTES DE USAR ESTE ARCHIVO

   Este es el archivo del Paso 4, entregado en .txt para que puedas
   abrirlo con el Bloc de notas o TextEdit sin problemas.

   Para que la aplicación funcione DEBES guardarlo con el nombre:

        supabase-bridge.js

   ...es decir, terminado en .js y NO en .txt, y colocarlo en la misma
   carpeta donde está tu app.js.

   En Windows (Bloc de notas):  Archivo -> Guardar como ->
     "Tipo": Todos los archivos  ->  Nombre: supabase-bridge.js
   En Mac (TextEdit):  Formato -> Convertir a formato solo texto,
     luego Archivo -> Guardar como -> supabase-bridge.js

   Si al guardar queda como "supabase-bridge.js.txt", activa la opcion
   de ver las extensiones de archivo y quita el ".txt" del final.

   Recuerda editar las dos lineas de CONFIG (url y anonKey) que estan
   justo abajo, con los datos del Paso 3.
   ==================================================================== */

/**
 * ToolMaster Pro — Puente de sincronización con Supabase (tiempo real)
 * ---------------------------------------------------------------------
 * Este archivo NO modifica app.js. Se engancha al estado reactivo de Vue
 * ya montado y se encarga de:
 *
 *   1. Cargar los datos desde Supabase al abrir la app.
 *   2. Detectar cualquier cambio local y escribir SOLO las filas que
 *      cambiaron (no el bloque completo).
 *   3. Recibir por WebSocket los cambios de otros usuarios y aplicarlos
 *      a la pantalla al instante.
 *
 * Cargar en index.html DESPUÉS de app.js.
 * Para desactivarlo, basta con quitar su <script>. La app vuelve a
 * funcionar como antes, con localStorage.
 */
(function () {
  'use strict';

  // ===================================================================
  // 1. CONFIGURACIÓN  ← LO ÚNICO QUE DEBES EDITAR
  // ===================================================================
  const CONFIG = {
    // Supabase -> Project Settings -> Data API -> Project URL
    url: 'https://mwxjdubdboavfoxoxike.supabase.co',

    // Supabase -> Project Settings -> API Keys -> anon / public
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13eGpkdWJkYm9hdmZveG94aWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MzA1MzAsImV4cCI6MjEwNDQwNjUzMH0.a32p3PZcKw4ZCIntaGmYH-YdVdBP3qH2F3c-We4ywTw',

    // Si la base está totalmente vacía, sube los datos que hoy están
    // en este navegador. Déjalo en true para la primera carga.
    seedIfEmpty: true,

    // Milisegundos de espera antes de guardar (agrupa cambios seguidos).
    debounceMs: 600,

    // Muestra el indicador de estado abajo a la izquierda.
    showStatusBadge: true
  };

  // Tablas que son arrays en la app (nombre de tabla === nombre del ref)
  const TABLES = ['tools', 'technicians', 'loans', 'maintenances', 'users'];

  // ===================================================================
  // 2. UTILIDADES
  // ===================================================================

  const log = (...a) => console.log('%c[Sync]', 'color:#10b981;font-weight:bold', ...a);
  const err = (...a) => console.error('%c[Sync]', 'color:#ef4444;font-weight:bold', ...a);

  /** Serialización estable: mismas claves en distinto orden dan el mismo texto. */
  function stable(v) {
    if (v === null || v === undefined) return 'null';
    if (typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    return '{' + Object.keys(v).sort()
      .map(k => JSON.stringify(k) + ':' + stable(v[k]))
      .join(',') + '}';
  }

  function debounce(fn, ms) {
    let t = null;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  // ===================================================================
  // 3. INDICADOR DE ESTADO
  // ===================================================================

  let badge = null;

  function buildBadge() {
    if (!CONFIG.showStatusBadge) return;
    badge = document.createElement('div');
    badge.id = 'tm-sync-badge';
    badge.style.cssText = [
      'position:fixed', 'left:12px', 'bottom:12px', 'z-index:99999',
      'font:600 11px/1.4 system-ui,-apple-system,Segoe UI,sans-serif',
      'padding:6px 11px', 'border-radius:999px', 'color:#fff',
      'background:#64748b', 'box-shadow:0 2px 10px rgba(0,0,0,.25)',
      'display:flex', 'align-items:center', 'gap:6px',
      'pointer-events:none', 'user-select:none', 'transition:background .3s'
    ].join(';');
    badge.innerHTML = '<span style="width:7px;height:7px;border-radius:50%;background:#fff;display:inline-block"></span><span data-txt>Conectando…</span>';
    document.body.appendChild(badge);
  }

  const COLORS = { ok: '#059669', busy: '#d97706', err: '#dc2626', idle: '#64748b' };

  function status(text, kind) {
    if (!badge) return;
    badge.style.background = COLORS[kind] || COLORS.idle;
    const s = badge.querySelector('[data-txt]');
    if (s) s.textContent = text;
  }

  /** Avisa del primer fallo de guardado sin bloquear la app con alert(). */
  let warned = false;
  function warnOnce(e) {
    if (warned) return;
    warned = true;
    const box = document.createElement('div');
    box.style.cssText = [
      'position:fixed', 'right:14px', 'bottom:14px', 'z-index:99999', 'max-width:330px',
      'background:#7f1d1d', 'color:#fee2e2', 'border:1px solid #b91c1c',
      'border-radius:11px', 'padding:13px 15px',
      'font:500 12px/1.55 system-ui,-apple-system,Segoe UI,sans-serif',
      'box-shadow:0 6px 22px rgba(0,0,0,.35)'
    ].join(';');
    box.innerHTML =
      '<b style="display:block;margin-bottom:5px;font-size:13px">No se guardó en la nube</b>' +
      'Tus cambios siguen en este navegador, pero no llegaron al servidor. ' +
      'Revisa la conexión y recarga la página.' +
      '<div style="margin-top:7px;font:11px/1.4 ui-monospace,monospace;opacity:.85;word-break:break-word">' +
      String(e && e.message ? e.message : e).slice(0, 180) + '</div>' +
      '<button style="margin-top:9px;background:#fecaca;color:#7f1d1d;border:0;padding:5px 11px;' +
      'border-radius:6px;font-weight:700;cursor:pointer">Entendido</button>';
    box.querySelector('button').onclick = () => { box.remove(); warned = false; };
    document.body.appendChild(box);
  }

  let okTimer = null;
  function flashOk(text) {
    status(text, 'ok');
    clearTimeout(okTimer);
    okTimer = setTimeout(() => status('En línea', 'ok'), 1800);
  }

  // ===================================================================
  // 4. PANTALLA DE CARGA INICIAL
  // ===================================================================

  let overlay = null;

  function showOverlay(msg) {
    if (overlay) {
      const m = overlay.querySelector('[data-msg]');
      if (m) m.textContent = msg;
      return;
    }
    overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:99998',
      'background:rgba(15,23,42,.92)', 'backdrop-filter:blur(3px)',
      'display:flex', 'flex-direction:column', 'align-items:center',
      'justify-content:center', 'gap:18px', 'color:#e2e8f0',
      'font:500 14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif'
    ].join(';');
    overlay.innerHTML =
      '<div style="width:42px;height:42px;border:3px solid rgba(255,255,255,.15);' +
      'border-top-color:#10b981;border-radius:50%;animation:tmspin .8s linear infinite"></div>' +
      '<div data-msg>' + msg + '</div>' +
      '<style>@keyframes tmspin{to{transform:rotate(360deg)}}</style>';
    document.body.appendChild(overlay);
  }

  function hideOverlay() {
    if (overlay) { overlay.remove(); overlay = null; }
  }

  function fatal(msg, detail) {
    err(msg, detail || '');
    showOverlay('');
    overlay.innerHTML =
      '<div style="max-width:460px;text-align:center;padding:26px 30px;background:#1e293b;' +
      'border:1px solid #334155;border-radius:14px">' +
      '<div style="font-size:30px;margin-bottom:10px">⚠️</div>' +
      '<div style="font-weight:700;font-size:15px;margin-bottom:10px;color:#fca5a5">' +
      'No se pudo conectar a la base de datos</div>' +
      '<div style="font-size:13px;color:#cbd5e1;line-height:1.6">' + msg + '</div>' +
      (detail ? '<div style="margin-top:12px;font:11px/1.5 ui-monospace,monospace;color:#94a3b8;' +
        'background:#0f172a;padding:9px;border-radius:7px;word-break:break-word">' +
        String(detail).slice(0, 300) + '</div>' : '') +
      '<button onclick="location.reload()" style="margin-top:16px;background:#10b981;color:#fff;' +
      'border:0;padding:9px 18px;border-radius:8px;font-weight:600;cursor:pointer">Reintentar</button>' +
      '</div>';
    status('Sin conexión', 'err');
  }

  // ===================================================================
  // 5. ESTADO INTERNO
  // ===================================================================

  let sb = null;          // cliente Supabase
  let state = null;       // setupState de Vue (los refs de la app)
  let snap = {};          // tabla -> Map(id -> texto estable de la fila)
  let companySnap = '';
  let paused = true;      // true = no escribir en la nube

  /** Localiza los refs reactivos de la app ya montada. */
  function findState() {
    const el = document.querySelector('#app');
    const inst = el && el._vnode && el._vnode.component;
    if (!inst || !inst.setupState) return null;
    const raw = Vue.toRaw(inst.setupState);
    return (raw && raw.tools && raw.tools.__v_isRef) ? raw : null;
  }

  function waitForState(timeoutMs) {
    return new Promise((resolve, reject) => {
      const t0 = Date.now();
      (function poll() {
        const s = findState();
        if (s) return resolve(s);
        if (Date.now() - t0 > timeoutMs) {
          return reject(new Error('No se encontró el estado de Vue. ' +
            'Verifica que supabase-bridge.js se cargue DESPUÉS de app.js.'));
        }
        setTimeout(poll, 100);
      })();
    });
  }

  // ===================================================================
  // 6. LECTURA INICIAL
  // ===================================================================

  async function pullAll() {
    const out = {};
    for (const t of TABLES) {
      const { data, error } = await sb.from(t).select('*');
      if (error) throw new Error('Leyendo "' + t + '": ' + error.message);
      out[t] = data || [];
    }
    const { data: comp, error: cErr } = await sb
      .from('company').select('*').eq('id', 'main').maybeSingle();
    if (cErr) throw new Error('Leyendo "company": ' + cErr.message);
    out.company = comp || null;
    return out;
  }

  /** Primera carga: si la nube está vacía, sube lo que hay en este navegador. */
  async function seedFromLocal() {
    const local = {};
    let total = 0;
    for (const t of TABLES) {
      local[t] = (state[t].value || []).filter(r => r && r.id);
      total += local[t].length;
    }
    if (!total) return false;

    log('Base vacía: subiendo', total, 'registros locales…');
    showOverlay('Migrando ' + total + ' registros a la nube…');

    for (const t of TABLES) {
      if (!local[t].length) continue;
      const { error } = await sb.from(t).upsert(local[t]);
      if (error) throw new Error('Migrando "' + t + '": ' + error.message);
    }
    const c = state.company;
    if (c && c.name) {
      const row = { id: 'main' };
      ['name', 'nit', 'warehouse', 'address', 'phone', 'manager']
        .forEach(k => { row[k] = c[k] ?? null; });
      await sb.from('company').upsert(row);
    }
    log('Migración inicial completa.');
    return true;
  }

  /** Vuelca los datos del servidor a los refs de la app. */
  function applyServerData(data) {
    paused = true;
    for (const t of TABLES) {
      state[t].value = data[t];
      snap[t] = new Map(data[t].map(r => [r.id, stable(r)]));
    }
    if (data.company) {
      const { id, ...rest } = data.company;
      Object.keys(rest).forEach(k => {
        if (rest[k] !== null && rest[k] !== undefined) state.company[k] = rest[k];
      });
    }
    companySnap = stable(plainCompany());
    Vue.nextTick(() => { paused = false; });
  }

  function plainCompany() {
    const c = state.company || {};
    const row = { id: 'main' };
    ['name', 'nit', 'warehouse', 'address', 'phone', 'manager']
      .forEach(k => { row[k] = c[k] ?? null; });
    return row;
  }

  // ===================================================================
  // 7. ESCRITURA (diferencial, fila por fila)
  // ===================================================================

  function diff(table) {
    const cur = state[table].value || [];
    const prev = snap[table] || new Map();
    const upserts = [];
    const seen = new Set();

    for (const row of cur) {
      if (!row || !row.id) continue;
      seen.add(row.id);
      const s = stable(row);
      if (prev.get(row.id) !== s) upserts.push({ row: JSON.parse(JSON.stringify(row)), s });
    }
    const deletes = [];
    prev.forEach((_v, id) => { if (!seen.has(id)) deletes.push(id); });

    return { upserts, deletes };
  }

  async function push(table) {
    if (paused || !sb) return;
    const { upserts, deletes } = diff(table);
    if (!upserts.length && !deletes.length) return;

    status('Guardando…', 'busy');
    try {
      if (upserts.length) {
        const { error } = await sb.from(table).upsert(upserts.map(u => u.row));
        if (error) throw error;
        upserts.forEach(u => snap[table].set(u.row.id, u.s));
      }
      if (deletes.length) {
        const { error } = await sb.from(table).delete().in('id', deletes);
        if (error) throw error;
        deletes.forEach(id => snap[table].delete(id));
      }
      flashOk('Guardado');
      log('push', table, '+' + upserts.length, '-' + deletes.length);
    } catch (e) {
      err('Error guardando ' + table, e);
      status('Error al guardar', 'err');
      warnOnce(e);
    }
  }

  async function pushCompany() {
    if (paused || !sb) return;
    const row = plainCompany();
    const s = stable(row);
    if (s === companySnap) return;
    status('Guardando…', 'busy');
    try {
      const { error } = await sb.from('company').upsert(row);
      if (error) throw error;
      companySnap = s;
      flashOk('Guardado');
    } catch (e) {
      err('Error guardando company', e);
      status('Error al guardar', 'err');
    }
  }

  // ===================================================================
  // 8. TIEMPO REAL (cambios de otros usuarios)
  // ===================================================================

  function applyRemote(table, payload) {
    const arr = state[table].value;
    const prev = snap[table];
    if (!arr || !prev) return;

    if (payload.eventType === 'DELETE') {
      const id = payload.old && payload.old.id;
      if (!id) return;
      // Actualizar el snapshot ANTES de tocar el array evita que nuestro
      // propio watcher reenvíe el cambio a la nube (eco).
      prev.delete(id);
      const i = arr.findIndex(r => r && r.id === id);
      if (i > -1) arr.splice(i, 1);
      log('remoto: borrado en', table, id);
    } else {
      const row = payload.new;
      if (!row || !row.id) return;
      prev.set(row.id, stable(row));
      const i = arr.findIndex(r => r && r.id === row.id);
      if (i > -1) arr.splice(i, 1, row); else arr.push(row);
      log('remoto:', payload.eventType, 'en', table, row.id);
    }
    flashOk('Actualizado');
  }

  function applyRemoteCompany(payload) {
    const row = payload.new;
    if (!row) return;
    const { id, ...rest } = row;
    Object.keys(rest).forEach(k => { state.company[k] = rest[k]; });
    companySnap = stable(plainCompany());
    flashOk('Actualizado');
  }

  function subscribe() {
    const ch = sb.channel('toolmaster-sync');
    TABLES.forEach(t => {
      ch.on('postgres_changes',
        { event: '*', schema: 'public', table: t },
        p => applyRemote(t, p));
    });
    ch.on('postgres_changes',
      { event: '*', schema: 'public', table: 'company' },
      applyRemoteCompany);

    ch.subscribe(st => {
      if (st === 'SUBSCRIBED') { status('En línea', 'ok'); log('Tiempo real activo.'); }
      else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') status('Reconectando…', 'busy');
      else if (st === 'CLOSED') status('Desconectado', 'err');
    });
  }

  // ===================================================================
  // 9. VIGILANTES LOCALES
  // ===================================================================

  function startWatchers() {
    TABLES.forEach(t => {
      Vue.watch(state[t], debounce(() => push(t), CONFIG.debounceMs), { deep: true });
    });
    Vue.watch(state.company, debounce(pushCompany, CONFIG.debounceMs), { deep: true });
    log('Vigilantes activos sobre', TABLES.join(', ') + ', company');
  }

  // ===================================================================
  // 10. ARRANQUE
  // ===================================================================

  async function boot() {
    buildBadge();
    showOverlay('Conectando con la base de datos…');

    if (!CONFIG.url.startsWith('https://') || CONFIG.url.includes('TU-PROYECTO')) {
      return fatal('Falta configurar la URL del proyecto en <b>supabase-bridge.js</b> ' +
        '(constante CONFIG.url).');
    }
    if (!CONFIG.anonKey || CONFIG.anonKey.includes('PEGA-AQUI')) {
      return fatal('Falta configurar la anon key en <b>supabase-bridge.js</b> ' +
        '(constante CONFIG.anonKey).');
    }
    if (!window.supabase || !window.supabase.createClient) {
      return fatal('No se cargó la librería de Supabase. Revisa que el &lt;script&gt; del ' +
        'SDK esté ANTES de supabase-bridge.js en index.html.');
    }

    try {
      sb = window.supabase.createClient(CONFIG.url, CONFIG.anonKey, {
        auth: { persistSession: false },
        realtime: { params: { eventsPerSecond: 20 } }
      });

      state = await waitForState(15000);
      log('Estado de Vue localizado.');

      showOverlay('Descargando datos…');
      let data = await pullAll();

      const vacio = TABLES.every(t => data[t].length === 0);
      if (vacio && CONFIG.seedIfEmpty) {
        const subio = await seedFromLocal();
        if (subio) data = await pullAll();
      }

      applyServerData(data);
      const n = TABLES.reduce((a, t) => a + data[t].length, 0);
      log('Cargados', n, 'registros desde Supabase.');

      startWatchers();
      subscribe();
      hideOverlay();
      status('En línea', 'ok');

      window.TMSync = {
        client: sb,
        recargar: async () => { applyServerData(await pullAll()); flashOk('Recargado'); },
        estado: () => ({
          filas: Object.fromEntries(TABLES.map(t => [t, state[t].value.length])),
          pausado: paused
        })
      };
    } catch (e) {
      fatal('No se pudo iniciar la sincronización. Revisa que hayas ejecutado el ' +
        'script SQL y que la URL y la anon key sean correctas.', e.message || e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
