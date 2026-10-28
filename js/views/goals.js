// هدف پس‌انداز
import { state, saveItem, deleteItem, acc } from '../store.js';
import { icon } from '../icons.js';
import { fa, short, toman, toEnDigits, rialsFromToman, tomanFromRials } from '../money.js';
import { toRials, monthlyGrowth } from '../ledger.js';
import { toJ, fromJ, MONTHS } from '../jalali.js';
import { openSheet, closeSheet, toast, esc, ring, animateFills, $$ } from '../ui.js';

export function goalTarget(g) {
  const subs = (g.subgoals || []).filter((x) => x.amount > 0);
  return subs.length ? subs.reduce((s, x) => s + Number(x.amount), 0) : Number(g.target) || 0;
}
export function goalProgress(g) {
  const a = acc(g.accountId);
  const saved = a ? Math.max(0, toRials(state.bal[a.id] || 0, a.currency, state.rate)) : 0;
  const target = goalTarget(g);
  const pct = target ? saved / target : 0;
  const growth = a ? monthlyGrowth(state.accounts, state.txs, a.id, state.rate) : 0;
  const left = Math.max(0, target - saved);
  let eta = null, perMonth = null, monthsLeft = null;
  if (left === 0) eta = 'رسیدی!';
  else if (growth > 0) { const m = Math.ceil(left / growth); const d = new Date(); d.setMonth(d.getMonth() + m); const j = toJ(d); eta = `با روند فعلی: ${MONTHS[j.jm - 1]} ${fa(j.jy)}`; }
  else eta = 'با روند فعلی این حساب هنوز رشد نکرده';
  if (g.deadline && left > 0) {
    const [y, m] = g.deadline.split('-').map(Number);
    const end = fromJ(y, m, 1);
    monthsLeft = Math.max(1, Math.round((end - Date.now()) / (30 * 864e5)));
    perMonth = left / monthsLeft;
  }
  return { saved, target, pct, eta, perMonth, monthsLeft, account: a };
}

export function goalCard(g, compact = false) {
  const p = goalProgress(g);
  return `<div class="glow-card" data-goal="${g.id}" style="--edge:rgba(233,196,106,.55);cursor:pointer">
    <div class="row" style="align-items:center">
      <span style="flex:1;min-width:0">
        <div class="sec gold" style="font-size:13px">${icon('flag-3', 16)} ${esc(g.name)}</div>
        <div class="mid num" style="margin-top:4px">${short(p.saved)} <span class="muted" style="font-family:Vazirmatn;font-size:13px">از ${short(p.target)}</span></div>
        <div class="muted" style="font-size:12px;margin-top:2px">${p.perMonth ? `ماهی ${short(p.perMonth)} تا ${fa(p.monthsLeft)} ماه دیگه` : p.eta}</div>
      </span>
      ${ring(p.pct, { size: compact ? 58 : 66 })}
    </div>
    ${!compact && (g.subgoals || []).length ? `<div style="margin-top:12px">${g.subgoals.map((s) => `<div class="stat-row"><span class="muted">${esc(s.name)}</span><span class="num">${short(s.amount)}</span></div>`).join('')}</div>` : ''}
    ${!compact && !p.account ? `<div class="amber" style="font-size:12px;margin-top:8px">این هدف به هیچ حسابی وصل نیست.</div>` : ''}
  </div>`;
}

export function renderGoals(root, go) {
  root.innerHTML = `
    <div class="page-h fade"><h1>هدف پس‌انداز</h1><button class="back" data-back aria-label="برگشت">${icon('arrow-left', 20)}</button></div>
    <div class="stack fade">${state.goals.length ? state.goals.map((g) => goalCard(g)).join('') : `<div class="empty">${icon('flag-3', 32)}هنوز هدفی نساختی.<br>یه هدف بساز و به یه حساب وصلش کن؛ پیشرفتش خودکار حساب می‌شه.</div>`}</div>
    <button class="btn btn-gold btn-block fade" id="add" style="margin-top:14px">${icon('plus', 18)} هدف جدید</button>`;
  animateFills(root);
  root.querySelector('[data-back]').onclick = () => go('more');
  root.querySelector('#add').onclick = () => openGoal(null);
  $$('[data-goal]', root).forEach((el) => (el.onclick = () => openGoal(state.goals.find((g) => g.id === el.dataset.goal))));
}

export function openGoal(g) {
  const isNew = !g;
  const d = g ? JSON.parse(JSON.stringify(g)) : { name: '', target: 0, deadline: '', accountId: (state.accounts.find((a) => a.isSavings && !a.archived) || state.accounts.find((a) => a.currency === 'USDT' && !a.archived) || {}).id, subgoals: [] };
  const num = (v) => Number(toEnDigits(v).replace(/[^\d]/g, '')) || 0;
  const j = toJ(new Date());
  const years = [j.jy, j.jy + 1, j.jy + 2, j.jy + 3, j.jy + 4];
  const [dy, dm] = d.deadline ? d.deadline.split('-').map(Number) : [0, 0];

  const subsHtml = () => d.subgoals.map((s, i) => `<div class="row" style="margin-bottom:8px">
      <input class="input" data-sn="${i}" value="${esc(s.name)}" placeholder="مثلاً: رهن" style="flex:1.4">
      <input class="input num" data-sa="${i}" inputmode="numeric" value="${s.amount ? fa(tomanFromRials(s.amount)) : ''}" placeholder="تومان" style="flex:1">
      <button class="icon-btn" data-sd="${i}" aria-label="حذف">${icon('x', 18)}</button></div>`).join('');

  openSheet(`
    <div class="sheet-title gold">${icon('flag-3', 22)} ${isNew ? 'هدف جدید' : 'ویرایش هدف'}</div>
    <div class="field"><label for="n">اسم هدف</label><input class="input" id="n" value="${esc(d.name)}" placeholder="مثلاً: اجاره خونه"></div>
    <div class="field"><label for="t">مبلغ هدف (تومان)</label><input class="input num" id="t" inputmode="numeric" value="${d.target ? fa(tomanFromRials(d.target)) : ''}" placeholder="تخمینی هم اشکال نداره">
      <div class="help">اگه زیرهدف اضافه کنی، مبلغ هدف خودش جمع زیرهدف‌ها می‌شه.</div></div>
    <div class="field"><label>زیرهدف‌ها</label><div id="subs">${subsHtml()}</div>
      <button class="btn btn-ghost btn-sm" id="addsub">${icon('plus', 16)} زیرهدف</button></div>
    <div class="field"><label for="a">حسابی که پیشرفت از اون حساب می‌شه</label><select class="input" id="a">
      ${state.accounts.filter((a) => !a.archived).map((a) => `<option value="${a.id}" ${a.id === d.accountId ? 'selected' : ''}>${esc(a.name)}${a.isSavings ? ' (پس‌انداز)' : ''}</option>`).join('')}</select></div>
    <div class="field"><label>تا کی؟ (اختیاری)</label><div class="grid2">
      <select class="input" id="dm"><option value="0">ماه</option>${MONTHS.map((m, i) => `<option value="${i + 1}" ${dm === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}</select>
      <select class="input" id="dy"><option value="0">سال</option>${years.map((y) => `<option value="${y}" ${dy === y ? 'selected' : ''}>${fa(y)}</option>`).join('')}</select></div></div>
    <button class="btn btn-gold btn-block" id="save">${icon('check', 18)} ذخیره</button>
    ${!isNew ? `<button class="btn btn-danger btn-block" id="del" style="margin-top:10px">${icon('trash', 18)} حذف هدف</button>` : ''}
  `, (sheet) => {
    const q = (s) => sheet.querySelector(s);
    const readSubs = () => { $$('[data-sn]', sheet).forEach((el) => (d.subgoals[el.dataset.sn].name = el.value)); $$('[data-sa]', sheet).forEach((el) => (d.subgoals[el.dataset.sa].amount = rialsFromToman(num(el.value)))); };
    const bindSubs = () => $$('[data-sd]', sheet).forEach((b) => (b.onclick = () => { readSubs(); d.subgoals.splice(Number(b.dataset.sd), 1); q('#subs').innerHTML = subsHtml(); bindSubs(); }));
    bindSubs();
    q('#addsub').onclick = () => { readSubs(); d.subgoals.push({ name: '', amount: 0 }); q('#subs').innerHTML = subsHtml(); bindSubs(); };
    q('#save').onclick = async () => {
      readSubs();
      d.name = q('#n').value.trim() || 'هدف';
      d.target = rialsFromToman(num(q('#t').value));
      d.subgoals = d.subgoals.filter((s) => s.name.trim() || s.amount);
      d.accountId = q('#a').value;
      const m = Number(q('#dm').value), y = Number(q('#dy').value);
      d.deadline = m && y ? `${y}-${m}` : '';
      if (!goalTarget(d)) { toast('مبلغ هدف یا زیرهدف‌ها رو بزن'); return; }
      await saveItem('goals', d);
      const a = acc(d.accountId);
      if (a && !a.isSavings) { const { saveAccount } = await import('../store.js'); await saveAccount({ ...a, isSavings: true }); }
      closeSheet(); toast('هدف ذخیره شد', { ok: true });
    };
    const del = q('#del');
    if (del) del.onclick = async () => {
      if (!del.dataset.sure) { del.dataset.sure = 1; del.innerHTML = icon('alert-triangle', 18) + ' دوباره بزن'; return; }
      await deleteItem('goals', g.id); closeSheet(); toast('حذف شد');
    };
  });
}
