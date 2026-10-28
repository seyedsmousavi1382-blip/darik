// پشتیبان‌گیری و بازگردانی
import { exportAll, importAll } from './db.js';
import { setLastBackup } from './store.js';
import { toJ } from './jalali.js';

export async function makeBackup() {
  const data = await exportAll();
  const j = toJ(new Date());
  const name = `darik-backup-${j.jy}-${String(j.jm).padStart(2, '0')}-${String(j.jd).padStart(2, '0')}.json`;
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });

  // روی آیفون: منوی اشتراک‌گذاری باز می‌شود (Save to Files یا تلگرام)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'پشتیبان داریک' });
      await setLastBackup();
      return { ok: true };
    } catch (e) {
      if (e.name === 'AbortError') return { ok: false, cancelled: true };
    }
  }
  // روی کامپیوتر: فایل دانلود می‌شود
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  await setLastBackup();
  return { ok: true };
}

export async function restoreFromFile(file) {
  const text = await file.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('فایل خراب است یا فایل پشتیبان نیست.'); }
  await importAll(data);
}
