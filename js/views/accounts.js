// صفحه‌ی «حساب‌ها»
import { state, saveAccount, addTx } from '../store.js';
import { icon } from '../icons.js';
import { toman, usdt, short, fa, toEnDigits, rialsFromToman, tomanFromRials } from '../money.js';
import { toRials, usdtAvgCost } from '../ledger.js';
import { openSheet, closeSheet, toast, esc, $$ } from '../ui.js';

const KINDS = {
  bank: { name: 'حساب بانکی', icon: 'building-bank', color: '#85B7EB', currency: 'IRR' },
  broker: { name: 'بروکر ترید', icon: 'chart-line', color: '#5DCAA5', currency: 'USDT' },
  wallet: { name: 'کیف پول / صرافی تتر', icon: 'wallet', color: '#AFA9EC', currency: 'USDT' },
  cash: { name: 'پول نقد', icon: 'cash', color: '#97C459', currency: 'IRR' },
};

const parseNum = (v) => Number(toEnDigits(v).replace(/[٬,\s]/g, '').replace('٫', '.')) || 0;
const balText = (a, b) => (a.currency === 'USDT' ? `${usdt(b)} تتر` : `${toman(b)} تومان`);

export function renderAccounts(root) {
  const list = state.accounts.filter((a) => !a.archived);
  const cost = usdtAvgCost(state.accounts, state.txs, state.rate);
  const unreal = cost.qty && state.rate ? Math.round(cost.qty * state.rate - cost.cost) : 0;
  root.innerHTML = `
    <div class="page-h fade"><h1>حساب‌ها</h1></div>
    <div class="glow-card fade" style="margin-bottom:12px">
      <div class="muted">جمع همه‌ی حساب‌ها</div>
      <div class="mid num" style="margin-top:2px">${toman(state.tot.total)} <span class="muted" style="font-family:Vazirmatn;font-size:13px">تومان</span></div>
      ${state.rate ? `<div class="muted" style="font-size:12px">تتر به قیمت ${toman(state.rate)} تومان حساب شده</div>` : `<div class="amber" style="font-size:12px">قیمت تتر نداریم؛ حساب‌های تتری صفر حساب شدن</div>`}
      ${cost.qty && cost.avg ? `<div class="stat-row" style="margin-top:8px;border-top:1px solid var(--line)"><span class="muted">میانگین قیمت خرید تتر</span><span class="num">${toman(cost.avg)}</span></div>
        <div class="stat-row"><span class="muted">سود یا زیان نرخ روی تترها</span><span class="num ${unreal >= 0 ? 'green' : 'red'}">${unreal >= 0 ? '+' : '−'}${short(Math.abs(unreal))}</span></div>` : ''}
    </div>
    <div class="card flush fade">
      ${list.map((a) => {
        const k = KINDS[a.kind] || KINDS.bank, b = state.bal[a.id] || 0;
        return `<div class="tx" data-acc="${a.id}" role="button" tabindex="0">
            <span class="tx-l"><span class="ic" style="background:${k.color}1f;color:${k.color}">${icon(k.icon, 20)}</span>
              <span class="t"><div>${esc(a.name)}</div><div class="muted" style="font-size:11.5px">${k.name}${a.isSavings ? ' · <span class="gold">پس‌انداز</span>' : ''}</div></span></span>
            <span style="text-align:left"><div class="num" style="font-weight:500">${balText(a, b)}</div>
              ${a.currency === 'USDT' && state.rate ? `<div class="muted num" style="font-size:11.5px">≈ ${short(toRials(b, 'USDT', state.rate))} تومان</div>` : ''}</span>
          </div>`;
      }).join('')}
    </div>
    <button class="btn btn-ghost btn-block fade" id="add" style="margin-top:12px">${icon('plus', 18)} حساب جدید</button>`;
  $$('[data-acc]', root).forEach((el) => (el.onclick = () => openAccount(state.accounts.find((a) => a.id === el.dataset.acc))));
  root.querySelector('#add').onclick = () => openAccount(null);
}

function openAccount(a) {
  const isNew = !a;
  const draft = a ? { ...a } : { name: '', kind: 'bank', currency: 'IRR', opening: 0 };
  const unit = () => (KINDS[draft.kind].currency === 'USDT' ? 'تتر' : 'تومان');
  const openingShown = () => (draft.currency === 'USDT' ? (draft.opening ? String(draft.opening) : '') : (draft.opening ? String(tomanFromRials(draft.opening)) : ''));
  const bal = a ? state.bal[a.id] || 0 : 0;

  openSheet(`
    <div class="sheet-title">${isNew ? 'حساب جدید' : 'ویرایش حساب'}</div>
    <div class="field"><label>اسم حساب</label><input class="input" id="name" value="${esc(draft.name)}" placeholder="مثلاً: بانک رسالت"></div>
    ${isNew ? `<div class="field"><label>نوع</label><select class="input" id="kind">${Object.entries(KINDS).map(([k, v]) => `<option value="${k}">${v.name} (${v.currency === 'USDT' ? 'تتر' : 'تومان'})</option>`).join('')}</select></div>` : ''}
    <div class="field"><label id="olbl">موجودی اولیه (${unit()})</label><input class="input num" id="opening" inputmode="decimal" value="${openingShown()}" placeholder="۰"></div>
    <div class="muted" style="margin:-6px 0 12px;font-size:11px;line-height:1.8">موجودی اولیه یعنی موجودی این حساب قبل از اولین تراکنشی که توی اپ ثبت می‌کنی.</div>
    <div class="toggle"><span>حساب پس‌انداز<div class="muted" style="font-size:11px">پیشرفت هدف‌های پس‌انداز از این حساب حساب می‌شه</div></span><button class="switch ${draft.isSavings ? 'on' : ''}" id="sav" aria-label="حساب پس‌انداز"></button></div>
    <button class="btn btn-primary btn-block" id="save" style="margin-top:8px">${icon('check', 18)} ذخیره</button>
    ${!isNew ? `
      <div class="card" style="margin-top:16px">
        <div class="sec" style="margin-bottom:6px">${icon('scale', 18)} تطبیق موجودی</div>
        <div class="muted" style="font-size:12px;line-height:1.8;margin-bottom:10px">موجودی فعلی توی اپ: <b class="num">${balText(a, bal)}</b><br>اگه با موجودی واقعی فرق داره (مثلاً کمیسیون یا سواپ جا مونده)، عدد واقعی رو بزن.</div>
        <div class="row"><input class="input num" id="real" inputmode="decimal" placeholder="موجودی واقعی (${unit()})" style="flex:1"><button class="btn btn-ghost" id="rec">تطبیق</button></div>
      </div>
      <button class="btn btn-danger btn-block" id="arch" style="margin-top:12px">${icon('trash', 18)} بایگانی حساب</button>` : ''}
  `, (sheet) => {
    const q = (s) => sheet.querySelector(s);
    const kind = q('#kind');
    if (kind) kind.onchange = (e) => { draft.kind = e.target.value; draft.currency = KINDS[draft.kind].currency; q('#olbl').textContent = `موجودی اولیه (${unit()})`; };
    q('#sav').onclick = (e) => { draft.isSavings = !draft.isSavings; e.currentTarget.classList.toggle('on', draft.isSavings); };
    q('#save').onclick = async () => {
      draft.name = q('#name').value.trim() || KINDS[draft.kind].name;
      const n = parseNum(q('#opening').value);
      draft.opening = draft.currency === 'USDT' ? n : rialsFromToman(n);
      await saveAccount(draft);
      closeSheet();
      toast('ذخیره شد', { ok: true });
    };
    const rec = q('#rec');
    if (rec) rec.onclick = async () => {
      const v = q('#real').value.trim();
      if (!v) { toast('موجودی واقعی رو بزن'); return; }
      const real = a.currency === 'USDT' ? parseNum(v) : rialsFromToman(parseNum(v));
      const diff = a.currency === 'USDT' ? Math.round((real - bal) * 1e6) / 1e6 : real - bal;
      if (!diff) { toast('موجودی درسته، تغییری لازم نیست'); return; }
      await addTx({ type: 'adjust', amount: diff, accountId: a.id, rate: a.currency === 'USDT' ? state.rate : undefined, note: 'تطبیق موجودی' });
      closeSheet();
      toast(`تعدیل ثبت شد: ${a.currency === 'USDT' ? usdt(Math.abs(diff)) + ' تتر' : short(Math.abs(diff)) + ' تومان'} ${diff > 0 ? 'اضافه' : 'کم'}`);
    };
    const arch = q('#arch');
    if (arch) arch.onclick = async () => {
      if (!arch.dataset.sure) { arch.dataset.sure = 1; arch.innerHTML = icon('alert-triangle', 18) + ' مطمئنی؟ دوباره بزن'; return; }
      await saveAccount({ ...a, archived: true });
      closeSheet();
      toast('حساب بایگانی شد. تراکنش‌هاش سر جاشون می‌مونن.');
    };
  });
}
