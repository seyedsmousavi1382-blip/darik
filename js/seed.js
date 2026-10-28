// اطلاعات پیش‌فرضی که بار اول در اپ ساخته می‌شوند
import { put, kvGet, kvSet } from './db.js';

// [شناسه، نام، آیکون، رنگ، شناسه‌ی والد]
const EXPENSE = [
  ['food', 'خوراک', 'tools-kitchen-2', '#AFA9EC'],
  ['coffee', 'قهوه', 'coffee', '#AFA9EC', 'food'],
  ['restaurant', 'رستوران و فست‌فود', 'tools-kitchen-2', '#AFA9EC', 'food'],
  ['grocery', 'سوپرمارکت', 'shopping-cart', '#AFA9EC', 'food'],
  ['car', 'خودرو', 'car', '#EF9F27'],
  ['fuel', 'بنزین', 'gas-station', '#EF9F27', 'car'],
  ['repair', 'تعمیر و سرویس', 'tool', '#EF9F27', 'car'],
  ['insurance', 'بیمه و عوارض', 'shield-check', '#EF9F27', 'car'],
  ['parking', 'پارکینگ', 'parking', '#EF9F27', 'car'],
  ['transport', 'رفت‌وآمد', 'bus', '#85B7EB'],
  ['taxi', 'تاکسی اینترنتی', 'car', '#85B7EB', 'transport'],
  ['public', 'حمل‌ونقل عمومی', 'bus', '#85B7EB', 'transport'],
  ['bills', 'قبوض و شارژ', 'receipt-2', '#F0997B'],
  ['mobile', 'موبایل و اینترنت', 'device-mobile', '#F0997B', 'bills'],
  ['utility', 'قبوض', 'receipt-2', '#F0997B', 'bills'],
  ['shopping', 'خرید شخصی', 'shopping-bag', '#ED93B1'],
  ['clothes', 'پوشاک', 'shirt', '#ED93B1', 'shopping'],
  ['electronics', 'لوازم الکترونیکی', 'device-laptop', '#ED93B1', 'shopping'],
  ['shop_other', 'سایر خریدها', 'shopping-bag', '#ED93B1', 'shopping'],
  ['edu', 'آموزش', 'book', '#97C459'],
  ['uni', 'دانشگاه', 'school', '#97C459', 'edu'],
  ['course', 'دوره و کتاب', 'book', '#97C459', 'edu'],
  ['health', 'سلامت', 'heartbeat', '#F09595'],
  ['fun', 'تفریح و اشتراک‌ها', 'ticket', '#7F77DD'],
  ['family', 'خانواده و هدیه', 'gift', '#E8A0BF'],
  ['fees', 'کارمزدها', 'percentage', '#9A9CA3'],
  ['fee_bank', 'کارمزد بانکی', 'building-bank', '#9A9CA3', 'fees'],
  ['fee_transfer', 'کارمزد انتقال و تبدیل', 'arrows-exchange', '#9A9CA3', 'fees'],
  ['loan', 'قسط وام', 'receipt', '#5DCAA5'],
];
const INCOME = [
  ['inc_person', 'دریافتی از اشخاص', 'users', '#5DCAA5'],
  ['inc_gift', 'هدیه', 'gift', '#5DCAA5'],
  ['inc_other', 'سایر درآمدها', 'cash', '#5DCAA5'],
];

export async function seedIfEmpty() {
  if (await kvGet('seeded')) return;
  let order = 0;
  for (const [id, name, icon, color, parentId] of EXPENSE)
    await put('categories', { id, name, icon, color, parentId: parentId || null, kind: 'expense', order: order++ });
  for (const [id, name, icon, color] of INCOME)
    await put('categories', { id, name, icon, color, parentId: null, kind: 'income', order: order++ });

  await put('accounts', { id: 'bank', name: 'حساب بانکی', kind: 'bank', currency: 'IRR', opening: 0, order: 0 });
  await put('accounts', { id: 'broker', name: 'بروکر', kind: 'broker', currency: 'USDT', opening: 0, order: 1 });
  await put('accounts', { id: 'wallet', name: 'کیف پول تتر', kind: 'wallet', currency: 'USDT', opening: 0, order: 2 });

  await put('templates', { id: 't_coffee', categoryId: 'coffee', amount: null, label: 'قهوه' });
  await kvSet('seeded', true);
  await kvSet('installedAt', new Date().toISOString());
}
