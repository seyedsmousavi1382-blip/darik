// مدیریت دسته‌ها
import { state, saveItem, deleteItem, cat } from '../store.js';
import { icon } from '../icons.js';
import { openSheet, closeSheet, toast, esc, segHtml, $$ } from '../ui.js';

const ICON_CHOICES = ['tools-kitchen-2', 'coffee', 'shopping-cart', 'car', 'gas-station', 'tool', 'bus', 'receipt-2', 'device-mobile', 'shopping-bag', 'shirt', 'device-laptop',
  'book', 'school', 'heartbeat', 'ticket', 'gift', 'percentage', 'receipt', 'home-2', 'plane', 'device-gamepad-2', 'music', 'paw', 'baby-carriage', 'briefcase',
  'world', 'sparkles', 'cash', 'users', 'pig-money', 'moneybag', 'crown', 'flame', 'tag', 'calculator'];
const COLORS = ['#5DCAA5', '#AFA9EC', '#8F87F1', '#E9C46A', '#F0A43A', '#F0997B', '#F28B82', '#ED93B1', '#85B7EB', '#97C459', '#9AA6A0'];

let kind = 'expense';
export function renderCategories(root, go) {
  const list = state.cats.filter((c) => c.kind === kind && !c.archived);
  const parents = list.filter((c) => !c.parentId);
  root.innerHTML = `
    <div class="page-h fade"><h1>دسته‌ها</h1><button class="back" data-back aria-label="برگشت">${icon('arrow-left', 20)}</button></div>
    <div class="fade" style="margin-bottom:14px">${segHtml([['expense', 'هزینه'], ['income', 'درآمد']], kind, kind === 'expense' ? 'exp' : 'inc')}</div>
    <div class="card flush fade">
      ${parents.map((p) => [p, ...list.filter((c) => c.parentId === p.id)].map((c) => `
        <div class="tx" data-c="${c.id}" style="${c.parentId ? 'padding-right:26px' : ''}">
          <span class="tx-l"><span class="ic" style="background:${c.color}1f;color:${c.color};${c.parentId ? 'width:32px;height:32px' : ''}">${icon(c.icon, c.parentId ? 17 : 20)}</span><span class="t"><div>${esc(c.name)}</div></span></span>
          <span class="faint">${icon('chevron-left', 18)}</span>
        </div>`).join('')).join('')}
    </div>
    <button class="btn btn-ghost btn-block fade" id="add" style="margin-top:14px">${icon('plus', 18)} دسته‌ی جدید</button>
    ${state.templates.length ? `<div class="section-t"><span class="sec">${icon('sparkles', 15)} تراکنش‌های آماده</span></div>
      <div class="card flush">${state.templates.map((t) => `<div class="tx" style="cursor:default"><span class="tx-l"><span class="ic" style="background:${cat(t.categoryId)?.color || '#9AA6A0'}1f;color:${cat(t.categoryId)?.color || '#9AA6A0'}">${icon(cat(t.categoryId)?.icon || 'sparkles', 19)}</span><span class="t">${esc(t.label)}</span></span>
        <button class="icon-btn" data-deltpl="${t.id}" aria-label="حذف تراکنش آماده">${icon('trash', 18)}</button></div>`).join('')}</div>` : ''}`;
  root.querySelector('[data-back]').onclick = () => go('more');
  $$('[data-seg]', root).forEach((b) => (b.onclick = () => { kind = b.dataset.seg; renderCategories(root, go); }));
  $$('[data-c]', root).forEach((el) => (el.onclick = () => openCat(cat(el.dataset.c))));
  root.querySelector('#add').onclick = () => openCat(null);
  $$('[data-deltpl]', root).forEach((b) => (b.onclick = async () => { const { deleteTemplate } = await import('../store.js'); await deleteTemplate(b.dataset.deltpl); toast('حذف شد'); }));
}

function openCat(c) {
  const isNew = !c;
  const d = c ? { ...c } : { name: '', icon: 'sparkles', color: COLORS[0], kind, parentId: null };
  const parents = state.cats.filter((x) => x.kind === d.kind && !x.parentId && !x.archived && x.id !== d.id);
  const used = c ? state.txs.some((t) => t.categoryId === c.id) : false;
  const hasChildren = c ? state.cats.some((x) => x.parentId === c.id && !x.archived) : false;
  openSheet(`
    <div class="sheet-title">${isNew ? 'دسته‌ی جدید' : 'ویرایش دسته'}</div>
    <div class="field"><label for="n">اسم</label><input class="input" id="n" value="${esc(d.name)}" placeholder="مثلاً: باشگاه"></div>
    ${!hasChildren ? `<div class="field"><label for="p">زیرمجموعه‌ی</label><select class="input" id="p"><option value="">— دسته‌ی اصلی —</option>${parents.map((p) => `<option value="${p.id}" ${p.id === d.parentId ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>` : ''}
    <div class="field"><label>آیکون</label><div class="icon-grid">${ICON_CHOICES.map((n) => `<button data-ic="${n}" class="${n === d.icon ? 'on' : ''}" aria-label="${n}">${icon(n, 20)}</button>`).join('')}</div></div>
    <div class="field"><label>رنگ</label><div class="swatches">${COLORS.map((col) => `<button class="swatch ${col === d.color ? 'on' : ''}" data-col="${col}" style="background:${col}" aria-label="رنگ"></button>`).join('')}</div></div>
    <button class="btn btn-primary btn-block" id="save">${icon('check', 18)} ذخیره</button>
    ${!isNew ? `<button class="btn btn-danger btn-block" id="del" style="margin-top:10px">${icon('trash', 18)} ${used ? 'پنهان کردن دسته' : 'حذف دسته'}</button>
      ${used ? `<div class="help" style="text-align:center">این دسته تراکنش داره؛ پنهان می‌شه ولی تراکنش‌هاش سر جاشون می‌مونن.</div>` : ''}` : ''}
  `, (sheet) => {
    const q = (s) => sheet.querySelector(s);
    $$('[data-ic]', sheet).forEach((b) => (b.onclick = () => { d.icon = b.dataset.ic; $$('[data-ic]', sheet).forEach((x) => x.classList.toggle('on', x === b)); }));
    $$('[data-col]', sheet).forEach((b) => (b.onclick = () => { d.color = b.dataset.col; $$('[data-col]', sheet).forEach((x) => x.classList.toggle('on', x === b)); }));
    q('#save').onclick = async () => {
      d.name = q('#n').value.trim();
      if (!d.name) { toast('اسم دسته رو بنویس'); return; }
      const p = q('#p'); if (p) d.parentId = p.value || null;
      await saveItem('categories', d);
      closeSheet(); toast('ذخیره شد', { ok: true });
    };
    const del = q('#del');
    if (del) del.onclick = async () => {
      if (hasChildren) { toast('اول زیردسته‌هاش رو حذف یا جابه‌جا کن'); return; }
      if (!del.dataset.sure) { del.dataset.sure = 1; del.innerHTML = icon('alert-triangle', 18) + ' دوباره بزن'; return; }
      if (used) await saveItem('categories', { ...c, archived: true }); else await deleteItem('categories', c.id);
      closeSheet(); toast(used ? 'دسته پنهان شد' : 'دسته حذف شد');
    };
  });
}
