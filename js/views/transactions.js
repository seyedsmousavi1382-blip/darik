// صفحه‌ی «تراکنش‌ها» + ردیف تراکنش که در بقیه‌ی صفحه‌ها هم استفاده می‌شود
import { state, cat, acc, deleteTx, addTx, updateTx, allTags } from '../store.js';
import { icon } from '../icons.js';
import { short, usdt, relDay, jDate, hm, toman } from '../money.js';
import { toRials, sessionDate } from '../ledger.js';
import { WEEKDAYS } from '../jalali.js';
import { esc, openSheet, closeSheet, toast, $$ } from '../ui.js';

// ظاهر هر نوع تراکنش: آیکون، رنگ، عنوان
export function txLook(t) {
  if (t.type === 'trade') {
    const win = Number(t.amount) >= 0;
    return { icon: win ? 'trending-up' : 'trending-down', color: win ? '#5DCAA5' : '#F28B82', title: win ? 'سود ترید' : 'ضرر ترید' };
  }
  if (t.type === 'adjust') return { icon: 'scale', color: '#9AA6A0', title: 'تعدیل موجودی' };
  if (t.type === 'transfer') return { icon: 'arrows-left-right', color: '#85B7EB', title: `${acc(t.accountId)?.name || ''} ← ${acc(t.toAccountId)?.name || ''}`.replace(/^ ← | ← $/, '') || 'انتقال' };
  if (t.type === 'convert') {
    const toU = acc(t.toAccountId)?.currency === 'USDT';
    return { icon: 'arrows-exchange', color: '#85B7EB', title: toU ? 'خرید تتر' : 'فروش تتر' };
  }
  const c = cat(t.categoryId);
  return { icon: c?.icon || 'dots-circle-horizontal', color: c?.color || '#9AA6A0', title: c?.name || 'بدون دسته' };
}

export function sessionLabel(key) {
  return 'جلسه ' + WEEKDAYS[sessionDate(key).getDay()] + ' شب';
}

export function txAmount(t) {
  const a = acc(t.accountId);
  const n = Number(t.amount);
  if (t.type === 'transfer') return `<span class="num" style="color:var(--blue)">${a?.currency === 'USDT' ? usdt(n) + ' تتر' : short(n)}</span>`;
  if (t.type === 'convert') {
    return a?.currency === 'USDT'
      ? `<span class="num" style="color:var(--blue)">${usdt(n)} تتر</span>`
      : `<span class="num" style="color:var(--blue)">${usdt(t.toAmount)} تتر</span>`;
  }
  if (a?.currency === 'USDT') return `<span class="${n >= 0 ? 'green' : 'red'} num">${n >= 0 ? '+' : '−'}${usdt(Math.abs(n))} تتر</span>`;
  if (t.type === 'expense') return `<span class="red num">−${short(n)}</span>`;
  if (t.type === 'income') return `<span class="green num">+${short(n)}</span>`;
  return `<span class="num ${n >= 0 ? 'green' : 'red'}">${n >= 0 ? '+' : '−'}${short(Math.abs(n))}</span>`;
}

export function txRow(t) {
  const L = txLook(t);
  const sub = t.type === 'trade' && t.sessionKey ? sessionLabel(t.sessionKey) : relDay(t.date);
  const tags = (t.tags || []).length ? ` <span class="tags">${t.tags.map((g) => `<span class="tagc">#${esc(g)}</span>`).join('')}</span>` : '';
  return `<div class="tx" data-tx="${t.id}" role="button" tabindex="0">
    <span class="tx-l"><span class="ic" style="background:${L.color}1f;color:${L.color}">${icon(L.icon, 20)}</span>
      <span class="t"><div>${esc(L.title)}</div><div class="muted" style="font-size:11.5px">${sub}${t.note ? ' · ' + esc(t.note) : ''}${tags}</div></span></span>
    ${txAmount(t)}
  </div>`;
}

export function bindTxRows(root) {
  $$('[data-tx]', root).forEach((el) => {
    el.onclick = () => openTxDetail(el.dataset.tx);
    el.onkeydown = (e) => { if (e.key === 'Enter') openTxDetail(el.dataset.tx); };
  });
}

export function openTxDetail(id) {
  const t = state.txs.find((x) => x.id === id);
  if (!t) return;
  const L = txLook(t), a = acc(t.accountId), to = acc(t.toAccountId);
  const rows = [['حساب', esc(a?.name || '—') + (to ? ' ← ' + esc(to.name) : '')], ['زمان', jDate(t.date, { weekday: true }) + '، ساعت ' + hm(t.date)]];
  if (t.type === 'convert') rows.push(['مقدار', a?.currency === 'USDT' ? `${usdt(t.amount)} تتر ← ${toman(t.toAmount)} تومان` : `${toman(t.amount)} تومان ← ${usdt(t.toAmount)} تتر`]);
  if (t.rate && (a?.currency === 'USDT' || t.type === 'convert')) rows.push(['نرخ تتر', toman(t.rate) + ' تومان']);
  if (a?.currency === 'USDT' && t.rate && t.type !== 'convert') rows.push(['معادل تومانی', toman(toRials(Math.abs(t.amount), 'USDT', t.rate)) + ' تومان']);
  if (t.note) rows.push(['توضیح', esc(t.note)]);

  openSheet(`
    <div style="text-align:center;margin-bottom:16px">
      <span class="ic" style="margin:0 auto 10px;width:56px;height:56px;border-radius:18px;background:${L.color}1f;color:${L.color}">${icon(L.icon, 28)}</span>
      <div style="font-size:15px">${esc(L.title)}</div>
      <div class="mid" style="margin-top:2px">${txAmount(t)}</div>
    </div>
    <div class="card" style="margin-bottom:14px">${rows.map(([k, v]) => `<div class="stat-row"><span class="muted">${k}</span><span>${v}</span></div>`).join('')}</div>
    <div class="field"><label for="tg">${icon('tag', 15)} تگ‌ها</label><input class="input" id="tg" value="${esc((t.tags || []).join(' '))}" placeholder="مثلاً: سفر_مشهد"></div>
    <div class="row">
      <button class="btn btn-ghost" id="savetg" style="flex:1">${icon('check', 18)} ذخیره تگ</button>
      <button class="btn btn-danger" id="del" style="flex:1">${icon('trash', 18)} حذف</button>
    </div>
  `, (sheet) => {
    sheet.querySelector('#savetg').onclick = async () => {
      await updateTx({ ...t, tags: parseTags(sheet.querySelector('#tg').value) });
      closeSheet(); toast('تگ‌ها ذخیره شد', { ok: true });
    };
    const btn = sheet.querySelector('#del');
    btn.onclick = async () => {
      if (!btn.dataset.sure) { btn.dataset.sure = 1; btn.innerHTML = icon('alert-triangle', 18) + ' دوباره بزن'; return; }
      const copy = { ...t };
      await deleteTx(t.id);
      closeSheet();
      toast('حذف شد', { action: 'برگردون', onAction: () => addTx(copy) });
    };
  });
}

export const parseTags = (s) => [...new Set(String(s).split(/[\s,،]+/).map((x) => x.replace(/^#/, '').trim()).filter(Boolean))].slice(0, 6);

// ———— صفحه‌ی تراکنش‌ها ————
let filter = 'all', query = '', tagF = '';
const FILTERS = [['all', 'همه'], ['expense', 'هزینه'], ['income', 'درآمد'], ['trade', 'ترید'], ['move', 'انتقال و تبدیل']];

export function renderTransactions(root) {
  const tags = allTags();
  root.innerHTML = `
    <div class="page-h fade"><h1>تراکنش‌ها</h1></div>
    <div class="fade" style="position:relative;margin-bottom:12px">
      <input class="input" id="q" placeholder="جست‌وجو در دسته، توضیح یا تگ" value="${esc(query)}" style="padding-right:44px" aria-label="جست‌وجو">
      <span class="muted" style="position:absolute;right:14px;top:13px">${icon('search', 20)}</span>
    </div>
    <div class="chips fade">${FILTERS.map(([k, v]) => `<button class="chip ${filter === k ? 'on' : ''}" data-f="${k}">${v}</button>`).join('')}</div>
    ${tags.length ? `<div class="chips fade" style="margin-top:8px">${tags.slice(0, 12).map((g) => `<button class="chip ${tagF === g ? 'on' : ''}" data-tag="${esc(g)}">#${esc(g)}</button>`).join('')}</div>` : ''}
    <div id="list" class="fade"></div>`;
  const list = root.querySelector('#list');
  const draw = () => {
    const q = query.trim().replace(/^#/, '');
    const items = state.txs.filter((t) => {
      if (filter === 'move') { if (!['transfer', 'convert', 'adjust'].includes(t.type)) return false; }
      else if (filter !== 'all' && t.type !== filter) return false;
      if (tagF && !(t.tags || []).includes(tagF)) return false;
      if (!q) return true;
      return (txLook(t).title + ' ' + (t.note || '') + ' ' + (t.tags || []).join(' ')).includes(q);
    });
    if (!items.length) {
      list.innerHTML = `<div class="empty">${icon('list-details', 30)}${state.txs.length ? 'با این فیلتر چیزی پیدا نشد.' : 'اولین تراکنشت رو با دکمه‌ی + ثبت کن.'}</div>`;
      return;
    }
    const dayExp = {};
    for (const t of items) if (t.type === 'expense') { const k = new Date(t.date).toDateString(); dayExp[k] = (dayExp[k] || 0) + Number(t.amount); }
    let html = '', day = '';
    for (const t of items.slice(0, 400)) {
      const k = new Date(t.date).toDateString();
      if (k !== day) {
        if (day) html += '</div>';
        day = k;
        html += `<div class="day-h"><span>${jDate(t.date, { weekday: true })}</span>${dayExp[k] ? `<span class="num">خرج ${short(dayExp[k])}</span>` : ''}</div><div class="card flush">`;
      }
      html += txRow(t);
    }
    list.innerHTML = html + '</div>';
    bindTxRows(list);
  };
  root.querySelector('#q').oninput = (e) => { query = e.target.value; draw(); };
  $$('[data-f]', root).forEach((b) => (b.onclick = () => { filter = b.dataset.f; $$('[data-f]', root).forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
  $$('[data-tag]', root).forEach((b) => (b.onclick = () => { tagF = tagF === b.dataset.tag ? '' : b.dataset.tag; $$('[data-tag]', root).forEach((x) => x.classList.toggle('on', x.dataset.tag === tagF)); draw(); }));
  draw();
}
