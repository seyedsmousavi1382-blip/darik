// صفحه‌ی خانه
import { state, setHidden, parentOf, cat, unskipSession } from '../store.js';
import { icon } from '../icons.js';
import { fa, toman, short, usdt, jDate, hm } from '../money.js';
import { monthSummary, currentJ, lastSessionKey, netWorthSeries, forecast, loanPaidThisMonth, daysToDue } from '../ledger.js';
import { prevMonth, MONTHS, toJ } from '../jalali.js';
import { txRow, bindTxRows, sessionLabel } from './transactions.js';
import { openTrade } from './trade.js';
import { payLoan, loanStatus } from './loans.js';
import { goalCard, openGoal } from './goals.js';
import { countUp, lineChart, animateFills, toast, $$ } from '../ui.js';
import { refreshPrice } from '../price.js';

let range = 30;
let firstPaint = true;

function bigParts(rials) {
  const t = Math.round(rials / 10);
  if (Math.abs(t) >= 1e9) return [t / 1e9, 2, 'میلیارد تومان'];
  if (Math.abs(t) >= 1e6) return [t / 1e6, 1, 'میلیون تومان'];
  return [t, 0, 'تومان'];
}
const fmtShortJ = (d) => { const j = toJ(d); return fa(j.jd) + ' ' + MONTHS[j.jm - 1]; };

export function renderHome(root, go) {
  const j = currentJ();
  const sum = monthSummary(state.txs, state.accounts, j.jy, j.jm);
  const [py, pm] = prevMonth(j.jy, j.jm);
  const prev = monthSummary(state.txs, state.accounts, py, pm);
  const tot = state.tot;
  const [bigN, bigD, bigU] = bigParts(tot.total);
  const noData = !state.txs.length && state.accounts.every((a) => !Number(a.opening));
  const needBackup = state.txs.length > 0 && (!state.lastBackup || Date.now() - new Date(state.lastBackup) > 7 * 864e5);
  const f = forecast(state);

  // ترید دیشب
  const key = lastSessionKey();
  const lastTrade = state.txs.filter((t) => t.type === 'trade' && t.sessionKey === key);
  const skipped = state.tradeSkips.includes(key);
  const tradeSum = lastTrade.reduce((s, t) => s + Number(t.amount), 0);
  const hasBroker = state.accounts.some((a) => a.currency === 'USDT' && !a.archived);

  // قسط نزدیک یا عقب‌افتاده
  const dueLoans = state.loans.filter((l) => l.remaining > 0 && !loanPaidThisMonth(l, state.txs) && daysToDue(l) <= 5);

  // تغییر کل دارایی نسبت به ۳۰ روز قبل
  const series = netWorthSeries(state.accounts, state.txs, range, state.priceHist, state.rate);
  const s30 = range === 30 ? series : netWorthSeries(state.accounts, state.txs, 30, state.priceHist, state.rate);
  const base = s30[0]?.v || 0, change = base ? (tot.total - base) / Math.abs(base) : 0;
  const hasHistory = state.txs.length > 0;

  // خرج به تفکیک دسته‌ی اصلی
  const byParent = {};
  for (const [id, v] of Object.entries(sum.byCat)) { const p = parentOf(cat(id)); const pid = p?.id || 'none'; byParent[pid] = (byParent[pid] || 0) + v; }
  const sorted = Object.entries(byParent).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 3), rest = sorted.slice(3).reduce((s, [, v]) => s + v, 0);
  const segs = top.map(([id, v]) => ({ c: cat(id) || { name: 'بدون دسته', icon: 'dots-circle-horizontal', color: '#5E6B65' }, v })).concat(rest ? [{ c: { name: 'سایر', icon: 'dots-circle-horizontal', color: '#4A5550' }, v: rest }] : []);
  const pct = (v) => (sum.expense ? Math.round((v / sum.expense) * 100) : 0);

  const priceLine = state.rate
    ? `تتر ${toman(state.rate)} تومان · ${state.priceAt ? (Date.now() - new Date(state.priceAt) < 864e5 ? 'ساعت ' + hm(state.priceAt) : jDate(state.priceAt, { year: false })) : ''}`
    : 'قیمت تتر هنوز گرفته نشده';
  const goal = state.goals[0];

  root.innerHTML = `
    <div class="row fade" style="margin-bottom:14px">
      <span class="muted" style="font-size:13px">${jDate(new Date(), { weekday: true })}</span>
      <button class="icon-btn" id="eye" aria-label="${state.hidden ? 'نمایش عددها' : 'مخفی کردن عددها'}">${icon(state.hidden ? 'eye-off' : 'eye', 22)}</button>
    </div>

    <section class="fade" aria-label="کل دارایی">
      <div class="muted sec">${icon('building-bank', 16)} کل دارایی</div>
      <div style="margin:6px 0 2px;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap"><span class="big num" id="total">۰</span><span class="muted" style="font-size:14px">${bigU}</span></div>
      <div class="sec" style="flex-wrap:wrap;gap:4px 10px;font-size:12.5px">
        ${hasHistory && base ? `<span class="${change >= 0 ? 'green' : 'red'} sec num">${icon(change >= 0 ? 'trending-up' : 'trending-down', 16)} ${change >= 0 ? '+' : '−'}${fa(Math.abs(change * 100).toFixed(1))}٪ در ۳۰ روز</span>` : ''}
        ${tot.usdtAmount ? `<span class="muted num">${usdt(tot.usdtAmount)} تتر · ${fa(Math.round(tot.usdtShare * 100))}٪ دارایی</span>` : ''}
      </div>
      <div class="muted sec" style="font-size:12px;margin-top:2px">${icon('coin', 15)} <span>${priceLine}</span>
        <button class="icon-btn" id="rp" aria-label="به‌روزرسانی قیمت تتر" style="width:36px;height:36px;color:var(--mint)">${icon('refresh', 16)}</button></div>
    </section>

    ${hasHistory ? `<section class="fade" style="margin-top:6px">
      <div class="chips" role="tablist">${[[7, 'هفته'], [30, 'ماه'], [90, '۳ ماه']].map(([d, l]) => `<button class="chip ${range === d ? 'on' : ''}" data-range="${d}" role="tab" aria-selected="${range === d}">${l}</button>`).join('')}</div>
      <div class="chart" id="nw" style="margin-top:8px"></div>
    </section>` : ''}

    <div class="stack" style="margin-top:14px">
      ${noData ? `<div class="banner mint fade" data-go="accounts" role="button">${icon('info-circle', 22, 'green')}<span class="grow">اول موجودی فعلی حساب‌هات رو وارد کن تا کل دارایی درست حساب بشه.</span>${icon('chevron-left', 18)}</div>` : ''}
      ${dueLoans.map((l) => { const st = loanStatus(l); return `<div class="banner amber fade">${icon('calendar-due', 22, 'amber')}<span class="grow">قسط ${l.name ? '«' + l.name + '»' : ''} · ${short(l.installment)}<div class="muted ${st.cls}" style="font-size:12px">${st.text}</div></span><button class="btn btn-ghost btn-sm" data-pay="${l.id}">پرداخت شد</button></div>`; }).join('')}
      ${needBackup ? `<div class="banner amber fade" data-go="backup" role="button">${icon('database-export', 22, 'amber')}<span class="grow">${state.lastBackup ? 'یه هفته‌ست پشتیبان نگرفتی.' : 'هنوز پشتیبان نگرفتی.'}</span><span class="amber" style="font-size:13px">الان بگیر</span></div>` : ''}

      <div class="grid2 fade">
        <div class="glow-card" style="--edge:rgba(93,202,165,.45)">
          <div class="muted sec">${icon('arrow-down-left', 16, 'green')} درآمد ${MONTHS[j.jm - 1]}</div>
          <div class="mid green num" style="margin-top:4px">${short(sum.totalIncome)}</div>
          <div class="muted num" style="font-size:11.5px">${sum.tradeDays ? `${usdt(sum.tradeUsdt)} تتر از ترید` : 'بدون ترید'}</div>
        </div>
        <div class="glow-card" style="--edge:rgba(242,139,130,.45)">
          <div class="muted sec">${icon('arrow-up-right', 16, 'red')} خرج ${MONTHS[j.jm - 1]}</div>
          <div class="mid red num" style="margin-top:4px">${short(sum.expense)}</div>
          <div class="muted num" style="font-size:11.5px">${f.hasData ? `تا آخر ماه: ${short(f.projected.lo)} تا ${short(f.projected.hi)}` : prev.expense ? `ماه قبل: ${short(prev.expense)}` : 'هنوز خرجی نیست'}</div>
        </div>
      </div>

      ${hasBroker ? `<div class="card fade">
        <div class="row">
          <div>
            <div class="muted sec">${icon('chart-line', 16)} ${sessionLabel(key)}</div>
            ${lastTrade.length
              ? `<div class="mid num ${tradeSum >= 0 ? 'green' : 'red'}" style="margin-top:2px">${tradeSum >= 0 ? '+' : '−'}${usdt(Math.abs(tradeSum))} تتر</div>`
              : skipped ? `<div class="muted" style="font-size:13.5px;margin-top:4px">ترید نکردی</div>`
              : `<div class="amber" style="font-size:13px;margin-top:4px">هنوز ثبت نشده</div>`}
          </div>
          ${!lastTrade.length && !skipped ? `<button class="btn btn-primary btn-sm" id="trade">${icon('pencil-plus', 17)} ثبت</button>`
            : skipped ? `<button class="btn btn-ghost btn-sm" id="unskip">ترید کردم</button>`
            : `<button class="icon-btn" id="trade" aria-label="ثبت ترید دیگر">${icon('circle-plus', 24)}</button>`}
        </div>
      </div>` : ''}

      ${f.hasData || state.txs.some((t) => t.type === 'trade') ? `<div class="card fade">
        <div class="grid2">
          <div><div class="muted sec">${icon('target-arrow', 16)} سود لازم تا آخر ماه</div>
            <div class="mid num" style="margin-top:2px">${f.neededUsdt === null ? '—' : f.neededUsdt > 0 ? usdt(f.neededUsdt, 0) + ' تتر' : '<span class="green">پوشش داده شد</span>'}</div></div>
          <div><div class="muted sec">${icon('hourglass', 16)} دوام بدون درآمد</div>
            <div class="mid num" style="margin-top:2px">${f.runway === null ? '—' : fa(f.runway.toFixed(1)) + ' ماه'}</div></div>
        </div>
        ${f.confidence === 'low' ? `<div class="help">این عددها با داده‌ی کمتر از یه ماه حساب شدن و تقریبی‌ان.</div>` : ''}
      </div>` : ''}

      ${goal ? `<div class="fade">${goalCard(goal, true)}</div>` : ''}

      ${sum.expense ? `<section class="fade">
        <div class="section-t" style="margin-top:12px"><span class="sec">${icon('chart-donut', 15)} خرج بر اساس دسته</span><button class="link" data-go="reports">گزارش‌ها ${icon('chevron-left', 14)}</button></div>
        <div class="bar">${segs.map((x) => `<div data-w="${pct(x.v)}%" style="background:${x.c.color}"></div>`).join('')}</div>
        <div class="legend">${segs.map((x) => `<span>${icon(x.c.icon, 14)} ${x.c.name} <span class="num">${fa(pct(x.v))}٪</span></span>`).join('')}</div>
      </section>` : ''}

      <section class="fade">
        <div class="section-t" style="margin-top:12px">
          <span class="sec">${icon('history', 15)} تراکنش‌های اخیر</span>
          ${state.txs.length > 5 ? `<button class="link" data-go="txs">همه ${icon('chevron-left', 14)}</button>` : ''}
        </div>
        <div class="card flush" id="recent">
          ${state.txs.length ? state.txs.slice(0, 5).map(txRow).join('') : `<div class="empty" style="padding:20px 0">${icon('plus', 26)}اولین تراکنشت رو با دکمه‌ی + ثبت کن.</div>`}
        </div>
      </section>
    </div>`;

  // یک لحظه‌ی هماهنگ: شمارش عدد + کشیده شدن نمودار + پر شدن نوارها
  const totalEl = root.querySelector('#total');
  const fmtBig = (x) => (bigD === 0 ? toman(x * 10) : fa(x.toFixed(bigD)));
  if (firstPaint && tot.total) countUp(totalEl, bigN, (x) => (x < 0 ? '−' : '') + fmtBig(Math.abs(x)));
  else totalEl.textContent = (bigN < 0 ? '−' : '') + fmtBig(Math.abs(bigN));
  firstPaint = false;
  const nw = root.querySelector('#nw');
  if (nw) {
    const step = range === 7 ? 2 : range === 30 ? 9 : 29;
    const labels = []; for (let i = 0; i < series.length; i += step) labels.push(i);
    const lastI = series.length - 1;
    if (lastI - labels[labels.length - 1] < step * 0.6) labels.pop(); // جلوگیری از روی‌هم افتادن دو برچسب آخر
    labels.push(lastI);
    lineChart(nw, series, { fmtV: (v, axis) => short(v), fmtX: fmtShortJ, labels });
  }
  animateFills(root);

  // رویدادها
  bindTxRows(root.querySelector('#recent'));
  root.querySelector('#eye').onclick = () => setHidden(!state.hidden);
  $$('[data-go]', root).forEach((b) => (b.onclick = () => go(b.dataset.go)));
  $$('[data-range]', root).forEach((b) => (b.onclick = () => { range = Number(b.dataset.range); renderHome(root, go); }));
  $$('[data-pay]', root).forEach((b) => (b.onclick = () => payLoan(state.loans.find((l) => l.id === b.dataset.pay))));
  $$('[data-goal]', root).forEach((el) => (el.onclick = () => openGoal(state.goals.find((g) => g.id === el.dataset.goal))));
  const tr = root.querySelector('#trade'); if (tr) tr.onclick = openTrade;
  const us = root.querySelector('#unskip'); if (us) us.onclick = async () => { await unskipSession(key); openTrade(); };
  root.querySelector('#rp').onclick = async (e) => {
    const b = e.currentTarget; b.style.transition = 'transform .8s'; b.style.transform = 'rotate(-360deg)';
    const r = await refreshPrice({ force: true });
    setTimeout(() => { b.style.transition = 'none'; b.style.transform = ''; }, 800);
    if (!r.ok) toast('قیمت گرفته نشد. اینترنت یا فیلترشکن رو چک کن.');
  };
}
