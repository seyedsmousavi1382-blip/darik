// نقطه‌ی شروع اپ: بارگذاری داده‌ها، ساختن تب‌بار، جابه‌جایی بین صفحه‌ها
import { seedIfEmpty } from './seed.js';
import { state, load, onChange } from './store.js';
import { icon } from './icons.js';
import { drawBackground, initSheet, $ } from './ui.js';
import { refreshPrice } from './price.js';
import { renderHome } from './views/home.js';
import { renderTransactions } from './views/transactions.js';
import { renderAccounts } from './views/accounts.js';
import { renderMore, openBackup } from './views/more.js';
import { renderReports } from './views/reports.js';
import { renderLoans } from './views/loans.js';
import { renderGoals } from './views/goals.js';
import { renderCategories } from './views/categories.js';
import { openQuick } from './views/quick.js';

const TABS = [['home', 'home', 'خانه'], ['txs', 'list-details', 'تراکنش‌ها'], ['add'], ['accounts', 'wallet', 'حساب‌ها'], ['more', 'dots', 'بیشتر']];
const VIEWS = { home: renderHome, txs: renderTransactions, accounts: renderAccounts, more: renderMore, reports: renderReports, loans: renderLoans, goals: renderGoals, cats: renderCategories };
// صفحه‌های داخلی «بیشتر» تب «بیشتر» را فعال نگه می‌دارند
const TAB_OF = { reports: 'more', loans: 'more', goals: 'more', cats: 'more' };
let route = 'home';

function go(r, { push = true } = {}) {
  if (r === 'backup') { openBackup(); return; }
  if (!VIEWS[r]) return;
  const changed = r !== route;
  route = r;
  if (push && changed) history.pushState({ r }, '', '#' + r);
  render();
  if (changed) window.scrollTo(0, 0);
}
// دکمه‌ی «برگشت» گوشی/مرورگر
addEventListener('popstate', (e) => go((e.state && e.state.r) || 'home', { push: false }));

function render() {
  document.body.classList.toggle('hidden-nums', state.hidden);
  VIEWS[route]($('#app'), go);
  const tab = TAB_OF[route] || route;
  $('#tabbar').querySelectorAll('[data-tab]').forEach((b) => { b.classList.toggle('on', b.dataset.tab === tab); b.setAttribute('aria-current', b.dataset.tab === tab ? 'page' : 'false'); });
}

function buildTabbar() {
  $('#tabbar').innerHTML = TABS.map(([id, ic, label]) => id === 'add'
    ? `<div class="fab-wrap"><button class="fab" id="fab" aria-label="ثبت تراکنش">${icon('plus', 30)}</button></div>`
    : `<button class="tab" data-tab="${id}" aria-label="${label}">${icon(ic, 24)}<span>${label}</span></button>`).join('');
  $('#tabbar').querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => go(b.dataset.tab)));
  $('#fab').onclick = () => openQuick();
}

async function start() {
  document.body.classList.add('boot');
  drawBackground();
  initSheet();
  buildTabbar();
  try {
    await seedIfEmpty();
    await load();
  } catch (e) {
    $('#app').innerHTML = `<div class="empty">اپ نتونست اطلاعات رو باز کنه.<br>${String(e.message || e)}</div>`;
    return;
  }
  const initial = location.hash.slice(1);
  if (VIEWS[initial]) route = initial;
  history.replaceState({ r: route }, '', '#' + route);
  onChange(render);
  render();
  setTimeout(() => document.body.classList.remove('boot'), 1400);

  // قیمت تتر: موقع باز شدن و هر بار برگشتن به اپ
  refreshPrice();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshPrice(); });

  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
}

start();
