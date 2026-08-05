import React, { useState } from 'react';
import '../../styles/AdminPageCommon.css';
import './BrokerLogin.css';

const BrokerLogin: React.FC = () => {
  const [ttop, setTtop] = useState('');
  const [relogin, setRelogin] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    // Placeholder: trigger broker login API
    console.log('Logging in trader', { ttop, relogin });
    setTimeout(() => setLoading(false), 700);
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
          <label className="label">TTOP Identifier</label>
          <input
            className="input"
            placeholder="Enter the trader's TTOP"
            value={ttop}
            onChange={(e) => setTtop(e.target.value)}
          />

          <label className="checkbox-row">
            <input type="checkbox" checked={relogin} onChange={(e) => setRelogin(e.target.checked)} />
            <span className="checkbox-label">Use relogin to refresh an existing session</span>
          </label>

          <div className="actions">
            <button className="btn primary" onClick={handleLogin} disabled={loading}>
              {loading ? 'Working…' : 'Login Trader'}
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
