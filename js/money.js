// قالب‌بندی اعداد و مبالغ
// قانون مهم: مبالغ تومانی در دیتابیس به «ریال و عدد صحیح» ذخیره می‌شوند.
// فقط موقع نمایش به تومان تبدیل می‌شوند. تتر با اعشار ذخیره می‌شود.
import { toJ, MONTHS, WEEKDAYS } from './jalali.js';

const FA = '۰۱۲۳۴۵۶۷۸۹';
export const fa = (s) => String(s).replace(/\d/g, (d) => FA[d]).replace(/\./g, '٫');
export const toEnDigits = (s) => String(s).replace(/[۰-۹]/g, (d) => FA.indexOf(d)).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));

function group(n) {
  const [i, f] = String(n).split('.');
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (f ? '.' + f : '');
}
const sep = (s) => fa(s).replace(/,/g, '٬');

export const rialsFromToman = (t) => Math.round(Number(t) * 10);
export const tomanFromRials = (r) => Math.round(r / 10);

// مبلغ کامل تومان: «۸۵٬۰۰۰»
export function toman(rials) { return sep(group(tomanFromRials(rials))); }

// مبلغ کوتاه: «۸۵ هزار»، «۱٫۲ م»، «۲٫۵ میلیارد»
export function short(rials, { unit = true } = {}) {
  const t = Math.abs(tomanFromRials(rials));
  let s;
  if (t >= 1e9) s = trim(t / 1e9, 2) + ' میلیارد';
  else if (t >= 1e6) s = trim(t / 1e6, 1) + (unit ? ' م' : '');
  else if (t >= 1e3) s = trim(t / 1e3, 1) + ' هزار';
  else s = String(t);
  return fa(s);
}
// برای زیر کیبورد: «۸۵ هزار تومان»، «۱ میلیون و ۲۰۰ هزار تومان»
export function words(rials) {
  const t = tomanFromRials(rials);
  if (!t) return '';
  const parts = [];
  const b = Math.floor(t / 1e9), m = Math.floor((t % 1e9) / 1e6), k = Math.floor((t % 1e6) / 1e3), r = t % 1e3;
  if (b) parts.push(b + ' میلیارد');
  if (m) parts.push(m + ' میلیون');
  if (k) parts.push(k + ' هزار');
  if (r) parts.push(String(r));
  return fa(parts.join(' و ')) + ' تومان';
}
function trim(x, d) { return String(Number(x.toFixed(d))); }

// تتر: حداکثر ۲ رقم اعشار
export function usdt(x, d = 2) { return sep(group(Number(Number(x).toFixed(d)))); }

// ———— تاریخ ————
export function jDate(date, { weekday = false, year = true } = {}) {
  const d = new Date(date), j = toJ(d);
  return fa((weekday ? WEEKDAYS[d.getDay()] + ' ' : '') + j.jd + ' ' + MONTHS[j.jm - 1] + (year ? ' ' + j.jy : ''));
}
export function hm(date) {
  const d = new Date(date);
  return fa(String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'));
}
// «امروز ۱۸:۲۰»، «دیروز»، «۳ آبان»
export function relDay(date) {
  const d = new Date(date), now = new Date();
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 864e5);
  if (diff === 0) return 'امروز ' + hm(d);
  if (diff === 1) return 'دیروز ' + hm(d);
  return jDate(d, { year: false });
}
export function ymd(date) {
  const d = new Date(date);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
