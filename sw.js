// Service Worker: فایل‌های اپ را روی گوشی نگه می‌دارد تا بدون اینترنت هم باز شود.
// هر بار که فایلی از اپ عوض شد، عدد VERSION را یکی بالا ببر تا گوشی نسخه‌ی جدید را بگیرد.
const VERSION = 'darik-v3';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/store.js', 'js/ui.js', 'js/db.js', 'js/jalali.js', 'js/money.js', 'js/ledger.js', 'js/seed.js',
  'js/icons.js', 'js/price.js', 'js/backup.js',
  'js/views/home.js', 'js/views/quick.js', 'js/views/trade.js', 'js/views/transactions.js', 'js/views/accounts.js', 'js/views/more.js',
  'js/views/reports.js', 'js/views/loans.js', 'js/views/goals.js', 'js/views/categories.js',
  'fonts/vazirmatn-arabic-400-normal.woff2', 'fonts/vazirmatn-arabic-500-normal.woff2', 'fonts/vazirmatn-arabic-700-normal.woff2',
  'fonts/vazirmatn-latin-400-normal.woff2', 'fonts/vazirmatn-latin-500-normal.woff2', 'fonts/vazirmatn-latin-700-normal.woff2',
  'fonts/lalezar-arabic-400-normal.woff2', 'fonts/lalezar-latin-400-normal.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // درخواست‌های بیرونی (مثل قیمت تتر) مستقیم به اینترنت می‌روند
  if (url.origin !== self.location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
