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
        copy: "Use the dashboard to decide what to issue next and what still needs follow-up.",
        steps: [
          {
            title: "Start with Issue",
            copy: "Open Issue Material when a label needs to be created for the next movement."
          },
          {
            title: "Track pending receipts",
            copy: "Watch the pending count to see which issuances are still waiting on production."
          },
          {
            title: "Audit from History",
            copy: "Open History to confirm what has been issued, received, or rejected."
          }
        ]
      },
      production: {
        title: "Production walkthrough",
        copy: "The dashboard keeps the receive queue and verification path one click away.",
        steps: [
          {
            title: "Open Receive",
            copy: "Go to Receive Material when a label arrives at the production point."
          },
          {
            title: "Use camera first",
            copy: "Scan the label directly when possible, then fall back to manual lookup only if needed."
          },
          {
            title: "Confirm through History",
            copy: "Use History when you need to review an earlier receipt or rejection."
          }
        ]
      },
      admin: {
        title: "Admin walkthrough",
        copy: "Admin mode can move between stores, production, and audit tasks from one place.",
        steps: [
          {
            title: "Choose the lane",
            copy: "Jump into Issue or Receive depending on where the operational bottleneck is."
          },
          {
            title: "Maintain the master",
            copy: "Use Materials when bad master data is slowing down issue creation."
          },
          {
            title: "Audit exceptions",
            copy: "Review History to resolve rejects, mismatches, and open receipts."
          }
        ]
      }
    },
    masters: {
      default: {
        title: "Material master walkthrough",
        copy: "Keep master data accurate so issuing stays fast and predictable.",
        steps: [
          {
            title: "Filter to a narrow list",
            copy: "Use search and filters first so edits happen in a controlled subset."
          },
          {
            title: "Edit or add",
            copy: "Use Edit to correct an existing row or Add Material to introduce a new code."
          },
          {
            title: "Export when needed",
            copy: "Export filtered or selected rows when someone needs a controlled extract."
          }
        ]
      }
    },
    issue: {
      default: {
        title: "Issue workflow",
        copy: "This flow is intentionally short: pick the material, enter the movement details, and print.",
        steps: [
          {
            title: "Find the material",
            copy: "Search by code or description and confirm the linked material details before continuing."
          },
          {
            title: "Enter quantity and DMR",
            copy: "Only quantity and DMR are required beyond the material itself."
          },
          {
            title: "Generate and print",
            copy: "Create the issuance, then print the QR label for production receipt."
          }
        ]
      }
    },
    scan: {
      default: {
        title: "Receive workflow",
        copy: "Production can scan, verify the trace, and record the receipt decision in one pass.",
        steps: [
          {
            title: "Scan or paste",
            copy: "Open the camera for live scanning or paste the scan text from another device."
          },
          {
            title: "Verify the trace",
            copy: "Confirm the scanned key matches the issuance and review the resolved movement details."
          },
          {
            title: "Accept or reject",
            copy: "Accept when the movement is valid, or reject with remarks if the receipt should not proceed."
          }
        ]
      }
    },
    history: {
      default: {
        title: "History walkthrough",
        copy: "History is the audit workspace for search, review, and export.",
        steps: [
          {
            title: "Filter first",
            copy: "Search by issuance, material, or DMR and narrow the list with status or date filters."
          },
          {
            title: "Inspect the record",
            copy: "Open a row to view the QR label, status changes, and receipt remarks."
          },
          {
            title: "Page and export",
            copy: "Adjust the row count, move through pages, or export the selected result set."
          }
        ]
      }
    }
  };

  const pageContent = walkthroughs[page];
  if (!pageContent) return null;
  return pageContent[role] || pageContent.default || null;
}

function TutorialPanel({ page }) {
  const { user, tutorialMode, setTutorialMode } = useContext(AppContext);
  const tutorial = getTutorialContent(page, user.role);

  if (!tutorialMode || !tutorial) return null;

  return (
    <Reveal delay={50}>
      <section className="tutorial-panel">
        <div className="tutorial-head">
          <div>
            <div className="workspace-eyebrow">
              {Icons.spark}
              Tutorial Mode
            </div>
            <h3>{tutorial.title}</h3>
            <p>{tutorial.copy}</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setTutorialMode(false)}
          >
            {Icons.close}
            Hide Tutorial
          </button>
        </div>

        <div className="tutorial-grid">
          {tutorial.steps.map((step, index) => (
            <div key={step.title} className="tutorial-step">
              <span className="tutorial-index mono">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </Reveal>
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
      copy: "Issue labels, review pending receipts, and maintain master data."
    },
    {
      role: "Production",
      username: "production",
      password: "prod123",
      copy: "Scan incoming labels, verify trace details, and close receipts."
    },
    {
      role: "Admin",
      username: "admin",
      password: "admin123",
      copy: "Monitor operations, resolve exceptions, and audit the full history."
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
              <h1>MatGate Management System</h1>
              <p>Sign in to your account</p>
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

              <div className="field-note">Session is role-based and expires after 12 hours.</div>
            </form>
          </section>

          <aside className="login-panel login-demo-panel">
            <div className="login-demo-head">
              <div className="login-demo-title">
                {Icons.users}
                <h2>Demo User Credentials</h2>
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
                Click "Show Credentials" to view demo user accounts
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
        const [statsData, recentData] = await Promise.all([
          api("/api/issuances/stats"),
          api(`/api/issuances?page=${recentPage}&limit=${recentLimit}`)
        ]);

        if (!cancelled) {
          setStats(statsData);
          setRecent(recentData.issuances || []);
          setRecentPages(recentData.pages || 1);
          setRecentTotal(recentData.total || 0);
        }
      } catch (e) {
        if (!cancelled) {
          setStats(null);
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
  }, [recentPage, recentLimit]);

  const quickActions = [
    {
      key: "issue",
      label: "Issue Material",
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

  const heroStats = [
    { label: "Pending Receipt", value: stats?.issued ?? "—", tone: "warning" },
    { label: "Received", value: stats?.received ?? "—", tone: "success" },
    { label: "Rejected", value: stats?.rejected ?? "—", tone: "danger" },
    { label: "Opened Today", value: stats?.todayCount ?? "—", tone: "primary" }
  ];

  const metricCards = [
    {
      label: "Lane",
      value: roleLabel(user.role),
      copy: "Current operating lane.",
      tone: "primary"
    },
    {
      label: "Total Movements",
      value: stats?.total ?? "—",
      copy: "All tracked issuances.",
      tone: "success"
    },
    {
      label: "Awaiting Receipt",
      value: stats?.issued ?? "—",
      copy: "Still pending production action.",
      tone: "warning"
    },
    {
      label: "Rejected",
      value: stats?.rejected ?? "—",
      copy: "Need follow-up or reissue.",
      tone: "danger"
    }
  ];

  const actionCards = quickActions.map((action) => ({
    ...action,
    copy:
      {
        issue: "Create an issuance and print a label.",
        scan: "Resolve a scan and confirm receipt.",
        history: "Search, inspect, and export records."
      }[action.key] || "Open the next task."
  }));

  const recentWindow = pageWindow(recentPage, recentLimit, recentTotal);

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
          title="Dashboard"
          description="Monitor pending receipts, open the next transaction, and review the latest movements."
          actions={
            <>
              {quickActions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  className={classNames(
                    "btn",
                    action.key === "issue" ? "btn-primary" : "btn-secondary"
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
            <>
              <div className="workflow-step compact">
                <span className="step-label">Lane</span>
                <strong>{roleLabel(user.role)}</strong>
                <p>{user.name}</p>
              </div>
              <div className="workflow-step compact">
                <span className="step-label">Lookup Standard</span>
                <strong>Issuance ID</strong>
                <p>New and legacy labels resolve to the same receipt key.</p>
              </div>
            </>
          }
        />
      </Reveal>

      <TutorialPanel page="dashboard" />

      <Reveal delay={90}>
        <div className="metric-grid">
          {metricCards.map((card) => (
            <div key={card.label} className={classNames("metric-card", card.tone)}>
              <div className="metric-kicker">{card.label}</div>
              <div className="metric-value">{card.value}</div>
              <div className="metric-copy">{card.copy}</div>
            </div>
          ))}
        </div>
      </Reveal>

      <div className="split-grid">
        <Reveal delay={140}>
          <section className="surface-card alt">
            <div className="surface-header">
              <div className="surface-title">
                <h3>Primary actions</h3>
              </div>
            </div>
            <div className="surface-body stack">
              <div className="workflow-grid">
                {actionCards.map((action) => (
                  <div key={action.key} className="workflow-card">
                    <div className="workflow-icon">{action.icon}</div>
                    <h4 className="workflow-title">{action.label}</h4>
                    <p className="workflow-copy">{action.copy}</p>
                    <button
                      type="button"
                      className={classNames(
                        "btn",
                        action.key === "issue" ? "btn-primary" : "btn-secondary",
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
                <h3>Recent movements</h3>
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
                    <th>Issuance ID</th>
                    <th>Material</th>
                    <th>Quantity</th>
                    <th>DMR</th>
                    <th>Status</th>
                    <th>Issued At</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 ? (
                    <tr>
                      <td colSpan="6">
                        <EmptyState
                          title="No issuances yet"
                          copy="Create the first issuance to start the queue."
                        />
                      </td>
                    </tr>
                  ) : (
                    recent.map((item) => (
                      <tr key={item._id}>
                        <td className="mono" style={{ color: "var(--primary)", fontWeight: 700 }}>
                          {item.issuanceId}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: "var(--ink)" }}>
                            {item.materialCode}
                          </div>
                          <div className="muted">{clip(item.materialDescription, 48)}</div>
                        </td>
                        <td className="mono">
                          {item.quantity} {item.baseUoM}
                        </td>
                        <td className="mono">{item.dmrNumber}</td>
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
                  title="No issuances yet"
                  copy="Create the first issuance to start the queue."
                />
              ) : (
                <div className="record-list">
                  {recent.map((item) => (
                    <article key={item._id} className="record-card">
                      <div className="record-card-head">
                        <div>
                          <div className="record-card-kicker">Issuance</div>
                          <div className="record-card-title mono">{item.issuanceId}</div>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                      <div className="record-card-copy">
                        <strong>{item.materialCode}</strong>
                        <span>{clip(item.materialDescription, 64)}</span>
                      </div>
                      <div className="record-card-grid">
                        <div className="record-field">
                          <span>Quantity</span>
                          <strong className="mono">
                            {item.quantity} {item.baseUoM}
                          </strong>
                        </div>
                        <div className="record-field">
                          <span>DMR</span>
                          <strong className="mono">{item.dmrNumber}</strong>
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
          description="Maintain clean material data for issue, receipt, and export workflows."
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

function IssueMaterial() {
  const { toast, user } = useContext(AppContext);
  const emptyForm = {
    materialCode: "",
    materialDescription: "",
    materialType: "",
    baseUoM: "",
    quantity: "",
    dmrNumber: ""
  };
  const [form, setForm] = useState({
    ...emptyForm
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

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
    setForm({ ...emptyForm });
  };

  const handleIssue = async () => {
    if (!form.materialCode || !form.quantity || !form.dmrNumber) {
      toast("Material code, quantity, and DMR number are required.", "error");
      return;
    }

    setLoading(true);
    try {
      const data = await api("/api/issuances", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          quantity: Number(form.quantity)
        })
      });
      setResult(data);
      toast("Material issued and QR label generated.", "success");
      resetForm();
    } catch (e) {
      toast(e.message, "error");
    }
    setLoading(false);
  };

  const handlePrint = () => {
    if (!result) return;

    const lookupText = getQrLookupValue(result);
    const printWindow = window.open("", "_blank", "width=560,height=760");
    printWindow.document.write(`<!DOCTYPE html>
      <html>
      <head>
        <title>MatGate Label ${result.issuanceId}</title>
        <style>
          body{margin:0;padding:28px;font-family:Arial,sans-serif;background:#f7f9fc;color:#0f172a}
          .card{max-width:460px;margin:0 auto;background:#fff;border:1px solid #d8e1ec;border-radius:24px;padding:24px;box-shadow:0 20px 60px rgba(15,23,42,.08)}
          .eyebrow{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#47668f;font-weight:700}
          h1{margin:12px 0 18px;font-size:24px;line-height:1;letter-spacing:-.04em}
          .row{display:flex;justify-content:space-between;gap:18px;padding:10px 0;border-bottom:1px solid #edf2f7;font-size:13px}
          .row span:first-child{color:#6b7f97;text-transform:uppercase;letter-spacing:.12em;font-size:10px;font-weight:700}
          .row span:last-child{text-align:right;font-weight:700}
          .qr{margin:22px 0;display:grid;place-items:center}
          .qr img{width:220px;padding:12px;background:#fff;border-radius:22px;box-shadow:0 16px 40px rgba(15,23,42,.08)}
          .footer{margin-top:18px;font-size:12px;color:#47668f;line-height:1.6}
        </style>
      </head>
      <body>
        <div class="card">
          <div class="eyebrow">Material Issue Label</div>
          <h1>${result.issuanceId}</h1>
          <div class="row"><span>Material</span><span>${result.materialCode}</span></div>
          <div class="row"><span>Description</span><span>${clip(result.materialDescription, 42)}</span></div>
          <div class="row"><span>Quantity</span><span>${result.quantity} ${result.baseUoM}</span></div>
          <div class="row"><span>DMR</span><span>${result.dmrNumber}</span></div>
          <div class="row"><span>Issued By</span><span>${result.issuedByName}</span></div>
          <div class="row"><span>Issued At</span><span>${toIST(result.issuedAt)}</span></div>
          <div class="row"><span>QR Lookup Text</span><span>${lookupText}</span></div>
          <div class="qr"><img src="${result.qrCodeData}" alt="QR Code" /></div>
          <div class="footer">Scan to receive by issuance ID.</div>
        </div>
      </body>
      </html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 400);
  };

  const previewItems = [
    { label: "Operator", value: user.name },
    { label: "Role", value: roleLabel(user.role) },
    { label: "Material", value: form.materialCode || "Select material" },
    { label: "Description", value: form.materialDescription || "Auto-filled on selection." },
    { label: "Quantity", value: form.quantity ? `${form.quantity} ${form.baseUoM || ""}` : "Enter quantity" },
    { label: "DMR", value: form.dmrNumber || "Enter DMR number" }
  ];

  const heroStats = [
    { label: "Operator", value: user.name, tone: "primary" },
    {
      label: "Material",
      value: form.materialCode || "Pending",
      tone: form.materialCode ? "success" : "warning"
    },
    {
      label: "Quantity",
      value: form.quantity || "Pending",
      tone: form.quantity ? "success" : "warning"
    },
    {
      label: "DMR",
      value: form.dmrNumber || "Pending",
      tone: form.dmrNumber ? "success" : "warning"
    }
  ];

  if (result) {
    const lookupText = getQrLookupValue(result);

    return (
      <div className="page-stack">
        <Reveal>
          <PageHero
            eyebrow={
              <>
                {Icons.qr}
                Issuance Created
              </>
            }
            title="Issuance ready"
            description="Print the QR label now or move directly into the next issuance."
            actions={
              <>
                <button type="button" className="btn btn-primary" onClick={handlePrint}>
                  {Icons.printer}
                  Print
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setResult(null)}
                >
                  {Icons.plus}
                  New Issue
                </button>
              </>
            }
            stats={[
              { label: "Issuance ID", value: result.issuanceId, tone: "primary" },
              { label: "Status", value: statusLabel(result.status), tone: "success" },
              { label: "QR Lookup", value: lookupText, tone: "warning" },
              { label: "Issued At", value: toIST(result.issuedAt), tone: "danger" }
            ]}
            aside={
              <div className="workflow-step compact">
                <span className="step-label">QR Lookup</span>
                <strong>Resolve {lookupText}</strong>
                <p>Print the label or start the next issuance.</p>
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
                  <h3>Printable QR Label</h3>
                </div>
              </div>
              <div className="surface-body stack">
                <div className="qr-frame">
                  <img src={result.qrCodeData} alt="Issuance QR Code" />
                </div>
                <div className="callout success">
                  <strong>QR lookup text</strong>
                  <p className="mono">{lookupText}</p>
                </div>
              </div>
            </section>
          </Reveal>

          <Reveal delay={140}>
            <section className="surface-card alt">
              <div className="surface-header">
                <div className="surface-title">
                  <h3>Label Summary</h3>
                </div>
              </div>
              <div className="surface-body stack">
                <SummaryGrid
                  items={[
                    { label: "Material Code", value: result.materialCode },
                    { label: "Description", value: result.materialDescription || "—" },
                    { label: "Quantity", value: `${result.quantity} ${result.baseUoM}` },
                    { label: "DMR Number", value: result.dmrNumber },
                    { label: "Issued By", value: result.issuedByName },
                    { label: "Issued At", value: toIST(result.issuedAt) },
                    { label: "Status", value: statusLabel(result.status) },
                    { label: "QR Lookup Text", value: lookupText, className: "mono" }
                  ]}
                />
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
              Operations
            </>
          }
          title="Issue material"
          description="Search the material, confirm movement details, and generate the receipt label."
          stats={heroStats}
          aside={
            <div className="workflow-step compact">
              <span className="step-label">Label Payload</span>
              <strong>Issuance ID</strong>
              <p>Generated after submit and used during receipt.</p>
            </div>
          }
        />
      </Reveal>

      <TutorialPanel page="issue" />

      <div className="form-layout">
        <Reveal delay={90}>
          <section className="surface-card">
            <div className="surface-header">
              <div className="surface-title">
                <h3>Issue details</h3>
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

              {form.materialDescription && (
                <div className="callout info">
                  <strong>Linked material</strong>
                  <p>
                    {form.materialDescription} • {form.materialType || "No type"} •{" "}
                    {form.baseUoM || "No UoM"}
                  </p>
                </div>
              )}

              <div className="field-grid">
                <div className="field">
                  <label>Quantity</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.quantity}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, quantity: event.target.value }))
                    }
                    placeholder="Enter quantity"
                  />
                </div>

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
              </div>

              <div className="field">
                <label>Time (IST)</label>
                <div className="input-like">{toIST(new Date())}</div>
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal delay={140}>
          <section className="surface-card alt">
            <div className="surface-header">
              <div className="surface-title">
                <h3>Ready check</h3>
              </div>
            </div>
            <div className="surface-body stack">
              <SummaryGrid items={previewItems} />

              <div className="callout warning">
                <strong>QR text</strong>
                <p>The generated label stores the issuance ID used by receipt.</p>
              </div>
            </div>
          </section>
        </Reveal>
      </div>

      <Reveal delay={190}>
        <ActionDock>
          {(form.materialCode || form.quantity || form.dmrNumber) && (
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              {Icons.close}
              Clear
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleIssue}
            disabled={loading || !form.materialCode || !form.quantity || !form.dmrNumber}
          >
            {Icons.qr}
            {loading ? "Generating..." : "Generate Label"}
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

  const heroStats = issuance
    ? [
        { label: "Issuance ID", value: issuance.issuanceId, tone: "primary" },
        { label: "Scanned Key", value: scanTrace?.lookupKey || "—", tone: "success" },
        { label: "Stored QR Key", value: storedLookupText, tone: "warning" },
        { label: "Status", value: statusLabel(issuance.status), tone: "danger" }
      ]
    : [
        { label: "Lane", value: roleLabel(user.role), tone: "primary" },
        { label: "Scanner", value: scanning ? "Live" : "Idle", tone: "success" },
        { label: "QR Standard", value: "Issuance ID", tone: "warning" },
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
              ? "Validate the trace, review the record, and capture the receipt outcome."
              : "Scan a label or use manual lookup to open the receipt review."
          }
          stats={heroStats}
          aside={
            <div className="workflow-step compact">
              <span className="step-label">Next Action</span>
              <strong>{issuance ? (issuance.status === "issued" ? "Accept or reject" : "Review only") : "Start with scan"}</strong>
              <p>
                {issuance
                  ? issuance.status === "issued"
                    ? "Reject requires remarks."
                    : "This record already has a receipt decision."
                  : "Camera scan is fastest; manual lookup stays available."}
              </p>
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
                    <label>Issuance ID or scanned text</label>
                    <input
                      value={manualId}
                      onChange={(event) => setManualId(event.target.value)}
                      onKeyDown={(event) => event.key === "Enter" && handleManualLookup()}
                      placeholder="e.g. MG-260320-ABC12"
                    />
                  </div>

                  <div className="callout info">
                    <strong>Accepted inputs</strong>
                    <p>Issuance ID, raw QR text, or legacy JSON payload.</p>
                  </div>

                  <div className="checklist">
                    <div className="checklist-item">
                      {Icons.check}
                      <span>Open camera for live labels on the shop floor.</span>
                    </div>
                    <div className="checklist-item">
                      {Icons.check}
                      <span>Paste the scan text when a scanner feeds data into another system.</span>
                    </div>
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
                            ? "Lookup matches."
                            : "Lookup mismatch."
                          : `Already ${issuance.status}.`}
                      </strong>
                      <p>
                        {issuance.status === "issued"
                          ? lookupMatches
                            ? "Scan text and receipt key are aligned."
                            : "Review the trace before you act."
                          : "Trace is available for review only."}
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
                      { label: "Material Code", value: issuance.materialCode, className: "mono" },
                      { label: "Description", value: issuance.materialDescription || "—" },
                      { label: "Quantity", value: `${issuance.quantity} ${issuance.baseUoM || ""}` },
                      { label: "DMR Number", value: issuance.dmrNumber },
                      { label: "Issued By", value: issuance.issuedByName || "—" },
                      { label: "Issued At", value: toIST(issuance.issuedAt) },
                      { label: "Stored QR Key", value: storedLookupText, className: "mono" },
                      {
                        label: "Receipt Remarks",
                        value: issuance.receiptRemarks || "Awaiting action."
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
        "Material Code": item.materialCode,
        Description: item.materialDescription,
        "Material Type": item.materialType,
        "Base UoM": item.baseUoM,
        Quantity: item.quantity,
        "DMR Number": item.dmrNumber,
        "Issued By": item.issuedByName,
        "Issued At (IST)": toIST(item.issuedAt),
        Status: statusLabel(item.status),
        "Received By": item.receivedByName || "",
        "Received At (IST)": item.receivedAt ? toIST(item.receivedAt) : "",
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
          title="Issuance history"
          description="Filter, inspect, and export movement records for audit and operational follow-up."
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
                  placeholder="Search issuance ID, material, or DMR"
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
                    Issuance ID
                    <SortArrow column="issuanceId" />
                  </th>
                  <th onClick={() => handleSort("materialCode")}>
                    Material
                    <SortArrow column="materialCode" />
                  </th>
                  <th onClick={() => handleSort("quantity")}>
                    Quantity
                    <SortArrow column="quantity" />
                  </th>
                  <th>DMR</th>
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
                        copy="Clear filters or issue new records."
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
                      <td>
                        <div className="mono" style={{ color: "var(--ink)" }}>
                          {item.materialCode}
                        </div>
                        <div className="muted">{clip(item.materialDescription, 44)}</div>
                      </td>
                      <td className="mono">
                        {item.quantity} {item.baseUoM || ""}
                      </td>
                      <td className="mono">{item.dmrNumber}</td>
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
                copy="Clear filters or issue new records."
              />
            ) : (
              <div className="record-list">
                {issuances.map((item) => (
                  <article key={item._id} className="record-card">
                    <div className="record-card-head">
                      <div>
                        <div className="record-card-kicker">Issuance</div>
                        <div className="record-card-title mono">{item.issuanceId}</div>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>

                    <div className="record-card-copy">
                      <strong>{item.materialCode}</strong>
                      <span>{clip(item.materialDescription, 84)}</span>
                    </div>

                    <div className="record-card-grid">
                      <div className="record-field">
                        <span>Quantity</span>
                        <strong className="mono">
                          {item.quantity} {item.baseUoM || ""}
                        </strong>
                      </div>
                      <div className="record-field">
                        <span>DMR</span>
                        <strong className="mono">{item.dmrNumber}</strong>
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

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=560,height=760");
    printWindow.document.write(`<!DOCTYPE html>
      <html>
      <head>
        <title>MatGate Label ${issuance.issuanceId}</title>
        <style>
          body{margin:0;padding:28px;font-family:Arial,sans-serif;background:#f7f9fc;color:#0f172a}
          .card{max-width:460px;margin:0 auto;background:#fff;border:1px solid #d8e1ec;border-radius:24px;padding:24px;box-shadow:0 20px 60px rgba(15,23,42,.08)}
          .eyebrow{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#47668f;font-weight:700}
          h1{margin:12px 0 18px;font-size:24px;line-height:1;letter-spacing:-.04em}
          .row{display:flex;justify-content:space-between;gap:18px;padding:10px 0;border-bottom:1px solid #edf2f7;font-size:13px}
          .row span:first-child{color:#6b7f97;text-transform:uppercase;letter-spacing:.12em;font-size:10px;font-weight:700}
          .row span:last-child{text-align:right;font-weight:700}
          .qr{margin:22px 0;display:grid;place-items:center}
          .qr img{width:220px;padding:12px;background:#fff;border-radius:22px;box-shadow:0 16px 40px rgba(15,23,42,.08)}
        </style>
      </head>
      <body>
        <div class="card">
          <div class="eyebrow">Material Issue Label</div>
          <h1>${issuance.issuanceId}</h1>
          <div class="row"><span>Material</span><span>${issuance.materialCode}</span></div>
          <div class="row"><span>Description</span><span>${clip(issuance.materialDescription, 42)}</span></div>
          <div class="row"><span>Quantity</span><span>${issuance.quantity} ${issuance.baseUoM || ""}</span></div>
          <div class="row"><span>DMR</span><span>${issuance.dmrNumber}</span></div>
          <div class="row"><span>Issued By</span><span>${issuance.issuedByName || ""}</span></div>
          <div class="row"><span>Issued At</span><span>${toIST(issuance.issuedAt)}</span></div>
          <div class="row"><span>QR Lookup Text</span><span>${lookupText}</span></div>
          <div class="qr"><img src="${issuance.qrCodeData}" alt="QR Code" /></div>
        </div>
      </body>
      </html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 400);
  };

  return (
    <Modal title={`Issuance ${issuance.issuanceId}`} onClose={onClose} large>
      <div className="modal-body">
        <div className="detail-grid">
          <section className="surface-card" style={{ boxShadow: "none", background: "transparent" }}>
            <div className="surface-body" style={{ padding: 0 }}>
              <DetailRows
                items={[
                  { label: "Issuance ID", value: issuance.issuanceId, className: "mono" },
                  { label: "Material Code", value: issuance.materialCode, className: "mono" },
                  { label: "Description", value: issuance.materialDescription || "—" },
                  { label: "Material Type", value: issuance.materialType || "—" },
                  { label: "Base UoM", value: issuance.baseUoM || "—" },
                  { label: "Quantity", value: issuance.quantity },
                  { label: "DMR Number", value: issuance.dmrNumber },
                  { label: "Issued By", value: issuance.issuedByName || "—" },
                  { label: "Issued At", value: toIST(issuance.issuedAt) },
                  { label: "Status", value: statusLabel(issuance.status) },
                  { label: "Received By", value: issuance.receivedByName || "—" },
                  { label: "Received At", value: issuance.receivedAt ? toIST(issuance.receivedAt) : "—" },
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
      hint: "Queue and recent activity",
      group: "Overview",
      icon: Icons.dashboard,
      roles: ["stores", "production", "admin"]
    },
    {
      key: "masters",
      label: "Materials",
      title: "Material Master",
      section: "Records",
      hint: "Maintain master data",
      group: "Records",
      icon: Icons.database,
      roles: ["stores", "admin"]
    },
    {
      key: "issue",
      label: "Issue",
      title: "Issue Material",
      section: "Operations",
      hint: "Create a new issuance",
      group: "Operations",
      icon: Icons.send,
      roles: ["stores", "admin"]
    },
    {
      key: "scan",
      label: "Receive",
      title: "Receive Material",
      section: "Operations",
      hint: "Accept or reject scans",
      group: "Operations",
      icon: Icons.scan,
      roles: ["production", "admin"]
    },
    {
      key: "history",
      label: "History",
      title: "Issuance History",
      section: "Records",
      hint: "Search and export records",
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
      case "masters":
        return <MaterialMaster />;
      case "issue":
        return <IssueMaterial />;
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
              {tutorialMode ? "Tutorial On" : "Tutorial Off"}
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
