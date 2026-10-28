// گرفتن قیمت تتر از نوبیتکس
// اگر اینترنت یا سایت در دسترس نباشد، آخرین قیمت ذخیره‌شده باقی می‌ماند.
import { state, setPrice } from './store.js';

const URL_NOBITEX = 'https://api.nobitex.ir/market/stats?srcCurrency=usdt&dstCurrency=rls';
const FRESH_MS = 5 * 60 * 1000; // اگر قیمت کمتر از ۵ دقیقه پیش گرفته شده، دوباره نگیر

export async function refreshPrice({ force = false } = {}) {
  if (!force && state.priceAt && Date.now() - new Date(state.priceAt) < FRESH_MS) return { ok: true, cached: true };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(URL_NOBITEX, { signal: ctrl.signal, cache: 'no-store' });
    const json = await res.json();
    const s = json?.stats?.['usdt-rls'];
    const rial = Math.round(Number(s?.latest || s?.bestSell || 0));
    if (!rial) throw new Error('bad data');
    await setPrice(rial, 'nobitex');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.name === 'AbortError' ? 'timeout' : String(e.message || e) };
  } finally {
    clearTimeout(timer);
  }
}
