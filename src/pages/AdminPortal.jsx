import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isAdmin } from "../utils/permissions";

const SIDEBAR_LINKS = [
  { to: "/admin", end: true, label: "Overview", icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z M4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z M16 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z M16 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" },
  { to: "/manage-events", end: false, label: "Manage Events", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { to: "/event-approval", end: false, label: "Event Approval", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  { to: "/dashboard", end: false, label: "Dashboard", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { to: "/admin/assignments", end: false, label: "Assignments", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  { to: "/communities", end: false, label: "Communities", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m3-7h3m-3 3h3m-6 0h.01M12 16h.01M12 8h.01M16 16h.01M8 16h.01M12 12v.01" },
];

function SidebarIcon({ d, className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d} />
    </svg>
  );
}

function AdminPortal() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const [dismissWelcome, setDismissWelcome] = useState(false);
  const [welcomeExiting, setWelcomeExiting] = useState(false);
  const showWelcome = Boolean(location.state?.fromLogin) && !dismissWelcome;
  const showWelcomeMessage = showWelcome || welcomeExiting;

  const startWelcomeExit = () => {
    if (welcomeExiting) return;
    setWelcomeExiting(true);
  };

  const handleWelcomeAnimationEnd = (e) => {
    if (e.animationName === "welcomeSlideUp") {
      setDismissWelcome(true);
      setWelcomeExiting(false);
    }
  };

  useEffect(() => {
    if (!showWelcome) return;
    const timer = setTimeout(startWelcomeExit, 3000);
    return () => clearTimeout(timer);
  }, [showWelcome]);

  useEffect(() => {
    if (loading) return;
    if (!user || !isAdmin(user)) {
      navigate("/login", { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f6f3]">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#f7f6f3]">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-[#0b2d52] text-white shadow-xl">
        <div className="p-5 border-b border-white/10">
          <Link to="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <SidebarIcon d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/60">An-Najah</p>
              <p className="font-semibold text-sm tracking-tight" style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}>Admin Portal</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {SIDEBAR_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <SidebarIcon d={item.icon} className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="rounded-lg bg-white/5 px-3 py-2">
            <p className="text-xs font-medium text-white/90 truncate">{user.name || user.email}</p>
            <p className="text-[10px] text-white/60 truncate">Administrator</p>
          </div>
        </div>
      </aside>

      {/* Main content — empty */}
      <div className="flex-1 flex flex-col min-w-0">
        {showWelcomeMessage && (
          <>
            <style>{`
              @keyframes welcomeSlideDown {
                from { transform: translateY(-100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
              }
              @keyframes welcomeSlideUp {
                from { transform: translateY(0); opacity: 1; }
                to { transform: translateY(-100%); opacity: 0; }
              }
              .welcome-enter-admin { animation: welcomeSlideDown 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
              .welcome-exit-admin { animation: welcomeSlideUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
            `}</style>
            <div className="flex-shrink-0 px-6 pt-4">
              <div
                className={`max-w-2xl rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden ${welcomeExiting ? "welcome-exit-admin" : "welcome-enter-admin"}`}
                onAnimationEnd={handleWelcomeAnimationEnd}
              >
                <div className="flex items-center justify-between gap-4 py-3 pl-4 pr-3 border-l-4 border-[#00356b]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#00356b]/10 flex items-center justify-center flex-shrink-0">
                      <SidebarIcon d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" className="w-4 h-4 text-[#00356b]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Admin Portal</p>
                      <p className="text-sm font-semibold text-[#0b2d52]" style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}>Welcome back, Admin</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={startWelcomeExit}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00356b]/20"
                    aria-label="Dismiss"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        <main className="flex-1 p-6 lg:p-10 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
              <SidebarIcon d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-semibold text-slate-700" style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}>Overview</h2>
            <p className="mt-2 text-sm text-slate-500">Select an item from the sidebar to get started.</p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminPortal;
