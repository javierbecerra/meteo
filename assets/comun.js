/* ==========================================================
   CONFIGURACIÓN: cambia estos valores por los de tu estación
   ========================================================== */
const CONFIG = {
  nombre: "Meteo El Viso de San Juan",
  lema: "El tiempo al minuto en El Viso de San Juan, en plena comarca de La Sagra, medido por nuestra propia estación.",
  estacion: "Mi estación",                 // nombre corto de la estación
  ubicacion: "El Viso de San Juan (Toledo)",
  equipo: "Ecowitt EasyWeather WIFI3658",
  altitud: 653,                            // metros sobre el nivel del mar
  lat: 40.13, lon: -3.96,                  // redondeadas a ~1 km para no publicar la dirección exacta
  zona: "Europe/Madrid",
  foto_portada: "images/portada.jpg",      // sube tu propia foto con este nombre (opcional)
  webcam: "",                              // URL de una imagen de webcam, si tienes (opcional)
  datos_viejos_min: 40
};

/* ===== Utilidades ===== */
const $ = id => document.getElementById(id);
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const fmt = (v, d = 1) => (v == null || isNaN(v)) ? "--" : Number(v).toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/^-(0(,0+)?)$/, "$1");
const hora = t => new Date(t * 1000).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: CONFIG.zona });
const fechaCorta = t => new Date(t * 1000).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: CONFIG.zona });
const fechaISO = iso => { const [a, m, d] = iso.split("-"); return `${d}/${m}/${a}`; };
const DIRS = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSO","SO","OSO","O","ONO","NO","NNO"];
const dirTxt = g => g == null ? "--" : DIRS[Math.round(g / 22.5) % 16];
const FLECHAS = ["↓","↙","←","↖","↑","↗","→","↘"]; // hacia dónde sopla, según de dónde viene
const flecha = g => g == null ? "" : FLECHAS[Math.round(g / 45) % 8];
const filas = pares => pares.filter(Boolean).map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("");

async function cargarJSON(ruta, defecto = null) {
  try { const r = await fetch(ruta + "?v=" + Date.now()); if (!r.ok) throw 0; return await r.json(); }
  catch (e) { return defecto; }
}

/* ===== Iconos (trazos propios) ===== */
const ICONOS = {
  temp: '<path d="M10 14.5V5a2 2 0 1 1 4 0v9.5a4 4 0 1 1-4 0Z"/><path d="M12 17.5v-4"/>',
  hum: '<path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5Z"/>',
  viento: '<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h15a3 3 0 1 1-3 3"/><path d="M3 16h7"/>',
  pres: '<circle cx="12" cy="13" r="8"/><path d="M12 13l4-3"/><path d="M8 17h8"/>',
  lluvia: '<path d="M7 15a4 4 0 0 1 .5-8A5.5 5.5 0 0 1 18 8.5 3.5 3.5 0 0 1 17.5 15H7Z"/><path d="M9 18l-1 2.5M13 18l-1 2.5M17 18l-1 2.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  luna: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>'
};
const icono = n => `<div class="icono"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONOS[n]}</svg></div>`;

/* ===== Cabecera común ===== */
function montarCabecera(activa) {
  const enlaces = [["index.html", "Inicio"], ["index.html#pronostico", "Pronóstico"], ["graficas.html", "Gráficas"], ["historico.html", "Histórico"], ["index.html#radar", "Radar"], ["index.html#cielo", "Sol y luna"]];
  const logo = `<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="11" fill="var(--accent)"/><path d="M20 7l-7 11h4l-5 8h16l-5-8h4z" fill="#fff"/><path d="M8 31c4-2.5 8 2.5 12 0s8 2.5 12 0" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>`;
  document.body.insertAdjacentHTML("afterbegin", `
  <header class="cab"><div class="wrap">
    <a class="logo" href="index.html">${logo}<span>${CONFIG.nombre}</span></a>
    <nav class="menu">${enlaces.map(([h, t]) => `<a href="${h}" class="${t === activa ? "activo" : ""}">${t}</a>`).join("")}</nav>
    <div class="der">
      <button class="btn-tema" id="btn-tema" aria-label="Cambiar tema claro u oscuro"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">${ICONOS.luna}</svg></button>
      <div class="reloj"><b id="reloj-h">--:--</b><small id="reloj-f"></small></div>
    </div>
  </div></header>`);
  document.body.insertAdjacentHTML("beforeend", `<footer class="pie"><div class="wrap">
    ${CONFIG.nombre}. Datos de una estación ${CONFIG.equipo} vía ecowitt.net, actualizados cada 10 minutos. Pronóstico, calidad del aire y astronomía: Open‑Meteo (CAMS). Radar: RainViewer. Datos sin validar, de aficionado.
  </div></footer>`);

  const tick = () => {
    const d = new Date();
    $("reloj-h").textContent = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: CONFIG.zona });
    $("reloj-f").textContent = d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", timeZone: CONFIG.zona });
  };
  tick(); setInterval(tick, 15000);

  try { const t = localStorage.getItem("tema"); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
  $("btn-tema").onclick = () => {
    const oscuro = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = oscuro ? "light" : "dark";
    try { localStorage.setItem("tema", document.documentElement.dataset.theme); } catch (e) {}
    document.dispatchEvent(new Event("tema"));
  };
}

/* ===== Cálculos de humedad ===== */
function psicrometria(T, HR, P) {
  if (T == null || HR == null) return {};
  const es = 6.112 * Math.exp(17.67 * T / (T + 243.5));       // hPa
  const e = es * HR / 100;
  const absoluta = 216.7 * e / (T + 273.15);                  // g/m³
  const especifica = P ? 622 * e / (P - 0.378 * e) : null;    // g/kg
  return { vapor: e, absoluta, especifica };
}

/* ===== Mini‑gráfica de las tarjetas ===== */
function sparkline(pts) {
  pts = pts.filter(p => p[1] != null);
  if (pts.length < 2) return `<svg class="spark"></svg>`;
  const W = 240, H = 58, t0 = pts[0][0], t1 = pts.at(-1)[0];
  let lo = Math.min(...pts.map(p => p[1])), hi = Math.max(...pts.map(p => p[1]));
  if (hi - lo < 1e-6) { hi += 1; lo -= 1; }
  const x = t => (t - t0) / (t1 - t0 || 1) * W, y = v => H - 6 - (v - lo) / (hi - lo) * (H - 18);
  const d = pts.map((p, i) => (i ? "L" : "M") + x(p[0]).toFixed(1) + " " + y(p[1]).toFixed(1)).join("");
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <defs><linearGradient id="gs" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".28"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
    <path d="${d}L${W} ${H}L0 ${H}Z" fill="url(#gs)"/><path d="${d}" fill="none" stroke="var(--accent)" stroke-width="1.8" vector-effect="non-scaling-stroke"/></svg>`;
}

/* ===== Gráfica técnica con dos ejes ===== */
// op = { t0, t1, alto, izq: {unidad, series, min, max, cero}, der: {...} }
// serie = { pts: [[t, v]], color, ancho, raya, area, puntos }
function grafica(el, op) {
  const W = 1000, H = op.alto || 260, P = { l: 50, r: op.der ? 50 : 16, t: 22, b: 26 };
  const ejes = ["izq", "der"].filter(k => op[k]);
  const todo = ejes.flatMap(k => op[k].series.flatMap(s => s.pts.filter(p => p[0] >= op.t0 && p[1] != null)));
  if (todo.length < 2) { $(el).innerHTML = `<p class="vacio">Todavía no hay datos suficientes para este periodo.</p>`; return; }
  const x = t => P.l + (t - op.t0) / (op.t1 - op.t0) * (W - P.l - P.r);
  const escala = {};
  for (const k of ejes) {
    const e = op[k], vals = e.series.flatMap(s => s.pts.filter(p => p[0] >= op.t0 && p[1] != null).map(p => p[1]));
    let lo = e.min ?? (vals.length ? Math.min(...vals) : 0), hi = e.max ?? (vals.length ? Math.max(...vals) : 1);
    if (e.cero) lo = 0;
    if (hi - lo < (e.rango || 1)) hi = lo + (e.rango || 1);
    if (e.min == null && !e.cero) { const p = (hi - lo) * .06; lo -= p; hi += p; }
    escala[k] = { lo, hi, y: v => H - P.b - (v - lo) / (hi - lo) * (H - P.t - P.b) };
  }
  let s = "";
  const base = escala[ejes[0]];
  for (let i = 0; i <= 5; i++) {
    const yy = P.t + (H - P.t - P.b) * i / 5;
    s += `<line x1="${P.l}" x2="${W - P.r}" y1="${yy}" y2="${yy}" stroke="${css("--line")}"/>`;
    for (const k of ejes) {
      const e = escala[k], v = e.hi - (e.hi - e.lo) * i / 5, d = op[k].dec ?? (e.hi - e.lo < 8 ? 1 : 0);
      s += `<text x="${k === "izq" ? P.l - 8 : W - P.r + 8}" y="${yy + 4}" text-anchor="${k === "izq" ? "end" : "start"}">${fmt(v, d)}</text>`;
    }
  }
  for (const k of ejes) s += `<text x="${k === "izq" ? P.l - 8 : W - P.r + 8}" y="${P.t - 9}" text-anchor="${k === "izq" ? "end" : "start"}" font-weight="600">${op[k].unidad}</text>`;
  // marcas de tiempo
  const dur = op.t1 - op.t0, paso = dur <= 86400 ? 4 : dur <= 2 * 86400 ? 6 : 24;
  const ini = Math.ceil(op.t0 / 3600) * 3600;
  for (let t = ini; t < op.t1; t += 3600) {
    const h = Number(new Date(t * 1000).toLocaleString("es-ES", { hour: "numeric", hour12: false, timeZone: CONFIG.zona })) % 24;
    if (h % paso) continue;
    const et = h === 0 ? new Date(t * 1000).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", timeZone: CONFIG.zona }) : String(h).padStart(2, "0") + ":00";
    s += `<line x1="${x(t)}" x2="${x(t)}" y1="${P.t}" y2="${H - P.b}" stroke="${css("--line")}" stroke-dasharray="${h === 0 ? "" : "3 4"}"/><text x="${x(t)}" y="${H - 7}" text-anchor="middle" ${h === 0 ? 'font-weight="700"' : ""}>${et}</text>`;
  }
  for (const k of ejes) for (const se of op[k].series) {
    const y = escala[k].y, pts = se.pts.filter(p => p[0] >= op.t0 && p[1] != null), col = se.color.startsWith("--") ? css(se.color) : se.color;
    if (se.puntos) { s += pts.map(p => `<circle cx="${x(p[0]).toFixed(1)}" cy="${y(p[1]).toFixed(1)}" r="2" fill="${col}"/>`).join(""); continue; }
    let d = "", prev = null;
    for (const [t, v] of pts) { d += (prev != null && t - prev < 1800 ? "L" : "M") + x(t).toFixed(1) + " " + y(v).toFixed(1); prev = t; }
    if (se.area && pts.length) s += `<path d="${d}L${x(pts.at(-1)[0])} ${H - P.b}L${x(pts[0][0])} ${H - P.b}Z" fill="${col}" opacity=".18"/>`;
    s += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${se.ancho || 2}" ${se.raya ? `stroke-dasharray="${se.raya}"` : ""} stroke-linejoin="round"/>`;
  }
  $(el).innerHTML = `<svg class="g" viewBox="0 0 ${W} ${H}" role="img">${s}</svg>`;
}

/* ===== Pronóstico: códigos WMO ===== */
function cieloWMO(c, dia = 1) {
  const n = !dia;
  if (c === 0) return [n ? "🌙" : "☀️", "Despejado"];
  if (c === 1) return [n ? "🌙" : "🌤️", "Poco nuboso"];
  if (c === 2) return [n ? "☁️" : "⛅", "Nubes y claros"];
  if (c === 3) return ["☁️", "Cubierto"];
  if (c === 45 || c === 48) return ["🌫️", "Niebla"];
  if (c >= 51 && c <= 57) return ["🌦️", "Llovizna"];
  if (c >= 61 && c <= 67) return ["🌧️", "Lluvia"];
  if (c >= 71 && c <= 77) return ["🌨️", "Nieve"];
  if (c >= 80 && c <= 82) return ["🌦️", "Chubascos"];
  if (c === 85 || c === 86) return ["🌨️", "Chubascos de nieve"];
  if (c >= 95) return ["⛈️", "Tormenta"];
  return ["❔", ""];
}

/* ===== Luna ===== */
function luna(fecha = new Date()) {
  const ciclo = 29.530588853, ref = Date.UTC(2000, 0, 6, 18, 14) / 86400000;
  const edad = (((fecha.getTime() / 86400000 - ref) % ciclo) + ciclo) % ciclo;
  const ilum = (1 - Math.cos(2 * Math.PI * edad / ciclo)) / 2;
  const fases = [["🌑", "Luna nueva"], ["🌒", "Creciente"], ["🌓", "Cuarto creciente"], ["🌔", "Gibosa creciente"], ["🌕", "Luna llena"], ["🌖", "Gibosa menguante"], ["🌗", "Cuarto menguante"], ["🌘", "Menguante"]];
  const [em, nombre] = fases[Math.round(edad / ciclo * 8) % 8];
  return { edad, ilum, em, nombre };
}
