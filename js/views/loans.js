// وام و اقساط
import { state, saveItem, deleteItem, addTx, deleteTx } from '../store.js';
import { icon } from '../icons.js';
import { fa, toman, short, toEnDigits, rialsFromToman, tomanFromRials } from '../money.js';
import { loanPaidThisMonth, daysToDue } from '../ledger.js';
import { openSheet, closeSheet, toast, esc, animateFills, $$ } from '../ui.js';

export function loanStatus(l) {
  if (l.remaining <= 0) return { text: 'تسویه شد', cls: 'green' };
  if (loanPaidThisMonth(l, state.txs)) return { text: 'قسط این ماه پرداخت شده', cls: 'green' };
  const d = daysToDue(l);
  if (d < 0) return { text: `${fa(-d)} روز از سررسید گذشته`, cls: 'red' };
  if (d === 0) return { text: 'سررسید امروزه', cls: 'amber' };
  return { text: `${fa(d)} روز تا سررسید`, cls: d <= 5 ? 'amber' : '' };
}

export function renderLoans(root, go) {
  root.innerHTML = `
    <div class="page-h fade"><h1>وام و اقساط</h1><button class="back" data-back aria-label="برگشت">${icon('arrow-left', 20)}</button></div>
    <div class="stack fade">
      ${state.loans.length ? state.loans.map((l) => {
        const st = loanStatus(l), paid = (l.total || 0) - l.remaining, pct = l.total ? paid / l.total : 0;
        const canPay = l.remaining > 0 && !loanPaidThisMonth(l, state.txs);
        return `<div class="glow-card" style="--edge:rgba(93,202,165,.4)">
          <div class="row" style="margin-bottom:10px">
            <span class="sec"><span class="ic" style="background:#5DCAA51f;color:#5DCAA5;margin:0">${icon('receipt', 20)}</span><span style="margin-right:4px"><div>${esc(l.name)}</div><div class="muted">روز ${fa(l.dueDay)} هر ماه</div></span></span>
            <button class="icon-btn" data-edit="${l.id}" aria-label="ویرایش">${icon('pencil', 20)}</button>
          </div>
          <div class="row"><span class="mid num">${short(l.installment)}</span><span class="muted ${st.cls}">${st.text}</span></div>
          <div class="progress" style="margin:10px 0 6px"><div data-w="${Math.round(pct * 100)}%" style="background:var(--mint)"></div></div>
          <div class="row muted"><span>${fa(paid)} از ${fa(l.total || 0)} قسط</span><span class="num">مانده: ${short(l.remaining * l.installment)} تومان</span></div>
          ${canPay ? `<button class="btn btn-primary btn-block" data-pay="${l.id}" style="margin-top:12px">${icon('check', 18)} قسط این ماه رو پرداخت کردم</button>` : ''}
        </div>`;
      }).join('') : `<div class="empty">${icon('receipt', 32)}وامی ثبت نکردی.<br>وام رو اضافه کن تا اپ سررسید قسط رو یادت بندازه و توی پیش‌بینی حسابش کنه.</div>`}
    </div>
    <button class="btn btn-ghost btn-block fade" id="add" style="margin-top:14px">${icon('plus', 18)} وام جدید</button>`;
  animateFills(root);
  root.querySelector('[data-back]').onclick = () => go('more');
  root.querySelector('#add').onclick = () => openLoan(null);
  $$('[data-edit]', root).forEach((b) => (b.onclick = () => openLoan(state.loans.find((l) => l.id === b.dataset.edit))));
  $$('[data-pay]', root).forEach((b) => (b.onclick = () => payLoan(state.loans.find((l) => l.id === b.dataset.pay))));
}

export async function payLoan(l) {
  const accountId = (state.accounts.find((a) => a.currency === 'IRR' && !a.archived) || {}).id;
  if (!accountId) { toast('یه حساب تومانی لازمه'); return; }
  const t = await addTx({ type: 'expense', amount: l.installment, accountId, categoryId: 'loan', loanId: l.id, note: l.name });
  const before = { ...l };
  await saveItem('loans', { ...l, remaining: Math.max(0, l.remaining - 1) });
  toast('قسط ثبت شد', { ok: true, action: 'برگردون', onAction: async () => { await deleteTx(t.id); await saveItem('loans', before); } });
}

function openLoan(l) {
  const isNew = !l;
  const d = l ? { ...l } : { name: 'وام', installment: 0, dueDay: 1, remaining: 12, total: 12 };
  const num = (v) => Number(toEnDigits(v).replace(/[^\d]/g, '')) || 0;
  openSheet(`
    <div class="sheet-title">${icon('receipt', 22)} ${isNew ? 'وام جدید' : 'ویرایش وام'}</div>
    <div class="field"><label for="n">اسم</label><input class="input" id="n" value="${esc(d.name)}" placeholder="مثلاً: وام رسالت"></div>
    <div class="field"><label for="ins">مبلغ هر قسط (تومان)</label><input class="input num" id="ins" inputmode="numeric" value="${d.installment ? fa(tomanFromRials(d.installment)) : ''}"></div>
    <div class="grid2">
      <div class="field"><label for="due">روز سررسید (شمسی)</label><input class="input num" id="due" inputmode="numeric" value="${fa(d.dueDay)}"></div>
      <div class="field"><label for="rem">اقساط باقی‌مانده</label><input class="input num" id="rem" inputmode="numeric" value="${fa(d.remaining)}"></div>
    </div>
    <div class="field"><label for="tot">تعداد کل اقساط</label><input class="input num" id="tot" inputmode="numeric" value="${fa(d.total)}"></div>
    <button class="btn btn-primary btn-block" id="save">${icon('check', 18)} ذخیره</button>
    ${!isNew ? `<button class="btn btn-danger btn-block" id="del" style="margin-top:10px">${icon('trash', 18)} حذف وام</button>` : ''}
  `, (sheet) => {
    const q = (s) => sheet.querySelector(s);
    q('#save').onclick = async () => {
      const ins = num(q('#ins').value), due = Math.min(31, Math.max(1, num(q('#due').value))), rem = num(q('#rem').value);
      if (!ins) { toast('مبلغ قسط رو بزن'); return; }
      await saveItem('loans', { ...d, name: q('#n').value.trim() || 'وام', installment: rialsFromToman(ins), dueDay: due, remaining: rem, total: Math.max(num(q('#tot').value), rem) });
      closeSheet(); toast('ذخیره شد', { ok: true });
    };
    const del = q('#del');
    if (del) del.onclick = async () => {
      if (!del.dataset.sure) { del.dataset.sure = 1; del.innerHTML = icon('alert-triangle', 18) + ' دوباره بزن'; return; }
      await deleteItem('loans', l.id); closeSheet(); toast('حذف شد');
    };
  });
}
