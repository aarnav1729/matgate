const {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  createContext,
  useContext
} = React;

const AppContext = createContext();
const API = "";

async function api(path, opts = {}) {
  const token = localStorage.getItem("mg_token");
  const headers = { ...(opts.headers || {}) };

  if (!(opts.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...opts, headers });
  let data = {};

  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

function toIST(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
}

function toISTClock(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

function toISTDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function todayDateInputValue() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function toTatLabel(minutes) {
  if (minutes === null || minutes === undefined || Number.isNaN(Number(minutes))) {
    return "—";
  }

  const totalMinutes = Math.max(0, Math.round(Number(minutes)));
  if (totalMinutes < 60) return `${totalMinutes} min`;

  const hours = Math.floor(totalMinutes / 60);
  const remainderMinutes = totalMinutes % 60;
  if (hours < 24) return `${hours}h ${remainderMinutes}m`;

  const days = Math.floor(hours / 24);
  const remainderHours = hours % 24;
  return `${days}d ${remainderHours}h`;
}

function getIssuanceTat(issuance) {
  if (!issuance) {
    return {
      inwardToIssueMinutes: null,
      issueToReceiveMinutes: null,
      inwardToReceiveMinutes: null
    };
  }

  const inwardToIssueMinutes =
    issuance.tatInwardToIssueMinutes ??
    (issuance.sourceInwardPrintedAt && issuance.issuedAt
      ? Math.round(
          (new Date(issuance.issuedAt).getTime() -
            new Date(issuance.sourceInwardPrintedAt).getTime()) /
            60000
        )
      : null);

  const issueToReceiveMinutes =
    issuance.tatIssueToReceiveMinutes ??
    (issuance.issuedAt && issuance.receivedAt
      ? Math.round(
          (new Date(issuance.receivedAt).getTime() -
            new Date(issuance.issuedAt).getTime()) /
            60000
        )
      : null);

  const inwardToReceiveMinutes =
    issuance.tatInwardToReceiveMinutes ??
    (issuance.sourceInwardPrintedAt && issuance.receivedAt
      ? Math.round(
          (new Date(issuance.receivedAt).getTime() -
            new Date(issuance.sourceInwardPrintedAt).getTime()) /
            60000
        )
      : null);

  return {
    inwardToIssueMinutes,
    issueToReceiveMinutes,
    inwardToReceiveMinutes
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function openPrintDocument(title, cardsMarkup) {
  const printWindow = window.open("", "_blank", "width=1024,height=760");
  if (!printWindow) return;

  printWindow.document.write(`<!DOCTYPE html>
    <html>
    <head>
      <title>${escapeHtml(title)}</title>
      <style>
        :root{color-scheme:light only}
        *{box-sizing:border-box}
        body{margin:0;padding:24px;font-family:'SF Pro Text','SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI','IBM Plex Sans',Arial,sans-serif;background:#eef4ff;color:#111827}
        .sheet-head{margin:0 auto 20px;max-width:1120px}
        .sheet-head h1{margin:0 0 6px;font-size:22px;letter-spacing:-.03em}
        .sheet-head p{margin:0;color:#5b6475;font-size:13px}
        .sheet-grid{max-width:1120px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}
        .label-card{break-inside:avoid;page-break-inside:avoid;background:#fff;border:1px solid #d8e1ec;border-radius:22px;padding:18px;box-shadow:0 18px 48px rgba(15,23,42,.08)}
        .label-kicker{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#47668f;font-weight:700}
        .label-id{margin:10px 0 14px;font-size:22px;line-height:1.1;letter-spacing:-.04em;font-weight:800}
        .label-meta{display:grid;gap:8px}
        .label-row{display:flex;justify-content:space-between;gap:14px;padding:8px 0;border-bottom:1px solid #edf2f7;font-size:12px}
        .label-row span:first-child{color:#6b7f97;text-transform:uppercase;letter-spacing:.12em;font-size:10px;font-weight:700}
        .label-row span:last-child{text-align:right;font-weight:700}
        .label-qr{margin:16px 0 12px;display:grid;place-items:center}
        .label-qr img{width:180px;padding:10px;background:#fff;border-radius:18px;box-shadow:0 14px 30px rgba(15,23,42,.08)}
        .label-foot{font-size:11px;color:#5f6f86;line-height:1.5}
      </style>
    </head>
    <body>
      <div class="sheet-head">
        <h1>${escapeHtml(title)}</h1>
        <p>Printed in IST from MatGate.</p>
      </div>
      <div class="sheet-grid">${cardsMarkup}</div>
    </body>
    </html>`);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 400);
}

function buildStockLabelCard(label, heading = "Inward Stock Label") {
  return `
    <article class="label-card">
      <div class="label-kicker">${escapeHtml(heading)}</div>
      <div class="label-id">${escapeHtml(label.stockLabelId)}</div>
      <div class="label-meta">
        <div class="label-row"><span>Material</span><span>${escapeHtml(label.materialCode)}</span></div>
        <div class="label-row"><span>Description</span><span>${escapeHtml(clip(label.materialDescription, 42))}</span></div>
        <div class="label-row"><span>Quantity</span><span>${escapeHtml(`${label.currentQuantity} ${label.baseUoM || ""}`)}</span></div>
        <div class="label-row"><span>Batch</span><span>${escapeHtml(label.inwardBatchId)}</span></div>
        <div class="label-row"><span>Pallet</span><span>${escapeHtml(`${label.palletSequence} / ${label.palletCount}`)}</span></div>
        <div class="label-row"><span>DMR</span><span>${escapeHtml(label.dmrNumber)}</span></div>
        <div class="label-row"><span>DMR Date</span><span>${escapeHtml(toISTDate(label.dmrDate))}</span></div>
        <div class="label-row"><span>Make</span><span>${escapeHtml(label.make)}</span></div>
        <div class="label-row"><span>Vendor</span><span>${escapeHtml(label.vendorName)}</span></div>
        <div class="label-row"><span>Printed At</span><span>${escapeHtml(toIST(label.inwardPrintedAt))}</span></div>
        <div class="label-row"><span>Revision</span><span>${escapeHtml(label.revision || 1)}</span></div>
      </div>
      <div class="label-qr"><img src="${label.qrCodeData}" alt="QR Code" /></div>
      <div class="label-foot">Stick this label on the inward pallet and reprint the same stock label whenever the remaining balance changes.</div>
    </article>
  `;
}

function buildIssueLabelCard(issuance) {
  return `
    <article class="label-card">
      <div class="label-kicker">Issue To Production</div>
      <div class="label-id">${escapeHtml(issuance.issuanceId)}</div>
      <div class="label-meta">
        <div class="label-row"><span>Source Label</span><span>${escapeHtml(issuance.sourceLabelId || "—")}</span></div>
        <div class="label-row"><span>Material</span><span>${escapeHtml(issuance.materialCode)}</span></div>
        <div class="label-row"><span>Description</span><span>${escapeHtml(clip(issuance.materialDescription, 42))}</span></div>
        <div class="label-row"><span>Issued Qty</span><span>${escapeHtml(`${issuance.quantity} ${issuance.baseUoM || ""}`)}</span></div>
        <div class="label-row"><span>DMR</span><span>${escapeHtml(issuance.dmrNumber)}</span></div>
        <div class="label-row"><span>DMR Date</span><span>${escapeHtml(toISTDate(issuance.dmrDate))}</span></div>
        <div class="label-row"><span>Make</span><span>${escapeHtml(issuance.make || "—")}</span></div>
        <div class="label-row"><span>Vendor</span><span>${escapeHtml(issuance.vendorName || "—")}</span></div>
        <div class="label-row"><span>Issued At</span><span>${escapeHtml(toIST(issuance.issuedAt))}</span></div>
      </div>
      <div class="label-qr"><img src="${issuance.qrCodeData}" alt="QR Code" /></div>
      <div class="label-foot">Production receives against this issue QR. The source inward label stays as the stock record for any remaining balance.</div>
    </article>
  `;
}

function printStockLabels(labels, heading = "Stock Labels") {
  if (!Array.isArray(labels) || labels.length === 0) return;
  openPrintDocument(heading, labels.map((label) => buildStockLabelCard(label, heading)).join(""));
}

function printIssueLabels(issuances) {
  if (!Array.isArray(issuances) || issuances.length === 0) return;
  openPrintDocument("Issue Labels", issuances.map(buildIssueLabelCard).join(""));
}

function exportToXlsx(data, filename) {
  if (!Array.isArray(data) || data.length === 0) return false;

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");

  const keys = Object.keys(data[0] || {});
  ws["!cols"] = keys.map((key) => ({
    wch: Math.min(
      42,
      Math.max(
        key.length + 2,
        ...data.slice(0, 100).map((row) => String(row[key] ?? "").length + 2)
      )
    )
  }));

  XLSX.writeFile(wb, filename);
  return true;
}

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

function clip(value, size = 46) {
  const text = String(value || "");
  if (text.length <= size) return text || "—";
  return `${text.slice(0, size - 1)}…`;
}

function roleLabel(role) {
  return {
    stores: "Stores Operations",
    production: "Production Receipt",
    admin: "Administrator"
  }[role] || "Team Member";
}

function statusLabel(status) {
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : "Issued";
}

function pageWindow(page, limit, total) {
  if (!total) return { start: 0, end: 0 };
  const size = Number(limit) || 0;
  const currentPage = Number(page) || 1;
  return {
    start: (currentPage - 1) * size + 1,
    end: Math.min(currentPage * size, total)
  };
}

function parseScanTrace(scanText, source = "manual") {
  const raw = String(scanText || "").trim();
  if (!raw) {
    return {
      raw: "",
      lookupKey: "",
      source,
      format: "Empty input"
    };
  }

  let lookupKey = raw;
  let format = "Plain issuance ID";

  try {
    const parsed = JSON.parse(raw);
    lookupKey = String(
      parsed.issuanceId || parsed.id || parsed.lookupKey || raw
    ).trim();
    format = "Legacy JSON payload";
  } catch (e) {
    const prefixedMatch = raw.match(
      /^(?:MATGATE|MATGATE\||MG\|)\s*(MG-[A-Z0-9-]+)$/i
    );
    if (prefixedMatch) {
      lookupKey = prefixedMatch[1].toUpperCase();
      format = "Prefixed lookup text";
    }
  }

  if (/^mg-/i.test(lookupKey)) {
    lookupKey = lookupKey.toUpperCase();
  }

  return { raw, lookupKey, source, format };
}

function getQrLookupValue(issuance) {
  if (!issuance) return "—";
  return (
    issuance.qrLookupValue ||
    parseScanTrace(issuance.qrPayload || "", "stored").lookupKey ||
    issuance.issuanceId ||
    "—"
  );
}

const Icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  database: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  send: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  scan: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 6V1h-5M1 6V1h5M23 18v5h-5M1 18v5h5" />
      <line x1="1" y1="12" x2="23" y2="12" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  edit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  download: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  qr: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="2" width="8" height="8" rx="1" />
      <rect x="14" y="2" width="8" height="8" rx="1" />
      <rect x="2" y="14" width="8" height="8" rx="1" />
      <rect x="14" y="14" width="4" height="4" />
      <line x1="22" y1="14" x2="22" y2="14.01" />
      <line x1="22" y1="22" x2="22" y2="22.01" />
      <line x1="18" y1="22" x2="18" y2="22.01" />
      <line x1="22" y1="18" x2="22" y2="18.01" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  printer: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  ),
  eye: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  eyeOff: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C5 20 1 12 1 12a21.77 21.77 0 0 1 5.06-7.06" />
      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.69 21.69 0 0 1-3.22 4.84" />
      <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M20 8v6" />
      <path d="M23 11h-6" />
    </svg>
  ),
  spark: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3z" />
      <path d="M5 19l.8 2 .8-2 2-.8-2-.8L5 15l-.8 2.2-2 .8 2 .8L5 19z" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  layers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  arrowRight: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
};

function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (!("IntersectionObserver" in window)) {
      node.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            node.classList.add("is-visible");
            observer.unobserve(node);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -6% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={classNames("reveal", className)}
      style={{ "--delay": `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {toast.msg}
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={classNames("status-badge", `status-${status || "issued"}`)}>
      {statusLabel(status)}
    </span>
  );
}

function PageHero({ eyebrow, title, description, stats = [], actions, aside }) {
  return (
    <section className="workspace-header">
      <div className="workspace-main">
        <div className="workspace-head">
          <div className="workspace-title-block">
            {eyebrow && <div className="workspace-eyebrow">{eyebrow}</div>}
            <h1 className="workspace-title">{title}</h1>
            {description && <p className="workspace-caption">{description}</p>}
          </div>
          {actions && <div className="workspace-actions">{actions}</div>}
        </div>
        {aside && <div className="workspace-support">{aside}</div>}
      </div>
      {stats.length > 0 && (
        <div className="workspace-stats">
          {stats.map((stat) => (
            <div key={stat.label} className={classNames("workspace-stat", stat.tone)}>
              <span className="label">{stat.label}</span>
              <strong className="value">{stat.value}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SummaryGrid({ items }) {
  return (
    <div className="summary-grid">
      {items.map((item) => (
        <div key={item.label} className="summary-item">
          <div className="summary-label">{item.label}</div>
          <div className={classNames("summary-value", item.className)}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailRows({ items }) {
  return (
    <div className="detail-list">
      {items.map((item) => (
        <div key={item.label} className="detail-row">
          <span className="key">{item.label}</span>
          <span className={classNames("value", item.className)}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, copy }) {
  return (
    <div className="empty-state">
      <div>
        <h4>{title}</h4>
        <p>{copy}</p>
      </div>
    </div>
  );
}

function ActionDock({ children, className = "" }) {
  return <div className={classNames("action-dock", className)}>{children}</div>;
}

function PageSizeControl({ value, onChange, compact }) {
  return (
    <label className={classNames("page-size-control", compact && "compact")}>
      <span>Rows</span>
      <select
        value={value}
        aria-label="Rows per page"
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {[10, 25, 50, 100].map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </label>
  );
}

function getTutorialContent(page, role) {
  const walkthroughs = {
    dashboard: {
      stores: {
        title: "Stores walkthrough",
        copy: "Use the dashboard to start the next stock movement fast.",
        steps: [
          {
            title: "Start at inward",
            copy: "Every new arrival begins with stock labels.",
            action: "Open Inward, pick the material, enter quantity per pallet, pallet count, DMR date, make, and vendor.",
            check: "Confirm the pallet count matches the truck before printing.",
            outcome: "Each pallet gets one stock QR and becomes available for issue."
          },
          {
            title: "Issue from stock",
            copy: "Issue only from active inward labels.",
            action: "Open Issue, select the source labels, and enter full or partial quantities.",
            check: "If you split stock, make sure the issue quantity is lower than the available balance.",
            outcome: "Stores prints an issue QR and, when needed, a refreshed balance label."
          },
          {
            title: "Watch pending receipts",
            copy: "Stay on top of open handoffs.",
            action: "Use Recent or History to see which issue labels production has not accepted yet.",
            check: "Focus on long-open issues first.",
            outcome: "The queue stays clean and TAT stays accurate."
          }
        ]
      },
      production: {
        title: "Production walkthrough",
        copy: "Production works only on issue labels.",
        steps: [
          {
            title: "Open Receive",
            copy: "Start here when material reaches production.",
            action: "Open the Receive page as soon as an issue QR arrives at the line.",
            check: "Use the issue label, not the inward stock label.",
            outcome: "Production always acts on the correct movement record."
          },
          {
            title: "Scan first",
            copy: "Use the fastest lookup path.",
            action: "Open the camera for live scanning, or paste the QR text or issue ID if a scanner feeds another system.",
            check: "Make sure the resolved issue ID matches the label in hand.",
            outcome: "The correct issue opens with full trace details."
          },
          {
            title: "Confirm receipt",
            copy: "Close the movement cleanly.",
            action: "Review quantity, source label, vendor, and timestamps, then accept or reject.",
            check: "Reject only with remarks.",
            outcome: "Production acceptance updates the receipt timestamp and analytics."
          }
        ]
      },
      admin: {
        title: "Admin walkthrough",
        copy: "Admin can monitor the full flow from one view.",
        steps: [
          {
            title: "Read TAT first",
            copy: "Start with delay signals.",
            action: "Open the TAT cards and slowest movements to spot where the flow is slowing down.",
            check: "Separate stores delay from production delay.",
            outcome: "You know which team or step needs attention first."
          },
          {
            title: "Jump to the lane",
            copy: "Move directly to the blocked area.",
            action: "Use Inward, Issue, or Receive based on where the queue is building.",
            check: "Check pending issue age before changing priorities.",
            outcome: "Admins can intervene without losing traceability."
          },
          {
            title: "Audit exceptions",
            copy: "Use history only for detail work.",
            action: "Open History to inspect source labels, vendor details, remarks, and timestamps for any movement.",
            check: "Export only the filtered set you need.",
            outcome: "Audit and RCA stay focused and fast."
          }
        ]
      }
    },
    flow: {
      default: {
        title: "Flow guide",
        copy: "See the full operating flow from inward to receipt.",
        steps: [
          {
            title: "Stores creates stock",
            copy: "Inward is the start of traceability.",
            action: "Create one stock label per pallet when raw material arrives and stick the labels before any issue happens.",
            check: "Match the label count to the actual pallet count.",
            outcome: "Each pallet has a live stock identity."
          },
          {
            title: "Stores issues from stock",
            copy: "Issue uses existing stock labels.",
            action: "Select an active stock label and issue full or partial quantity to production.",
            check: "If only part of the stock moves, print the balance label and replace the old pallet label.",
            outcome: "The issue QR moves material and the stock label keeps the remaining balance."
          },
          {
            title: "Production closes the handoff",
            copy: "Receipt happens on the issue QR.",
            action: "Production scans the issue QR, verifies the trace, then accepts or rejects with remarks.",
            check: "Reject only when the physical handoff does not match the issue record.",
            outcome: "Receipt timestamps and TAT remain accurate."
          }
        ]
      }
    },
    masters: {
      default: {
        title: "Material master walkthrough",
        copy: "Keep material data clean so operators can move quickly.",
        steps: [
          {
            title: "Find the material",
            copy: "Narrow the list before you edit.",
            action: "Use search or filters to isolate the exact material or group you need.",
            check: "Avoid broad edits from the full list.",
            outcome: "You stay focused on the right records."
          },
          {
            title: "Edit or add",
            copy: "Update only what operations needs.",
            action: "Use Edit for existing materials or Add Material for a new code.",
            check: "Make sure type and UoM are correct before saving.",
            outcome: "Stores gets clean data in the operational screens."
          },
          {
            title: "Export with intent",
            copy: "Export only the working set.",
            action: "Use selected or filtered export when someone needs a controlled list.",
            check: "Apply filters before exporting large sets.",
            outcome: "Exports stay small and usable."
          }
        ]
      }
    },
    inward: {
      default: {
        title: "Inward workflow",
        copy: "Create stock labels as soon as the material arrives.",
        steps: [
          {
            title: "Find the material",
            copy: "Start with the right material record.",
            action: "Search by code or description and select the exact material.",
            check: "Confirm the UoM and description before moving on.",
            outcome: "The printed label uses the correct material snapshot."
          },
          {
            title: "Set the batch",
            copy: "Describe the arrival once.",
            action: "Enter quantity per pallet, number of pallets, DMR, DMR date, make, and vendor.",
            check: "Vendor should come from the list unless this is a new supplier.",
            outcome: "The whole truck or lot is ready to print in one run."
          },
          {
            title: "Print and stick",
            copy: "Create one label per pallet.",
            action: "Print the full batch and stick each label on the matching pallet immediately.",
            check: "Do not issue stock before the inward labels are on the pallets.",
            outcome: "Those labels become the stock source for later issue."
          }
        ]
      }
    },
    issue: {
      default: {
        title: "Issue workflow",
        copy: "Issue from active stock labels, not from free-text entry.",
        steps: [
          {
            title: "Choose source labels",
            copy: "Pick the pallets that should move.",
            action: "Search the active stock list and select the labels you want to issue.",
            check: "Pick only labels with live balance.",
            outcome: "The issue stays tied to the original inward pallet."
          },
          {
            title: "Set issue quantity",
            copy: "Full and partial issues both work.",
            action: "Leave the full quantity for a full pallet issue, or type a lower value for a split issue.",
            check: "Never exceed the available balance on the source label.",
            outcome: "Stores can issue exact demand without losing stock traceability."
          },
          {
            title: "Print issue and balance labels",
            copy: "Create the movement record and refresh stock.",
            action: "Print the issue QR for production and reprint the inward label if a balance remains.",
            check: "Replace the old pallet label with the new balance print.",
            outcome: "Production gets a clean issue QR and stores keeps an accurate stock label."
          }
        ]
      }
    },
    scan: {
      default: {
        title: "Receive workflow",
        copy: "Receive against the issue QR and confirm the handoff.",
        steps: [
          {
            title: "Resolve the issue",
            copy: "Open the right record first.",
            action: "Use the camera for a live scan or paste the issue ID or QR text for manual lookup.",
            check: "Make sure the resolved issue matches the label in front of you.",
            outcome: "Production is looking at the correct movement."
          },
          {
            title: "Verify the trace",
            copy: "Review before accepting.",
            action: "Check material, quantity, source stock label, vendor, and timestamps on the resolved record.",
            check: "Stop if the scan key and resolved issue do not line up.",
            outcome: "Receipt decisions are based on the full trace."
          },
          {
            title: "Accept or reject",
            copy: "Close the movement properly.",
            action: "Accept to mark receipt, or reject with remarks if the movement is invalid.",
            check: "Remarks are required for rejection.",
            outcome: "The production timestamp feeds history and TAT."
          }
        ]
      }
    },
    history: {
      default: {
        title: "History walkthrough",
        copy: "History is for audit, trace, and export.",
        steps: [
          {
            title: "Filter first",
            copy: "Start with a narrow result set.",
            action: "Search by issue ID, source label, material, vendor, or DMR, then add status or date filters.",
            check: "Use the smallest filter set that answers the question.",
            outcome: "The audit view stays fast and readable."
          },
          {
            title: "Inspect one movement",
            copy: "Open only the rows that matter.",
            action: "View a row to see the issue QR, source label, timestamps, remarks, and TAT.",
            check: "Focus on source label and timestamps for disputes.",
            outcome: "You can explain exactly what happened and when."
          },
          {
            title: "Export the answer",
            copy: "Export only what you need.",
            action: "Adjust rows, move through pages, select records, and export the final audit set.",
            check: "Export the filtered set instead of the full history when possible.",
            outcome: "Teams get a concise report with IST timestamps."
          }
        ]
      }
    }
  };

  const pageContent = walkthroughs[page];
  if (!pageContent) return null;
  return pageContent[role] || pageContent.default || null;
}

function WalkthroughModal({ tutorial, page, onClose, onDisable }) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    setStepIndex(0);
  }, [page, tutorial?.title]);

  if (!tutorial) return null;

  const step = tutorial.steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === tutorial.steps.length - 1;

  return (
    <Modal title={tutorial.title} onClose={onClose} large>
      <div className="modal-body stack walkthrough-modal-body">
        <section className="walkthrough-summary">
          <div className="workspace-eyebrow">
            {Icons.spark}
            Guided Walkthrough
          </div>
          <h4>{tutorial.copy}</h4>
          <div className="walkthrough-progress">
            {tutorial.steps.map((item, index) => (
              <span
                key={item.title}
                className={classNames(index === stepIndex && "active")}
              >
                {String(index + 1).padStart(2, "0")} {item.title}
              </span>
            ))}
          </div>
        </section>

        <div className="walkthrough-shell">
          <aside className="walkthrough-sidebar">
            {tutorial.steps.map((item, index) => (
              <button
                key={item.title}
                type="button"
                className={classNames("walkthrough-nav-item", index === stepIndex && "active")}
                onClick={() => setStepIndex(index)}
              >
                <span className="walkthrough-nav-index mono">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.copy}</p>
                </div>
              </button>
            ))}
          </aside>

          <section className="walkthrough-stage">
            <div className="walkthrough-stage-head">
              <span className="walkthrough-stage-count">
                Step {stepIndex + 1} of {tutorial.steps.length}
              </span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </div>

            <div className="walkthrough-card-grid">
              <article className="walkthrough-detail-card">
                <span>Do</span>
                <strong>{step.action}</strong>
              </article>
              <article className="walkthrough-detail-card">
                <span>Check</span>
                <strong>{step.check}</strong>
              </article>
              <article className="walkthrough-detail-card">
                <span>Result</span>
                <strong>{step.outcome}</strong>
              </article>
            </div>
          </section>
        </div>
      </div>

      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onDisable}>
          {Icons.close}
          Hide Guide
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
          disabled={isFirst}
        >
          Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            if (isLast) onClose();
            else setStepIndex((current) => Math.min(tutorial.steps.length - 1, current + 1));
          }}
        >
          {isLast ? "Done" : "Next"}
        </button>
      </div>
    </Modal>
  );
}

function TutorialPanel({ page }) {
  const { user, tutorialMode, setTutorialMode } = useContext(AppContext);
  const tutorial = getTutorialContent(page, user.role);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [page, tutorial?.title]);

  useEffect(() => {
    if (!tutorialMode || !tutorial) {
      setOpen(false);
      return;
    }

    let shouldAutoOpen = true;

    try {
      const key = `mg_walkthrough_seen_${user.role}_${page}`;
      shouldAutoOpen = sessionStorage.getItem(key) !== "1";
      if (shouldAutoOpen) sessionStorage.setItem(key, "1");
    } catch (e) {}

    if (shouldAutoOpen) setOpen(true);
  }, [page, tutorial, tutorialMode, user.role]);

  if (!tutorialMode || !tutorial) return null;

  return (
    <>
      <Reveal delay={50}>
        <section className="tutorial-rail">
          <div className="tutorial-rail-copy">
            <div className="workspace-eyebrow">
              {Icons.spark}
              Guided Walkthrough
            </div>
            <strong>{tutorial.title}</strong>
            <span>{tutorial.steps.length} steps for this screen.</span>
          </div>

          <div className="tutorial-rail-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setOpen(true)}
            >
              {Icons.spark}
              Open Walkthrough
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setTutorialMode(false)}
            >
              {Icons.close}
              Hide Guide
            </button>
          </div>
        </section>
      </Reveal>

      {open && (
        <WalkthroughModal
          tutorial={tutorial}
          page={page}
          onClose={() => setOpen(false)}
          onDisable={() => {
            setTutorialMode(false);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  const presets = [
    {
      role: "Stores",
      username: "stores",
      password: "stores123",
      copy: "Inward, issue, queue"
    },
    {
      role: "Production",
      username: "production",
      password: "prod123",
      copy: "Scan, verify, accept"
    },
    {
      role: "Admin",
      username: "admin",
      password: "admin123",
      copy: "Monitor, audit, TAT"
    }
  ];

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });

      localStorage.setItem("mg_token", data.token);
      localStorage.setItem("mg_user", JSON.stringify(data.user));
      onLogin(data.user);
    } catch (e) {
      setError(e.message);
    }

    setLoading(false);
  };

  return (
    <div className="login-shell">
      <Reveal>
        <div className="login-card">
          <section className="login-panel login-form-panel">
            <div className="login-form-head">
              <h1>MatGate</h1>
              <p>Operations sign in</p>
            </div>

            <form className="stack login-form" onSubmit={handleSubmit}>
              <div className="field">
                <label>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Enter your username"
                  autoFocus
                  required
                />
              </div>

              <div className="field">
                <label>Password</label>
                <div className="password-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? Icons.eyeOff : Icons.eye}
                  </button>
                </div>
              </div>

              {error && <div className="login-error">{error}</div>}

              <button className="btn btn-login btn-full" type="submit" disabled={loading}>
                {Icons.arrowRight}
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </section>

          <aside className="login-panel login-demo-panel">
            <div className="login-demo-head">
              <div className="login-demo-title">
                {Icons.users}
                <h2>Demo access</h2>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowCredentials((current) => !current)}
              >
                {showCredentials ? "Hide Credentials" : "Show Credentials"}
              </button>
            </div>

            {!showCredentials ? (
              <div className="login-demo-empty">
                Open demo access to autofill a role.
              </div>
            ) : (
              <div className="credential-grid">
                {presets.map((preset) => (
                  <button
                    key={preset.role}
                    type="button"
                    className="credential-card"
                    onClick={() => {
                      setUsername(preset.username);
                      setPassword(preset.password);
                    }}
                  >
                    <div className="credential-card-head">
                      <div className="role">{preset.role}</div>
                      <div className="credential-action">
                        Use Profile
                        {Icons.arrowRight}
                      </div>
                    </div>
                    <div className="credential-copy">{preset.copy}</div>
                    <div className="credential-pair">
                      <span>Username</span>
                      <strong className="credential-meta mono">{preset.username}</strong>
                    </div>
                    <div className="credential-pair">
                      <span>Password</span>
                      <strong className="credential-meta mono">{preset.password}</strong>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </aside>
        </div>
      </Reveal>
    </div>
  );
}

function Modal({ title, onClose, children, large }) {
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={classNames("modal", large && "modal-lg")}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button type="button" className="btn btn-secondary btn-icon" onClick={onClose}>
            {Icons.close}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MaterialAutocomplete({ value, onChange, onSelect }) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [show, setShow] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setShow(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const data = await api(`/api/materials/search?q=${encodeURIComponent(query.trim())}`);
        if (!cancelled) {
          setResults(data || []);
          setShow(true);
        }
      } catch (e) {
        if (!cancelled) {
          setResults([]);
          setShow(true);
        }
      }
      if (!cancelled) setLoading(false);
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setShow(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const pick = (material) => {
    setQuery(material.materialCode);
    setShow(false);
    setHighlighted(-1);
    onSelect(material);
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((current) => Math.min(current + 1, results.length - 1));
      setShow(true);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && highlighted >= 0 && results[highlighted]) {
      event.preventDefault();
      pick(results[highlighted]);
    } else if (event.key === "Escape") {
      setShow(false);
    }
  };

  return (
    <div className="autocomplete" ref={ref}>
      <input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setHighlighted(-1);
          onChange(event.target.value);
        }}
        onFocus={() => query.trim().length >= 2 && setShow(true)}
        onKeyDown={handleKeyDown}
        placeholder="Type material code or description"
      />

      {show && (
        <div className="autocomplete-panel">
          {loading ? (
            <div className="autocomplete-empty">Searching material master...</div>
          ) : results.length > 0 ? (
            results.map((material, index) => (
              <div
                key={material._id}
                className={classNames(
                  "autocomplete-item",
                  index === highlighted && "highlighted"
                )}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => pick(material)}
              >
                <div className="code">{material.materialCode}</div>
                <div className="desc">{material.materialDescription || "No description"}</div>
              </div>
            ))
          ) : (
            <div className="autocomplete-empty">No matching material found.</div>
          )}
        </div>
      )}
    </div>
  );
}

function Dashboard() {
  const { user, navigate } = useContext(AppContext);
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [recent, setRecent] = useState([]);
  const [recentPage, setRecentPage] = useState(1);
  const [recentPages, setRecentPages] = useState(1);
  const [recentLimit, setRecentLimit] = useState(10);
  const [recentTotal, setRecentTotal] = useState(0);

  useEffect(() => {
    setRecentPage(1);
  }, [recentLimit]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const requests = [
          api("/api/issuances/stats"),
          api(`/api/issuances?page=${recentPage}&limit=${recentLimit}`)
        ];

        if (user.role === "admin") {
          requests.push(api("/api/issuances/analytics"));
        }

        const [statsData, recentData, analyticsData] = await Promise.all(requests);

        if (!cancelled) {
          setStats(statsData);
          setRecent(recentData.issuances || []);
          setRecentPages(recentData.pages || 1);
          setRecentTotal(recentData.total || 0);
          setAnalytics(analyticsData || null);
        }
      } catch (e) {
        if (!cancelled) {
          setStats(null);
          setAnalytics(null);
          setRecent([]);
          setRecentPages(1);
          setRecentTotal(0);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [recentPage, recentLimit, user.role]);

  const quickActions = [
    {
      key: "flow",
      label: "Flow Guide",
      icon: Icons.spark,
      roles: ["stores", "production", "admin"]
    },
    {
      key: "inward",
      label: "Inward Labels",
      icon: Icons.layers,
      roles: ["stores", "admin"]
    },
    {
      key: "issue",
      label: "Issue Stock",
      icon: Icons.send,
      roles: ["stores", "admin"]
    },
    {
      key: "scan",
      label: "Receive Material",
      icon: Icons.scan,
      roles: ["production", "admin"]
    },
    {
      key: "history",
      label: "Review History",
      icon: Icons.history,
      roles: ["stores", "production", "admin"]
    }
  ].filter((action) => action.roles.includes(user.role));

  const heroStats =
    user.role === "production"
      ? [
          { label: "Pending Receipt", value: stats?.issued ?? "—", tone: "warning" },
          { label: "Accepted Today", value: stats?.acceptedTodayCount ?? "—", tone: "success" },
          { label: "Issued Today", value: stats?.issuedTodayCount ?? "—", tone: "primary" },
          { label: "Rejected", value: stats?.rejected ?? "—", tone: "danger" }
        ]
      : [
          { label: "Active Labels", value: stats?.activeLabels ?? "—", tone: "primary" },
          { label: "Available Qty", value: stats?.availableQuantity ?? "—", tone: "success" },
          { label: "Pending Receipt", value: stats?.issued ?? "—", tone: "warning" },
          { label: "Inward Today", value: stats?.inwardTodayCount ?? "—", tone: "danger" }
        ];

  const actionCards = quickActions.map((action) => ({
    ...action,
    copy:
      {
        flow: "See the full operating model",
        inward: "Print pallet labels",
        issue: "Issue from stock",
        scan: "Receive issue QRs",
        history: "Search movement records"
      }[action.key] || ""
  }));

  const recentWindow = pageWindow(recentPage, recentLimit, recentTotal);
  const analyticsCards = analytics?.summary
    ? [
        {
          label: "Avg Inward to Issue",
          value: toTatLabel(analytics.summary.avgInwardToIssueMinutes)
        },
        {
          label: "Avg Issue to Accept",
          value: toTatLabel(analytics.summary.avgIssueToReceiveMinutes)
        },
        {
          label: "Avg End to End",
          value: toTatLabel(analytics.summary.avgInwardToReceiveMinutes)
        },
        {
          label: "Pending Avg Age",
          value: toTatLabel(analytics.summary.pendingReceiptAvgAgeMinutes)
        }
      ]
    : [];

  return (
    <div className="page-stack">
      <Reveal>
        <PageHero
          eyebrow={
            <>
              {Icons.dashboard}
              Overview
            </>
          }
          title="Operations dashboard"
          description="Start the next task."
          actions={
            <>
              {quickActions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  className={classNames(
                    "btn",
                    action.key === "flow" ? "btn-primary" : "btn-secondary"
                  )}
                  onClick={() => navigate(action.key)}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </>
          }
          stats={heroStats}
          aside={
            <div className="workflow-step compact">
              <span className="step-label">Lane</span>
              <strong>{roleLabel(user.role)}</strong>
              <p>{user.name}</p>
            </div>
          }
        />
      </Reveal>

      <TutorialPanel page="dashboard" />

      {user.role === "admin" && analytics && (
        <div className="split-grid">
          <Reveal delay={125}>
            <section className="surface-card">
              <div className="surface-header">
                <div className="surface-title">
                  <h3>TAT Summary</h3>
                </div>
              </div>
              <div className="surface-body stack">
                <SummaryGrid
                  items={analyticsCards.map((item) => ({
                    label: item.label,
                    value: item.value
                  }))}
                />
              </div>
            </section>
          </Reveal>

          <Reveal delay={165}>
            <section className="surface-card alt">
              <div className="surface-header">
                <div className="surface-title">
                  <h3>Open Bottlenecks</h3>
                </div>
              </div>
              <div className="surface-body stack">
                {analytics.oldestPending?.length ? (
                  <div className="record-list">
                    {analytics.oldestPending.map((item) => (
                      <article key={item._id} className="record-card compact">
                        <div className="record-card-head">
                          <div>
                            <div className="record-card-kicker">Pending Issue</div>
                            <div className="record-card-title mono">{item.issuanceId}</div>
                          </div>
                          <StatusBadge status={item.status} />
                        </div>
                        <div className="record-card-copy">
                          <strong>{item.materialCode}</strong>
                          <span>{item.sourceLabelId || "No source label"}</span>
                        </div>
                        <div className="record-card-grid">
                          <div className="record-field">
                            <span>Pending Age</span>
                            <strong>{toTatLabel(item.pendingReceiptAgeMinutes)}</strong>
                          </div>
                          <div className="record-field">
                            <span>Vendor</span>
                            <strong>{item.vendorName || "—"}</strong>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No pending bottlenecks"
                    copy="Nothing is waiting."
                  />
                )}
              </div>
            </section>
          </Reveal>
        </div>
      )}

      {user.role === "admin" && analytics && (
        <Reveal delay={205}>
          <section className="surface-card">
            <div className="surface-header">
              <div className="surface-title">
                <h3>Slowest Accepted Movements</h3>
              </div>
            </div>
            <div className="table-wrap desktop-only">
              <table>
                <thead>
                  <tr>
                    <th>Issue ID</th>
                    <th>Source Label</th>
                    <th>Material</th>
                    <th>Vendor</th>
                    <th>Inward to Issue</th>
                    <th>Issue to Accept</th>
                    <th>Total TAT</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.slowestAccepted.length === 0 ? (
                    <tr>
                      <td colSpan="7">
                        <EmptyState
                          title="No accepted movements yet"
                          copy="Accepted movements will appear here."
                        />
                      </td>
                    </tr>
                  ) : (
                    analytics.slowestAccepted.map((item) => {
                      const tat = getIssuanceTat(item);
                      return (
                        <tr key={item._id}>
                          <td className="mono">{item.issuanceId}</td>
                          <td className="mono">{item.sourceLabelId || "—"}</td>
                          <td>{item.materialCode}</td>
                          <td>{item.vendorName || "—"}</td>
                          <td>{toTatLabel(tat.inwardToIssueMinutes)}</td>
                          <td>{toTatLabel(tat.issueToReceiveMinutes)}</td>
                          <td>{toTatLabel(tat.inwardToReceiveMinutes)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="surface-body mobile-only">
              {analytics.slowestAccepted.length === 0 ? (
                <EmptyState
                  title="No accepted movements yet"
                  copy="Accepted movements will appear here."
                />
              ) : (
                <div className="record-list">
                  {analytics.slowestAccepted.map((item) => {
                    const tat = getIssuanceTat(item);
                    return (
                      <article key={item._id} className="record-card compact">
                        <div className="record-card-head">
                          <div>
                            <div className="record-card-kicker">Accepted Movement</div>
                            <div className="record-card-title mono">{item.issuanceId}</div>
                          </div>
                          <strong>{toTatLabel(tat.inwardToReceiveMinutes)}</strong>
                        </div>
                        <div className="record-card-copy">
                          <strong>{item.materialCode}</strong>
                          <span>{item.sourceLabelId || "—"}</span>
                        </div>
                        <div className="record-card-grid">
                          <div className="record-field">
                            <span>Inward to Issue</span>
                            <strong>{toTatLabel(tat.inwardToIssueMinutes)}</strong>
                          </div>
                          <div className="record-field">
                            <span>Issue to Accept</span>
                            <strong>{toTatLabel(tat.issueToReceiveMinutes)}</strong>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </Reveal>
      )}

      <div className="split-grid">
        <Reveal delay={140}>
          <section className="surface-card alt">
            <div className="surface-header">
              <div className="surface-title">
                <h3>Start</h3>
              </div>
            </div>
            <div className="surface-body stack">
              <div className="workflow-grid">
                {actionCards.map((action) => (
                  <div key={action.key} className="workflow-card">
                    <div className="workflow-icon">{action.icon}</div>
                    <h4 className="workflow-title">{action.label}</h4>
                    {action.copy ? <p className="workflow-copy">{action.copy}</p> : null}
                    <button
                      type="button"
                      className={classNames(
                        "btn",
                        action.key === "flow" ? "btn-primary" : "btn-secondary",
                        "btn-sm"
                      )}
                      onClick={() => navigate(action.key)}
                    >
                      Open
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal delay={190}>
          <section className="surface-card">
            <div className="surface-header">
              <div className="surface-title">
                <h3>Recent</h3>
              </div>
              <div className="surface-tools">
                <PageSizeControl
                  value={recentLimit}
                  onChange={setRecentLimit}
                  compact
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate("history")}
                >
                  {Icons.history}
                  Open History
                </button>
              </div>
            </div>

            <div className="table-wrap desktop-only">
              <table>
                <thead>
                  <tr>
                    <th>Issue ID</th>
                    <th>Source Label</th>
                    <th>Material</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Issued At</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 ? (
                    <tr>
                      <td colSpan="6">
                        <EmptyState
                          title="No movements yet"
                          copy="Issue stock to start activity."
                        />
                      </td>
                    </tr>
                  ) : (
                    recent.map((item) => (
                      <tr key={item._id}>
                        <td className="mono" style={{ color: "var(--primary)", fontWeight: 700 }}>
                          {item.issuanceId}
                        </td>
                        <td className="mono">{item.sourceLabelId || "—"}</td>
                        <td>
                          <div style={{ fontWeight: 700, color: "var(--ink)" }}>
                            {item.materialCode}
                          </div>
                          <div className="muted">{clip(item.materialDescription, 48)}</div>
                        </td>
                        <td className="mono">
                          {item.quantity} {item.baseUoM}
                        </td>
                        <td>
                          <StatusBadge status={item.status} />
                        </td>
                        <td>{toIST(item.issuedAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="surface-body mobile-only">
              {recent.length === 0 ? (
                <EmptyState
                  title="No movements yet"
                  copy="Issue stock to start activity."
                />
              ) : (
                <div className="record-list">
                  {recent.map((item) => (
                    <article key={item._id} className="record-card">
                      <div className="record-card-head">
                        <div>
                          <div className="record-card-kicker">Issue</div>
                          <div className="record-card-title mono">{item.issuanceId}</div>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                      <div className="record-card-copy">
                        <strong>{item.materialCode}</strong>
                        <span>{item.sourceLabelId || clip(item.materialDescription, 64)}</span>
                      </div>
                      <div className="record-card-grid">
                        <div className="record-field">
                          <span>Source Label</span>
                          <strong className="mono">{item.sourceLabelId || "—"}</strong>
                        </div>
                        <div className="record-field">
                          <span>Quantity</span>
                          <strong className="mono">
                            {item.quantity} {item.baseUoM}
                          </strong>
                        </div>
                        <div className="record-field">
                          <span>Issued At</span>
                          <strong>{toIST(item.issuedAt)}</strong>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="table-footer compact">
              <div className="muted">
                Showing {recentWindow.start} to {recentWindow.end} of {recentTotal}
              </div>
              <div className="pagination">
                <button
                  type="button"
                  className="btn btn-secondary btn-compact"
                  disabled={recentPage <= 1}
                  onClick={() => setRecentPage(1)}
                >
                  «
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-compact"
                  disabled={recentPage <= 1}
                  onClick={() => setRecentPage((current) => current - 1)}
                >
                  ‹
                </button>
                <div className="page-index mono">
                  {recentPage} / {recentPages}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-compact"
                  disabled={recentPage >= recentPages}
                  onClick={() => setRecentPage((current) => current + 1)}
                >
                  ›
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-compact"
                  disabled={recentPage >= recentPages}
                  onClick={() => setRecentPage(recentPages)}
                >
                  »
                </button>
              </div>
            </div>
          </section>
        </Reveal>
      </div>
    </div>
  );
}

function FlowGuide() {
  const { navigate, user } = useContext(AppContext);

  const stages = [
    {
      step: "01",
      icon: Icons.layers,
      owner: "Stores",
      title: "Inward",
      copy: "Create one stock label per pallet as soon as raw material arrives."
    },
    {
      step: "02",
      icon: Icons.send,
      owner: "Stores",
      title: "Issue",
      copy: "Issue full or partial quantity from an active stock label."
    },
    {
      step: "03",
      icon: Icons.scan,
      owner: "Production",
      title: "Receive",
      copy: "Production scans the issue QR and accepts or rejects the handoff."
    },
    {
      step: "04",
      icon: Icons.history,
      owner: "Admin",
      title: "Audit",
      copy: "History and TAT show what moved, who touched it, and where delays happened."
    }
  ];

  const teamLanes = [
    {
      title: "Stores team",
      icon: Icons.layers,
      steps: [
        "Create inward labels for every arriving pallet.",
        "Stick the stock label on the pallet before any issue.",
        "Issue from active stock labels only.",
        "If the issue is partial, print the balance label and replace the old pallet label."
      ]
    },
    {
      title: "Production team",
      icon: Icons.scan,
      steps: [
        "Scan the issue QR, not the inward stock label.",
        "Verify source label, quantity, vendor, and timestamps.",
        "Accept to close the movement.",
        "Reject only with remarks when the physical handoff is invalid."
      ]
    },
    {
      title: "Admin team",
      icon: Icons.history,
      steps: [
        "Monitor active stock, pending receipts, and acceptance flow.",
        "Use history for trace, remarks, and exports.",
        "Use TAT to spot stores delay versus production delay.",
        "Review the slowest and oldest open movements first."
      ]
    }
  ];

  const nextActions = [
    { key: "inward", label: "Open Inward", roles: ["stores", "admin"] },
    { key: "issue", label: "Open Issue", roles: ["stores", "admin"] },
    { key: "scan", label: "Open Receive", roles: ["production", "admin"] },
    { key: "history", label: "Open History", roles: ["stores", "production", "admin"] }
  ].filter((item) => item.roles.includes(user.role));

  return (
    <div className="page-stack">
      <Reveal>
        <PageHero
          eyebrow={
            <>
              {Icons.spark}
              Shared Guide
            </>
          }
          title="How MatGate works"
          description="Shared operating flow for stores, production, and admin."
          actions={
            <>
              {nextActions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  className={classNames("btn", action.key === "inward" ? "btn-primary" : "btn-secondary")}
                  onClick={() => navigate(action.key)}
                >
                  {action.label}
                </button>
              ))}
            </>
          }
          stats={[
            { label: "Start", value: "Inward labels", tone: "primary" },
            { label: "Split", value: "Full or partial issue", tone: "warning" },
            { label: "Close", value: "Production receipt", tone: "success" },
            { label: "Audit", value: "History + TAT", tone: "danger" }
          ]}
        />
      </Reveal>

      <TutorialPanel page="flow" />

      <Reveal delay={90}>
        <section className="surface-card">
          <div className="surface-header">
            <div className="surface-title">
              <h3>End-to-end flow</h3>
              <p>Every team sees the same sequence.</p>
            </div>
          </div>
          <div className="surface-body">
            <div className="guide-step-grid">
              {stages.map((stage) => (
                <article key={stage.step} className="guide-step-card">
                  <div className="guide-step-top">
                    <span className="guide-step-index mono">{stage.step}</span>
                    <div className="workflow-icon">{stage.icon}</div>
                  </div>
                  <div className="guide-step-owner">{stage.owner}</div>
                  <h4>{stage.title}</h4>
                  <p>{stage.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal delay={130}>
        <section className="surface-card alt">
          <div className="surface-header">
            <div className="surface-title">
              <h3>What each team does</h3>
              <p>Use this as the standard operating flow.</p>
            </div>
          </div>
          <div className="surface-body">
            <div className="guide-lane-grid">
              {teamLanes.map((lane) => (
                <article key={lane.title} className="guide-lane-card">
                  <div className="guide-lane-head">
                    <div className="workflow-icon">{lane.icon}</div>
                    <h4>{lane.title}</h4>
                  </div>
                  <div className="guide-step-list">
                    {lane.steps.map((step, index) => (
                      <div key={step} className="guide-step-row">
                        <span className="guide-step-dot mono">{String(index + 1).padStart(2, "0")}</span>
                        <p>{step}</p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      <div className="detail-grid">
        <Reveal delay={170}>
          <section className="surface-card">
            <div className="surface-header">
              <div className="surface-title">
                <h3>Partial issue example</h3>
                <p>What happens when inward `100` and issue `50`.</p>
              </div>
            </div>
            <div className="surface-body stack">
              <div className="guide-step-grid guide-step-grid-example">
                <article className="guide-step-card compact">
                  <div className="guide-step-owner">Inward</div>
                  <h4>Stock label created</h4>
                  <p>`STK-...` starts with `100` available.</p>
                </article>
                <article className="guide-step-card compact">
                  <div className="guide-step-owner">Issue</div>
                  <h4>Issue QR created</h4>
                  <p>A new issue QR is created for `50`.</p>
                </article>
                <article className="guide-step-card compact">
                  <div className="guide-step-owner">Balance</div>
                  <h4>Same stock label reprinted</h4>
                  <p>The stock label stays the same ID, updates to `50`, and gets a higher revision.</p>
                </article>
              </div>

              <DetailRows
                items={[
                  { label: "System update", value: "Original stock record updates from 100 to 50" },
                  { label: "What gets printed", value: "1 issue QR + 1 balance stock label" },
                  { label: "What stores replaces", value: "The old pallet label is replaced with the balance reprint" },
                  { label: "If issued in full", value: "The stock label becomes depleted and no balance label is printed" }
                ]}
              />
            </div>
          </section>
        </Reveal>

        <Reveal delay={210}>
          <section className="surface-card alt">
            <div className="surface-header">
              <div className="surface-title">
                <h3>What the system records</h3>
                <p>These timestamps feed history and analytics.</p>
              </div>
            </div>
            <div className="surface-body stack">
              <SummaryGrid
                items={[
                  { label: "Inward printed", value: "Stores prints the stock label" },
                  { label: "Issued", value: "Stores creates the issue QR" },
                  { label: "Accepted", value: "Production confirms receipt" },
                  { label: "TAT", value: "Admin sees inward-to-issue, issue-to-accept, and total" }
                ]}
              />
              <DetailRows
                items={[
                  { label: "Inward inputs", value: "Material, quantity per pallet, pallet count, DMR, DMR date, make, and vendor" },
                  { label: "Timezone", value: "Operational print, issue, and receipt timestamps are shown in IST" },
                  { label: "Admin view", value: "Analytics show open queues, slowest movements, and full end-to-end TAT" }
                ]}
              />
            </div>
          </section>
        </Reveal>
      </div>
    </div>
  );
}

function MaterialMaster() {
  const { toast } = useContext(AppContext);
  const [materials, setMaterials] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    materialType: "",
    materialGroup: "",
    baseUoM: ""
  });
  const [filterOpts, setFilterOpts] = useState({
    materialTypes: [],
    materialGroups: [],
    baseUoMs: []
  });
  const [sortBy, setSortBy] = useState("materialCode");
  const [sortDir, setSortDir] = useState("asc");
  const [selected, setSelected] = useState(new Set());
  const [editModal, setEditModal] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadFilters() {
      try {
        const data = await api("/api/materials/filters");
        if (!cancelled) setFilterOpts(data);
      } catch (e) {}
    }

    loadFilters();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, filters.materialType, filters.materialGroup, filters.baseUoM, pageSize]);

  useEffect(() => {
    let cancelled = false;

    async function loadMaterials() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page,
          limit: pageSize,
          search,
          sortBy,
          sortDir
        });

        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.set(key, value);
        });

        const data = await api(`/api/materials?${params.toString()}`);
        if (!cancelled) {
          setMaterials(data.materials || []);
          setTotal(data.total || 0);
          setPages(data.pages || 1);
          setPageSize(data.limit || pageSize);
          setSelected(new Set());
        }
      } catch (e) {
        if (!cancelled) toast(e.message, "error");
      }
      if (!cancelled) setLoading(false);
    }

    loadMaterials();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, search, filters, sortBy, sortDir, toast]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir((value) => (value === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this material from active use?")) return;

    try {
      await api(`/api/materials/${id}`, { method: "DELETE" });
      toast("Material archived from the master list.", "success");
      setMaterials((current) => current.filter((item) => item._id !== id));
      setTotal((current) => Math.max(0, current - 1));
      setSelected((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const handleExport = async (mode) => {
    try {
      let data = [];

      if (mode === "selected") {
        data = materials.filter((item) => selected.has(item._id));
      } else {
        const params = new URLSearchParams();
        if (mode === "filtered") {
          if (search) params.set("search", search);
          Object.entries(filters).forEach(([key, value]) => {
            if (value) params.set(key, value);
          });
        }
        data = await api(`/api/materials/export${params.toString() ? `?${params.toString()}` : ""}`);
      }

      const clean = (data || []).map((item) => ({
        "Material Code": item.materialCode,
        "Material Type": item.materialType,
        "Base UoM": item.baseUoM,
        "Material Group": item.materialGroup,
        Description: item.materialDescription
      }));

      if (!exportToXlsx(clean, `MatGate_Materials_${new Date().toISOString().slice(0, 10)}.xlsx`)) {
        toast("No material rows available to export.", "info");
        return;
      }

      toast(`Exported ${clean.length} material rows.`, "success");
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const handleSave = async (formData) => {
    try {
      if (editModal && editModal._id) {
        await api(`/api/materials/${editModal._id}`, {
          method: "PUT",
          body: JSON.stringify(formData)
        });
        toast("Material updated.", "success");
      } else {
        await api("/api/materials", {
          method: "POST",
          body: JSON.stringify(formData)
        });
        toast("Material created.", "success");
      }
      setEditModal(null);
      setPage(1);
      setSearch("");
      setFilters({ materialType: "", materialGroup: "", baseUoM: "" });
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const allVisibleSelected = materials.length > 0 && selected.size === materials.length;
  const visibleWindow = pageWindow(page, pageSize, total);

  const heroStats = [
    { label: "Active Materials", value: total, tone: "primary" },
    { label: "Visible Rows", value: materials.length, tone: "success" },
    { label: "Selected", value: selected.size, tone: "warning" },
    { label: "Filters", value: activeFilterCount || 0, tone: "danger" }
  ];

  const SortArrow = ({ column }) => {
    if (sortBy !== column) return <span className="sort-arrow">↕</span>;
    return <span className="sort-arrow active">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div className="page-stack">
      <Reveal>
        <PageHero
          eyebrow={
            <>
              {Icons.database}
              Records
            </>
          }
          title="Material master"
          description="Maintain material data."
          actions={
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setEditModal("new")}
              >
                {Icons.plus}
                Add Material
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleExport("filtered")}
                disabled={!search && !activeFilterCount}
              >
                {Icons.download}
                Export Filtered
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleExport("all")}
              >
                {Icons.download}
                Export All
              </button>
            </>
          }
          stats={heroStats}
        />
      </Reveal>

      <TutorialPanel page="masters" />

      <Reveal delay={90}>
        <section className="surface-card">
          <div className="toolbar">
            <div className="toolbar-row">
              <div className="search-box">
                {Icons.search}
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search code or description"
                />
              </div>

              <select
                className="filter-select"
                value={filters.materialType}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    materialType: event.target.value
                  }))
                }
              >
                <option value="">All Types</option>
                {filterOpts.materialTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <select
                className="filter-select"
                value={filters.materialGroup}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    materialGroup: event.target.value
                  }))
                }
              >
                <option value="">All Groups</option>
                {filterOpts.materialGroups.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <select
                className="filter-select"
                value={filters.baseUoM}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    baseUoM: event.target.value
                  }))
                }
              >
                <option value="">All UoM</option>
                {filterOpts.baseUoMs.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="toolbar-row">
              <div className="kpi-strip">
                <span className="kpi-pill">{total.toLocaleString()} total rows</span>
                <span className="kpi-pill">{materials.length} visible</span>
                <span className="kpi-pill">{selected.size} selected</span>
                {activeFilterCount > 0 && (
                  <span className="kpi-pill">{activeFilterCount} active filters</span>
                )}
              </div>

              <div className="toolbar-actions">
                <PageSizeControl value={pageSize} onChange={setPageSize} compact />
                {selected.size > 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleExport("selected")}
                  >
                    {Icons.download}
                    Export Selected
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="table-wrap desktop-only">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 38 }}>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={allVisibleSelected}
                      onChange={(event) =>
                        setSelected(
                          event.target.checked
                            ? new Set(materials.map((item) => item._id))
                            : new Set()
                        )
                      }
                    />
                  </th>
                  <th onClick={() => handleSort("materialCode")}>
                    Material Code
                    <SortArrow column="materialCode" />
                  </th>
                  <th onClick={() => handleSort("materialType")}>
                    Type
                    <SortArrow column="materialType" />
                  </th>
                  <th onClick={() => handleSort("baseUoM")}>
                    UoM
                    <SortArrow column="baseUoM" />
                  </th>
                  <th onClick={() => handleSort("materialGroup")}>
                    Group
                    <SortArrow column="materialGroup" />
                  </th>
                  <th onClick={() => handleSort("materialDescription")}>
                    Description
                    <SortArrow column="materialDescription" />
                  </th>
                  <th style={{ width: 86 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {materials.length === 0 ? (
                  <tr>
                    <td colSpan="7">
                      <EmptyState
                        title={loading ? "Loading materials..." : "No materials found"}
                        copy="Clear filters or add a material."
                      />
                    </td>
                  </tr>
                ) : (
                  materials.map((material) => (
                    <tr key={material._id}>
                      <td>
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={selected.has(material._id)}
                          onChange={() =>
                            setSelected((current) => {
                              const next = new Set(current);
                              if (next.has(material._id)) next.delete(material._id);
                              else next.add(material._id);
                              return next;
                            })
                          }
                        />
                      </td>
                      <td className="mono" style={{ color: "var(--primary)", fontWeight: 700 }}>
                        {material.materialCode}
                      </td>
                      <td>{material.materialType || "—"}</td>
                      <td>{material.baseUoM || "—"}</td>
                      <td>{material.materialGroup || "—"}</td>
                      <td>{clip(material.materialDescription, 64)}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn btn-secondary btn-icon btn-sm"
                            onClick={() => setEditModal(material)}
                            title="Edit material"
                          >
                            {Icons.edit}
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-icon btn-sm"
                            onClick={() => handleDelete(material._id)}
                            title="Archive material"
                          >
                            {Icons.trash}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="surface-body mobile-only">
            {materials.length === 0 ? (
              <EmptyState
                title={loading ? "Loading materials..." : "No materials found"}
                copy="Clear filters or add a material."
              />
            ) : (
              <div className="record-list">
                {materials.map((material) => (
                  <article key={material._id} className="record-card">
                    <div className="record-card-head">
                      <div>
                        <div className="record-card-kicker">Material</div>
                        <div className="record-card-title mono">{material.materialCode}</div>
                      </div>
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={selected.has(material._id)}
                        onChange={() =>
                          setSelected((current) => {
                            const next = new Set(current);
                            if (next.has(material._id)) next.delete(material._id);
                            else next.add(material._id);
                            return next;
                          })
                        }
                      />
                    </div>

                    <div className="record-card-copy">
                      <strong>{material.materialType || "Unassigned type"}</strong>
                      <span>{clip(material.materialDescription || "No description", 88)}</span>
                    </div>

                    <div className="record-card-grid">
                      <div className="record-field">
                        <span>UoM</span>
                        <strong>{material.baseUoM || "—"}</strong>
                      </div>
                      <div className="record-field">
                        <span>Group</span>
                        <strong>{material.materialGroup || "—"}</strong>
                      </div>
                    </div>

                    <div className="record-card-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setEditModal(material)}
                      >
                        {Icons.edit}
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(material._id)}
                      >
                        {Icons.trash}
                        Archive
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="table-footer">
            <div className="muted">
              Showing {visibleWindow.start} to {visibleWindow.end} of {total}
            </div>
            <div className="pagination">
              <button
                type="button"
                className="btn btn-secondary btn-compact"
                disabled={page <= 1}
                onClick={() => setPage(1)}
              >
                «
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-compact"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                ‹
              </button>
              <div className="page-index mono">
                {page} / {pages}
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-compact"
                disabled={page >= pages}
                onClick={() => setPage((current) => current + 1)}
              >
                ›
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-compact"
                disabled={page >= pages}
                onClick={() => setPage(pages)}
              >
                »
              </button>
            </div>
          </div>
        </section>
      </Reveal>

      {editModal && (
        <MaterialFormModal
          material={editModal === "new" ? null : editModal}
          filterOpts={filterOpts}
          onClose={() => setEditModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function MaterialFormModal({ material, filterOpts, onClose, onSave }) {
  const [form, setForm] = useState({
    materialCode: material?.materialCode || "",
    materialType: material?.materialType || "",
    baseUoM: material?.baseUoM || "",
    materialGroup: material?.materialGroup || "",
    materialDescription: material?.materialDescription || ""
  });

  return (
    <Modal title={material ? "Edit Material" : "Add Material"} onClose={onClose}>
      <div className="modal-body stack">
        <div className="field">
          <label>Material Code</label>
          <input
            value={form.materialCode}
            onChange={(event) =>
              setForm((current) => ({ ...current, materialCode: event.target.value }))
            }
            placeholder="e.g. 1000000001"
            disabled={!!material}
          />
        </div>

        <div className="field-grid">
          <div className="field">
            <label>Material Type</label>
            <select
              value={form.materialType}
              onChange={(event) =>
                setForm((current) => ({ ...current, materialType: event.target.value }))
              }
            >
              <option value="">Select type</option>
              {filterOpts.materialTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Base UoM</label>
            <select
              value={form.baseUoM}
              onChange={(event) =>
                setForm((current) => ({ ...current, baseUoM: event.target.value }))
              }
            >
              <option value="">Select UoM</option>
              {filterOpts.baseUoMs.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Material Group</label>
          <select
            value={form.materialGroup}
            onChange={(event) =>
              setForm((current) => ({ ...current, materialGroup: event.target.value }))
            }
          >
            <option value="">Select group</option>
            {filterOpts.materialGroups.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Description</label>
          <textarea
            rows="3"
            value={form.materialDescription}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                materialDescription: event.target.value
              }))
            }
            placeholder="Material description"
          />
        </div>
      </div>

      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onSave(form)}
          disabled={!form.materialCode || !form.materialType || !form.baseUoM}
        >
          {material ? "Update Material" : "Create Material"}
        </button>
      </div>
    </Modal>
  );
}

function InwardStock() {
  const { toast, user } = useContext(AppContext);
  const emptyForm = {
    materialCode: "",
    materialDescription: "",
    materialType: "",
    baseUoM: "",
    quantityPerLabel: "",
    labelCount: "",
    dmrNumber: "",
    dmrDate: todayDateInputValue(),
    make: "",
    vendorName: "",
    customVendorName: ""
  };
  const [form, setForm] = useState({ ...emptyForm });
  const [vendorOptions, setVendorOptions] = useState([]);
  const [customVendorValue, setCustomVendorValue] = useState("__custom_vendor__");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFilters() {
      try {
        const data = await api("/api/stock-labels/filters");
        if (!cancelled) {
          setVendorOptions(data.vendorNames || []);
          setCustomVendorValue(data.customVendorValue || "__custom_vendor__");
        }
      } catch (e) {}
    }

    loadFilters();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleMaterialCodeChange = (value) => {
    setForm((current) => ({
      ...current,
      materialCode: value,
      materialDescription: "",
      materialType: "",
      baseUoM: ""
    }));
  };

  const handleMaterialSelect = (material) => {
    setForm((current) => ({
      ...current,
      materialCode: material.materialCode,
      materialDescription: material.materialDescription || "",
      materialType: material.materialType || "",
      baseUoM: material.baseUoM || ""
    }));
  };

  const resetForm = () => {
    setForm({ ...emptyForm, dmrDate: todayDateInputValue() });
  };

  const resolvedVendorName =
    form.vendorName === customVendorValue ? form.customVendorName : form.vendorName;
  const totalQuantity =
    (Number(form.quantityPerLabel) || 0) * (Number(form.labelCount) || 0);

  const previewItems = [
    { label: "Operator", value: user.name },
    { label: "Material", value: form.materialCode || "Select material" },
    {
      label: "Qty / Pallet",
      value: form.quantityPerLabel ? `${form.quantityPerLabel} ${form.baseUoM || ""}` : "Enter quantity"
    },
    { label: "Pallets", value: form.labelCount || "Enter pallet count" },
    { label: "Vendor", value: resolvedVendorName || "Select vendor" },
    { label: "Total Qty", value: totalQuantity ? `${totalQuantity} ${form.baseUoM || ""}` : "Pending" }
  ];

  const handleCreateBatch = async () => {
    if (
      !form.materialCode ||
      !form.quantityPerLabel ||
      !form.labelCount ||
      !form.dmrNumber ||
      !form.dmrDate ||
      !form.make ||
      !resolvedVendorName
    ) {
      toast("Material, quantity per pallet, pallet count, DMR, DMR date, make, and vendor are required.", "error");
      return;
    }

    setLoading(true);
    try {
      const data = await api("/api/stock-labels/inward", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          vendorName: form.vendorName,
          customVendorName: form.customVendorName,
          quantityPerLabel: Number(form.quantityPerLabel),
          labelCount: Number(form.labelCount)
        })
      });
      setResult(data);
      toast(`Created ${data.totalLabels} inward stock labels.`, "success");
      resetForm();
    } catch (e) {
      toast(e.message, "error");
    }
    setLoading(false);
  };

  if (result) {
    const firstLabel = result.labels?.[0];

    return (
      <div className="page-stack">
        <Reveal>
          <PageHero
            eyebrow={
              <>
                {Icons.layers}
                Inward Batch Ready
              </>
            }
            title="Inward labels ready"
            description="Print and stick the labels."
            actions={
              <>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => printStockLabels(result.labels, "Inward Stock Labels")}
                >
                  {Icons.printer}
                  Print {result.totalLabels} Labels
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setResult(null)}
                >
                  {Icons.plus}
                  New Inward Batch
                </button>
              </>
            }
            stats={[
              { label: "Batch ID", value: result.inwardBatchId, tone: "primary" },
              { label: "Labels", value: result.totalLabels, tone: "success" },
              { label: "Total Qty", value: result.totalQuantity, tone: "warning" },
              { label: "Printed At", value: firstLabel ? toIST(firstLabel.inwardPrintedAt) : "—", tone: "danger" }
            ]}
            aside={
              <div className="workflow-step compact">
                <span className="step-label">Next Step</span>
                <strong>Stick one label on each pallet</strong>
              </div>
            }
          />
        </Reveal>

        <TutorialPanel page="inward" />

        <div className="detail-grid">
          <Reveal delay={90}>
            <section className="surface-card">
              <div className="surface-header">
                <div className="surface-title">
                  <h3>Batch Summary</h3>
                </div>
              </div>
              <div className="surface-body stack">
                <SummaryGrid
                  items={[
                    { label: "Material Code", value: firstLabel?.materialCode || "—" },
                    { label: "Description", value: firstLabel?.materialDescription || "—" },
                    {
                      label: "Qty / Pallet",
                      value: firstLabel ? `${firstLabel.currentQuantity} ${firstLabel.baseUoM || ""}` : "—"
                    },
                    { label: "Pallet Count", value: result.totalLabels },
                    { label: "DMR Number", value: firstLabel?.dmrNumber || "—" },
                    { label: "DMR Date", value: firstLabel?.dmrDate ? toISTDate(firstLabel.dmrDate) : "—" },
                    { label: "Make", value: firstLabel?.make || "—" },
                    { label: "Vendor", value: firstLabel?.vendorName || "—" }
                  ]}
                />
              </div>
            </section>
          </Reveal>

          <Reveal delay={140}>
            <section className="surface-card alt">
              <div className="surface-header">
                <div className="surface-title">
                  <h3>Sample Labels</h3>
                </div>
              </div>
              <div className="surface-body stack">
                <div className="record-list">
                  {(result.labels || []).slice(0, 8).map((label) => (
                    <article key={label.stockLabelId} className="record-card compact">
                      <div className="record-card-head">
                        <div>
                          <div className="record-card-kicker">Stock Label</div>
                          <div className="record-card-title mono">{label.stockLabelId}</div>
                        </div>
                        <strong>{label.palletSequence} / {label.palletCount}</strong>
                      </div>
                      <div className="record-card-copy">
                        <strong>{label.materialCode}</strong>
                        <span>{label.vendorName}</span>
                      </div>
                      <div className="record-card-grid">
                        <div className="record-field">
                          <span>Quantity</span>
                          <strong>{label.currentQuantity} {label.baseUoM || ""}</strong>
                        </div>
                        <div className="record-field">
                          <span>Printed</span>
                          <strong>{toIST(label.inwardPrintedAt)}</strong>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
                {result.labels?.length > 8 && (
                  <div className="callout info">
                    <strong>Preview trimmed</strong>
                    <p>Printing still includes all {result.totalLabels} labels.</p>
                  </div>
                )}
              </div>
            </section>
          </Reveal>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <Reveal>
        <PageHero
          eyebrow={
            <>
              {Icons.layers}
              Stores
            </>
          }
          title="Print inward labels"
          description="Create one QR per pallet."
          stats={[
            { label: "Operator", value: user.name, tone: "primary" },
            { label: "Material", value: form.materialCode || "Pending", tone: form.materialCode ? "success" : "warning" },
            {
              label: "Pallets",
              value: form.labelCount || "Pending",
              tone: form.labelCount ? "success" : "warning"
            },
            {
              label: "Total Qty",
              value: totalQuantity ? `${totalQuantity} ${form.baseUoM || ""}` : "Pending",
              tone: totalQuantity ? "danger" : "warning"
            }
          ]}
          aside={
            <div className="workflow-step compact">
              <span className="step-label">Output</span>
              <strong>One QR per pallet</strong>
            </div>
          }
        />
      </Reveal>

      <TutorialPanel page="inward" />

      <div className="form-layout">
        <Reveal delay={90}>
          <section className="surface-card">
            <div className="surface-header">
              <div className="surface-title">
                <h3>Inward batch details</h3>
              </div>
            </div>
            <div className="surface-body stack">
              <div className="field">
                <label>Material Code or Description</label>
                <MaterialAutocomplete
                  value={form.materialCode}
                  onChange={handleMaterialCodeChange}
                  onSelect={handleMaterialSelect}
                />
              </div>

              <div className="field-grid">
                <div className="field">
                  <label>Quantity Per Pallet</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.quantityPerLabel}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, quantityPerLabel: event.target.value }))
                    }
                    placeholder="Enter quantity per pallet"
                  />
                </div>

                <div className="field">
                  <label>Number of Pallets</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.labelCount}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, labelCount: event.target.value }))
                    }
                    placeholder="Enter pallet count"
                  />
                </div>
              </div>

              <div className="field-grid">
                <div className="field">
                  <label>DMR Number</label>
                  <input
                    value={form.dmrNumber}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, dmrNumber: event.target.value }))
                    }
                    placeholder="Enter DMR number"
                  />
                </div>

                <div className="field">
                  <label>DMR Date</label>
                  <input
                    type="date"
                    value={form.dmrDate}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, dmrDate: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="field-grid">
                <div className="field">
                  <label>Make</label>
                  <input
                    value={form.make}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, make: event.target.value }))
                    }
                    placeholder="Enter make"
                  />
                </div>

                <div className="field">
                  <label>Vendor Name</label>
                  <select
                    value={form.vendorName}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, vendorName: event.target.value }))
                    }
                  >
                    <option value="">Select vendor</option>
                    {vendorOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                    <option value={customVendorValue}>Add custom vendor</option>
                  </select>
                </div>
              </div>

              {form.vendorName === customVendorValue && (
                <div className="field">
                  <label>Custom Vendor</label>
                  <input
                    value={form.customVendorName}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, customVendorName: event.target.value }))
                    }
                    placeholder="Enter vendor name"
                  />
                </div>
              )}

              <div className="field">
                <label>Printed Time (IST)</label>
                <div className="input-like">{toIST(new Date())}</div>
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal delay={140}>
          <section className="surface-card alt">
            <div className="surface-header">
              <div className="surface-title">
                <h3>Batch readiness</h3>
              </div>
            </div>
            <div className="surface-body stack">
              <SummaryGrid items={previewItems} />
            </div>
          </section>
        </Reveal>
      </div>

      <Reveal delay={190}>
        <ActionDock>
          {(form.materialCode || form.quantityPerLabel || form.labelCount || form.dmrNumber || form.make) && (
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              {Icons.close}
              Clear
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCreateBatch}
            disabled={
              loading ||
              !form.materialCode ||
              !form.quantityPerLabel ||
              !form.labelCount ||
              !form.dmrNumber ||
              !form.dmrDate ||
              !form.make ||
              !resolvedVendorName
            }
          >
            {Icons.qr}
            {loading ? "Creating Labels..." : "Create Inward Labels"}
          </button>
        </ActionDock>
      </Reveal>
    </div>
  );
}

function IssueStock() {
  const { toast, user } = useContext(AppContext);
  const [labels, setLabels] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [vendorOptions, setVendorOptions] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [issueDrafts, setIssueDrafts] = useState({});
  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [result, setResult] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadFilters() {
      try {
        const data = await api("/api/stock-labels/filters");
        if (!cancelled) setVendorOptions(data.vendorNames || []);
      } catch (e) {}
    }

    loadFilters();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, vendorFilter, pageSize]);

  useEffect(() => {
    let cancelled = false;

    async function loadLabels() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          availableOnly: "true",
          page,
          limit: pageSize,
          search
        });
        if (vendorFilter) params.set("vendorName", vendorFilter);

        const data = await api(`/api/stock-labels?${params.toString()}`);
        if (!cancelled) {
          setLabels(data.labels || []);
          setTotal(data.total || 0);
          setPages(data.pages || 1);
          setSelected(new Set());
          setIssueDrafts({});
        }
      } catch (e) {
        if (!cancelled) toast(e.message, "error");
      }
      if (!cancelled) setLoading(false);
    }

    loadLabels();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, search, vendorFilter, refreshKey, toast]);

  const toggleRow = (label, checked) => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(label.stockLabelId);
      else next.delete(label.stockLabelId);
      return next;
    });

    setIssueDrafts((current) => {
      const next = { ...current };
      if (checked) next[label.stockLabelId] = String(label.currentQuantity);
      else delete next[label.stockLabelId];
      return next;
    });
  };

  const allVisibleSelected = labels.length > 0 && labels.every((label) => selected.has(label.stockLabelId));
  const selectedLabels = labels.filter((label) => selected.has(label.stockLabelId));
  const selectedQuantity = selectedLabels.reduce(
    (sum, label) => sum + (Number(issueDrafts[label.stockLabelId]) || 0),
    0
  );
  const partialCount = selectedLabels.filter((label) => {
    const draft = Number(issueDrafts[label.stockLabelId] || 0);
    return draft > 0 && draft < Number(label.currentQuantity || 0);
  }).length;
  const visibleWindow = pageWindow(page, pageSize, total);

  const handleSelectAll = (checked) => {
    if (!checked) {
      setSelected(new Set());
      setIssueDrafts({});
      return;
    }

    setSelected(new Set(labels.map((label) => label.stockLabelId)));
    setIssueDrafts(
      labels.reduce((accumulator, label) => {
        accumulator[label.stockLabelId] = String(label.currentQuantity);
        return accumulator;
      }, {})
    );
  };

  const handleIssue = async () => {
    if (selectedLabels.length === 0) {
      toast("Select at least one active stock label to issue.", "error");
      return;
    }

    const items = selectedLabels.map((label) => ({
      stockLabelId: label.stockLabelId,
      issueQuantity: Number(issueDrafts[label.stockLabelId] || 0)
    }));

    const invalidItem = items.find(
      (item) =>
        !item.issueQuantity ||
        item.issueQuantity <= 0 ||
        item.issueQuantity > Number(
          labels.find((label) => label.stockLabelId === item.stockLabelId)?.currentQuantity || 0
        )
    );

    if (invalidItem) {
      toast("Each selected label needs a valid issue quantity within the available balance.", "error");
      return;
    }

    setIssuing(true);
    try {
      const data = await api("/api/issuances", {
        method: "POST",
        body: JSON.stringify({ items })
      });
      setResult(data);
      setRefreshKey((current) => current + 1);
      toast(`Created ${data.createdCount} issue QR label${data.createdCount === 1 ? "" : "s"}.`, "success");
    } catch (e) {
      toast(e.message, "error");
    }
    setIssuing(false);
  };

  if (result) {
    const lastIssuance = result.issuances?.[0];

    return (
      <div className="page-stack">
        <Reveal>
          <PageHero
            eyebrow={
              <>
                {Icons.send}
                Issue Labels Ready
              </>
            }
            title="Issue labels ready"
            description="Print issue and balance labels."
            actions={
              <>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => printIssueLabels(result.issuances)}
                >
                  {Icons.printer}
                  Print Issue Labels
                </button>
                {result.balanceLabels?.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => printStockLabels(result.balanceLabels, "Balance Stock Labels")}
                  >
                    {Icons.printer}
                    Print Balance Labels
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setResult(null)}
                >
                  {Icons.layers}
                  Back to Stock Queue
                </button>
              </>
            }
            stats={[
              { label: "Issue Labels", value: result.createdCount, tone: "primary" },
              { label: "Balance Reprints", value: result.balanceLabels?.length || 0, tone: "success" },
              { label: "Fully Depleted", value: result.depletedCount || 0, tone: "warning" },
              { label: "Issued At", value: lastIssuance ? toIST(lastIssuance.issuedAt) : "—", tone: "danger" }
            ]}
            aside={
              <div className="workflow-step compact">
                <span className="step-label">Result</span>
                <strong>Source labels stay traceable</strong>
              </div>
            }
          />
        </Reveal>

        <TutorialPanel page="issue" />

        <div className="detail-grid">
          <Reveal delay={90}>
            <section className="surface-card">
              <div className="surface-header">
                <div className="surface-title">
                  <h3>Issued Movements</h3>
                </div>
              </div>
              <div className="surface-body stack">
                <div className="record-list">
                  {(result.issuances || []).slice(0, 8).map((item) => (
                    <article key={item.issuanceId} className="record-card compact">
                      <div className="record-card-head">
                        <div>
                          <div className="record-card-kicker">Issue Label</div>
                          <div className="record-card-title mono">{item.issuanceId}</div>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                      <div className="record-card-copy">
                        <strong>{item.materialCode}</strong>
                        <span>{item.sourceLabelId || "—"}</span>
                      </div>
                      <div className="record-card-grid">
                        <div className="record-field">
                          <span>Issued Qty</span>
                          <strong>{item.quantity} {item.baseUoM || ""}</strong>
                        </div>
                        <div className="record-field">
                          <span>Vendor</span>
                          <strong>{item.vendorName || "—"}</strong>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </Reveal>

          <Reveal delay={140}>
            <section className="surface-card alt">
              <div className="surface-header">
                <div className="surface-title">
                  <h3>Balance Label Reprints</h3>
                </div>
              </div>
              <div className="surface-body stack">
                {result.balanceLabels?.length ? (
                  <div className="record-list">
                    {result.balanceLabels.slice(0, 8).map((label) => (
                      <article key={label.stockLabelId} className="record-card compact">
                        <div className="record-card-head">
                          <div>
                            <div className="record-card-kicker">Balance Label</div>
                            <div className="record-card-title mono">{label.stockLabelId}</div>
                          </div>
                          <strong>Rev {label.revision}</strong>
                        </div>
                        <div className="record-card-copy">
                          <strong>{label.materialCode}</strong>
                          <span>{label.vendorName}</span>
                        </div>
                        <div className="record-card-grid">
                          <div className="record-field">
                            <span>Remaining Qty</span>
                            <strong>{label.currentQuantity} {label.baseUoM || ""}</strong>
                          </div>
                          <div className="record-field">
                            <span>Source Batch</span>
                            <strong>{label.inwardBatchId}</strong>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No balance reprints required"
                    copy="All selected labels were issued in full."
                  />
                )}
              </div>
            </section>
          </Reveal>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <Reveal>
        <PageHero
          eyebrow={
            <>
              {Icons.send}
              Stores
            </>
          }
          title="Issue stock labels"
          description="Issue from active stock."
          stats={[
            { label: "Selected Labels", value: selected.size, tone: "primary" },
            {
              label: "Selected Qty",
              value: selectedQuantity ? `${selectedQuantity}` : "Pending",
              tone: selectedQuantity ? "success" : "warning"
            },
            {
              label: "Partial Issues",
              value: partialCount || 0,
              tone: partialCount ? "danger" : "warning"
            },
            { label: "Operator", value: user.name, tone: "warning" }
          ]}
        />
      </Reveal>

      <TutorialPanel page="issue" />

      <Reveal delay={90}>
        <section className="surface-card">
          <div className="toolbar">
            <div className="toolbar-row">
              <div className="search-box">
                {Icons.search}
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search stock label, material, vendor, DMR, or batch"
                />
              </div>

              <select
                className="filter-select"
                value={vendorFilter}
                onChange={(event) => setVendorFilter(event.target.value)}
              >
                <option value="">All Vendors</option>
                {vendorOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="toolbar-row">
              <div className="kpi-strip">
                <span className="kpi-pill">{total.toLocaleString()} active labels</span>
                <span className="kpi-pill">{selected.size} selected</span>
                <span className="kpi-pill">{partialCount} partial</span>
              </div>

              <div className="toolbar-actions">
                <PageSizeControl value={pageSize} onChange={setPageSize} compact />
              </div>
            </div>
          </div>

          <div className="table-wrap desktop-only">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 38 }}>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={allVisibleSelected}
                      onChange={(event) => handleSelectAll(event.target.checked)}
                    />
                  </th>
                  <th>Stock Label</th>
                  <th>Material</th>
                  <th>Available Qty</th>
                  <th>Issue Qty</th>
                  <th>Vendor</th>
                  <th>Printed At</th>
                </tr>
              </thead>
              <tbody>
                {labels.length === 0 ? (
                  <tr>
                    <td colSpan="7">
                      <EmptyState
                        title={loading ? "Loading active stock..." : "No active stock labels found"}
                        copy="Create inward labels or clear filters."
                      />
                    </td>
                  </tr>
                ) : (
                  labels.map((label) => {
                    const checked = selected.has(label.stockLabelId);
                    return (
                      <tr key={label.stockLabelId}>
                        <td>
                          <input
                            type="checkbox"
                            className="checkbox"
                            checked={checked}
                            onChange={(event) => toggleRow(label, event.target.checked)}
                          />
                        </td>
                        <td>
                          <div className="mono" style={{ color: "var(--primary)", fontWeight: 700 }}>
                            {label.stockLabelId}
                          </div>
                          <div className="muted">{label.inwardBatchId} • {label.palletSequence}/{label.palletCount}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: "var(--ink)" }}>{label.materialCode}</div>
                          <div className="muted">{clip(label.materialDescription, 44)}</div>
                        </td>
                        <td className="mono">{label.currentQuantity} {label.baseUoM || ""}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            className="filter-input"
                            style={{ maxWidth: 120 }}
                            disabled={!checked}
                            value={issueDrafts[label.stockLabelId] ?? ""}
                            onChange={(event) =>
                              setIssueDrafts((current) => ({
                                ...current,
                                [label.stockLabelId]: event.target.value
                              }))
                            }
                          />
                        </td>
                        <td>
                          <div>{label.vendorName}</div>
                          <div className="muted">{label.dmrNumber}</div>
                        </td>
                        <td>{toIST(label.inwardPrintedAt)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="surface-body mobile-only">
            {labels.length === 0 ? (
              <EmptyState
                title={loading ? "Loading active stock..." : "No active stock labels found"}
                copy="Create inward labels or clear filters."
              />
            ) : (
              <div className="record-list">
                {labels.map((label) => {
                  const checked = selected.has(label.stockLabelId);
                  return (
                    <article key={label.stockLabelId} className="record-card">
                      <div className="record-card-head">
                        <div>
                          <div className="record-card-kicker">Stock Label</div>
                          <div className="record-card-title mono">{label.stockLabelId}</div>
                        </div>
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={checked}
                          onChange={(event) => toggleRow(label, event.target.checked)}
                        />
                      </div>
                      <div className="record-card-copy">
                        <strong>{label.materialCode}</strong>
                        <span>{label.vendorName} • {label.dmrNumber}</span>
                      </div>
                      <div className="record-card-grid">
                        <div className="record-field">
                          <span>Available</span>
                          <strong>{label.currentQuantity} {label.baseUoM || ""}</strong>
                        </div>
                        <div className="record-field">
                          <span>Printed</span>
                          <strong>{toIST(label.inwardPrintedAt)}</strong>
                        </div>
                      </div>
                      <div className="field">
                        <label>Issue Quantity</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          disabled={!checked}
                          value={issueDrafts[label.stockLabelId] ?? ""}
                          onChange={(event) =>
                            setIssueDrafts((current) => ({
                              ...current,
                              [label.stockLabelId]: event.target.value
                            }))
                          }
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="table-footer">
            <div className="muted">
              Showing {visibleWindow.start} to {visibleWindow.end} of {total}
            </div>
            <div className="pagination">
              <button
                type="button"
                className="btn btn-secondary btn-compact"
                disabled={page <= 1}
                onClick={() => setPage(1)}
              >
                «
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-compact"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                ‹
              </button>
              <div className="page-index mono">{page} / {pages}</div>
              <button
                type="button"
                className="btn btn-secondary btn-compact"
                disabled={page >= pages}
                onClick={() => setPage((current) => current + 1)}
              >
                ›
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-compact"
                disabled={page >= pages}
                onClick={() => setPage(pages)}
              >
                »
              </button>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal delay={180}>
        <ActionDock>
          {selected.size > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSelected(new Set());
                setIssueDrafts({});
              }}
            >
              {Icons.close}
              Clear Selection
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleIssue}
            disabled={issuing || selected.size === 0}
          >
            {Icons.qr}
            {issuing ? "Creating Issue Labels..." : "Create Issue Labels"}
          </button>
        </ActionDock>
      </Reveal>
    </div>
  );
}

function ScanReceive() {
  const { toast, user } = useContext(AppContext);
  const [scanning, setScanning] = useState(false);
  const [issuance, setIssuance] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [manualId, setManualId] = useState("");
  const [scanTrace, setScanTrace] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const scanIntervalRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    scanIntervalRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const resolveScan = async (scanText, source = "manual") => {
    const trace = parseScanTrace(scanText, source);
    setScanTrace(trace);
    setLookupLoading(true);

    try {
      const data = await api("/api/issuances/scan", {
        method: "POST",
        body: JSON.stringify({ scanText })
      });
      setIssuance(data);
    } catch (e) {
      setIssuance(null);
      toast(e.message || "Unable to resolve scanned QR text.", "error");
    }

    setLookupLoading(false);
  };

  const startCamera = async () => {
    if (scanning) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setScanning(true);

      if (!window.jsQR) {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js";
        document.head.appendChild(script);
        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      scanIntervalRef.current = setInterval(() => {
        if (!videoRef.current || !canvasRef.current || !window.jsQR) return;
        const video = videoRef.current;
        if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d");
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = window.jsQR(imageData.data, imageData.width, imageData.height);

        if (code?.data) {
          stopCamera();
          resolveScan(code.data, "camera");
        }
      }, 220);
    } catch (e) {
      toast(`Camera access failed: ${e.message}`, "error");
    }
  };

  const handleManualLookup = async () => {
    if (!manualId.trim()) return;
    await resolveScan(manualId.trim(), "manual");
  };

  const resetFlow = () => {
    setIssuance(null);
    setRemarks("");
    setScanTrace(null);
    setManualId("");
    setLookupLoading(false);
  };

  const handleReceive = async () => {
    if (!issuance) return;
    try {
      await api(`/api/issuances/receive/${issuance.issuanceId}`, {
        method: "POST",
        body: JSON.stringify({ receiptRemarks: remarks })
      });
      toast("Material received.", "success");
      resetFlow();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const handleReject = async () => {
    if (!issuance) return;
    if (!remarks.trim()) {
      toast("Remarks are required when rejecting an issuance.", "error");
      return;
    }

    try {
      await api(`/api/issuances/reject/${issuance.issuanceId}`, {
        method: "POST",
        body: JSON.stringify({ receiptRemarks: remarks.trim() })
      });
      toast("Material rejected.", "info");
      resetFlow();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const storedLookupText = getQrLookupValue(issuance);
  const lookupMatches =
    !issuance ||
    !scanTrace?.lookupKey ||
    scanTrace.lookupKey === storedLookupText ||
    scanTrace.lookupKey === issuance.issuanceId;
  const tat = getIssuanceTat(issuance);

  const heroStats = issuance
    ? [
        { label: "Issue ID", value: issuance.issuanceId, tone: "primary" },
        { label: "Scanned Key", value: scanTrace?.lookupKey || "—", tone: "success" },
        { label: "Stored QR Key", value: storedLookupText, tone: "warning" },
        { label: "Status", value: statusLabel(issuance.status), tone: "danger" }
      ]
    : [
        { label: "Lane", value: roleLabel(user.role), tone: "primary" },
        { label: "Scanner", value: scanning ? "Live" : "Idle", tone: "success" },
        { label: "QR Standard", value: "Issue QR", tone: "warning" },
        { label: "Fallback", value: "Manual Lookup", tone: "danger" }
      ];

  return (
    <div className="page-stack">
      <Reveal>
        <PageHero
          eyebrow={
            <>
              {Icons.scan}
              Operations
            </>
          }
          title={issuance ? "Receipt review" : "Receive material"}
          description={
            issuance
              ? "Review and complete the handoff."
              : "Scan or search an issue label."
          }
          stats={heroStats}
          aside={
            <div className="workflow-step compact">
              <span className="step-label">Next Action</span>
              <strong>{issuance ? (issuance.status === "issued" ? "Accept or reject" : "Review only") : "Start with scan"}</strong>
            </div>
          }
        />
      </Reveal>

      <TutorialPanel page="scan" />

      {!issuance ? (
        <>
          <div className="scan-grid">
            <Reveal delay={90}>
              <section className="surface-card">
                <div className="surface-header">
                  <div className="surface-title">
                    <h3>Camera</h3>
                  </div>
                </div>
                <div className="surface-body">
                  {!scanning ? (
                    <div className="scan-zone" onClick={startCamera}>
                      <div className="scan-icon">{Icons.scan}</div>
                      <div>
                        <strong>Open camera</strong>
                        <div className="muted" style={{ marginTop: 8 }}>
                          Reads all labels.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="scan-zone active">
                      <div className="scan-viewport">
                        <video ref={videoRef} playsInline muted />
                        <canvas ref={canvasRef} style={{ display: "none" }} />
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={stopCamera}
                        >
                          Stop Scanner
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </Reveal>

            <Reveal delay={140}>
              <section className="surface-card alt">
                <div className="surface-header">
                  <div className="surface-title">
                    <h3>Manual Lookup</h3>
                  </div>
                </div>
                <div className="surface-body stack">
                  <div className="field">
                    <label>Issue ID or QR text</label>
                    <input
                      value={manualId}
                      onChange={(event) => setManualId(event.target.value)}
                      onKeyDown={(event) => event.key === "Enter" && handleManualLookup()}
                      placeholder="e.g. MG-260320-ABC12"
                    />
                  </div>
                </div>
              </section>
            </Reveal>
          </div>

          <Reveal delay={190}>
            <ActionDock>
              <button
                type="button"
                className={classNames(
                  "btn",
                  manualId.trim() ? "btn-secondary" : "btn-primary"
                )}
                onClick={startCamera}
                disabled={scanning}
              >
                {Icons.scan}
                {scanning ? "Camera Live" : "Open Camera"}
              </button>
              <button
                type="button"
                className={classNames(
                  "btn",
                  manualId.trim() ? "btn-primary" : "btn-secondary"
                )}
                onClick={handleManualLookup}
                disabled={lookupLoading || !manualId.trim()}
              >
                {Icons.search}
                {lookupLoading ? "Resolving..." : "Resolve Text"}
              </button>
            </ActionDock>
          </Reveal>
        </>
      ) : (
        <>
          <div className="detail-grid">
            <Reveal delay={90}>
              <section className="surface-card">
                <div className="surface-header">
                  <div className="surface-title">
                    <h3>Verification</h3>
                  </div>
                  <StatusBadge status={issuance.status} />
                </div>
                <div className="surface-body stack">
                  <div
                    className={classNames(
                      "verification-banner",
                      issuance.status === "issued"
                        ? lookupMatches
                          ? "success"
                          : "warning"
                        : "info"
                    )}
                  >
                    {lookupMatches ? Icons.check : Icons.shield}
                    <div>
                      <strong>
                        {issuance.status === "issued"
                          ? lookupMatches
                            ? "Lookup matches"
                            : "Lookup mismatch"
                          : `Already ${issuance.status}.`}
                      </strong>
                      <p>
                        {issuance.status === "issued"
                          ? lookupMatches
                            ? "Ready for action."
                            : "Review before acting."
                          : "This record is read only."}
                      </p>
                    </div>
                  </div>

                  <div className="trace-grid">
                    <div className="trace-box">
                      <span className="trace-label">Raw Scanned Text</span>
                      <span className="trace-value wrap mono">{scanTrace?.raw || "—"}</span>
                    </div>
                    <div className="trace-box">
                      <span className="trace-label">Normalized Lookup Key</span>
                      <span className="trace-value mono">{scanTrace?.lookupKey || "—"}</span>
                    </div>
                    <div className="trace-box">
                      <span className="trace-label">Scan Source</span>
                      <span className="trace-value">
                        {scanTrace?.source === "camera" ? "Camera scan" : "Manual lookup"}
                      </span>
                    </div>
                    <div className="trace-box">
                      <span className="trace-label">Detected Format</span>
                      <span className="trace-value">{scanTrace?.format || "—"}</span>
                    </div>
                    <div className="trace-box">
                      <span className="trace-label">Stored QR Lookup</span>
                      <span className="trace-value mono">{storedLookupText}</span>
                    </div>
                    <div className="trace-box">
                      <span className="trace-label">Issuance Resolved</span>
                      <span className="trace-value mono">{issuance.issuanceId}</span>
                    </div>
                  </div>

                  {issuance.status === "issued" && (
                    <div className="field">
                      <label>Receipt Remarks</label>
                      <textarea
                        rows="3"
                        value={remarks}
                        onChange={(event) => setRemarks(event.target.value)}
                        placeholder="Optional for accept, required for reject"
                      />
                    </div>
                  )}
                </div>
              </section>
            </Reveal>

            <Reveal delay={140}>
              <section className="surface-card alt">
                <div className="surface-header">
                  <div className="surface-title">
                    <h3>Resolved issuance</h3>
                  </div>
                </div>
                <div className="surface-body stack">
                  <div className="qr-frame">
                    <img src={issuance.qrCodeData} alt="Issuance QR" />
                  </div>
                  <DetailRows
                    items={[
                      { label: "Issuance ID", value: issuance.issuanceId, className: "mono" },
                      { label: "Source Stock Label", value: issuance.sourceLabelId || "—", className: "mono" },
                      { label: "Material Code", value: issuance.materialCode, className: "mono" },
                      { label: "Description", value: issuance.materialDescription || "—" },
                      { label: "Quantity", value: `${issuance.quantity} ${issuance.baseUoM || ""}` },
                      { label: "DMR Number", value: issuance.dmrNumber },
                      { label: "DMR Date", value: issuance.dmrDate ? toISTDate(issuance.dmrDate) : "—" },
                      { label: "Make", value: issuance.make || "—" },
                      { label: "Vendor", value: issuance.vendorName || "—" },
                      {
                        label: "Inward Printed",
                        value: issuance.sourceInwardPrintedAt ? toIST(issuance.sourceInwardPrintedAt) : "—"
                      },
                      { label: "Issued By", value: issuance.issuedByName || "—" },
                      { label: "Issued At", value: toIST(issuance.issuedAt) },
                      { label: "Inward to Issue TAT", value: toTatLabel(tat.inwardToIssueMinutes) },
                      { label: "Issue to Accept TAT", value: toTatLabel(tat.issueToReceiveMinutes) },
                      { label: "Stored QR Key", value: storedLookupText, className: "mono" },
                      {
                        label: "Receipt Remarks",
                        value: issuance.receiptRemarks || "—"
                      }
                    ]}
                  />
                </div>
              </section>
            </Reveal>
          </div>

          <Reveal delay={190}>
            <ActionDock>
              {issuance.status === "issued" ? (
                <>
                  <button type="button" className="btn btn-success" onClick={handleReceive}>
                    {Icons.check}
                    Accept
                  </button>
                  <button type="button" className="btn btn-danger" onClick={handleReject}>
                    {Icons.close}
                    Reject
                  </button>
                </>
              ) : null}
              <button type="button" className="btn btn-secondary" onClick={resetFlow}>
                {Icons.scan}
                New Lookup
              </button>
            </ActionDock>
          </Reveal>
        </>
      )}
    </div>
  );
}

function IssuanceHistory() {
  const { toast } = useContext(AppContext);
  const [issuances, setIssuances] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("issuedAt");
  const [sortDir, setSortDir] = useState("desc");
  const [selected, setSelected] = useState(new Set());
  const [viewModal, setViewModal] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, dateFrom, dateTo, pageSize]);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page,
          limit: pageSize,
          search,
          sortBy,
          sortDir
        });

        if (statusFilter) params.set("status", statusFilter);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);

        const data = await api(`/api/issuances?${params.toString()}`);
        if (!cancelled) {
          setIssuances(data.issuances || []);
          setTotal(data.total || 0);
          setPages(data.pages || 1);
          setPageSize(data.limit || pageSize);
          setSelected(new Set());
        }
      } catch (e) {
        if (!cancelled) toast(e.message, "error");
      }
      if (!cancelled) setLoading(false);
    }

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, search, statusFilter, dateFrom, dateTo, sortBy, sortDir, toast]);

  const pageSummary = useMemo(() => {
    return issuances.reduce(
      (accumulator, item) => {
        accumulator[item.status] = (accumulator[item.status] || 0) + 1;
        return accumulator;
      },
      { issued: 0, received: 0, rejected: 0 }
    );
  }, [issuances]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir((value) => (value === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir(column === "issuanceId" ? "asc" : "desc");
    }
  };

  const handleExport = async (mode) => {
    try {
      let data = [];

      if (mode === "selected") {
        data = issuances.filter((item) => selected.has(item._id));
      } else {
        const params = new URLSearchParams({
          all: "true",
          search,
          sortBy,
          sortDir
        });

        if (statusFilter) params.set("status", statusFilter);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);

        const result = await api(`/api/issuances?${params.toString()}`);
        data = result.issuances || [];
      }

      const clean = data.map((item) => ({
        "Issuance ID": item.issuanceId,
        "Source Stock Label": item.sourceLabelId || "",
        "Material Code": item.materialCode,
        Description: item.materialDescription,
        "Material Type": item.materialType,
        "Base UoM": item.baseUoM,
        Quantity: item.quantity,
        "DMR Number": item.dmrNumber,
        "DMR Date (IST)": item.dmrDate ? toISTDate(item.dmrDate) : "",
        Make: item.make || "",
        Vendor: item.vendorName || "",
        "Inward Printed At (IST)": item.sourceInwardPrintedAt ? toIST(item.sourceInwardPrintedAt) : "",
        "Issued By": item.issuedByName,
        "Issued At (IST)": toIST(item.issuedAt),
        Status: statusLabel(item.status),
        "Received By": item.receivedByName || "",
        "Received At (IST)": item.receivedAt ? toIST(item.receivedAt) : "",
        "Inward To Issue TAT": toTatLabel(getIssuanceTat(item).inwardToIssueMinutes),
        "Issue To Accept TAT": toTatLabel(getIssuanceTat(item).issueToReceiveMinutes),
        "End To End TAT": toTatLabel(getIssuanceTat(item).inwardToReceiveMinutes),
        Remarks: item.receiptRemarks || "",
        "QR Lookup Text": getQrLookupValue(item)
      }));

      if (!exportToXlsx(clean, `MatGate_Issuances_${new Date().toISOString().slice(0, 10)}.xlsx`)) {
        toast("No issuance rows available to export.", "info");
        return;
      }

      toast(`Exported ${clean.length} issuance rows.`, "success");
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const allVisibleSelected = issuances.length > 0 && selected.size === issuances.length;
  const visibleWindow = pageWindow(page, pageSize, total);

  const heroStats = [
    { label: "Filtered Total", value: total, tone: "primary" },
    { label: "Visible Issued", value: pageSummary.issued, tone: "warning" },
    { label: "Visible Received", value: pageSummary.received, tone: "success" },
    { label: "Visible Rejected", value: pageSummary.rejected, tone: "danger" }
  ];

  const SortArrow = ({ column }) => {
    if (sortBy !== column) return <span className="sort-arrow">↕</span>;
    return <span className="sort-arrow active">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div className="page-stack">
      <Reveal>
        <PageHero
          eyebrow={
            <>
              {Icons.history}
              Records
            </>
          }
          title="Movement history"
          description="Search and export movement records."
          actions={
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleExport("all")}
              >
                {Icons.download}
                Export All
              </button>
              {selected.size > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleExport("selected")}
                >
                  {Icons.download}
                  Export Selected
                </button>
              )}
            </>
          }
          stats={heroStats}
        />
      </Reveal>

      <TutorialPanel page="history" />

      <Reveal delay={90}>
        <section className="surface-card">
          <div className="toolbar">
            <div className="toolbar-row">
              <div className="search-box">
                {Icons.search}
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search issue, source label, material, vendor, or DMR"
                />
              </div>

              <select
                className="filter-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="issued">Issued</option>
                <option value="received">Received</option>
                <option value="rejected">Rejected</option>
              </select>

              <input
                type="date"
                className="filter-input"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />

              <input
                type="date"
                className="filter-input"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </div>

            <div className="toolbar-row">
              <div className="kpi-strip">
                <span className="kpi-pill">{total.toLocaleString()} matching rows</span>
                <span className="kpi-pill">{selected.size} selected</span>
                {statusFilter && <span className="kpi-pill">{statusLabel(statusFilter)} filter</span>}
              </div>

              <div className="toolbar-actions">
                <PageSizeControl value={pageSize} onChange={setPageSize} compact />
              </div>
            </div>
          </div>

          <div className="table-wrap desktop-only">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 38 }}>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={allVisibleSelected}
                      onChange={(event) =>
                        setSelected(
                          event.target.checked
                            ? new Set(issuances.map((item) => item._id))
                            : new Set()
                        )
                      }
                    />
                  </th>
                  <th onClick={() => handleSort("issuanceId")}>
                    Issue ID
                    <SortArrow column="issuanceId" />
                  </th>
                  <th>Source Label</th>
                  <th onClick={() => handleSort("materialCode")}>
                    Material
                    <SortArrow column="materialCode" />
                  </th>
                  <th onClick={() => handleSort("quantity")}>
                    Quantity
                    <SortArrow column="quantity" />
                  </th>
                  <th onClick={() => handleSort("status")}>
                    Status
                    <SortArrow column="status" />
                  </th>
                  <th onClick={() => handleSort("issuedAt")}>
                    Issued At
                    <SortArrow column="issuedAt" />
                  </th>
                  <th>Received At</th>
                  <th style={{ width: 72 }}>View</th>
                </tr>
              </thead>
              <tbody>
                {issuances.length === 0 ? (
                  <tr>
                    <td colSpan="9">
                      <EmptyState
                        title={loading ? "Loading history..." : "No issuances found"}
                        copy="Clear filters or issue stock."
                      />
                    </td>
                  </tr>
                ) : (
                  issuances.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={selected.has(item._id)}
                          onChange={() =>
                            setSelected((current) => {
                              const next = new Set(current);
                              if (next.has(item._id)) next.delete(item._id);
                              else next.add(item._id);
                              return next;
                            })
                          }
                        />
                      </td>
                      <td className="mono" style={{ color: "var(--primary)", fontWeight: 700 }}>
                        {item.issuanceId}
                      </td>
                      <td className="mono">{item.sourceLabelId || "—"}</td>
                      <td>
                        <div className="mono" style={{ color: "var(--ink)" }}>
                          {item.materialCode}
                        </div>
                        <div className="muted">{clip(item.vendorName || item.materialDescription, 44)}</div>
                      </td>
                      <td className="mono">
                        {item.quantity} {item.baseUoM || ""}
                      </td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td>{toIST(item.issuedAt)}</td>
                      <td>{item.receivedAt ? toIST(item.receivedAt) : "—"}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-icon btn-sm"
                          onClick={() => setViewModal(item)}
                          title="View details"
                        >
                          {Icons.eye}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="surface-body mobile-only">
            {issuances.length === 0 ? (
              <EmptyState
                title={loading ? "Loading history..." : "No issuances found"}
                copy="Clear filters or issue stock."
              />
            ) : (
              <div className="record-list">
                {issuances.map((item) => (
                  <article key={item._id} className="record-card">
                    <div className="record-card-head">
                      <div>
                        <div className="record-card-kicker">Issue</div>
                        <div className="record-card-title mono">{item.issuanceId}</div>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>

                    <div className="record-card-copy">
                      <strong>{item.materialCode}</strong>
                      <span>{item.sourceLabelId || clip(item.materialDescription, 84)}</span>
                    </div>

                    <div className="record-card-grid">
                      <div className="record-field">
                        <span>Source Label</span>
                        <strong className="mono">{item.sourceLabelId || "—"}</strong>
                      </div>
                      <div className="record-field">
                        <span>Quantity</span>
                        <strong className="mono">
                          {item.quantity} {item.baseUoM || ""}
                        </strong>
                      </div>
                      <div className="record-field">
                        <span>Issued At</span>
                        <strong>{toIST(item.issuedAt)}</strong>
                      </div>
                      <div className="record-field">
                        <span>Received At</span>
                        <strong>{item.receivedAt ? toIST(item.receivedAt) : "—"}</strong>
                      </div>
                    </div>

                    <div className="record-card-actions">
                      <label className="record-check">
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={selected.has(item._id)}
                          onChange={() =>
                            setSelected((current) => {
                              const next = new Set(current);
                              if (next.has(item._id)) next.delete(item._id);
                              else next.add(item._id);
                              return next;
                            })
                          }
                        />
                        Select
                      </label>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setViewModal(item)}
                      >
                        {Icons.eye}
                        View
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="table-footer">
            <div className="muted">
              Showing {visibleWindow.start} to {visibleWindow.end} of {total}
            </div>
            <div className="pagination">
              <button
                type="button"
                className="btn btn-secondary btn-compact"
                disabled={page <= 1}
                onClick={() => setPage(1)}
              >
                «
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-compact"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                ‹
              </button>
              <div className="page-index mono">
                {page} / {pages}
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-compact"
                disabled={page >= pages}
                onClick={() => setPage((current) => current + 1)}
              >
                ›
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-compact"
                disabled={page >= pages}
                onClick={() => setPage(pages)}
              >
                »
              </button>
            </div>
          </div>
        </section>
      </Reveal>

      {viewModal && (
        <IssuanceDetailModal issuance={viewModal} onClose={() => setViewModal(null)} />
      )}
    </div>
  );
}

function IssuanceDetailModal({ issuance, onClose }) {
  const lookupText = getQrLookupValue(issuance);
  const tat = getIssuanceTat(issuance);

  const handlePrint = () => {
    printIssueLabels([issuance]);
  };

  return (
    <Modal title={`Issue ${issuance.issuanceId}`} onClose={onClose} large>
      <div className="modal-body">
        <div className="detail-grid">
          <section className="surface-card" style={{ boxShadow: "none", background: "transparent" }}>
            <div className="surface-body" style={{ padding: 0 }}>
              <DetailRows
                items={[
                  { label: "Issue ID", value: issuance.issuanceId, className: "mono" },
                  { label: "Source Stock Label", value: issuance.sourceLabelId || "—", className: "mono" },
                  { label: "Source Batch", value: issuance.sourceBatchId || "—", className: "mono" },
                  { label: "Material Code", value: issuance.materialCode, className: "mono" },
                  { label: "Description", value: issuance.materialDescription || "—" },
                  { label: "Material Type", value: issuance.materialType || "—" },
                  { label: "Base UoM", value: issuance.baseUoM || "—" },
                  { label: "Quantity", value: issuance.quantity },
                  { label: "DMR Number", value: issuance.dmrNumber },
                  { label: "DMR Date", value: issuance.dmrDate ? toISTDate(issuance.dmrDate) : "—" },
                  { label: "Make", value: issuance.make || "—" },
                  { label: "Vendor", value: issuance.vendorName || "—" },
                  {
                    label: "Inward Printed",
                    value: issuance.sourceInwardPrintedAt ? toIST(issuance.sourceInwardPrintedAt) : "—"
                  },
                  { label: "Issued By", value: issuance.issuedByName || "—" },
                  { label: "Issued At", value: toIST(issuance.issuedAt) },
                  { label: "Status", value: statusLabel(issuance.status) },
                  { label: "Received By", value: issuance.receivedByName || "—" },
                  { label: "Received At", value: issuance.receivedAt ? toIST(issuance.receivedAt) : "—" },
                  { label: "Inward to Issue TAT", value: toTatLabel(tat.inwardToIssueMinutes) },
                  { label: "Issue to Accept TAT", value: toTatLabel(tat.issueToReceiveMinutes) },
                  { label: "End to End TAT", value: toTatLabel(tat.inwardToReceiveMinutes) },
                  { label: "QR Lookup Text", value: lookupText, className: "mono" },
                  { label: "Remarks", value: issuance.receiptRemarks || "—" }
                ]}
              />
            </div>
          </section>

          <section className="surface-card alt" style={{ boxShadow: "none", background: "transparent" }}>
            <div className="surface-body stack" style={{ padding: 0 }}>
              <div className="qr-frame">
                <img src={issuance.qrCodeData} alt="Issuance QR" />
              </div>
              <div className="callout info">
                <strong>QR text</strong>
                <p className="mono">{lookupText}</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={handlePrint}>
          {Icons.printer}
          Print
        </button>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  );
}

function AppShell({ user, onLogout }) {
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tutorialMode, setTutorialMode] = useState(
    () => localStorage.getItem("mg_tutorial_mode") === "1"
  );
  const [toasts, setToasts] = useState([]);
  const toastCounter = useRef(0);

  const toast = useCallback((msg, type = "info") => {
    const id = `${Date.now()}-${toastCounter.current++}`;
    setToasts((current) => [...current, { id, msg, type }]);
    setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 3600);
  }, []);

  const navigate = useCallback((page) => {
    setActivePage(page);
    setSidebarOpen(false);
  }, []);

  useEffect(() => {
    localStorage.setItem("mg_tutorial_mode", tutorialMode ? "1" : "0");
  }, [tutorialMode]);

  const contextValue = useMemo(
    () => ({
      user,
      toast,
      navigate,
      tutorialMode,
      setTutorialMode
    }),
    [user, toast, navigate, tutorialMode]
  );

  const navItems = [
    {
      key: "dashboard",
      label: "Overview",
      title: "Dashboard",
      section: "Overview",
      hint: "Queue and activity",
      group: "Overview",
      icon: Icons.dashboard,
      roles: ["stores", "production", "admin"]
    },
    {
      key: "flow",
      label: "Flow",
      title: "Flow Guide",
      section: "Overview",
      hint: "Shared process guide",
      group: "Overview",
      icon: Icons.spark,
      roles: ["stores", "production", "admin"]
    },
    {
      key: "masters",
      label: "Materials",
      title: "Material Master",
      section: "Records",
      hint: "Material data",
      group: "Records",
      icon: Icons.database,
      roles: ["stores", "admin"]
    },
    {
      key: "inward",
      label: "Inward",
      title: "Inward Labels",
      section: "Operations",
      hint: "Print pallet labels",
      group: "Operations",
      icon: Icons.layers,
      roles: ["stores", "admin"]
    },
    {
      key: "issue",
      label: "Issue",
      title: "Issue Stock",
      section: "Operations",
      hint: "Issue from stock",
      group: "Operations",
      icon: Icons.send,
      roles: ["stores", "admin"]
    },
    {
      key: "scan",
      label: "Receive",
      title: "Receive Material",
      section: "Operations",
      hint: "Receive issue labels",
      group: "Operations",
      icon: Icons.scan,
      roles: ["production", "admin"]
    },
    {
      key: "history",
      label: "History",
      title: "Movement History",
      section: "Records",
      hint: "Audit and export",
      group: "Records",
      icon: Icons.history,
      roles: ["stores", "production", "admin"]
    }
  ];

  const availableItems = navItems.filter((item) => item.roles.includes(user.role));
  const navGroups = ["Overview", "Operations", "Records"]
    .map((group) => ({
      title: group,
      items: availableItems.filter((item) => item.group === group)
    }))
    .filter((group) => group.items.length > 0);
  const currentPage = availableItems.find((item) => item.key === activePage) || availableItems[0];

  useEffect(() => {
    if (!availableItems.some((item) => item.key === activePage)) {
      setActivePage(availableItems[0]?.key || "dashboard");
    }
  }, [availableItems, activePage]);

  const renderPage = () => {
    switch (activePage) {
      case "flow":
        return <FlowGuide />;
      case "masters":
        return <MaterialMaster />;
      case "inward":
        return <InwardStock />;
      case "issue":
        return <IssueStock />;
      case "scan":
        return <ScanReceive />;
      case "history":
        return <IssuanceHistory />;
      case "dashboard":
      default:
        return <Dashboard />;
    }
  };

  return (
    <AppContext.Provider value={contextValue}>
      <ToastContainer toasts={toasts} />
      <div
        className={classNames("nav-backdrop", sidebarOpen && "show")}
        onClick={() => setSidebarOpen(false)}
      />
      <div className="app-shell topnav-shell">
        <header className="topbar">
          <div className="topbar-brand">
            <div className="brand-badge">
              <div className="brand-mark">MG</div>
              <div className="brand-title">
                <span>Operations Console</span>
                <strong>MatGate</strong>
              </div>
            </div>
            <div className="topbar-meta">
              <div className="topbar-kicker">{currentPage?.section || "Overview"}</div>
              <div className="topbar-title">{currentPage?.title || "Dashboard"}</div>
              <div className="topbar-subtitle">{currentPage?.hint || roleLabel(user.role)}</div>
            </div>
          </div>

          <nav className="topnav desktop-nav">
            {availableItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={classNames("topnav-link", activePage === item.key && "active")}
                onClick={() => navigate(item.key)}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="topbar-actions">
            <button
              type="button"
              className={classNames("btn", tutorialMode ? "btn-primary" : "btn-secondary", "btn-sm")}
              onClick={() => setTutorialMode((current) => !current)}
            >
              {Icons.spark}
              {tutorialMode ? "Guide On" : "Guide Off"}
            </button>
            <div className="context-pill nav-desktop-only">{roleLabel(user.role)}</div>
            <div className="time-pill nav-desktop-only">
              {Icons.clock}
              {toISTClock(new Date())}
            </div>
            <div className="user-chip nav-desktop-only">
              <span className={classNames("role-dot", user.role)} />
              {user.name}
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm nav-desktop-only"
              onClick={() => {
                localStorage.removeItem("mg_token");
                localStorage.removeItem("mg_user");
                onLogout();
              }}
            >
              {Icons.logout}
              Sign Out
            </button>
            <button
              type="button"
              className="hamburger topnav-toggle"
              onClick={() => setSidebarOpen((current) => !current)}
            >
              {Icons.menu}
            </button>
          </div>
        </header>

        <div className={classNames("topnav-panel", sidebarOpen && "open")}>
          {navGroups.map((group) => (
            <div key={group.title} className="topnav-group">
              <div className="topnav-caption">{group.title}</div>
              <div className="topnav-group-list">
                {group.items.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={classNames("topnav-item", activePage === item.key && "active")}
                    onClick={() => navigate(item.key)}
                  >
                    <div className="topnav-item-main">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    <span className="topnav-item-hint">{item.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="topnav-panel-footer">
            <div className="context-pill">{roleLabel(user.role)}</div>
            <div className="user-chip">
              <span className={classNames("role-dot", user.role)} />
              {user.name}
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                localStorage.removeItem("mg_token");
                localStorage.removeItem("mg_user");
                onLogout();
              }}
            >
              {Icons.logout}
              Sign Out
            </button>
          </div>
        </div>

        <main className="main-shell">
          <div className="page-wrap">{renderPage()}</div>
        </main>
      </div>
    </AppContext.Provider>
  );
}

function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("mg_user"));
    } catch (e) {
      return null;
    }
  });

  if (!user) {
    return <LoginScreen onLogin={setUser} />;
  }

  return <AppShell user={user} onLogout={() => setUser(null)} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
