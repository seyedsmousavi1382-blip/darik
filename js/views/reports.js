// گزارش‌ها
import { state, cat, parentOf, allTags } from '../store.js';
import { icon } from '../icons.js';
import { fa, short, usdt, toman, jDate } from '../money.js';
import { monthSummary, rateEffect, forecast, currentJ } from '../ledger.js';
import { MONTHS, prevMonth, monthRange, WEEKDAYS } from '../jalali.js';
import { txRow, bindTxRows, sessionLabel } from './transactions.js';
import { esc, donut, barChart, $$ } from '../ui.js';

let view = null, filt = { accountId: '', tag: '' }, drill = null;
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const delta = (a, b) => { if (!b) return ''; const d = Math.round(((a - b) / b) * 100); return d ? `${d > 0 ? '+' : '−'}${fa(Math.abs(d))}٪` : '۰٪'; };

export function renderReports(root, go) {
  const now = currentJ();
  if (!view) view = [now.jy, now.jm];
  const [jy, jm] = view;
  const isCurrent = jy === now.jy && jm === now.jm;
  const opts = { accountId: filt.accountId || null, tag: filt.tag || null };
  const s = monthSummary(state.txs, state.accounts, jy, jm, opts);
  const [py, pm] = prevMonth(jy, jm);
  const p = monthSummary(state.txs, state.accounts, py, pm, opts);
  const tags = allTags();

  // خرج به تفکیک دسته
  const byParent = {};
  for (const [id, v] of Object.entries(s.byCat)) { const pr = parentOf(cat(id)); const k = pr?.id || 'none'; byParent[k] = (byParent[k] || 0) + v; }
  const segs = Object.entries(byParent).sort((a, b) => b[1] - a[1]).map(([id, v]) => ({ id, v, c: cat(id) || { name: 'بدون دسته', color: '#5E6B65', icon: 'dots-circle-horizontal' }, color: (cat(id) || {}).color || '#5E6B65' }));

  // روند ۶ ماهه
  const trend = []; let [ty, tm] = [jy, jm];
  for (let i = 0; i < 6; i++) { const m = monthSummary(state.txs, state.accounts, ty, tm, opts); trend.unshift({ label: MONTHS[tm - 1], a: m.totalIncome, b: m.expense }); [ty, tm] = prevMonth(ty, tm); }

  const rEff = s.tradeDays || state.tot.usdtAmount ? rateEffect(state.accounts, state.txs, jy, jm, state.priceHist, state.rate) : 0;
  const cover = s.expense ? pct(s.tradeRials, s.expense) : 0;
  const f = isCurrent ? forecast(state) : null;

  root.innerHTML = `
    <div class="page-h fade"><h1>گزارش‌ها</h1><button class="back" data-back aria-label="برگشت">${icon('arrow-left', 20)}</button></div>

    <div class="row fade" style="margin-bottom:12px">
      <button class="icon-btn" id="next" aria-label="ماه بعد" ${isCurrent ? 'disabled style="opacity:.3"' : ''}>${icon('chevron-right', 22)}</button>
      <div class="mid">${MONTHS[jm - 1]} ${fa(jy)}</div>
      <button class="icon-btn" id="prev" aria-label="ماه قبل">${icon('chevron-left', 22)}</button>
    </div>
    <div class="grid2 fade" style="margin-bottom:6px">
      <select class="input" id="fa" aria-label="فیلتر حساب"><option value="">همه‌ی حساب‌ها</option>${state.accounts.map((a) => `<option value="${a.id}" ${filt.accountId === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select>
      <select class="input" id="ft" aria-label="فیلتر تگ"><option value="">همه‌ی تگ‌ها</option>${tags.map((g) => `<option value="${esc(g)}" ${filt.tag === g ? 'selected' : ''}>#${esc(g)}</option>`).join('')}</select>
    </div>

    <div class="section-t"><span class="sec">${icon('calculator', 15)} خلاصه‌ی ماه</span></div>
    <div class="grid2">
      <div class="glow-card" style="--edge:rgba(93,202,165,.5)"><div class="muted">درآمد</div><div class="mid green num">${short(s.totalIncome)}</div><div class="muted num" style="font-size:11.5px">${p.totalIncome ? 'نسبت به ماه قبل ' + delta(s.totalIncome, p.totalIncome) : '—'}</div></div>
      <div class="glow-card" style="--edge:rgba(242,139,130,.5)"><div class="muted">خرج</div><div class="mid red num">${short(s.expense)}</div><div class="muted num" style="font-size:11.5px">${p.expense ? 'نسبت به ماه قبل ' + delta(s.expense, p.expense) : '—'}</div></div>
    </div>
    <div class="card" style="margin-top:10px"><div class="row"><span class="muted">مانده‌ی ماه (درآمد منهای خرج)</span><span class="mid num ${s.net >= 0 ? 'green' : 'red'}">${s.net < 0 ? '−' : ''}${short(Math.abs(s.net))}</span></div></div>

    ${f && f.hasData ? `
    <div class="section-t"><span class="sec">${icon('sparkles', 15)} پیش‌بینی تا آخر ${MONTHS[jm - 1]}</span><span class="faint" style="font-size:11.5px">${f.confidence === 'good' ? 'دقت خوب' : f.confidence === 'mid' ? 'دقت متوسط' : 'داده کمه؛ تقریبیه'}</span></div>
    <div class="card">
      <div class="stat-row"><span class="muted">خرج تا امروز</span><span class="num">${short(f.spent)}</span></div>
      <div class="stat-row"><span class="muted">خرج پیش‌بینی‌شده تا آخر ماه</span><span class="num">${short(f.projected.lo)} تا ${short(f.projected.hi)}</span></div>
      ${f.loansDue ? `<div class="stat-row"><span class="muted">قسط‌های پرداخت‌نشده</span><span class="num">${short(f.loansDue)}</span></div>` : ''}
      <div class="stat-row"><span class="muted">سود ترید لازم برای پوشش خرج</span><span class="num">${f.neededUsdt === null ? '—' : f.neededUsdt > 0 ? usdt(f.neededUsdt, 0) + ' تتر' : 'پوشش داده شده'}</span></div>
      <div class="stat-row"><span class="muted">دوام بدون درآمد</span><span class="num">${f.runway === null ? '—' : fa(f.runway.toFixed(1)) + ' ماه'}</span></div>
    </div>
    <div class="card" style="margin-top:10px">
      <div class="muted" style="margin-bottom:6px">کل دارایی آخر ماه در سه حالت</div>
      <div class="stat-row"><span>بدون سود ترید</span><span class="num">${short(f.scenarios.none)}</span></div>
      <div class="stat-row"><span>با میانگین سودت</span><span class="num green">${short(f.scenarios.avg)}</span></div>
      <div class="stat-row"><span>مثل بدترین ماهت</span><span class="num red">${short(f.scenarios.worst)}</span></div>
      <div class="help">سود ترید پیش‌بینی نمی‌شه؛ این‌ها فقط سناریو هستن.</div>
    </div>` : ''}

    <div class="section-t"><span class="sec">${icon('chart-pie', 15)} خرج بر اساس دسته</span>${drill ? `<button class="link" id="up">${icon('arrow-right', 14)} همه‌ی دسته‌ها</button>` : ''}</div>
    <div class="card" id="cats">${segs.length ? '' : `<div class="empty" style="padding:14px 0">این ماه خرجی ثبت نشده.</div>`}</div>

    ${s.tradeDays ? `
    <div class="section-t"><span class="sec">${icon('chart-line', 15)} ترید</span></div>
    <div class="glow-card" style="--edge:rgba(93,202,165,.5)">
      <div class="row"><span class="muted">سود خالص</span><span class="mid num ${s.tradeUsdt >= 0 ? 'green' : 'red'}">${s.tradeUsdt < 0 ? '−' : ''}${usdt(Math.abs(s.tradeUsdt))} تتر</span></div>
      <div class="row muted num" style="margin-top:-2px"><span></span><span>≈ ${short(Math.abs(s.tradeRials))} تومان</span></div>
    </div>
    <div class="card" style="margin-top:10px">
      <div class="stat-row"><span class="muted">روزهای سود / ضرر</span><span class="num"><span class="green">${fa(s.winDays)}</span> / <span class="red">${fa(s.tradeDays - s.winDays)}</span></span></div>
      <div class="stat-row"><span class="muted">میانگین هر جلسه</span><span class="num">${usdt(s.tradeUsdt / s.tradeDays)} تتر</span></div>
      <div class="stat-row"><span class="muted">بهترین جلسه</span><span class="num green">${usdt(s.best.amount)} · ${s.best.sessionKey ? sessionLabel(s.best.sessionKey) : jDate(s.best.date, { year: false })}</span></div>
      <div class="stat-row"><span class="muted">بدترین جلسه</span><span class="num red">${usdt(s.worst.amount)} · ${s.worst.sessionKey ? sessionLabel(s.worst.sessionKey) : jDate(s.worst.date, { year: false })}</span></div>
      <div class="stat-row"><span class="muted">اثر نرخ تتر (جدا از ترید)</span><span class="num ${rEff >= 0 ? 'green' : 'red'}">${rEff < 0 ? '−' : '+'}${short(Math.abs(rEff))}</span></div>
      <div class="stat-row"><span class="muted">پوشش خرج‌ها با ترید</span><span class="num">${s.expense ? fa(cover) + '٪' : '—'}</span></div>
    </div>
    <div class="card" style="margin-top:10px">
      <div class="muted" style="margin-bottom:4px">میانگین سود هر شب هفته (تتر)</div>
      <div class="chart" id="wd"></div>
    </div>` : ''}

    <div class="section-t"><span class="sec">${icon('chart-bar', 15)} روند ۶ ماهه</span><span class="faint sec" style="font-size:11.5px"><span class="green">●</span> درآمد <span class="red" style="margin-right:6px">●</span> خرج</span></div>
    <div class="card"><div class="chart" id="trend"></div></div>`;

  // دسته‌ها با قابلیت «رفتن به داخل»
  const catsBox = root.querySelector('#cats');
  const drawCats = () => {
    if (!segs.length) return;
    if (!drill) {
      catsBox.innerHTML = `<div style="display:flex;justify-content:center;margin:4px 0 10px">${donut(segs, { center: short(s.expense) })}</div>
        ${segs.map((x) => `<div class="tx" data-drill="${x.id}"><span class="tx-l"><span class="ic" style="background:${x.color}1f;color:${x.color}">${icon(x.c.icon, 19)}</span><span class="t"><div>${esc(x.c.name)}</div><div class="progress" style="margin-top:6px;width:120px"><div data-w="${pct(x.v, s.expense)}%" style="background:${x.color}"></div></div></span></span>
          <span style="text-align:left"><div class="num">${short(x.v)}</div><div class="muted num">${fa(pct(x.v, s.expense))}٪</div></span></div>`).join('')}`;
      $$('[data-drill]', catsBox).forEach((el) => (el.onclick = () => { drill = el.dataset.drill; renderReports(root, go); root.querySelector('#cats').scrollIntoView({ block: 'start', behavior: 'smooth' }); }));
    } else {
      const [st, en] = monthRange(jy, jm);
      const kids = state.cats.filter((c) => c.parentId === drill).map((c) => ({ c, v: s.byCat[c.id] || 0 })).filter((x) => x.v);
      const txs = state.txs.filter((t) => t.type === 'expense' && new Date(t.date) >= st && new Date(t.date) < en && (t.categoryId === drill || parentOf(cat(t.categoryId))?.id === drill)
        && (!opts.accountId || t.accountId === opts.accountId) && (!opts.tag || (t.tags || []).includes(opts.tag)));
      const pc = cat(drill) || { name: 'بدون دسته', icon: 'dots-circle-horizontal', color: '#5E6B65' };
      catsBox.innerHTML = `<div class="sec" style="margin-bottom:8px"><span class="ic" style="background:${pc.color}1f;color:${pc.color};margin:0 0 0 8px">${icon(pc.icon, 19)}</span><b>${esc(pc.name)}</b><span class="muted num" style="margin-right:auto">${short(byParent[drill] || 0)}</span></div>
        ${kids.length > 1 ? kids.map((x) => `<div class="stat-row"><span>${esc(x.c.name)}</span><span class="num">${short(x.v)}</span></div>`).join('') : ''}
        <div style="margin-top:6px">${txs.map(txRow).join('')}</div>`;
      bindTxRows(catsBox);
    }
    requestAnimationFrame(() => requestAnimationFrame(() => $$('[data-w]', catsBox).forEach((b) => (b.style.width = b.dataset.w))));
  };
  drawCats();

  if (s.tradeDays) {
    const order = [6, 0, 1, 2, 3, 4, 5]; // شنبه تا جمعه (getDay: ۰ یکشنبه … ۶ شنبه)
    const short7 = ['شنبه', '۱شنبه', '۲شنبه', '۳شنبه', '۴شنبه', '۵شنبه', 'جمعه'];
    barChart(root.querySelector('#wd'), order.map((d, i) => ({ label: short7[i], a: s.byWeekday[d].n ? s.byWeekday[d].sum / s.byWeekday[d].n : 0 })), { fmt: (v) => usdt(v, 0) });
  }
  barChart(root.querySelector('#trend'), trend, { fmt: short });

  root.querySelector('[data-back]').onclick = () => { view = null; drill = null; go('more'); };
  root.querySelector('#prev').onclick = () => { view = prevMonth(jy, jm); drill = null; renderReports(root, go); };
  const nx = root.querySelector('#next');
  if (!isCurrent) nx.onclick = () => { view = jm === 12 ? [jy + 1, 1] : [jy, jm + 1]; drill = null; renderReports(root, go); };
  root.querySelector('#fa').onchange = (e) => { filt.accountId = e.target.value; renderReports(root, go); };
  root.querySelector('#ft').onchange = (e) => { filt.tag = e.target.value; renderReports(root, go); };
  const up = root.querySelector('#up'); if (up) up.onclick = () => { drill = null; renderReports(root, go); };
}
