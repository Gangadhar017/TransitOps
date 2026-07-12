import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { IconTruck } from '../components/icons';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { email, password });
      login(data);
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
        <p className="muted">Sign in to your operations command center.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="manager@transitops.com" required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
        </label>
        <button className="btn btn-blue" disabled={loading} style={{ justifyContent: 'center' }}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        <p className="muted small">
          Demo accounts (password <code>Password@123</code>): manager@ · driver@ · safety@ · analyst@ transitops.com
        </p>
      </form>
    </div>
  );
}
