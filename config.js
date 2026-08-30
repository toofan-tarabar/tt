// تنظیمات اتصال به گوگل شیت
// اگر لینک‌های شیت عوض شد، فقط همین‌ها رو آپدیت کن.

const SHEET_URLS = {
  iranian: "https://docs.google.com/spreadsheets/d/1TS8kJEmKqVFiSlBDUSkL1gQn0mQur-NCsAoxeXz5SEw/gviz/tq?tqx=out:csv&gid=0",
  iraqi:   "https://docs.google.com/spreadsheets/d/1TS8kJEmKqVFiSlBDUSkL1gQn0mQur-NCsAoxeXz5SEw/gviz/tq?tqx=out:csv&gid=1705380492",
  announcements: "https://docs.google.com/spreadsheets/d/1TS8kJEmKqVFiSlBDUSkL1gQn0mQur-NCsAoxeXz5SEw/gviz/tq?tqx=out:csv&gid=930681156"
};

// هر چند ثانیه یک‌بار خودکار داده‌ها رو تازه کنه (۶۰ ثانیه)
const AUTO_REFRESH_SECONDS = 60;
