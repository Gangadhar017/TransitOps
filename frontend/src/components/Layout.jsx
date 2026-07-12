import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  IconGrid, IconRoute, IconTruck, IconUser, IconWrench, IconWallet,
  IconChart, IconBell, IconSearch, IconPlus, IconLogout, IconMoon, IconSun,
} from './icons';

// hideFor: RBAC matrix — Drivers have no access to Fuel Logs / Expenses
const NAV = [
  { to: '/', label: 'Dashboard', icon: <IconGrid /> },
  { to: '/trips', label: 'Trips', icon: <IconRoute /> },
  { to: '/vehicles', label: 'Vehicles', icon: <IconTruck /> },
  { to: '/drivers', label: 'Drivers', icon: <IconUser /> },
  { to: '/maintenance', label: 'Maintenance', icon: <IconWrench /> },
  { to: '/expenses', label: 'Expenses', icon: <IconWallet />, hideFor: ['DRIVER'] },
  { to: '/reports', label: 'Reports', icon: <IconChart /> },
];

// Role-specific quick action in the sidebar (reference style)
const CTA = {
  FLEET_MANAGER: { label: 'Log New Maintenance', to: '/maintenance' },
  DRIVER: { label: 'New Trip', to: '/trips' },
  SAFETY_OFFICER: { label: 'Add Driver', to: '/drivers' },
  FINANCIAL_ANALYST: { label: 'View Reports', to: '/reports' },
};

const initials = (name) => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem('transitops_theme') || 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('transitops_theme', theme);
  }, [theme]);

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
            <input placeholder="Search operations…" onKeyDown={(e) => e.key === 'Enter' && navigate(`/vehicles`)} />
          </div>
          <div className="topbar-right">
            <button className="icon-btn" title="Notifications">
              <IconBell />
              <span className="dot" />
            </button>
            <div className="avatar">{initials(user.name)}</div>
            <div className="user-meta">
              <strong>{user.name}</strong>
              <small>{user.role.replaceAll('_', ' ')}</small>
            </div>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
