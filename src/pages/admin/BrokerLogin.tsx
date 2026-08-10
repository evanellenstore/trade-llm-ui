import React, { useState } from 'react';
import api from '../../services/api';
import '../../styles/AdminPageCommon.css';
import './BrokerLogin.css';
import { useMode } from '../../context/ModeContext';

const BrokerLogin: React.FC = () => {
  const { mode } = useMode();
  const [ttop, setTtop] = useState('');
  const [relogin, setRelogin] = useState(false);
  const [exchange, setExchange] = useState('NSE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async () => {
    const trimmedTtop = ttop.trim();
    if (!trimmedTtop) {
      setError('Please enter a valid TTOP before attempting login.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (relogin) {
        const url = `/broker/api/angelOne/relogin?ttop=${encodeURIComponent(trimmedTtop)}&mode=${encodeURIComponent(mode)}`;
        const response = await api.get(url);
        setMessage(response.data || `Re-login completed successfully in ${mode} mode.`);
      } else {
        const url = `/broker/api/angelOne/login/byTtop?ttop=${encodeURIComponent(trimmedTtop)}&mode=${encodeURIComponent(mode)}`;
        const response = await api.post(url);
        setMessage(response.data || `Login completed successfully in ${mode} mode.`);
      }
    } catch (err: unknown) {
      const serverMessage = (err as { response?: { data?: unknown } })?.response?.data;
      setError(typeof serverMessage === 'string' ? serverMessage : 'Broker login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportFNO = () => {
    setLoading(true);
    // Placeholder: trigger FNO import API
    console.log('Triggering FNO stock import');
    setTimeout(() => setLoading(false), 700);
  };

  return (
    <div className="broker-page-shell">
      <div className="broker-card">
        <h2 className="broker-title">AngelOne Broker Login</h2>

        <p className="broker-sub">Use the TTOP input to login a trader, or re-login existing broker sessions.</p>

        <section className="broker-section">
          <h3 className="section-heading">Admin tool</h3>
          <label className="label">Exchange (NSE / BSE)</label>
          <div className="field-value">{exchange}</div>
          <select className="input" value={exchange} onChange={(e) => setExchange(e.target.value)}>
            <option value="NSE">NSE</option>
            <option value="BSE">BSE</option>
          </select>

          <label className="label">TTOP Identifier</label>
          <input
            className="input"
            placeholder="Enter the trader's TTOP"
            value={ttop}
            onChange={(e) => setTtop(e.target.value)}
          />

          <label className="checkbox-row">
            <input type="checkbox" checked={relogin} onChange={(e) => setRelogin(e.target.checked)} />
            <span className="checkbox-label">Use relogin to refresh an active session</span>
          </label>

          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}

          <div className="actions">
            <button className="btn primary" onClick={handleLogin} disabled={loading}>
              {loading ? 'Working…' : relogin ? 'Re-login Trader' : 'Login Trader'}
            </button>
          </div>
        </section>

        <hr className="divider" />

        <section className="broker-section">
          <h3 className="section-heading">FNO stock import</h3>
          <p className="broker-sub">Trigger the broker service to load FNO stock master data for the configured exchange.</p>
          <div className="actions">
            <button className="btn" onClick={handleImportFNO} disabled={loading}>
              {loading ? 'Importing…' : 'Import'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default BrokerLogin;
