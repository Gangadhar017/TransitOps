import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { IconTruck } from '../components/icons';

const ROLES = [
  { value: 'FLEET_MANAGER', label: 'Fleet Manager' },
  { value: 'DRIVER', label: 'Driver' },
  { value: 'SAFETY_OFFICER', label: 'Safety Officer' },
  { value: 'FINANCIAL_ANALYST', label: 'Financial Analyst' },
];

// One page, two modes: /login = sign in, /signup = create account
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const isSignup = useLocation().pathname === '/signup';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('DRIVER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState([]);

  // The server says whether one-click demo sign-in is switched on.
  useEffect(() => {
    let alive = true;
    api.get('/auth/demo')
      .then((d) => { if (alive && d.enabled) setDemoAccounts(d.accounts); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = isSignup
        ? await api.post('/auth/register', { name, email, password, role })
        : await api.post('/auth/login', { email, password });
      login(data);
      if (isSignup) toast.success(`Welcome to TransitOps, ${data.user.name}!`);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function enterDemo(demoRole) {
    setError('');
    setLoading(true);
    try {
      login(await api.post('/auth/demo', { role: demoRole }));
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-pitch" aria-label="About TransitOps">
        <div className="login-brand">
          <div className="brand-ico"><IconTruck size={22} /></div>
          <div>
            <div className="brand-name">TransitOps</div>
            <div className="brand-tag">Fleet Operations</div>
          </div>
        </div>
        <h1>A fleet platform that refuses bad dispatches.</h1>
        <p className="pitch-sub">
          Dispatch, maintenance, drivers and costs in one place. Every rule is enforced in the database transaction, not just on the screen.
        </p>
        <ul className="pitch-rules">
          <li><span>Vehicle in the shop or retired</span><b>Refused</b></li>
          <li><span>Driver suspended or licence expired</span><b>Refused</b></li>
          <li><span>Cargo over the vehicle's capacity</span><b>Refused</b></li>
          <li><span>Vehicle or driver already on a trip</span><b>Refused</b></li>
        </ul>
        <p className="pitch-foot">37 end-to-end tests cover every rule and every role.</p>
      </section>

      <div className="login-side">
        <form className="login-card" onSubmit={handleSubmit}>
          <h2>{isSignup ? 'Create your account' : 'Sign in'}</h2>
          <p className="muted">
            {isSignup ? 'Join the operations command center.' : 'Use your account, or step straight into the demo below.'}
          </p>

          {error && <div className="alert alert-error" role="alert">{error}</div>}

          {isSignup && (
            <label>
              Full Name
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Kumar" required autoFocus />
            </label>
          )}
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required autoComplete="username" />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignup ? 'Minimum 8 characters' : '••••••••'}
              minLength={isSignup ? 8 : undefined}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              required
            />
          </label>
          {isSignup && (
            <label>
              Role
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </label>
          )}

          <button className="btn btn-blue" disabled={loading} style={{ justifyContent: 'center' }}>
            {loading ? (isSignup ? 'Creating account…' : 'Signing in…') : isSignup ? 'Create Account' : 'Sign In'}
          </button>

          <p className="muted small center">
            {isSignup ? (
              <>Already have an account? <Link className="auth-link" to="/login">Sign in</Link></>
            ) : (
              <>New to TransitOps? <Link className="auth-link" to="/signup">Create an account</Link></>
            )}
          </p>
        </form>

        {!isSignup && demoAccounts.length > 0 && (
          <div className="demo-box">
            <div className="demo-head">
              <strong>Open the demo as</strong>
              <span>no password needed</span>
            </div>
            {demoAccounts.map((a) => (
              <button type="button" key={a.role} className="demo-role" onClick={() => enterDemo(a.role)} disabled={loading}>
                <strong>{a.label}</strong>
                <span>{a.access}</span>
              </button>
            ))}
            <p className="demo-note">Demo data starts fresh every time the server restarts.</p>
          </div>
        )}
      </div>
    </div>
  );
}
