// ثبت سود/ضرر روزانه‌ی ترید (به تتر)
import { state, addTx, deleteTx, skipSession } from '../store.js';
import { icon } from '../icons.js';
import { fa, toEnDigits, usdt, short, jDate, rialsFromToman, tomanFromRials } from '../money.js';
import { lastSessionKey, sessionDate, toRials, ymd } from '../ledger.js';
import { sessionLabel } from './transactions.js';
import { openSheet, closeSheet, toast, esc, segHtml, $$ } from '../ui.js';

const keyMinus = (key, days) => { const d = sessionDate(key); d.setDate(d.getDate() - days); return ymd(d); };

export function openTrade() {
  const brokers = state.accounts.filter((a) => a.currency === 'USDT' && !a.archived);
  const last = lastSessionKey();
  const s = {
    win: true, digits: '', key: last,
    accountId: (brokers.find((a) => a.kind === 'broker') || brokers[0] || {}).id,
    rate: state.rate ? String(tomanFromRials(state.rate)) : '',
  };
  const html = () => `
    <div class="sheet-title">${icon('chart-line', 22)} ترید</div>
    <div class="chips" style="margin-bottom:12px">
      ${[0, 1, 2].map((d) => { const k = keyMinus(last, d); return `<button class="chip ${s.key === k ? 'on' : ''}" data-key="${k}">${sessionLabel(k)} · ${jDate(sessionDate(k), { year: false })}</button>`; }).join('')}
    </div>
    ${segHtml([['1', 'سود'], ['0', 'ضرر']], s.win ? '1' : '0', s.win ? 'inc' : 'exp')}
    <div class="amount" id="amt">
      <div class="v num ${s.win ? 'green' : 'red'}">${s.digits ? fa(s.digits) : '۰'}</div>
      <div class="w">تتر${s.digits && state.rate ? ' · حدود ' + short(toRials(Number(s.digits), 'USDT', state.rate)) + ' تومان' : ''}</div>
    </div>
    <div class="keypad">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'].map((k) => `<button data-k="${k}" aria-label="${k === 'del' ? 'پاک کردن' : k}">${k === 'del' ? icon('backspace', 24) : k === '.' ? '٫' : fa(k)}</button>`).join('')}</div>
    ${brokers.length > 1 ? `<div class="field"><label for="acc">حساب</label><select class="input" id="acc">${brokers.map((a) => `<option value="${a.id}" ${a.id === s.accountId ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></div>` : ''}
    ${!state.rate ? `<div class="field"><label for="rate">قیمت تتر الان (تومان)</label><input class="input num" id="rate" inputmode="numeric" value="${fa(s.rate)}" placeholder="قیمت آنلاین گرفته نشد"><div class="help">برای حساب کردن معادل تومانی لازمه.</div></div>` : ''}
    <button class="btn btn-primary btn-block" id="save">${icon('check', 18)} ثبت</button>
    <button class="btn btn-ghost btn-block" id="skip" style="margin-top:10px">${sessionLabel(s.key)} ترید نکردم</button>`;

  openSheet('<div id="tr"></div>', (sheet) => {
    const root = sheet.querySelector('#tr');
    const draw = () => { root.innerHTML = html(); bind(); };
    const bind = () => {
      $$('[data-key]', root).forEach((b) => (b.onclick = () => { s.key = b.dataset.key; draw(); }));
      $$('[data-seg]', root).forEach((b) => (b.onclick = () => { s.win = b.dataset.seg === '1'; draw(); }));
      $$('[data-k]', root).forEach((b) => (b.onclick = () => {
        const k = b.dataset.k;
        if (k === 'del') s.digits = s.digits.slice(0, -1);
        else if (k === '.') { if (!s.digits.includes('.')) s.digits = (s.digits || '0') + '.'; }
        else if (s.digits.length < 10 && !/\.\d\d$/.test(s.digits)) s.digits = s.digits === '0' ? k : s.digits + k;
        draw();
      }));
      const a = root.querySelector('#acc'); if (a) a.onchange = (e) => (s.accountId = e.target.value);
      const r = root.querySelector('#rate'); if (r) r.oninput = (e) => (s.rate = toEnDigits(e.target.value).replace(/[^\d]/g, ''));
      root.querySelector('#save').onclick = async () => {
        const n = Number(s.digits);
        if (!n) { const el = root.querySelector('#amt'); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); toast('مقدار سود یا ضرر رو بزن'); return; }
        if (!s.accountId) { toast('یه حساب تتری (بروکر) لازمه'); return; }
        const rate = state.rate || rialsFromToman(Number(s.rate)) || 0;
        const t = await addTx({ type: 'trade', amount: s.win ? n : -n, accountId: s.accountId, sessionKey: s.key, rate });
        closeSheet();
        toast(`${s.win ? 'سود' : 'ضرر'} ${usdt(n)} تتر ثبت شد`, { ok: true, action: 'برگردون', onAction: () => deleteTx(t.id) });
      };
      root.querySelector('#skip').onclick = async () => {
        await skipSession(s.key);
        closeSheet();
        toast(sessionLabel(s.key) + ': ترید نکردی', { ok: true });
      };
    };
    draw();
  });
}
