import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '▦' },
  { to: '/vehicles', label: 'Vehicles', icon: '🚚' },
  { to: '/drivers', label: 'Drivers', icon: '👤' },
  { to: '/trips', label: 'Trips', icon: '🧭' },
  { to: '/maintenance', label: 'Maintenance', icon: '🔧' },
  { to: '/expenses', label: 'Fuel & Expenses', icon: '⛽' },
  { to: '/reports', label: 'Reports', icon: '📊' },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          Transit<span>Ops</span>
        </div>
        <nav>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className="nav-link">
              <span className="nav-icon">{item.icon}</span> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <strong>{user.name}</strong>
            <small>{user.role.replaceAll('_', ' ')}</small>
          </div>
          <button className="btn btn-ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
