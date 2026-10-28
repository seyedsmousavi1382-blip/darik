// محاسبات مالی: موجودی، کل دارایی، خلاصه‌ی ماه، تاریخچه، پیش‌بینی، گزارش ترید
// این فایل هیچ کاری با ظاهر ندارد؛ فقط عدد حساب می‌کند.
import { toJ, monthRange, monthLength, prevMonth } from './jalali.js';

// انواع تراکنش:
// expense  هزینه      : amount از accountId کم می‌شود
// income   درآمد      : amount به accountId اضافه می‌شود
// transfer انتقال     : amount از accountId به toAccountId (هم‌واحد)
// convert  تبدیل      : amount از accountId کم، toAmount به toAccountId اضافه (rate = ریال برای هر تتر)
// trade    سود/ضرر ترید: amount (مثبت یا منفی، تتر) به accountId
// adjust   تعدیل      : amount (مثبت یا منفی) به accountId

export const ymd = (d) => { d = new Date(d); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const roundU = (x) => Math.round(x * 1e6) / 1e6;

function apply(b, t) {
  const amt = Number(t.amount) || 0;
  switch (t.type) {
    case 'expense': b[t.accountId] = (b[t.accountId] || 0) - amt; break;
    case 'income': case 'trade': case 'adjust': b[t.accountId] = (b[t.accountId] || 0) + amt; break;
    case 'transfer': b[t.accountId] = (b[t.accountId] || 0) - amt; b[t.toAccountId] = (b[t.toAccountId] || 0) + amt; break;
    case 'convert': b[t.accountId] = (b[t.accountId] || 0) - amt; b[t.toAccountId] = (b[t.toAccountId] || 0) + (Number(t.toAmount) || 0); break;
  }
}

export function balances(accounts, txs, until = null) {
  const b = {};
  for (const a of accounts) b[a.id] = Number(a.opening) || 0;
  for (const t of txs) if (!until || new Date(t.date) <= until) apply(b, t);
  for (const a of accounts) if (a.currency === 'USDT') b[a.id] = roundU(b[a.id]);
  return b;
}

// ارزش ریالی یک مقدار در واحد یک حساب
export const toRials = (amount, currency, rate) => (currency === 'USDT' ? Math.round(amount * (rate || 0)) : Math.round(amount));

export function totals(accounts, bal, rate) {
  let total = 0, usdtRials = 0, usdtAmount = 0;
  for (const a of accounts) {
    if (a.archived) continue;
    const v = toRials(bal[a.id] || 0, a.currency, rate);
    total += v;
    if (a.currency === 'USDT') { usdtRials += v; usdtAmount += bal[a.id] || 0; }
  }
  return { total, usdtRials, usdtAmount: roundU(usdtAmount), usdtShare: total > 0 ? usdtRials / total : 0 };
}

// قیمت تتر در یک روز: از تاریخچه‌ی قیمت، یا نزدیک‌ترین روز قبلش
export function rateOn(hist, day, fallback) {
  if (hist[day]) return hist[day];
  let best = null;
  for (const k in hist) if (k <= day && (!best || k > best)) best = k;
  return best ? hist[best] : fallback;
}

// تاریخچه‌ی کل دارایی (برای نمودار خانه)
export function netWorthSeries(accounts, txs, days, hist, curRate) {
  const active = accounts.filter((a) => !a.archived);
  const cur = Object.fromEntries(accounts.map((a) => [a.id, a.currency]));
  const asc = [...txs].sort((a, b) => new Date(a.date) - new Date(b.date));
  const today = new Date(); today.setHours(23, 59, 59, 999);
  const start = new Date(today); start.setDate(start.getDate() - days + 1);
  const b = {};
  for (const a of accounts) b[a.id] = Number(a.opening) || 0;
  let i = 0;
  while (i < asc.length && new Date(asc[i].date) < new Date(start.getFullYear(), start.getMonth(), start.getDate())) apply(b, asc[i++]);
  const out = [];
  for (let k = 0; k < days; k++) {
    const end = new Date(start); end.setDate(start.getDate() + k); end.setHours(23, 59, 59, 999);
    while (i < asc.length && new Date(asc[i].date) <= end) apply(b, asc[i++]);
    const r = k === days - 1 ? curRate : rateOn(hist, ymd(end), curRate);
    let v = 0;
    for (const a of active) v += toRials(b[a.id] || 0, cur[a.id], r);
    out.push({ x: new Date(end), v });
  }
  return out;
}

// خلاصه‌ی یک ماه شمسی (همه‌ی مبالغ به ریال)
export function monthSummary(txs, accounts, jy, jm, { accountId = null, tag = null } = {}) {
  const [start, end] = monthRange(jy, jm);
  const cur = Object.fromEntries(accounts.map((a) => [a.id, a.currency]));
  let income = 0, expense = 0, tradeUsdt = 0, tradeRials = 0, tradeDays = 0, winDays = 0, best = null, worst = null;
  const byCat = {}, byWeekday = Array.from({ length: 7 }, () => ({ n: 0, sum: 0 }));
  for (const t of txs) {
    const d = new Date(t.date);
    if (d < start || d >= end) continue;
    if (accountId && t.accountId !== accountId && t.toAccountId !== accountId) continue;
    if (tag && !(t.tags || []).includes(tag)) continue;
    const rials = toRials(Number(t.amount), cur[t.accountId], t.rate);
    if (t.type === 'expense') { expense += rials; byCat[t.categoryId] = (byCat[t.categoryId] || 0) + rials; }
    else if (t.type === 'income') income += rials;
    else if (t.type === 'trade') {
      const a = Number(t.amount);
      tradeUsdt += a; tradeRials += rials; tradeDays++;
      if (a > 0) winDays++;
      if (!best || a > best.amount) best = t;
      if (!worst || a < worst.amount) worst = t;
      const wd = t.sessionKey ? new Date(t.sessionKey + 'T12:00:00').getDay() : d.getDay();
      byWeekday[wd].n++; byWeekday[wd].sum += a;
    }
  }
  return { income, expense, tradeUsdt: roundU(tradeUsdt), tradeRials, tradeDays, winDays, best, worst, byWeekday,
    totalIncome: income + tradeRials, net: income + tradeRials - expense, byCat };
}

// اثر نرخ تتر در یک ماه: تغییر ارزش تومانیِ تترها که از «بالا/پایین رفتن قیمت» آمده، نه از ترید
export function rateEffect(accounts, txs, jy, jm, hist, curRate) {
  const [start, end] = monthRange(jy, jm);
  const usdtIds = new Set(accounts.filter((a) => a.currency === 'USDT').map((a) => a.id));
  const sumU = (b) => [...usdtIds].reduce((s, id) => s + (b[id] || 0), 0);
  const before = new Date(start.getTime() - 1);
  const endNow = end > new Date() ? new Date() : new Date(end.getTime() - 1);
  const q0 = sumU(balances(accounts, txs, before)), q1 = sumU(balances(accounts, txs, endNow));
  const r0 = rateOn(hist, ymd(before), curRate), r1 = end > new Date() ? curRate : rateOn(hist, ymd(endNow), curRate);
  // ارزش جریان‌های تتری داخل ماه به قیمت همان لحظه
  let flows = 0;
  for (const t of txs) {
    const d = new Date(t.date);
    if (d < start || d >= end) continue;
    const r = t.rate || rateOn(hist, ymd(d), curRate);
    if (usdtIds.has(t.accountId)) {
      const sign = ['expense', 'transfer', 'convert'].includes(t.type) ? -1 : 1;
      if (!(t.type === 'transfer' && usdtIds.has(t.toAccountId))) flows += sign * Number(t.amount) * r;
    }
    if (t.toAccountId && usdtIds.has(t.toAccountId) && !usdtIds.has(t.accountId)) flows += (t.type === 'convert' ? Number(t.toAmount) : Number(t.amount)) * r;
  }
  return Math.round(q1 * r1 - q0 * r0 - flows);
}

// میانگین قیمت خرید تتر (روش میانگین موزون)
export function usdtAvgCost(accounts, txs, curRate) {
  const usdtIds = new Set(accounts.filter((a) => a.currency === 'USDT').map((a) => a.id));
  let qty = accounts.filter((a) => usdtIds.has(a.id)).reduce((s, a) => s + (Number(a.opening) || 0), 0);
  let cost = qty * (curRate || 0); // موجودی اولیه به قیمت فعلی فرض می‌شود
  const asc = [...txs].sort((a, b) => new Date(a.date) - new Date(b.date));
  for (const t of asc) {
    const inU = usdtIds.has(t.toAccountId), fromU = usdtIds.has(t.accountId);
    if (t.type === 'convert' && inU && !fromU) { qty += Number(t.toAmount); cost += Number(t.amount); }
    else if (t.type === 'convert' && fromU && !inU) { const q = Number(t.amount); if (qty > 0) cost -= (cost / qty) * q; qty -= q; }
    else if (fromU && ['trade', 'adjust', 'income'].includes(t.type)) { const q = Number(t.amount); if (q >= 0) { qty += q; cost += q * (t.rate || curRate); } else { if (qty > 0) cost -= (cost / qty) * -q; qty += q; } }
    else if (fromU && t.type === 'expense') { const q = Number(t.amount); if (qty > 0) cost -= (cost / qty) * q; qty -= q; }
  }
  return qty > 0 ? { qty: roundU(qty), avg: Math.round(cost / qty), cost: Math.round(cost) } : { qty: 0, avg: 0, cost: 0 };
}

export const currentJ = () => toJ(new Date());

// «جلسه‌ی ترید»: ترید از نیمه‌شب شروع می‌شود، پس آخرین جلسه همیشه مال «دیروز» است.
export function lastSessionKey(now = new Date()) {
  return ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
}
export function sessionDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ———— پیش‌بینی ————
// همه‌ی خروجی‌ها به ریال، به‌جز «سود لازم» که تتر است.
export function forecast(state) {
  const { txs, accounts, loans, rate } = state;
  const now = new Date(), j = toJ(now);
  const len = monthLength(j.jy, j.jm), dayIdx = j.jd, left = len - dayIdx;
  const [start] = monthRange(j.jy, j.jm);
  const isLoan = (t) => t.categoryId === 'loan' || t.loanId;

  // خرج متغیر = همه‌ی هزینه‌ها به‌جز قسط
  const varSpent = txs.filter((t) => t.type === 'expense' && new Date(t.date) >= start && !isLoan(t)).reduce((s, t) => s + Number(t.amount), 0);
  const loanSpent = txs.filter((t) => t.type === 'expense' && new Date(t.date) >= start && isLoan(t)).reduce((s, t) => s + Number(t.amount), 0);
  const thisDaily = varSpent / Math.max(dayIdx, 1);

  // میانگین روزانه‌ی دو ماه قبل
  const prevDailies = [];
  let [py, pm] = [j.jy, j.jm];
  for (let k = 0; k < 2; k++) {
    [py, pm] = prevMonth(py, pm);
    const [s, e] = monthRange(py, pm);
    const v = txs.filter((t) => t.type === 'expense' && !isLoan(t) && new Date(t.date) >= s && new Date(t.date) < e).reduce((a, t) => a + Number(t.amount), 0);
    if (v > 0) prevDailies.push(v / monthLength(py, pm));
  }
  const dailies = [thisDaily, ...prevDailies].filter((x) => x > 0);
  const lo = dailies.length ? Math.min(...dailies) : 0, hi = dailies.length ? Math.max(...dailies) : 0;
  const mid = dailies.length ? dailies.reduce((a, b) => a + b, 0) / dailies.length : 0;
  const spread = dailies.length > 1 ? 1 : 0.15; // وقتی فقط یک ماه داده داریم، ±۱۵٪

  // قسط‌هایی که این ماه هنوز پرداخت نشده
  const loansDue = (loans || []).filter((l) => l.remaining > 0 && !loanPaidThisMonth(l, txs)).reduce((s, l) => s + Number(l.installment), 0);

  const spent = varSpent + loanSpent;
  const remLo = (spread === 1 ? lo : mid * (1 - spread)) * left + loansDue;
  const remHi = (spread === 1 ? hi : mid * (1 + spread)) * left + loansDue;
  const remMid = mid * left + loansDue;
  const projected = { lo: Math.round(spent + remLo), mid: Math.round(spent + remMid), hi: Math.round(spent + remHi) };

  // درآمد همین ماه تا الان (درآمد + ترید)
  const sum = monthSummary(txs, accounts, j.jy, j.jm);
  const gap = Math.max(0, projected.mid - sum.totalIncome);
  const neededUsdt = rate ? gap / rate : null;

  // دوام بدون درآمد: کل دارایی ÷ میانگین خرج ماهانه
  const monthlyExp = mid * 30 + (loans || []).filter((l) => l.remaining > 0).reduce((s, l) => s + Number(l.installment), 0);
  const total = state.tot.total;
  const runway = monthlyExp > 0 ? total / monthlyExp : null;

  // سناریوها برای کل دارایی آخر ماه
  const sessions = txs.filter((t) => t.type === 'trade');
  const sessionDays = new Set(sessions.map((t) => t.sessionKey || ymd(t.date)));
  const firstTrade = sessions.length ? Math.min(...sessions.map((t) => new Date(t.date))) : null;
  const spanDays = firstTrade ? Math.max(7, (now - firstTrade) / 864e5) : 0;
  const tradeRatePerDay = spanDays ? sessionDays.size / spanDays : 0;
  const avgSession = sessions.length ? sessions.reduce((s, t) => s + Number(t.amount), 0) / sessionDays.size : 0;
  // بدترین ماه ترید (به تتر)
  const byMonth = {};
  for (const t of sessions) { const jj = toJ(t.date); const k = jj.jy * 100 + jj.jm; byMonth[k] = (byMonth[k] || 0) + Number(t.amount); }
  const worstMonth = Object.values(byMonth).length ? Math.min(...Object.values(byMonth)) : 0;
  const remainingTradeAvg = avgSession * tradeRatePerDay * left * (rate || 0);
  const remainingTradeWorst = (worstMonth * (left / len)) * (rate || 0);
  const base = total - remMid;
  const scenarios = { none: Math.round(base), avg: Math.round(base + remainingTradeAvg), worst: Math.round(base + Math.min(0, remainingTradeWorst)) };

  const months = new Set(txs.map((t) => { const jj = toJ(t.date); return jj.jy * 100 + jj.jm; })).size;
  return { projected, spent, loansDue, neededUsdt, gap, runway, scenarios, left, confidence: months >= 3 ? 'good' : months === 2 ? 'mid' : 'low', hasData: dailies.length > 0 };
}

export function loanPaidThisMonth(loan, txs) {
  const j = toJ(new Date());
  const [s, e] = monthRange(j.jy, j.jm);
  return txs.some((t) => t.loanId === loan.id && new Date(t.date) >= s && new Date(t.date) < e);
}
// چند روز تا سررسید قسط این ماه (منفی یعنی گذشته)
export function daysToDue(loan) {
  const j = toJ(new Date());
  const due = Math.min(loan.dueDay, monthLength(j.jy, j.jm));
  return due - j.jd;
}

// رشد ماهانه‌ی ارزش یک حساب در ۹۰ روز اخیر (برای «کی به هدف می‌رسی»)
export function monthlyGrowth(accounts, txs, accountId, rate) {
  const a = accounts.find((x) => x.id === accountId);
  if (!a) return 0;
  const now = balances(accounts, txs)[accountId] || 0;
  const firstTx = txs.filter((t) => t.accountId === accountId || t.toAccountId === accountId).map((t) => new Date(t.date)).sort((x, y) => x - y)[0];
  if (!firstTx) return 0;
  const days = Math.min(90, Math.max(14, (Date.now() - firstTx) / 864e5));
  const past = balances(accounts, txs, new Date(Date.now() - days * 864e5))[accountId] || 0;
  return (toRials(now, a.currency, rate) - toRials(past, a.currency, rate)) / (days / 30);
}
