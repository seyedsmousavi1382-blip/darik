// صفحه‌ی «بیشتر»
import { state, setPrice } from '../store.js';
import { icon } from '../icons.js';
import { toman, jDate, hm, fa, toEnDigits, rialsFromToman } from '../money.js';
import { refreshPrice, diagnose, sourceName } from '../price.js';
import { makeBackup, restoreFromFile } from '../backup.js';
import { openSheet, closeSheet, toast, $$ } from '../ui.js';

const item = (id, ic, color, title, sub) => `<div class="menu-item" data-open="${id}" role="button" tabindex="0">
  <span class="mi" style="background:${color}1f;color:${color}">${icon(ic, 21)}</span><span class="grow">${title}<div class="muted" style="font-size:12px">${sub}</div></span><span class="faint">${icon('chevron-left', 18)}</span></div>`;

export function renderMore(root, go) {
  const dueSoon = state.loans.filter((l) => l.remaining > 0).length;
  root.innerHTML = `
    <div class="page-h fade"><h1>بیشتر</h1></div>
    <div class="card fade" style="padding:0">
      ${item('reports', 'chart-pie', '#5DCAA5', 'گزارش‌ها', 'خلاصه‌ی ماه، دسته‌ها، ترید، پیش‌بینی')}
      ${item('goals', 'flag-3', '#E9C46A', 'هدف پس‌انداز', state.goals.length ? fa(state.goals.length) + ' هدف' : 'هنوز هدفی نساختی')}
      ${item('loans', 'receipt', '#F0A43A', 'وام و اقساط', dueSoon ? fa(dueSoon) + ' وام فعال' : 'وامی ثبت نشده')}
      ${item('cats', 'palette', '#8F87F1', 'دسته‌ها و تراکنش‌های آماده', 'ساختن، تغییر اسم، آیکون و رنگ')}
    </div>
    <div class="card fade" style="padding:0;margin-top:12px">
      ${item('price', 'coin', '#85B7EB', 'قیمت تتر', state.rate ? toman(state.rate) + ' تومان' : 'گرفته نشده')}
      ${item('backup', 'database-export', '#97C459', 'پشتیبان‌گیری و بازگردانی', state.lastBackup ? 'آخرین: ' + jDate(state.lastBackup, { year: false }) : 'هنوز پشتیبان نگرفتی')}
    </div>
    <div class="fade" style="text-align:center;margin-top:28px">
      <img src="icons/icon-192.png" alt="" width="64" height="64" style="border-radius:16px;box-shadow:0 10px 24px -8px rgba(93,202,165,.5)">
      <div class="display" style="font-size:22px;margin-top:8px">داریک</div>
      <div class="muted" style="font-size:12px;line-height:1.9">نسخه‌ی ۱<br>همه‌ی اطلاعات فقط روی همین گوشی ذخیره می‌شن.</div>
    </div>`;
  $$('[data-open]', root).forEach((el) => {
    const open = () => {
      const k = el.dataset.open;
      if (k === 'price') openPrice(); else if (k === 'backup') openBackup(); else go(k);
    };
    el.onclick = open;
    el.onkeydown = (e) => { if (e.key === 'Enter') open(); };
  });
}

export function openPrice() {
  openSheet(`
    <div class="sheet-title">${icon('coin', 22)} قیمت تتر</div>
    <div class="glow-card" style="text-align:center;margin-bottom:14px">
      <div class="big num" style="font-size:38px">${state.rate ? toman(state.rate) : '—'}</div>
      <div class="muted">تومان · ${state.priceAt ? `${sourceName(state.priceSource)}، ${jDate(state.priceAt, { year: false })} ساعت ${hm(state.priceAt)}` : 'هنوز قیمتی گرفته نشده'}</div>
    </div>
    <button class="btn btn-primary btn-block" id="fetch">${icon('refresh', 18)} گرفتن قیمت آنلاین</button>
    <div class="field" style="margin-top:18px"><label for="manual">یا قیمت رو دستی وارد کن (تومان)</label>
      <div class="row"><input class="input num" id="manual" inputmode="numeric" placeholder="مثلاً ۱۰۲۰۰۰" style="flex:1"><button class="btn btn-ghost" id="set">ذخیره</button></div></div>
    <button class="btn btn-ghost btn-block btn-sm" id="diag" style="margin-top:6px">${icon('adjustments-horizontal', 16)} عیب‌یابی منابع قیمت</button>
    <div id="diagout"></div>
  `, (sheet) => {
    sheet.querySelector('#fetch').onclick = async (e) => {
      const b = e.currentTarget; b.style.opacity = .6; b.innerHTML = icon('refresh', 18) + ' در حال گرفتن…';
      const r = await refreshPrice({ force: true });
      if (r.ok) { closeSheet(); toast(`قیمت از ${sourceName(r.source)}: ${toman(state.rate)} تومان`, { ok: true }); }
      else { b.style.opacity = 1; b.innerHTML = icon('refresh', 18) + ' دوباره امتحان کن'; toast('از هیچ منبعی قیمت نیومد. عیب‌یابی رو بزن.'); }
    };
    sheet.querySelector('#diag').onclick = async (e) => {
      const b = e.currentTarget, out = sheet.querySelector('#diagout');
      b.innerHTML = icon('refresh', 16) + ' در حال امتحان همه‌ی منابع…';
      const d = await diagnose();
      b.innerHTML = icon('adjustments-horizontal', 16) + ' دوباره عیب‌یابی کن';
      out.innerHTML = `<div class="card" style="margin-top:10px">
        <div class="stat-row"><span class="muted">اینترنت گوشی</span><span class="${d.online ? 'green' : 'red'}">${d.online ? 'وصله' : 'قطعه'}</span></div>
        ${d.results.map((r) => `<div class="stat-row"><span>${r.src.name}</span><span class="${r.ok ? 'green' : 'red'}" style="font-size:12.5px;text-align:left">${r.ok ? toman(r.rial) + ' تومان' : r.why}</span></div>`).join('')}
      </div><div class="help">یه بار با فیلترشکن روشن و یه بار خاموش امتحان کن و نتیجه رو مقایسه کن.</div>`;
    };
    sheet.querySelector('#set').onclick = async () => {
      const n = Number(toEnDigits(sheet.querySelector('#manual').value).replace(/[^\d]/g, ''));
      if (!n) { toast('قیمت رو به تومان بزن'); return; }
      await setPrice(rialsFromToman(n), 'manual');
      closeSheet(); toast('قیمت ذخیره شد', { ok: true });
    };
  });
}

export function openBackup() {
  openSheet(`
    <div class="sheet-title">${icon('database-export', 22)} پشتیبان‌گیری</div>
    <div class="muted" style="font-size:13px;line-height:1.9;margin-bottom:14px">
      ${state.lastBackup ? `آخرین پشتیبان: ${jDate(state.lastBackup, { weekday: true })}` : 'هنوز پشتیبان نگرفتی.'}<br>
      فایل رو توی Files، آی‌کلود یا Saved Messages تلگرام نگه دار. فایل رمز نداره؛ جای دیگه‌ای نفرستش.
    </div>
    <button class="btn btn-primary btn-block" id="mk">${icon('download', 18)} گرفتن پشتیبان</button>
    <div class="card" style="margin-top:16px">
      <div class="sec" style="margin-bottom:6px">${icon('database-import', 18)} بازگردانی</div>
      <div class="muted" style="font-size:12.5px;line-height:1.9;margin-bottom:10px">همه‌ی اطلاعات فعلی اپ پاک می‌شه و اطلاعات فایل جاش میاد.</div>
      <input type="file" id="file" accept=".json,application/json" style="display:none">
      <button class="btn btn-ghost btn-block" id="pick">${icon('upload', 18)} انتخاب فایل پشتیبان</button>
    </div>
  `, (sheet) => {
    sheet.querySelector('#mk').onclick = async () => {
      const r = await makeBackup();
      if (r.ok) { closeSheet(); toast('پشتیبان گرفته شد', { ok: true }); }
    };
    const file = sheet.querySelector('#file');
    sheet.querySelector('#pick').onclick = () => file.click();
    file.onchange = async () => {
      const f = file.files[0];
      if (!f) return;
      if (!confirm('همه‌ی اطلاعات فعلی با اطلاعات این فایل جایگزین بشه؟')) return;
      try { await restoreFromFile(f); location.reload(); }
      catch (e) { toast(e.message || 'بازگردانی نشد'); }
    };
  });
}
