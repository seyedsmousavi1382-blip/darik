// ابزارهای ظاهری مشترک: برگه‌ی پایین، پیغام، پس‌زمینه، نمودارها
import { ICONS, icon } from './icons.js';
import { fa } from './money.js';

export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];

// جلوگیری از اجرای کد داخل متن‌هایی که کاربر تایپ کرده
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ———— برگه‌ی پایین (Sheet) ————
let onSheetClose = null;
export function openSheet(html, mount) {
  const sheet = $('#sheet');
  sheet.classList.remove('closing');
  sheet.innerHTML = '<div class="grab"></div>' + html;
  sheet.scrollTop = 0;
  $('#overlay').classList.add('show');
  document.body.classList.add('sheet-open');
  requestAnimationFrame(() => sheet.classList.add('show'));
  onSheetClose = mount ? mount(sheet) || null : null;
}
export function closeSheet() {
  const sheet = $('#sheet');
  sheet.classList.add('closing');
  sheet.classList.remove('show');
  $('#overlay').classList.remove('show');
  document.body.classList.remove('sheet-open');
  if (typeof onSheetClose === 'function') onSheetClose();
  onSheetClose = null;
}
export function initSheet() {
  $('#overlay').addEventListener('click', closeSheet);
  const sheet = $('#sheet');
  let y0 = null, dy = 0;
  sheet.addEventListener('touchstart', (e) => { if (sheet.scrollTop <= 0) { y0 = e.touches[0].clientY; dy = 0; } }, { passive: true });
  sheet.addEventListener('touchmove', (e) => {
    if (y0 === null) return;
    dy = e.touches[0].clientY - y0;
    if (dy > 0) { sheet.style.transition = 'none'; sheet.style.transform = `translateY(${dy}px)`; }
  }, { passive: true });
  sheet.addEventListener('touchend', () => {
    sheet.style.transition = ''; sheet.style.transform = '';
    if (y0 !== null && dy > 110) closeSheet();
    y0 = null;
  });
}

// ———— پیغام پایین ————
let toastTimer = null;
const CHECK = '<svg class="i check-anim" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7FE0BA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12.5l2.7 2.7L16 9.8"/></svg>';
export function toast(msg, { action, onAction, ms = 4000, ok = false } = {}) {
  const t = $('#toast');
  t.innerHTML = (ok ? CHECK : '') + `<span class="msg">${esc(msg)}</span>` + (action ? `<button>${esc(action)}</button>` : '');
  if (action) t.querySelector('button').onclick = () => { t.classList.remove('show'); onAction && onAction(); };
  t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

// ———— کلید انتخاب با نشانگر لغزنده ————
export function segHtml(items, active, tone = '') {
  const i = Math.max(0, items.findIndex(([k]) => k === active));
  return `<div class="seg" data-tone="${tone}" style="--n:${items.length};--i:${i}">${items.map(([k, l]) => `<button data-seg="${k}" class="${k === active ? 'on' : ''}">${l}</button>`).join('')}</div>`;
}

// ———— پس‌زمینه: مدار ریز بالای صفحه + دلارهای سه‌بعدی مینیمال ————
export function drawBackground() {
  const bg = $('#bg');
  // خطوط مدار (هم‌خانواده‌ی آیکون اپ)
  const traces = [
    'M-10 40 H70 L100 70 H170', 'M-10 90 H40 L70 120 H120', 'M400 30 H330 L300 60 H240', 'M400 110 H350 L320 140 H280',
    'M150 -10 V20 L180 50 V90', 'M260 -10 V30 L230 60',
  ];
  const ends = [[170, 70], [120, 120], [240, 60], [280, 140], [180, 90], [230, 60]];
  bg.innerHTML = `<svg class="circuit" viewBox="0 0 390 180" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
    <g fill="none" stroke="#5DCAA5" stroke-opacity=".16" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">${traces.map((d) => `<path d="${d}"/>`).join('')}</g>
    <g fill="#7FE0BA" fill-opacity=".28">${ends.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6"/>`).join('')}</g></svg>`;

  let seed = 21;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const colors = ['#5DCAA5', '#8F87F1', '#E9C46A'];
  const layers = [];
  for (let i = 0; i < 9; i++) {
    const depth = 0.3 + rnd() * 0.7;                  // ۰٫۳ دور ← ۱ نزدیک
    const size = Math.round(18 + depth * 34);
    const el = document.createElement('div');
    el.className = 'dollar';
    el.style.left = (4 + rnd() * 86) + '%';
    el.style.top = (8 + (i / 9) * 84 + rnd() * 6) + '%';
    el.style.opacity = (0.1 + depth * 0.22).toFixed(2);
    el.style.filter = depth < 0.5 ? 'blur(0.6px)' : 'none';
    const c = colors[i % 3];
    el.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${(1.1 + (1 - depth) * 0.6).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
      style="--t: rotateX(${Math.round(rnd() * 70 - 35)}deg) rotateY(${Math.round(rnd() * 80 - 40)}deg) rotateZ(${Math.round(rnd() * 50 - 25)}deg); --d:${(6 + rnd() * 6).toFixed(1)}s">${ICONS['currency-dollar']}</svg>`;
    bg.appendChild(el);
    layers.push([el, depth]);
  }
  // حرکت آرام با اسکرول (عمق): دلارهای نزدیک‌تر بیشتر جابه‌جا می‌شوند
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = scrollY;
      for (const [el, d] of layers) el.style.transform = `translate3d(0, ${(-y * d * 0.12).toFixed(1)}px, 0)`;
      ticking = false;
    });
  }, { passive: true });
}

// ———— شمارش عدد ————
export function countUp(el, to, format, ms = 1100) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = format(to); return; }
  let t0 = null;
  const step = (ts) => {
    if (!t0) t0 = ts;
    const k = Math.min((ts - t0) / ms, 1), e = 1 - Math.pow(1 - k, 4);
    el.textContent = format(to * e);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ———— نمودار خطی با لمس ————
// points: [{x: Date, v: number}] ، fmtV: نمایش عدد ، fmtX: نمایش تاریخ
export function lineChart(el, points, { fmtV, fmtX, color = '#5DCAA5', labels = [] } = {}) {
  if (points.length < 2) { el.innerHTML = `<div class="empty" style="padding:18px 0">برای نمودار، چند روز داده لازمه.</div>`; return; }
  const W = 340, H = 140, X0 = 8, X1 = W - 40, Y0 = 14, Y1 = 104;
  const vs = points.map((p) => p.v);
  let mn = Math.min(...vs), mx = Math.max(...vs);
  if (mn === mx) { mn -= 1; mx += 1; }
  const pad = (mx - mn) * 0.12; mn -= pad; mx += pad;
  const P = points.map((p, i) => [X0 + (X1 - X0) * i / (points.length - 1), Y1 - (p.v - mn) / (mx - mn) * (Y1 - Y0)]);
  let d = `M${P[0][0]},${P[0][1]}`;
  for (let i = 1; i < P.length; i++) { const [x0, y0] = P[i - 1], [x1, y1] = P[i], cx = (x0 + x1) / 2; d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`; }
  const grid = [0, 0.5, 1].map((t) => { const y = Y0 + (Y1 - Y0) * t, v = mx - (mx - mn) * t;
    return `<line x1="${X0}" x2="${X1}" y1="${y}" y2="${y}" stroke="rgba(255,255,255,.06)"/><text x="${W - 2}" y="${y + 4}" fill="#8E9A94" font-size="10" text-anchor="end" font-family="Vazirmatn">${fmtV(v, true)}</text>`; }).join('');
  // در متن راست‌به‌چپ: end یعنی لبه‌ی چپ متن، start یعنی لبه‌ی راست؛ اولی و آخری داخل کادر می‌مانند
  const xl = labels.map((i, k) => `<text x="${P[i][0]}" y="${H - 8}" fill="#8E9A94" font-size="10" text-anchor="${k === 0 ? 'end' : k === labels.length - 1 ? 'start' : 'middle'}" direction="rtl" font-family="Vazirmatn">${fmtX(points[i].x)}</text>`).join('');
  const last = P[P.length - 1];
  const gid = 'g' + Math.random().toString(36).slice(2, 7);
  el.innerHTML = `<div class="tip"></div><svg viewBox="0 0 ${W} ${H}" direction="ltr" role="img" aria-label="نمودار">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".32"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    ${grid}
    <path d="${d} L${X1},${Y1 + 4} L${X0},${Y1 + 4} Z" fill="url(#${gid})" style="opacity:0;transition:opacity .9s .5s" class="area"/>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" class="ln"/>
    <line class="cur" y1="${Y0 - 4}" y2="${Y1 + 4}" stroke="rgba(255,255,255,.3)" stroke-dasharray="3 3" opacity="0"/>
    <circle class="dot" cx="${last[0]}" cy="${last[1]}" r="5" fill="${color}" stroke="#07100C" stroke-width="2.5"/>
    ${xl}</svg>`;
  const svg = el.querySelector('svg'), ln = el.querySelector('.ln'), area = el.querySelector('.area'), dot = el.querySelector('.dot'), cur = el.querySelector('.cur'), tip = el.querySelector('.tip');
  const L = ln.getTotalLength();
  ln.style.strokeDasharray = L; ln.style.setProperty('--len', L); ln.classList.add('line-draw');
  requestAnimationFrame(() => (area.style.opacity = 1));
  const scrub = (cx) => {
    const r = svg.getBoundingClientRect(), x = ((cx - r.left) / r.width) * W;
    let b = 0; P.forEach((p, i) => { if (Math.abs(p[0] - x) < Math.abs(P[b][0] - x)) b = i; });
    dot.setAttribute('cx', P[b][0]); dot.setAttribute('cy', P[b][1]);
    cur.setAttribute('x1', P[b][0]); cur.setAttribute('x2', P[b][0]); cur.setAttribute('opacity', 1);
    tip.textContent = fmtV(points[b].v) + ' · ' + fmtX(points[b].x);
    tip.classList.add('show');
    tip.style.left = Math.min(Math.max((P[b][0] / W) * r.width - tip.offsetWidth / 2, 0), r.width - tip.offsetWidth) + 'px';
  };
  const end = () => { tip.classList.remove('show'); cur.setAttribute('opacity', 0); dot.setAttribute('cx', last[0]); dot.setAttribute('cy', last[1]); };
  svg.addEventListener('pointermove', (e) => scrub(e.clientX));
  svg.addEventListener('pointerdown', (e) => scrub(e.clientX));
  svg.addEventListener('pointerleave', end);
  svg.addEventListener('pointerup', () => setTimeout(end, 1200));
}

// ———— نمودار میله‌ای (یک یا دو سری) ————
// items: [{label, a, b}] ، a سبز ، b قرمز (اختیاری)
export function barChart(el, items, { fmt, colorA = '#5DCAA5', colorB = '#F28B82' } = {}) {
  const W = 340, H = 150, top = 16, base = 118;
  const max = Math.max(1, ...items.flatMap((x) => [Math.abs(x.a || 0), Math.abs(x.b || 0)]));
  const slot = W / items.length, bw = items.some((x) => x.b !== undefined) ? Math.min(14, slot / 4) : Math.min(22, slot / 2.2);
  const bars = items.map((x, i) => {
    const cx = slot * i + slot / 2;
    const h = (v) => Math.max(2, (Math.abs(v || 0) / max) * (base - top));
    let s = '';
    if (x.b !== undefined) {
      s += `<rect class="vbar" x="${cx - bw - 2}" y="${base - h(x.a)}" width="${bw}" height="${h(x.a)}" rx="4" fill="${colorA}" style="animation-delay:${i * 60}ms"/>`;
      s += `<rect class="vbar" x="${cx + 2}" y="${base - h(x.b)}" width="${bw}" height="${h(x.b)}" rx="4" fill="${colorB}" style="animation-delay:${i * 60 + 30}ms"/>`;
    } else {
      const c = (x.a || 0) >= 0 ? colorA : colorB;
      s += `<rect class="vbar" x="${cx - bw / 2}" y="${base - h(x.a)}" width="${bw}" height="${h(x.a)}" rx="5" fill="${c}" style="animation-delay:${i * 60}ms"/>`;
      if (x.a) s += `<text x="${cx}" y="${base - h(x.a) - 5}" fill="#ECF2EF" font-size="10" text-anchor="middle" font-family="Vazirmatn">${fmt(x.a)}</text>`;
    }
    return s + `<text x="${cx}" y="${H - 12}" fill="#8E9A94" font-size="9.5" text-anchor="middle" font-family="Vazirmatn">${x.label}</text>`;
  }).join('');
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" direction="ltr" role="img" aria-label="نمودار میله‌ای"><line x1="0" x2="${W}" y1="${base}" y2="${base}" stroke="rgba(255,255,255,.08)"/>${bars}</svg>`;
}

// ———— نمودار حلقه‌ای ————
export function donut(segs, { size = 150, stroke = 18, center = '' } = {}) {
  const r = (size - stroke) / 2, C = 2 * Math.PI * r, total = segs.reduce((s, x) => s + x.v, 0) || 1;
  let acc = 0;
  const arcs = segs.map((x, i) => {
    const len = (x.v / total) * C, gap = segs.length > 1 ? 3 : 0;
    const s = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${x.color}" stroke-width="${stroke}" stroke-linecap="butt"
      stroke-dasharray="${Math.max(0, len - gap)} ${C}" stroke-dashoffset="${-acc}" transform="rotate(-90 ${size / 2} ${size / 2})"
      style="opacity:0;animation:rise .5s ${i * 70}ms forwards" data-i="${i}"/>`;
    acc += len;
    return s;
  }).join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="نمودار حلقه‌ای">${arcs}<text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" fill="#ECF2EF" font-size="20" font-family="Lalezar">${center}</text></svg>`;
}

// ———— حلقه‌ی پیشرفت ————
export function ring(pct, { size = 56, stroke = 6, color = '#E9C46A', label = '' } = {}) {
  const r = (size - stroke) / 2, C = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct));
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="${stroke}"/>
    <circle class="ring-fill" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${C}" stroke-dashoffset="${C}" data-to="${C * (1 - p)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="#ECF2EF" font-size="${size / 4.2}" font-family="Lalezar">${label || fa(Math.round(p * 100)) + '٪'}</text></svg>`;
}
// بعد از گذاشتن HTML، حلقه‌ها و نوارها را پر کن (انیمیشن)
export function animateFills(root) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $$('.ring-fill', root).forEach((c) => (c.style.strokeDashoffset = c.dataset.to));
    $$('[data-w]', root).forEach((b) => (b.style.width = b.dataset.w));
  }));
}

export { icon };
