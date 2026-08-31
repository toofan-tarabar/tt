// ------------------------------------------------------------
// حالت کلی برنامه
// ------------------------------------------------------------
const state = {
  iranian: [],
  iraqi: [],
  announcements: [],
  loading: false,
  lastSync: null,
  error: null
};

const STATUS_LOADING = "در حال بارگیری";
const STATUS_WAITING = "منتظر بار";
const STATUS_LOADED = "بار شده";

function norm(v) {
  return (v === undefined || v === null) ? "" : String(v).trim();
}

function faDigitsToEn(str) {
  const map = { "۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9" };
  return String(str).replace(/[۰-۹]/g, d => map[d]);
}

function toSortableDateTime(dateStr, timeStr) {
  const d = faDigitsToEn(norm(dateStr));
  const t = faDigitsToEn(norm(timeStr || ""));
  const dParts = d.split(/[^\d]+/).filter(Boolean);
  let y = "0000", m = "00", day = "00";
  if (dParts.length >= 3) {
    y = dParts[0].padStart(4, "0");
    m = dParts[1].padStart(2, "0");
    day = dParts[2].padStart(2, "0");
  }
  const tParts = t.split(/[^\d]+/).filter(Boolean);
  let hh = "00", mm = "00";
  if (tParts.length >= 1) hh = tParts[0].padStart(2, "0");
  if (tParts.length >= 2) mm = tParts[1].padStart(2, "0");
  return `${y}${m}${day}${hh}${mm}`;
}

function recentIranianEntries(limit = 3) {
  return state.iranian.slice(-limit).reverse();
}

function badgeFor(status) {
  const s = norm(status);
  if (s === STATUS_LOADING) return `<span class="badge badge-loading">${s}</span>`;
  if (s === STATUS_WAITING) return `<span class="badge badge-waiting">${s}</span>`;
  if (s === STATUS_LOADED) return `<span class="badge badge-loaded">${s}</span>`;
  if (!s) return `<span class="badge badge-unknown">نامشخص</span>`;
  return `<span class="badge badge-unknown">${s}</span>`;
}

// ------------------------------------------------------------
// دریافت و خواندن داده از گوگل شیت
// ------------------------------------------------------------
function fetchSheet(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data || []),
      error: (err) => reject(err)
    });
  });
}

function normalizeKey(str) {
  return String(str || "")
    .replace(/\u064A/g, "\u06CC")   // Arabic Yeh -> Persian Yeh
    .replace(/\u0643/g, "\u06A9")   // Arabic Kaf -> Persian Kaf
    .replace(/[\u200B-\u200F\uFEFF]/g, "") // zero-width chars
    .replace(/\s+/g, " ")
    .trim();
}

function getCol(row, name) {
  const target = normalizeKey(name);
  for (const k in row) {
    if (normalizeKey(k) === target) return row[k];
  }
  return "";
}

async function loadAllData() {
  state.loading = true;
  state.error = null;
  renderRefreshBtn();

  try {
    const [iranianRaw, iraqiRaw, announceRaw] = await Promise.all([
      fetchSheet(SHEET_URLS.iranian),
      fetchSheet(SHEET_URLS.iraqi),
      fetchSheet(SHEET_URLS.announcements)
    ]);

    state.iranian = iranianRaw
      .map(r => ({
        name: norm(getCol(r, "نام راننده")),
        plate: norm(getCol(r, "شماره پلاک")),
        destination: norm(getCol(r, "مقصد")),
        phone: norm(getCol(r, "شماره تماس")),
        entryDate: norm(getCol(r, "تاریخ ورود")),
        entryTime: norm(getCol(r, "ساعت ورود")),
        status: norm(getCol(r, "وضعیت"))
      }))
      .filter(r => r.name || r.plate);

    state.iraqi = iraqiRaw
      .map(r => ({
        name: norm(getCol(r, "نام راننده")),
        plate: norm(getCol(r, "شماره پلاک")),
        entryDate: norm(getCol(r, "تاریخ ورود به ایران")),
        status: norm(getCol(r, "وضعیت"))
      }))
      .filter(r => r.name || r.plate);

    state.announcements = announceRaw
      .map(r => ({
        text: norm(getCol(r, "اعلان")),
        date: norm(getCol(r, "تاریخ اعلان"))
      }))
      .filter(r => r.text);

    state.lastSync = new Date();
  } catch (e) {
    state.error = "خطا در دریافت اطلاعات از گوگل شیت. لطفاً اتصال اینترنت یا تنظیمات لینک شیت رو بررسی کن.";
    console.error(e);
  }

  state.loading = false;
  renderAll();
}

// ------------------------------------------------------------
// محاسبات مشترک
// ------------------------------------------------------------
function statusCounts() {
  const all = state.iranian;
  return {
    total: all.length,
    loading: all.filter(r => r.status === STATUS_LOADING).length,
    waiting: all.filter(r => r.status === STATUS_WAITING).length,
    loaded: all.filter(r => r.status === STATUS_LOADED).length
  };
}

function iraqiTodayEnteringCount() {
  return state.iraqi.filter(r => r.status === STATUS_LOADED).length;
}

function loadedList() {
  const fromIranian = state.iranian
    .filter(r => r.status === STATUS_LOADED)
    .map(r => ({ ...r, source: "نوبت ایرانی" }));
  const fromIraqi = state.iraqi
    .filter(r => r.status === STATUS_LOADED)
    .map(r => ({ ...r, source: "ورود عراقی" }));
  return [...fromIranian, ...fromIraqi];
}

// ------------------------------------------------------------
// رندر: نوبار / سایدبار
// ------------------------------------------------------------
function renderRefreshBtn() {
  const btn = document.getElementById("refresh-btn");
  if (state.loading) {
    btn.innerHTML = `<i class="ti ti-refresh spin"></i> در حال به‌روزرسانی...`;
  } else {
    btn.innerHTML = `<i class="ti ti-refresh"></i> به‌روزرسانی`;
  }
}

function renderError() {
  const slot = document.getElementById("error-slot");
  if (state.error) {
    slot.innerHTML = `<div class="error-banner"><i class="ti ti-alert-circle"></i> ${state.error}</div>`;
  } else {
    slot.innerHTML = "";
  }
}

function getSeenAnnouncementCount() {
  const v = parseInt(localStorage.getItem("toofan_seen_announcements") || "0", 10);
  return isNaN(v) ? 0 : v;
}

function markAnnouncementsSeen() {
  localStorage.setItem("toofan_seen_announcements", String(state.announcements.length));
  renderAnnounceBadge();
}

function renderAnnounceBadge() {
  const badge = document.getElementById("announce-badge");
  const total = state.announcements.length;
  const seen = getSeenAnnouncementCount();
  const unseen = Math.max(0, total - seen);
  if (unseen > 0) {
    badge.style.display = "flex";
    badge.textContent = unseen > 99 ? "99+" : unseen;
  } else {
    badge.style.display = "none";
  }
}

// ------------------------------------------------------------
// رندر: داشبورد
// ------------------------------------------------------------
function renderDashboard() {
  const c = statusCounts();
  const iraqiToday = iraqiTodayEnteringCount();

  // کارت‌های آماری
  const statGrid = document.getElementById("stat-grid");
  statGrid.innerHTML = `
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--accent-bg);color:var(--accent);"><i class="ti ti-truck"></i></div>
      <div><p class="stat-value">${c.total}</p><p class="stat-label">کل ورودها</p></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--success-bg);color:var(--success);"><i class="ti ti-loader-2"></i></div>
      <div><p class="stat-value">${c.loading}</p><p class="stat-label">در حال بارگیری</p></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--warning-bg);color:var(--warning);"><i class="ti ti-clock"></i></div>
      <div><p class="stat-value">${c.waiting}</p><p class="stat-label">منتظر بار</p></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--neutral-bg);color:var(--neutral);"><i class="ti ti-package"></i></div>
      <div><p class="stat-value">${c.loaded}</p><p class="stat-label">بار شده</p></div>
    </div>
    <div class="stat-card stat-card-wide">
      <div class="stat-icon" style="background:var(--pro-bg);color:var(--pro);"><i class="ti ti-login"></i></div>
      <div><p class="stat-value">${iraqiToday}</p><p class="stat-label">ماشین‌های عراقی که امروز وارد سایت می‌شوند</p></div>
    </div>
  `;

  // نمودار دونات
  const total = Math.max(c.total, 1);
  const pLoading = (c.loading / total) * 100;
  const pWaiting = (c.waiting / total) * 100;
  const pLoaded = (c.loaded / total) * 100;

  const donut = document.getElementById("donut-chart");
  let offset = 25;
  const seg = (pct, color) => {
    const circle = `<circle cx="21" cy="21" r="15.9" fill="transparent" stroke="${color}" stroke-width="5" stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="${offset}" stroke-linecap="butt"></circle>`;
    offset -= pct;
    return circle;
  };
  donut.innerHTML = `
    <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="var(--border)" stroke-width="5"></circle>
    ${seg(pLoading, "#12875B")}
    ${seg(pWaiting, "#B7791F")}
    ${seg(pLoaded, "#475467")}
  `;

  document.getElementById("donut-legend").innerHTML = `
    <div class="legend-row"><span class="legend-dot" style="background:#12875B;"></span>در حال بارگیری<span class="legend-val">${c.loading}</span></div>
    <div class="legend-row"><span class="legend-dot" style="background:#B7791F;"></span>منتظر بار<span class="legend-val">${c.waiting}</span></div>
    <div class="legend-row"><span class="legend-dot" style="background:#475467;"></span>بار شده<span class="legend-val">${c.loaded}</span></div>
  `;

  // آخرین ورودها (۳ مورد، بر اساس جدیدترین تاریخ/ساعت واقعی، ترکیب هر دو شیت)
  const combined = recentIranianEntries(3);
  const wrap = document.getElementById("recent-table-wrap");
  if (combined.length === 0) {
    wrap.innerHTML = emptyState("ti-inbox", "هنوز ورودی ثبت نشده است.");
  } else {
    wrap.innerHTML = `
      <table class="recent-table">
        <thead><tr><th>راننده</th><th>پلاک</th><th>تاریخ و ساعت ورود</th></tr></thead>
        <tbody>
          ${combined.map(r => `
            <tr>
              <td>${r.name || "—"}</td>
              <td>${r.plate || "—"}</td>
              <td>${r.entryDate || "—"}${r.entryTime ? " - " + r.entryTime : ""}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  renderBaskol();
  renderDashboardAnnouncements();
}

function renderDashboardAnnouncements() {
  const listEl = document.getElementById("dashboard-announce-list");
  if (!listEl) return;

  const latest = getSortedAnnouncements().slice(0, 2);

  if (latest.length === 0) {
    listEl.innerHTML = `<p class="baskol-empty">اعلانی ثبت نشده است.</p>`;
    return;
  }

  listEl.innerHTML = latest.map(a => `
    <div class="announce-highlight-row">
      ${a.date ? `<div class="announce-highlight-date"><i class="ti ti-calendar"></i>${a.date}</div>` : ""}
      <p class="announce-highlight-text">${a.text}</p>
    </div>
  `).join("");
}

function renderBaskol() {
  const rows = state.iranian.filter(r => r.status === STATUS_LOADING);
  const countEl = document.getElementById("baskol-count");
  const listEl = document.getElementById("baskol-list");
  if (!countEl || !listEl) return;

  countEl.textContent = rows.length;

  if (rows.length === 0) {
    listEl.innerHTML = `<p class="baskol-empty">در حال حاضر خودرویی برای ثبت باسکول خالی نیست.</p>`;
    return;
  }

  listEl.innerHTML = rows.map(r => `
    <div class="baskol-row">
      <div class="baskol-row-main">
        <span class="baskol-dot"></span>
        <span class="baskol-name">${r.name || "بدون نام"}</span>
      </div>
      <span class="baskol-plate">${r.plate || "—"}</span>
    </div>
  `).join("");
}

// ------------------------------------------------------------
// رندر: لیست نوبت ایرانی
// ------------------------------------------------------------
function renderIranian(filterText = "") {
  const q = filterText.trim().toLowerCase();
  const filtered = state.iranian.filter(r =>
    !q || r.name.toLowerCase().includes(q) || r.plate.toLowerCase().includes(q)
  );

  const loadingRows = filtered.filter(r => r.status === STATUS_LOADING);
  const waitingRows = filtered.filter(r => r.status === STATUS_WAITING);

  const el = document.getElementById("iranian-content");

  if (loadingRows.length === 0 && waitingRows.length === 0) {
    el.innerHTML = emptyState("ti-search-off", "موردی یافت نشد.");
    return;
  }

  const renderGroup = (rows) => rows.map((r, i) => `
    <div class="record-card">
      <div class="record-top">
        <div class="record-name">
          <span class="record-num">${i + 1}</span>
          ${r.name || "بدون نام"}
        </div>
        ${badgeFor(r.status)}
      </div>
      <div class="record-meta">
        <span><i class="ti ti-license"></i>${r.plate || "—"}</span>
        <span><i class="ti ti-map-pin"></i>${r.destination || "—"}</span>
        <span><i class="ti ti-phone"></i>${r.phone || "—"}</span>
        <span><i class="ti ti-calendar"></i>${r.entryDate || "—"} ${r.entryTime ? "- " + r.entryTime : ""}</span>
      </div>
    </div>
  `).join("");

  let html = "";
  html += `<p class="section-label">در حال بارگیری <span class="section-count">${loadingRows.length}</span></p>`;
  html += loadingRows.length ? `<div class="record-list">${renderGroup(loadingRows)}</div>` : emptyState("ti-loader-2", "موردی در این وضعیت نیست.");

  html += `<p class="section-label">منتظر بار <span class="section-count">${waitingRows.length}</span></p>`;
  html += waitingRows.length ? `<div class="record-list">${renderGroup(waitingRows)}</div>` : emptyState("ti-clock", "موردی در این وضعیت نیست.");

  el.innerHTML = html;
}

// ------------------------------------------------------------
// رندر: لیست ورود عراقی
// ------------------------------------------------------------
function parsableDate(str) {
  // تلاش برای تبدیل رشته تاریخ به مقدار قابل مقایسه (پشتیبانی از فرمت‌های رایج)
  const cleaned = norm(str).replace(/[^\d]/g, "");
  return cleaned || "99999999";
}

function renderIraqi(filterText = "") {
  const q = filterText.trim().toLowerCase();
  const filtered = state.iraqi.filter(r =>
    !q || r.name.toLowerCase().includes(q) || r.plate.toLowerCase().includes(q)
  );

  const loadedRows = filtered.filter(r => r.status === STATUS_LOADED);
  const waitingRows = filtered
    .filter(r => r.status === STATUS_WAITING)
    .sort((a, b) => parsableDate(a.entryDate).localeCompare(parsableDate(b.entryDate)));
  const otherRows = filtered.filter(r => r.status !== STATUS_LOADED && r.status !== STATUS_WAITING);

  const el = document.getElementById("iraqi-content");

  if (filtered.length === 0) {
    el.innerHTML = emptyState("ti-search-off", "موردی یافت نشد.");
    return;
  }

  const renderGroup = (rows) => rows.map(r => `
    <div class="record-card">
      <div class="record-top">
        <div class="record-name">${r.name || "بدون نام"}</div>
        ${badgeFor(r.status)}
      </div>
      <div class="record-meta">
        <span><i class="ti ti-license"></i>${r.plate || "—"}</span>
        <span><i class="ti ti-calendar"></i>تاریخ ورود به ایران: ${r.entryDate || "—"}</span>
      </div>
    </div>
  `).join("");

  let html = "";
  html += `<p class="section-label">بار شده <span class="section-count">${loadedRows.length}</span></p>`;
  html += loadedRows.length ? `<div class="record-list">${renderGroup(loadedRows)}</div>` : emptyState("ti-package", "موردی در این وضعیت نیست.");

  html += `<p class="section-label">منتظر بار <span class="section-count">${waitingRows.length}</span></p>`;
  html += waitingRows.length ? `<div class="record-list">${renderGroup(waitingRows)}</div>` : emptyState("ti-clock", "موردی در این وضعیت نیست.");

  if (otherRows.length) {
    html += `<p class="section-label">سایر وضعیت‌ها <span class="section-count">${otherRows.length}</span></p>`;
    html += `<div class="record-list">${renderGroup(otherRows)}</div>`;
  }

  el.innerHTML = html;
}

// ------------------------------------------------------------
// رندر: لیست بار شده‌ها
// ------------------------------------------------------------
function renderLoaded(filterText = "") {
  const q = filterText.trim().toLowerCase();
  const rows = loadedList().filter(r =>
    !q || r.name.toLowerCase().includes(q) || r.plate.toLowerCase().includes(q)
  );

  const el = document.getElementById("loaded-content");
  if (rows.length === 0) {
    el.innerHTML = emptyState("ti-package-off", "هنوز موردی بار نشده است.");
    return;
  }

  el.innerHTML = `<div class="record-list">${rows.map(r => `
    <div class="record-card">
      <div class="record-top">
        <div class="record-name">${r.name || "بدون نام"}</div>
        <span class="badge badge-loaded">${r.source}</span>
      </div>
      <div class="record-meta">
        <span><i class="ti ti-license"></i>${r.plate || "—"}</span>
        ${r.destination ? `<span><i class="ti ti-map-pin"></i>${r.destination}</span>` : ""}
        ${r.entryDate ? `<span><i class="ti ti-calendar"></i>${r.entryDate} ${r.entryTime ? "- " + r.entryTime : ""}</span>` : ""}
      </div>
    </div>
  `).join("")}</div>`;
}

// ------------------------------------------------------------
// رندر: اعلان‌ها
// ------------------------------------------------------------
function getSortedAnnouncements() {
  return [...state.announcements]
    .map(a => ({ ...a, _sort: toSortableDateTime(a.date, "") }))
    .sort((a, b) => b._sort.localeCompare(a._sort));
}

function renderAnnouncements() {
  const el = document.getElementById("announcements-content");
  const list = getSortedAnnouncements();

  if (list.length === 0) {
    el.innerHTML = emptyState("ti-bell-off", "اعلانی ثبت نشده است.");
    return;
  }

  el.innerHTML = `<div class="record-list">${list.map(a => `
    <div class="announce-card">
      <div class="announce-icon"><i class="ti ti-speakerphone"></i></div>
      <div class="announce-body">
        <div class="announce-top">
          ${a.date ? `<span class="announce-date"><i class="ti ti-calendar"></i>${a.date}</span>` : ""}
        </div>
        <p class="announce-text">${a.text}</p>
      </div>
    </div>
  `).join("")}</div>`;
}

// ------------------------------------------------------------
// کمکی
// ------------------------------------------------------------
function emptyState(icon, text) {
  return `<div class="empty-state"><i class="ti ${icon}"></i><p>${text}</p></div>`;
}

function renderAll() {
  renderRefreshBtn();
  renderError();
  renderAnnounceBadge();
  renderDashboard();
  renderIranian(document.getElementById("search-iranian").value);
  renderIraqi(document.getElementById("search-iraqi").value);
  renderLoaded(document.getElementById("search-loaded").value);
  renderAnnouncements();
}

// ------------------------------------------------------------
// ناوبری
// ------------------------------------------------------------
const pageTitles = {
  dashboard: ["داشبورد", "نوبت بارگیری LPG سایت طوفان ترابر"],
  iranian: ["لیست نوبت ایرانی", "خودروهای در حال بارگیری و منتظر بار"],
  iraqi: ["لیست ورود عراقی", "خودروهای وارد شده از عراق"],
  announcements: ["اعلان‌ها", "آخرین اطلاعیه‌ها برای رانندگان"],
  loaded: ["لیست بار شده‌ها", "خودروهایی که بارگیری آن‌ها کامل شده"]
};

function goToPage(page) {
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === page);
  });
  document.querySelectorAll("main > section").forEach(sec => {
    sec.style.display = sec.id === `page-${page}` ? "" : "none";
  });
  document.getElementById("page-title").textContent = pageTitles[page][0];
  document.getElementById("page-sub").textContent = pageTitles[page][1];

  if (page === "announcements") {
    markAnnouncementsSeen();
  }
}

document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => goToPage(btn.dataset.page));
});

document.getElementById("refresh-btn").addEventListener("click", loadAllData);

document.getElementById("search-iranian").addEventListener("input", (e) => renderIranian(e.target.value));
document.getElementById("search-iraqi").addEventListener("input", (e) => renderIraqi(e.target.value));
document.getElementById("search-loaded").addEventListener("input", (e) => renderLoaded(e.target.value));

// ------------------------------------------------------------
// شروع
// ------------------------------------------------------------
loadAllData();
if (typeof AUTO_REFRESH_SECONDS === "number" && AUTO_REFRESH_SECONDS > 0) {
  setInterval(loadAllData, AUTO_REFRESH_SECONDS * 1000);
}
