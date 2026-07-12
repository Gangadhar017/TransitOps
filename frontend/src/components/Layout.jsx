import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  IconGrid, IconRoute, IconTruck, IconUser, IconWrench, IconWallet,
  IconChart, IconBell, IconSearch, IconPlus, IconLogout, IconMoon, IconSun,
  IconAlert, IconCalendar,
} from './icons';

// hideFor: RBAC — Drivers have no access to Fuel Logs / Expenses
const NAV = [
  { to: '/', label: 'Dashboard', icon: <IconGrid /> },
  { to: '/trips', label: 'Trips', icon: <IconRoute /> },
  { to: '/vehicles', label: 'Vehicles', icon: <IconTruck /> },
  { to: '/drivers', label: 'Drivers', icon: <IconUser /> },
  { to: '/maintenance', label: 'Maintenance', icon: <IconWrench /> },
  { to: '/expenses', label: 'Expenses', icon: <IconWallet />, hideFor: ['DRIVER'] },
  { to: '/reports', label: 'Reports', icon: <IconChart /> },
];

// Role-specific quick action in the sidebar
const CTA = {
  FLEET_MANAGER: { label: 'Log New Maintenance', to: '/maintenance' },
  DRIVER: { label: 'New Trip', to: '/trips' },
  SAFETY_OFFICER: { label: 'Add Driver', to: '/drivers' },
  FINANCIAL_ANALYST: { label: 'View Reports', to: '/reports' },
};

const initials = (name) => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const daysUntil = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem('transitops_theme') || 'light');
  const [menu, setMenu] = useState(null); // null | 'bell' | 'profile'
  const [alerts, setAlerts] = useState([]);
  const [search, setSearch] = useState('');
  const topRightRef = useRef(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('transitops_theme', theme);
  }, [theme]);

  // Live notifications from real data — refreshed on route change
  useEffect(() => {
    let alive = true;
    Promise.all([api.get('/drivers'), api.get('/maintenance?status=OPEN'), api.get('/trips?status=DRAFT')])
      .then(([drivers, maint, drafts]) => {
        if (!alive) return;
        const now = new Date();
        setAlerts([
          ...drivers
            .filter((d) => new Date(d.licenseExpiry) < now)
            .map((d) => ({ tone: 'red', icon: <IconAlert size={16} />, title: 'License expired', desc: `${d.name} is blocked from dispatch.` })),
          ...drivers
            .filter((d) => { const dd = daysUntil(d.licenseExpiry); return dd >= 0 && dd <= 30; })
            .map((d) => ({ tone: 'amber', icon: <IconCalendar size={16} />, title: 'License expiring soon', desc: `${d.name} — ${daysUntil(d.licenseExpiry)} days left.` })),
          ...drivers
            .filter((d) => d.status === 'SUSPENDED')
            .map((d) => ({ tone: 'red', icon: <IconUser size={16} />, title: 'Driver suspended', desc: `${d.name} (safety score ${d.safetyScore}).` })),
          ...maint.map((m) => ({ tone: 'amber', icon: <IconWrench size={16} />, title: 'Vehicle in shop', desc: `${m.vehicle.name} — ${m.title}.` })),
          ...drafts.map((t) => ({ tone: 'blue', icon: <IconRoute size={16} />, title: 'Trip awaiting dispatch', desc: `#${t.id} ${t.source} → ${t.destination}.` })),
        ]);
      })
      .catch(() => {}); // notifications are best-effort
    return () => { alive = false; };
  }, [menu === 'bell']);

  // Close dropdowns on outside click
  useEffect(() => {
    function onClick(e) {
      if (topRightRef.current && !topRightRef.current.contains(e.target)) setMenu(null);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function submitSearch(e) {
    if (e.key === 'Enter' && search.trim()) {
      navigate(`/vehicles?q=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  }

  const cta = CTA[user.role] || CTA.DRIVER;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="side-brand">
          <div className="brand-ico"><IconTruck size={22} /></div>
          <div>
            <div className="brand-name">TransitOps</div>
            <div className="brand-tag">Fleet Operations</div>
          </div>
        </div>

        <button className="side-cta" onClick={() => navigate(cta.to)}>
          <IconPlus size={15} /> {cta.label}
        </button>

        <nav>
          {NAV.filter((item) => !item.hideFor?.includes(user.role)).map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className="nav-link">
              {item.icon} {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="side-foot">
          <button className="nav-link" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? <IconMoon /> : <IconSun />} {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>
          <button className="nav-link" onClick={logout}>
            <IconLogout /> Log Out
          </button>
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <span className="topbar-title">Operations Command</span>
          <div className="topbar-search">
            <IconSearch size={16} />
            <input
              placeholder="Search vehicles by name or reg no…  ⏎"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={submitSearch}
            />
          </div>

          <div className="topbar-right" ref={topRightRef}>
            {/* ---- Notifications ---- */}
            <button className="icon-btn" title="Notifications" onClick={() => setMenu(menu === 'bell' ? null : 'bell')}>
              <IconBell />
              {alerts.length > 0 && <span className="bell-count">{alerts.length > 9 ? '9+' : alerts.length}</span>}
            </button>
            {menu === 'bell' && (
              <div className="dropdown dropdown-bell">
                <div className="dropdown-head">
                  <strong>Notifications</strong>
                  {alerts.length > 0 && <span className="chip chip-red">{alerts.length} active</span>}
                </div>
                <div className="dropdown-scroll">
                  {alerts.length === 0 && <p className="muted small" style={{ padding: '14px 16px' }}>All clear — no alerts right now. ✓</p>}
                  {alerts.slice(0, 8).map((a, i) => (
                    <div key={i} className="dropdown-alert">
                      <div className={`alert-ico tone-${a.tone}`}>{a.icon}</div>
                      <div>
                        <div className="alert-title">{a.title}</div>
                        <div className="alert-desc">{a.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="dropdown-foot" onClick={() => { setMenu(null); navigate('/'); }}>
                  View all on dashboard →
                </button>
              </div>
            )}

            {/* ---- Profile ---- */}
            <button className="avatar-btn" onClick={() => setMenu(menu === 'profile' ? null : 'profile')}>
              <div className="avatar">{initials(user.name)}</div>
              <div className="user-meta">
                <strong>{user.name}</strong>
                <small>{user.role.replaceAll('_', ' ')}</small>
              </div>
            </button>
            {menu === 'profile' && (
              <div className="dropdown dropdown-profile">
                <div className="profile-card">
                  <div className="avatar avatar-lg">{initials(user.name)}</div>
                  <div>
                    <strong>{user.name}</strong>
                    <div className="muted small">{user.email}</div>
                    <span className="chip chip-blue" style={{ marginTop: 6, display: 'inline-block' }}>
                      {user.role.replaceAll('_', ' ')}
                    </span>
                  </div>
                </div>
                <button className="dropdown-item" onClick={() => { setMenu(null); navigate('/reports'); }}>
                  <IconChart size={16} /> My Reports
                </button>
                <button className="dropdown-item" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                  {theme === 'light' ? <IconMoon size={16} /> : <IconSun size={16} />} Switch to {theme === 'light' ? 'dark' : 'light'} mode
                </button>
                <button className="dropdown-item danger" onClick={logout}>
                  <IconLogout size={16} /> Log out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
