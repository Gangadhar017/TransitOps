import { useState } from 'react';
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

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <div className="brand-ico"><IconTruck size={22} /></div>
          <div>
            <div className="brand-name">TransitOps</div>
            <div className="brand-tag">Fleet Operations</div>
          </div>
        </div>
        <p className="muted">
          {isSignup ? 'Create your account to join the operations command center.' : 'Sign in to your operations command center.'}
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        {isSignup && (
          <label>
            Full Name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Kumar" required autoFocus />
          </label>
        )}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required autoFocus={!isSignup} />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isSignup ? 'Minimum 8 characters' : '••••••••'}
            minLength={isSignup ? 8 : undefined}
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
    </div>
  );
}
