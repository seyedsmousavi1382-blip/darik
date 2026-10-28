// «ثبت سریع»: هزینه و درآمد (مبلغ ← لمس دسته = ثبت) + انتقال و تبدیل بین حساب‌ها
import { state, addTx, deleteTx, leafCatsByRecent, cat, acc, saveTemplate, dismissTemplate, allTags } from '../store.js';
import { icon } from '../icons.js';
import { fa, words, short, usdt, toman, toEnDigits, rialsFromToman, tomanFromRials } from '../money.js';
import { openSheet, closeSheet, toast, esc, segHtml, $$ } from '../ui.js';
import { parseTags } from './transactions.js';

const DAYS = [[0, 'امروز'], [1, 'دیروز'], [2, 'پریروز']];
const active = () => state.accounts.filter((a) => !a.archived);

export function openQuick({ type = 'expense' } = {}) {
  const irr = active().filter((a) => a.currency === 'IRR');
  const s = {
    type, digits: '', catId: null,
    accountId: irr[0]?.id,
    from: irr[0]?.id, to: (active().find((a) => a.currency === 'USDT') || active()[1] || {}).id,
    rate: state.rate ? String(tomanFromRials(state.rate)) : '', fee: '',
    dayOffset: 0, note: '', tags: [], more: false,
  };

  // واحد مبلغ: در انتقال از حساب تتری، تتر (با اعشار)؛ بقیه تومان
  const unitU = () => s.type === 'transfer' && acc(s.from)?.currency === 'USDT';
  const amountVal = () => Number(s.digits || 0);
  const amountRials = () => rialsFromToman(amountVal());
  const fmt = () => {
    if (!s.digits) return '۰';
    if (unitU()) return fa(s.digits);
    return fa(Number(s.digits).toLocaleString('en-US')).replace(/,/g, '٬');
  };
  const wordsLine = () => {
    if (!s.digits) return unitU() ? 'مقدار به تتر' : 'مبلغ به تومان';
    return unitU() ? 'تتر' : words(amountRials());
  };

  const catGrid = () => `
    <div class="muted" style="margin:6px 2px 10px">${s.catId ? 'یا یه دسته‌ی دیگه:' : 'دسته رو بزن تا ثبت بشه'}</div>
    <div class="cats">${leafCatsByRecent(s.type).map((c) => `
      <button class="cat ${s.catId === c.id ? 'sel' : ''}" data-cat="${c.id}"><span class="ic" style="background:${c.color}1f;color:${c.color}">${icon(c.icon, 19)}</span>${esc(c.name)}</button>`).join('')}
    </div>`;

  const moreBox = () => {
    const tags = allTags();
    return `<div class="card" style="margin-bottom:12px">
      ${s.type !== 'transfer' && irr.length > 1 ? `<div class="field"><label for="acc">حساب</label><select class="input" id="acc">${irr.map((a) => `<option value="${a.id}" ${a.id === s.accountId ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></div>` : ''}
      <div class="field"><label>روز</label><div class="chips">${DAYS.map(([d, l]) => `<button class="chip ${s.dayOffset === d ? 'on' : ''}" data-day="${d}">${l}</button>`).join('')}</div></div>
      <div class="field"><label for="note">توضیح</label><input class="input" id="note" value="${esc(s.note)}" placeholder="اختیاری"></div>
      <div class="field" style="margin:0"><label for="tags">تگ‌ها</label><input class="input" id="tags" value="${esc(s.tags.join(' '))}" placeholder="مثلاً: سفر_مشهد">
        ${tags.length ? `<div class="chips" style="margin-top:8px">${tags.slice(0, 8).map((g) => `<button class="chip ${s.tags.includes(g) ? 'on' : ''}" data-addtag="${esc(g)}">#${esc(g)}</button>`).join('')}</div>` : ''}</div>
    </div>`;
  };

  const transferBox = () => {
    const accs = active();
    const fromA = acc(s.from), toA = acc(s.to);
    const cross = fromA && toA && fromA.currency !== toA.currency;
    let preview = '';
    if (cross && amountVal() && Number(s.rate)) {
      preview = fromA.currency === 'IRR'
        ? `= ${usdt(amountVal() / Number(s.rate))} تتر`
        : `= ${toman(rialsFromToman(amountVal() * Number(s.rate)))} تومان`;
    }
    return `<div class="grid2" style="margin-bottom:12px">
        <div class="field" style="margin:0"><label for="from">از</label><select class="input" id="from">${accs.map((a) => `<option value="${a.id}" ${a.id === s.from ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></div>
        <div class="field" style="margin:0"><label for="to">به</label><select class="input" id="to">${accs.map((a) => `<option value="${a.id}" ${a.id === s.to ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></div>
      </div>
      ${cross ? `<div class="card" style="margin-bottom:12px">
        <div class="sec" style="margin-bottom:8px;color:var(--blue)">${icon('arrows-exchange', 18)} ${fromA.currency === 'IRR' ? 'خرید تتر' : 'فروش تتر'}</div>
        <div class="grid2">
          <div class="field" style="margin:0"><label for="rate">نرخ هر تتر (تومان)</label><input class="input num" id="rate" inputmode="numeric" value="${fa(s.rate)}"></div>
          <div class="field" style="margin:0"><label for="fee">کارمزد (تومان)</label><input class="input num" id="fee" inputmode="numeric" value="${fa(s.fee)}" placeholder="اختیاری"></div>
        </div>
        <div class="help" id="prev">${preview || 'نرخ پیش‌فرض، قیمت آنلاین تتره. اگه نرخ واقعی فرق داشت، عوضش کن.'}</div>
      </div>` : ''}
      <button class="btn btn-primary btn-block" id="save" style="margin-bottom:10px">${icon('check', 18)} ثبت ${cross ? (fromA.currency === 'IRR' ? 'خرید تتر' : 'فروش تتر') : 'انتقال'}</button>`;
  };

  const html = () => {
    const tpls = s.type === 'expense' ? state.templates : [];
    const selected = s.catId ? cat(s.catId) : null;
    const keys = unitU() ? ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'] : ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'del'];
    return `
      ${segHtml([['expense', 'هزینه'], ['income', 'درآمد'], ['transfer', 'انتقال']], s.type, s.type === 'expense' ? 'exp' : s.type === 'income' ? 'inc' : 'tr')}
      ${tpls.length ? `<div class="chips" style="margin-top:12px">${tpls.map((t) => {
        const c = cat(t.categoryId);
        return `<button class="chip ${s.catId === t.categoryId && (!t.amount || tomanFromRials(t.amount) === amountVal()) ? 'on' : ''}" data-tpl="${t.id}">${icon(c?.icon || 'sparkles', 16)} ${esc(t.label)}${t.amount ? ' · ' + short(t.amount) : ''}</button>`;
      }).join('')}</div>` : ''}
      <div class="amount" id="amt">
        <div class="v num ${s.type === 'income' ? 'green' : s.type === 'transfer' ? '' : ''}">${fmt()}</div>
        <div class="w">${wordsLine()}</div>
      </div>
      <div class="keypad">${keys.map((k) => `<button data-k="${k}" aria-label="${k === 'del' ? 'پاک کردن' : k}">${k === 'del' ? icon('backspace', 24) : k === '.' ? '٫' : fa(k)}</button>`).join('')}</div>
      ${s.type === 'transfer' ? transferBox() : selected ? `<button class="btn btn-primary btn-block" id="save" style="margin-bottom:10px">${icon('check', 18)} ثبت ${esc(selected.name)}</button>` : ''}
      <button class="btn btn-ghost btn-sm" id="more" style="margin-bottom:12px">${icon(s.more ? 'chevron-down' : 'chevron-left', 16)} جزئیات بیشتر</button>
      ${s.more ? moreBox() : ''}
      ${s.type !== 'transfer' ? catGrid() : ''}`;
  };

  openSheet('<div id="q"></div>', (sheet) => {
    const root = sheet.querySelector('#q');
    const draw = () => { root.innerHTML = html(); bind(); };
    const shake = (msg) => { const a = root.querySelector('#amt'); a.classList.remove('shake'); void a.offsetWidth; a.classList.add('shake'); toast(msg); };
    const dateOf = () => { const d = new Date(); if (s.dayOffset) { d.setDate(d.getDate() - s.dayOffset); d.setHours(12, 0, 0, 0); } return d.toISOString(); };
    const extras = () => ({ note: s.note.trim() || undefined, tags: s.tags.length ? s.tags : undefined, date: dateOf() });

    const save = async (catId) => {
      if (!amountVal()) return shake('اول مبلغ رو بزن');
      if (!s.accountId) return toast('یه حساب تومانی لازمه. از بخش حساب‌ها بساز.');
      const t = await addTx({ type: s.type, amount: amountRials(), accountId: s.accountId, categoryId: catId, ...extras() });
      closeSheet();
      toast(`${cat(catId)?.name || ''} · ${short(t.amount)} ثبت شد`, { ok: true, action: 'برگردون', onAction: () => deleteTx(t.id) });
      suggestTemplate(t);
    };

    const saveTransfer = async () => {
      const fromA = acc(s.from), toA = acc(s.to);
      if (!fromA || !toA || s.from === s.to) return toast('دو حساب متفاوت انتخاب کن');
      if (!amountVal()) return shake('اول مقدار رو بزن');
      const ex = extras();
      if (fromA.currency === toA.currency) {
        const amount = fromA.currency === 'USDT' ? amountVal() : amountRials();
        const t = await addTx({ type: 'transfer', amount, accountId: s.from, toAccountId: s.to, rate: fromA.currency === 'USDT' ? state.rate : undefined, ...ex });
        closeSheet();
        toast('انتقال ثبت شد', { ok: true, action: 'برگردون', onAction: () => deleteTx(t.id) });
        return;
      }
      const rateT = Number(s.rate);
      if (!rateT) return toast('نرخ تتر رو وارد کن');
      const rate = rialsFromToman(rateT);
      let amount, toAmount;
      if (fromA.currency === 'IRR') { amount = amountRials(); toAmount = Math.round((amount / rate) * 1e6) / 1e6; }
      else { amount = amountVal(); toAmount = Math.round(amount * rate); }
      const t = await addTx({ type: 'convert', amount, toAmount, accountId: s.from, toAccountId: s.to, rate, ...ex });
      let fee = null;
      if (Number(s.fee)) fee = await addTx({ type: 'expense', amount: rialsFromToman(Number(s.fee)), accountId: fromA.currency === 'IRR' ? s.from : s.to, categoryId: 'fee_transfer', note: 'کارمزد تبدیل', date: ex.date });
      closeSheet();
      toast(fromA.currency === 'IRR' ? `${usdt(toAmount)} تتر خریدی` : `${usdt(amount)} تتر فروختی`, { ok: true, action: 'برگردون', onAction: async () => { await deleteTx(t.id); if (fee) await deleteTx(fee.id); } });
    };

    const bind = () => {
      $$('[data-seg]', root).forEach((b) => (b.onclick = () => {
        if (s.type === b.dataset.seg) return;
        s.type = b.dataset.seg; s.catId = null; s.digits = '';
        draw();
      }));
      $$('[data-k]', root).forEach((b) => (b.onclick = () => {
        const k = b.dataset.k;
        if (k === 'del') s.digits = s.digits.slice(0, -1);
        else if (k === '.') { if (!s.digits.includes('.')) s.digits = (s.digits || '0') + '.'; }
        else if (s.digits.length < 12 && !/\.\d{2}$/.test(s.digits)) s.digits = (s.digits + k).replace(/^0+(?=\d)/, '');
        const v = root.querySelector('#amt .v');
        v.textContent = fmt(); v.classList.remove('pop'); void v.offsetWidth; v.classList.add('pop');
        root.querySelector('#amt .w').textContent = wordsLine();
        const prev = root.querySelector('#prev');
        if (prev && s.type === 'transfer') { const box = transferPreview(); if (box) prev.textContent = box; }
      }));
      $$('[data-tpl]', root).forEach((b) => (b.onclick = () => {
        const t = state.templates.find((x) => x.id === b.dataset.tpl);
        s.catId = t.categoryId;
        if (t.amount) s.digits = String(tomanFromRials(t.amount));
        draw();
      }));
      $$('[data-cat]', root).forEach((b) => (b.onclick = () => save(b.dataset.cat)));
      const sv = root.querySelector('#save'); if (sv) sv.onclick = () => (s.type === 'transfer' ? saveTransfer() : save(s.catId));
      root.querySelector('#more').onclick = () => { s.more = !s.more; draw(); };
      const a = root.querySelector('#acc'); if (a) a.onchange = (e) => (s.accountId = e.target.value);
      const f = root.querySelector('#from'); if (f) f.onchange = (e) => { s.from = e.target.value; s.digits = ''; draw(); };
      const t = root.querySelector('#to'); if (t) t.onchange = (e) => { s.to = e.target.value; draw(); };
      const r = root.querySelector('#rate'); if (r) r.oninput = (e) => { s.rate = toEnDigits(e.target.value).replace(/[^\d.]/g, ''); const p = root.querySelector('#prev'); const x = transferPreview(); if (p && x) p.textContent = x; };
      const fe = root.querySelector('#fee'); if (fe) fe.oninput = (e) => (s.fee = toEnDigits(e.target.value).replace(/[^\d]/g, ''));
      $$('[data-day]', root).forEach((b) => (b.onclick = () => { s.dayOffset = Number(b.dataset.day); draw(); }));
      const n = root.querySelector('#note'); if (n) n.oninput = (e) => (s.note = e.target.value);
      const tg = root.querySelector('#tags'); if (tg) tg.oninput = (e) => (s.tags = parseTags(e.target.value));
      $$('[data-addtag]', root).forEach((b) => (b.onclick = () => { const g = b.dataset.addtag; s.tags = s.tags.includes(g) ? s.tags.filter((x) => x !== g) : [...s.tags, g]; draw(); }));
    };
    const transferPreview = () => {
      const fromA = acc(s.from), toA = acc(s.to);
      if (!fromA || !toA || fromA.currency === toA.currency || !amountVal() || !Number(s.rate)) return '';
      return fromA.currency === 'IRR' ? `= ${usdt(amountVal() / Number(s.rate))} تتر` : `= ${toman(rialsFromToman(amountVal() * Number(s.rate)))} تومان`;
    };
    draw();
  });
}

// اگر یک «دسته + مبلغ» سه بار تکرار شد، پیشنهاد بده تراکنش آماده شود
function suggestTemplate(t) {
  if (t.type !== 'expense') return;
  const key = t.categoryId + ':' + t.amount;
  if (state.dismissedTemplates.includes(key)) return;
  if (state.templates.some((x) => x.categoryId === t.categoryId && x.amount === t.amount)) return;
  const n = state.txs.filter((x) => x.type === 'expense' && x.categoryId === t.categoryId && x.amount === t.amount).length;
  if (n < 3) return;
  const c = cat(t.categoryId);
  setTimeout(() => toast(`«${c.name} ${short(t.amount)}» رو آماده کنم؟`, {
    action: 'آماده کن', ms: 7000,
    onAction: async () => { await saveTemplate({ categoryId: t.categoryId, amount: t.amount, label: c.name }); toast('به تراکنش‌های آماده اضافه شد', { ok: true }); },
  }), 4200);
  dismissTemplate(key);
}
