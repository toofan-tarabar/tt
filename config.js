// تنظیمات اتصال به گوگل شیت
// اگر لینک‌های شیت عوض شد، فقط همین‌ها رو آپدیت کن.

const SHEET_URLS = {
  iranian: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUlqtUk2C3n0QaGtzq1LCx1NNVSnZD9kLW9NG2ShzGmUBHuVh4jubRMr-te2q7HUvEWJCfEVicOC6F/pub?gid=0&single=true&output=csv",
  iraqi:   "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUlqtUk2C3n0QaGtzq1LCx1NNVSnZD9kLW9NG2ShzGmUBHuVh4jubRMr-te2q7HUvEWJCfEVicOC6F/pub?gid=1705380492&single=true&output=csv",
  announcements: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUlqtUk2C3n0QaGtzq1LCx1NNVSnZD9kLW9NG2ShzGmUBHuVh4jubRMr-te2q7HUvEWJCfEVicOC6F/pub?gid=930681156&single=true&output=csv"
};

// هر چند ثانیه یک‌بار خودکار داده‌ها رو تازه کنه (۶۰ ثانیه)
const AUTO_REFRESH_SECONDS = 60;
