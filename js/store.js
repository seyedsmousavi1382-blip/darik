// «حافظه‌ی» اپ: همه‌ی داده‌ها اینجا بارگذاری می‌شوند و صفحه‌ها از اینجا می‌خوانند.
// هر تغییری (ثبت، حذف، ویرایش) از طریق توابع همین فایل انجام می‌شود.
import * as db from './db.js';
import { balances, totals } from './ledger.js';

export const state = {
  accounts: [], txs: [], cats: [], templates: [], loans: [], goals: [],
  bal: {}, tot: { total: 0, usdtRials: 0, usdtAmount: 0, usdtShare: 0 },
  rate: 0, priceAt: null, priceSource: null, priceHist: {},
  lastBackup: null, tradeSkips: [], hidden: false, dismissedTemplates: [],
};

const listeners = new Set();
export const onChange = (fn) => listeners.add(fn);
function derive() {
  state.bal = balances(state.accounts, state.txs);
  state.tot = totals(state.accounts, state.bal, state.rate);
}
export function emit() { derive(); listeners.forEach((fn) => fn()); }

const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);
const byDateDesc = (a, b) => new Date(b.date) - new Date(a.date) || String(b.createdAt).localeCompare(String(a.createdAt));

export async function load() {
  state.accounts = (await db.all('accounts')).sort(byOrder);
  state.txs = (await db.all('transactions')).sort(byDateDesc);
  state.cats = (await db.all('categories')).sort(byOrder);
  state.templates = await db.all('templates');
  state.loans = (await db.all('loans')).sort(byOrder);
  state.goals = (await db.all('goals')).sort(byOrder);
  state.priceHist = await db.kvGet('priceHist', {});
  const price = await db.kvGet('usdtPrice');
  state.rate = price?.rial || 0;
  state.priceAt = price?.at || null;
  state.priceSource = price?.source || null;
  state.lastBackup = await db.kvGet('lastBackup');
  state.tradeSkips = await db.kvGet('tradeSkips', []);
  state.hidden = await db.kvGet('hidden', false);
  state.dismissedTemplates = await db.kvGet('dismissedTemplates', []);
  derive();
}

// ———— تراکنش ————
export async function addTx(t) {
  t.id = t.id || db.uid();
  t.createdAt = t.createdAt || new Date().toISOString();
  t.date = t.date || new Date().toISOString();
  await db.put('transactions', t);
  state.txs.push(t);
  state.txs.sort(byDateDesc);
  emit();
  return t;
}
export async function deleteTx(id) {
  await db.del('transactions', id);
  state.txs = state.txs.filter((t) => t.id !== id);
  emit();
}

// ———— حساب ————
export async function saveAccount(a) {
  a.id = a.id || db.uid();
  if (a.order === undefined) a.order = state.accounts.length;
  await db.put('accounts', a);
  const i = state.accounts.findIndex((x) => x.id === a.id);
  if (i >= 0) state.accounts[i] = a; else state.accounts.push(a);
  state.accounts.sort(byOrder);
  emit();
}

export async function deleteTemplate(id) {
  await db.del('templates', id);
  state.templates = state.templates.filter((x) => x.id !== id);
  emit();
}
// ———— قالب (تراکنش آماده) ————
export async function saveTemplate(t) {
  t.id = t.id || db.uid();
  await db.put('templates', t);
  state.templates = state.templates.filter((x) => x.id !== t.id).concat(t);
  emit();
}
export async function dismissTemplate(key) {
  state.dismissedTemplates.push(key);
  await db.kvSet('dismissedTemplates', state.dismissedTemplates);
}

// ———— تنظیمات کوچک ————
export async function setPrice(rial, source) {
  state.rate = rial; state.priceAt = new Date().toISOString(); state.priceSource = source;
  await db.kvSet('usdtPrice', { rial, at: state.priceAt, source });
  // تاریخچه‌ی روزانه‌ی قیمت (برای نمودار و «اثر نرخ تتر»)
  const d = new Date(), key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  state.priceHist[key] = rial;
  await db.kvSet('priceHist', state.priceHist);
  emit();
}

// ———— ذخیره‌ی عمومی برای وام، هدف و دسته ————
const LISTS = { loans: 'loans', goals: 'goals', categories: 'cats' };
export async function saveItem(store, item) {
  const key = LISTS[store];
  item.id = item.id || db.uid();
  if (item.order === undefined) item.order = state[key].length + 1000;
  await db.put(store, item);
  const i = state[key].findIndex((x) => x.id === item.id);
  if (i >= 0) state[key][i] = item; else state[key].push(item);
  state[key].sort(byOrder);
  emit();
  return item;
}
export async function deleteItem(store, id) {
  const key = LISTS[store];
  await db.del(store, id);
  state[key] = state[key].filter((x) => x.id !== id);
  emit();
}
export async function updateTx(t) {
  await db.put('transactions', t);
  const i = state.txs.findIndex((x) => x.id === t.id);
  if (i >= 0) state.txs[i] = t;
  state.txs.sort(byDateDesc);
  emit();
}

// همه‌ی تگ‌های استفاده‌شده، پرکاربردترین اول
export function allTags() {
  const n = {};
  for (const t of state.txs) for (const g of t.tags || []) n[g] = (n[g] || 0) + 1;
  return Object.keys(n).sort((a, b) => n[b] - n[a]);
}
export async function setLastBackup() {
  state.lastBackup = new Date().toISOString();
  await db.kvSet('lastBackup', state.lastBackup);
  emit();
}
export async function skipSession(key) {
  if (!state.tradeSkips.includes(key)) state.tradeSkips.push(key);
  await db.kvSet('tradeSkips', state.tradeSkips);
  emit();
}
export async function unskipSession(key) {
  state.tradeSkips = state.tradeSkips.filter((k) => k !== key);
  await db.kvSet('tradeSkips', state.tradeSkips);
  emit();
}
export async function setHidden(v) {
  state.hidden = v;
  await db.kvSet('hidden', v);
  emit();
}

// ———— کمکی‌ها ————
export const cat = (id) => state.cats.find((c) => c.id === id);
export const acc = (id) => state.accounts.find((a) => a.id === id);
export const parentOf = (c) => (c && c.parentId ? cat(c.parentId) : c);

// دسته‌هایی که می‌شود رویشان ثبت کرد (زیردسته‌ها + دسته‌های بدون زیردسته)
export function leafCats(kind) {
  const list = state.cats.filter((c) => c.kind === kind && !c.archived);
  const parents = new Set(list.filter((c) => c.parentId).map((c) => c.parentId));
  return list.filter((c) => !parents.has(c.id));
}
// به ترتیب «اخیراً استفاده‌شده» و بعد ترتیب پیش‌فرض
export function leafCatsByRecent(kind) {
  const seen = [];
  for (const t of state.txs) if (t.categoryId && !seen.includes(t.categoryId)) seen.push(t.categoryId);
  const rank = (c) => { const i = seen.indexOf(c.id); return i < 0 ? 1000 + (c.order ?? 0) : i; };
  return leafCats(kind).sort((a, b) => rank(a) - rank(b));
}
