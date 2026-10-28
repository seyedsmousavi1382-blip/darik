// گرفتن قیمت تتر
// چند منبع به ترتیب امتحان می‌شوند؛ اولین منبعی که جواب درست داد استفاده می‌شود.
// اگر هیچ‌کدام جواب ندهند، آخرین قیمت ذخیره‌شده باقی می‌ماند.
import { state, setPrice } from './store.js';

// parse باید قیمت هر تتر را «به ریال» برگرداند
export const SOURCES = [
  { id: 'nobitex', name: 'نوبیتکس', url: 'https://api.nobitex.ir/market/stats?srcCurrency=usdt&dstCurrency=rls',
    parse: (j) => Number(j?.stats?.['usdt-rls']?.latest || j?.stats?.['usdt-rls']?.bestSell) },
  { id: 'nobitex2', name: 'نوبیتکس (دفتر سفارش)', url: 'https://api.nobitex.ir/v3/orderbook/USDTIRT',
    parse: (j) => Number(j?.lastTradePrice) },
  { id: 'wallex', name: 'والکس', url: 'https://api.wallex.ir/v1/markets',
    parse: (j) => Number(j?.result?.symbols?.USDTTMN?.stats?.lastPrice) * 10 },
  { id: 'bitpin', name: 'بیت‌پین', url: 'https://api.bitpin.ir/v1/mkt/markets/',
    parse: (j) => { const m = (j?.results || []).find((x) => x.code === 'USDT_IRT'); return Number(m?.price) * 10; } },
  { id: 'tetherland', name: 'تترلند', url: 'https://api.tetherland.com/currencies',
    parse: (j) => Number(j?.data?.currencies?.USDT?.price) * 10 },
];
export const sourceName = (id) => (id === 'manual' ? 'دستی' : SOURCES.find((s) => s.id === id)?.name || id || '');

const FRESH_MS = 5 * 60 * 1000;
// قیمت معقول تتر: بین ۳۰ هزار و ۱۰ میلیون تومان (برای رد کردن جواب‌های اشتباه)
const sane = (rial) => Number.isFinite(rial) && rial > 300000 && rial < 100000000;

async function trySource(src, ms = 7000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  const t0 = Date.now();
  try {
    const res = await fetch(src.url, { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) return { ok: false, why: `سرور خطای ${res.status} داد`, ms: Date.now() - t0 };
    const json = await res.json();
    const rial = Math.round(src.parse(json));
    if (!sane(rial)) return { ok: false, why: 'جواب اومد ولی قیمت توش نبود', ms: Date.now() - t0 };
    return { ok: true, rial, ms: Date.now() - t0 };
  } catch (e) {
    if (e.name === 'AbortError') return { ok: false, why: 'جواب نداد (وقت تموم شد)', ms: Date.now() - t0 };
    // Load failed / Failed to fetch: یا اینترنت قطعه، یا سایت به این IP جواب نمی‌ده، یا اجازه‌ی مرورگر (CORS) نمی‌ده
    return { ok: false, why: 'اتصال برقرار نشد (فیلتر، IP یا اجازه‌ی مرورگر)', ms: Date.now() - t0 };
  } finally {
    clearTimeout(timer);
  }
}

export async function refreshPrice({ force = false } = {}) {
  if (!force && state.priceAt && Date.now() - new Date(state.priceAt) < FRESH_MS) return { ok: true, cached: true };
  for (const src of SOURCES) {
    const r = await trySource(src);
    if (r.ok) { await setPrice(r.rial, src.id); return { ok: true, source: src.id }; }
  }
  return { ok: false };
}

// عیب‌یابی: همه‌ی منابع را هم‌زمان امتحان می‌کند و نتیجه‌ی هرکدام را برمی‌گرداند
export async function diagnose() {
  const results = await Promise.all(SOURCES.map(async (s) => ({ src: s, ...(await trySource(s, 9000)) })));
  return { online: navigator.onLine, results };
}
