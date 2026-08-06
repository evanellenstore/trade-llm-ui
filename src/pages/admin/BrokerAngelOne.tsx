import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import './BrokerAngelOne.css';

const loginEndpoint = '/broker/api/angelOne/login/byTtop';
const reloginEndpoint = '/broker/api/angelOne/relogin';
const subscriptionsEndpoint = '/broker/api/angelOne/subscriptions';
const saveFnoStockEndpoint = '/broker/api/job/saveFNOStock';
const fnoStockSymbolsEndpoint = '/broker/api/job/fnoStockSymbols';

const BrokerAngelOne: React.FC = () => {
  const [ttop, setTtop] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [response, setResponse] = useState<{ status: number; payload: unknown } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseFromRelogin, setResponseFromRelogin] = useState(false);
  const [reloginLoading, setReloginLoading] = useState(false);
  const [showInput, setShowInput] = useState(true);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [fnoStockLoading, setFnoStockLoading] = useState(false);
  const [loadingFnoStockSymbols, setLoadingFnoStockSymbols] = useState(false);
  const [subscriptionExchange, setSubscriptionExchange] = useState('NSE');
  const [subscriptionSymbols, setSubscriptionSymbols] = useState<Array<{ token: string; symbol: string }>>([]);
  const [selectedSubscriptionRows, setSelectedSubscriptionRows] = useState<Set<number>>(new Set());
  const [subscriptionFormError, setSubscriptionFormError] = useState('');
  const [activeTab, setActiveTab] = useState<'session' | 'fno' | 'subscriptions'>('session');

  const tabItems = [
    { id: 'session', title: 'Broker session', description: 'Authenticate a broker session with TTOP or refresh an existing AngelOne session.' },
    { id: 'fno', title: 'FNO master import', description: 'Refresh the broker database with the latest FNO master data before loading symbols.' },
    { id: 'subscriptions', title: 'Broker subscriptions', description: 'Choose an exchange and register broker subscriptions from one panel.' },
  ];

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    // When performing a normal login, ensure input is visible
    setShowInput(true);

    const trimmedTtop = ttop.trim();
    if (!trimmedTtop) {
      setError('Please enter a valid TTOP value before checking the broker service.');
      setResponse(null);
      return;
    }

    setLoading(true);
    setError('');
    setResponse(null);

    try {
      const result = await api.post(loginEndpoint, null, {
        params: { ttop: trimmedTtop },
      });

      setResponse({ status: result.status, payload: result.data });
      // Show the response in the modal (message-only) instead of a toast
      if (result.status >= 200 && result.status < 300) {
        setResponseFromRelogin(true);
        setShowResponseModal(true);
      }
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : 'Broker login check failed.';

      const serverMessage = (err as { response?: { data?: unknown } })?.response?.data;
      setError(typeof serverMessage === 'string' ? serverMessage : message);
    } finally {
      setLoading(false);
    }
  };

  const handleRelogin = async () => {
    const trimmedTtop = ttop.trim();
    // Hide input while doing relogin (per UI requirement)
    setShowInput(false);
    setReloginLoading(true);
    setError('');
    setResponse(null);
    try {
      const config = trimmedTtop ? { params: { ttop: trimmedTtop } } : undefined;
      const result = await api.get(reloginEndpoint, config as any);
      setResponse({ status: result.status, payload: result.data });
      // Mark that this response came from relogin and show it in a popup
      setResponseFromRelogin(true);
      setShowResponseModal(true);
      // For relogin we show the response in the modal only — no toast
      // (keep server response available in modal)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Re-login failed.';
      const serverMessage = (err as { response?: { data?: unknown } })?.response?.data;
      setError(typeof serverMessage === 'string' ? serverMessage : message);
    } finally {
      setReloginLoading(false);
    }
  };

  const closeResponseModal = () => {
    setShowResponseModal(false);
    setResponseFromRelogin(false);
    // clear the response so the bottom panel does not show after closing modal
    setResponse(null);
    setShowRaw(false);
    setCopied(false);
  };

  const validateSubscriptionForm = () => {
    const nextFieldErrors: Record<number, { token?: string; symbol?: string }> = {};
    const validRows = subscriptionSymbols.filter((item) => item.token.trim() && item.symbol.trim());

    subscriptionSymbols.forEach((item, index) => {
      const rowErrors: { token?: string; symbol?: string } = {};
      if (!item.token.trim()) {
        rowErrors.token = 'Token is required.';
      }
      if (!item.symbol.trim()) {
        rowErrors.symbol = 'Symbol is required.';
      }
      if (Object.keys(rowErrors).length > 0) {
        nextFieldErrors[index] = rowErrors;
      }
    });

    let formError = '';
    if (validRows.length === 0) {
      formError = 'Please add at least one valid symbol entry with both Token and Symbol.';
    } else if (Object.keys(nextFieldErrors).length > 0) {
      formError = 'Please fix the highlighted symbol rows before submitting.';
    }

    setSubscriptionFormError(formError);
    return formError === '';
  };

  const loadFnoStockSymbols = async (exchange?: string, suppressToast = false) => {
    const selectedExchange = exchange ?? subscriptionExchange;
    setError('');
    setResponse(null);
    setSubscriptionFormError('');
    setLoadingFnoStockSymbols(true);

    try {
      setSubscriptionSymbols([]);
      setSelectedSubscriptionRows(new Set());
      const result = await api.get(fnoStockSymbolsEndpoint, { params: { exchange: selectedExchange } });
      if (result.status >= 200 && result.status < 300 && Array.isArray(result.data)) {
        const symbols = result.data as Array<{ symboltoken: string; tradingsymbol: string }>;
        if (symbols.length === 0) {
          setError(`No FNO symbols found for exchange ${selectedExchange}.`);
        } else {
          const rows = symbols.map((item) => ({ token: item.symboltoken, symbol: item.tradingsymbol }));
          setSubscriptionSymbols(rows);
          setSelectedSubscriptionRows(new Set(rows.map((_, index) => index)));
          if (!suppressToast) {
            setToastMessage(`Loaded ${symbols.length} FNO symbols for ${selectedExchange}.`);
            setShowToast(true);
          }
        }
      } else {
        setError('Failed to load FNO stock symbols.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load FNO stock symbols.';
      const serverMessage = (err as { response?: { data?: unknown } })?.response?.data;
      setError(typeof serverMessage === 'string' ? serverMessage : message);
    } finally {
      setLoadingFnoStockSymbols(false);
    }
  };

  const handleSaveFnoStocks = async () => {
    if (typeof window !== 'undefined' && !window.confirm('Trigger FNO master data sync now?')) {
      return;
    }

    setError('');
    setResponse(null);
    setFnoStockLoading(true);

    try {
      const result = await api.get(saveFnoStockEndpoint);
      setResponse({ status: result.status, payload: result.data });
      if (result.status >= 200 && result.status < 300) {
        setToastMessage('FNO master data sync started successfully!');
        setShowToast(true);
        await loadFnoStockSymbols(subscriptionExchange, true);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'FNO master data sync failed.';
      const serverMessage = (err as { response?: { data?: unknown } })?.response?.data;
      setError(typeof serverMessage === 'string' ? serverMessage : message);
    } finally {
      setFnoStockLoading(false);
    }
  };

  useEffect(() => {
    loadFnoStockSymbols(subscriptionExchange);
  }, []);

  useEffect(() => {
    if (!showToast) {
      return;
    }

    const timeout = window.setTimeout(() => setShowToast(false), 3200);
    return () => window.clearTimeout(timeout);
  }, [showToast]);

  const handleExchangeChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextExchange = event.target.value;
    setSubscriptionExchange(nextExchange);
    await loadFnoStockSymbols(nextExchange);
  };

  const handleSubscriptions = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setResponse(null);
    setSubscriptionFormError('');

    if (!validateSubscriptionForm()) {
      return;
    }

    setSubscriptionLoading(true);
    try {
      const symbols = subscriptionSymbols.reduce((acc, item, index) => {
        if (selectedSubscriptionRows.has(index) && item.token.trim() && item.symbol.trim()) {
          acc[item.token.trim()] = item.symbol.trim();
        }
        return acc;
      }, {} as Record<string, string>);

      const payload = {
        exchange: subscriptionExchange,
        symbols,
      };

      const result = await api.post(subscriptionsEndpoint, payload);
      setResponse({ status: result.status, payload: result.data });
      if (result.status >= 200 && result.status < 300) {
        setToastMessage('Subscriptions updated successfully!');
        setShowToast(true);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Subscriptions update failed.';
      const serverMessage = (err as { response?: { data?: unknown } })?.response?.data;
      setError(typeof serverMessage === 'string' ? serverMessage : message);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const renderPayload = () => {
    if (!response) {
      return null;
    }

    if (typeof response.payload === 'string') {
      return response.payload;
    }

    try {
      return JSON.stringify(response.payload, null, 2);
    } catch {
      return String(response.payload);
    }
  };

  const getReloginMessage = () => {
    if (!response) return '';
    const p = response.payload;
    if (typeof p === 'string') return p;
    try {
      const obj = p as any;
      if (obj && typeof obj === 'object') {
        if (typeof obj.message === 'string') return obj.message;
        if (typeof obj.msg === 'string') return obj.msg;
        if (obj.payload && typeof obj.payload.message === 'string') return obj.payload.message;
        if (obj.data && typeof obj.data.message === 'string') return obj.data.message;
        return JSON.stringify(obj);
      }
      return String(p);
    } catch {
      return String(p);
    }
  };

  const copyToClipboard = async () => {
    const payload = renderPayload();
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };


  const statusVariant = (status?: number) => {
    if (!status) return 'secondary';
    if (status >= 200 && status < 300) return 'success';
    if (status >= 400 && status < 500) return 'warning';
    return 'danger';
  };

  return (
    <div className="admin-page-shell broker-page">
      {showToast && (
        <div className="broker-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}

      <section className="section-card">
        <div className="broker-tabs" role="tablist" aria-label="Broker administration tabs">
          {tabItems.map((tab) => (
            <button
              key={tab.id}
              className={`broker-tab ${activeTab === tab.id ? 'active' : ''}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id as 'session' | 'fno' | 'subscriptions')}
            >
              {tab.title}
            </button>
          ))}
        </div>

        <div className="tab-panel">
          {activeTab === 'session' && (
            <div className="tab-section">
              <div className="section-header section-header-sm">
                <div>
                  <h5>AngelOne broker session</h5>
                  <p className="section-text">Authenticate a broker session with TTOP, or refresh an existing AngelOne session.</p>
                </div>
              </div>
              <form onSubmit={handleLogin} className="form-stack">
                {showInput ? (
                  <div className="form-group">
                    <label className="form-label">TTOP</label>
                    <input
                      className="form-control"
                      value={ttop}
                      onChange={(event) => setTtop(event.target.value)}
                      placeholder="Enter trader TTOP"
                      aria-label="Enter trader TTOP"
                    />
                    <p className="form-text">Provide the trader's TTOP. Use Re-login to refresh an active session.</p>
                  </div>
                ) : (
                  <div className="notice-box">
                    <div>
                      <div className="notice-title">Re-login mode</div>
                      <p className="form-text">TTOP input is hidden while re-login is active.</p>
                    </div>
                    <button className="button button-link" type="button" onClick={() => setShowInput(true)}>
                      Show input
                    </button>
                  </div>
                )}

                <div className="button-group">
                  <button className="button button-primary" type="submit" disabled={loading} aria-live="polite">
                    {loading ? <span className="spinner" aria-hidden="true" /> : null}
                    {loading ? 'Checking…' : 'Login with TTOP'}
                  </button>
                  <button className="button button-secondary" type="button" disabled={reloginLoading} onClick={handleRelogin}>
                    {reloginLoading ? <span className="spinner" aria-hidden="true" /> : null}
                    {reloginLoading ? 'Re-login…' : 'Re-login'}
                  </button>
                  {showInput && (
                    <button className="button button-secondary" type="button" onClick={() => setTtop('')}>
                      Reset
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {activeTab === 'fno' && (
            <div className="tab-section">
              <div className="section-header section-header-sm">
                <div>
                  <h5>FNO master import</h5>
                  <p className="section-text">Refresh the broker database with the latest FNO master data before loading symbols.</p>
                </div>
              </div>
              <div className="tab-panel-header">
                <div className="form-group" style={{ minWidth: '220px' }}>
                  <label className="form-label">Exchange</label>
                  <select className="form-control" value={subscriptionExchange} onChange={handleExchangeChange}>
                    <option value="NSE">NSE</option>
                    <option value="BSE">BSE</option>
                  </select>
                </div>
                <div className="tab-panel-meta" style={{ alignSelf: 'flex-end', textAlign: 'right' }}>
                  <span className="badge badge-info">Active exchange: {subscriptionExchange}</span>
                  <p className="section-text" style={{ margin: '8px 0 0' }}>
                    Refresh the broker database, then reload symbols for the selected exchange.
                  </p>
                </div>
                <div className="button-group">
                  <button className="button button-primary" type="button" onClick={handleSaveFnoStocks} disabled={fnoStockLoading}>
                    {fnoStockLoading ? <span className="spinner" aria-hidden="true" /> : null}
                    {fnoStockLoading ? 'Syncing…' : 'Sync FNO master data'}
                  </button>
                  <button className="button button-secondary" type="button" onClick={() => loadFnoStockSymbols(subscriptionExchange)} disabled={loadingFnoStockSymbols}>
                    {loadingFnoStockSymbols ? <span className="spinner" aria-hidden="true" /> : null}
                    {loadingFnoStockSymbols ? 'Loading…' : 'Reload symbols'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'subscriptions' && (
            <div className="tab-section">
              <div className="section-header section-header-sm">
                <div>
                  <h5>Broker subscriptions</h5>
                  <p className="section-text">Choose an exchange and register broker subscriptions from one panel.</p>
                </div>
              </div>

              <div className="tab-panel-header">
                <div className="form-group" style={{ minWidth: '220px' }}>
                  <label className="form-label">Exchange</label>
                  <select className="form-control" value={subscriptionExchange} onChange={handleExchangeChange}>
                    <option value="NSE">NSE</option>
                    <option value="BSE">BSE</option>
                  </select>
                </div>
                <div className="tab-panel-meta" style={{ alignSelf: 'flex-end', textAlign: 'right' }}>
                  <span className="badge badge-info">Active exchange: {subscriptionExchange}</span>
                  <p className="section-text" style={{ margin: '8px 0 0' }}>
                    Symbols loaded for the selected exchange. Use the checkbox controls to register subscriptions.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubscriptions} className="form-stack">
                <div className="form-row">
                  <div className="form-group">
                    <div className="table-card">
                      <div className="table-toolbar">
                        <label className="checkbox-field">
                          <input
                            type="checkbox"
                            checked={subscriptionSymbols.length > 0 && selectedSubscriptionRows.size === subscriptionSymbols.length}
                            onChange={() => {
                              if (selectedSubscriptionRows.size === subscriptionSymbols.length) {
                                setSelectedSubscriptionRows(new Set());
                              } else {
                                setSelectedSubscriptionRows(new Set(subscriptionSymbols.map((_, index) => index)));
                              }
                            }}
                          />
                          {selectedSubscriptionRows.size === subscriptionSymbols.length ? 'Unselect all' : 'Select all'}
                        </label>
                        <span className="table-note">{subscriptionSymbols.length} {subscriptionSymbols.length === 1 ? 'row' : 'rows'} loaded</span>
                      </div>

                      <div className="table-scroll">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>
                                <input
                                  type="checkbox"
                                  checked={subscriptionSymbols.length > 0 && selectedSubscriptionRows.size === subscriptionSymbols.length}
                                  onChange={() => {
                                    if (selectedSubscriptionRows.size === subscriptionSymbols.length) {
                                      setSelectedSubscriptionRows(new Set());
                                    } else {
                                      setSelectedSubscriptionRows(new Set(subscriptionSymbols.map((_, index) => index)));
                                    }
                                  }}
                                />
                              </th>
                              <th style={{ width: '140px' }}>Token ID</th>
                              <th>Symbol Name</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subscriptionSymbols.length === 0 ? (
                              <tr>
                                <td colSpan={3} className="table-empty">
                                  {loadingFnoStockSymbols ? 'Loading symbols…' : `No symbols available for ${subscriptionExchange}.`}
                                </td>
                              </tr>
                            ) : (
                              subscriptionSymbols.map((item, index) => (
                                <tr key={`${item.token}-${index}`}>
                                  <td className="table-checkbox">
                                    <input
                                      type="checkbox"
                                      checked={selectedSubscriptionRows.has(index)}
                                      onChange={() => {
                                        const nextSelected = new Set(selectedSubscriptionRows);
                                        if (nextSelected.has(index)) {
                                          nextSelected.delete(index);
                                        } else {
                                          nextSelected.add(index);
                                        }
                                        setSelectedSubscriptionRows(nextSelected);
                                      }}
                                    />
                                  </td>
                                  <td>{item.token || '-'}</td>
                                  <td>{item.symbol || '-'}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {subscriptionFormError && <div className="status-banner status-warning">{subscriptionFormError}</div>}

                <div className="button-group">
                  <button className="button button-primary" type="submit" disabled={subscriptionLoading}>
                    {subscriptionLoading ? <span className="spinner" aria-hidden="true" /> : null}
                    {subscriptionLoading ? 'Submitting…' : 'Submit subscriptions'}
                  </button>
                  <button className="button button-secondary" type="button" onClick={() => {
                    setSelectedSubscriptionRows(new Set());
                    setSubscriptionFormError('');
                  }}>
                    Clear selection
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </section>

      {response && !responseFromRelogin && (
        <section className="section-card">
          <div className="section-header section-header-sm">
            <div>
              <h6>Response details</h6>
              <p className="section-text">Status code and payload from the broker service.</p>
            </div>
            <span className={`badge ${statusVariant(response.status) === 'success' ? 'badge-success' : statusVariant(response.status) === 'warning' ? 'badge-warning' : 'badge-danger'}`}>
              {response.status}
            </span>
          </div>

          <div className="button-group button-group-right">
            <button className="button button-outline-secondary button-small" type="button" onClick={() => setShowRaw((s) => !s)}>
              {showRaw ? 'Pretty' : 'Raw'}
            </button>
            <button className="button button-outline-primary button-small" type="button" onClick={copyToClipboard}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <pre className="response-box" style={{ whiteSpace: showRaw ? 'pre' : 'pre-wrap' }}>
            {renderPayload()}
          </pre>
        </section>
      )}

      {/* Response modal for relogin responses - show only the message text */}
      {showResponseModal && response && (
        <div className="response-modal-backdrop" role="dialog" aria-modal="true">
          <div className="response-modal">
            <div className="response-modal-header">
              <h4>Message</h4>
              <button className="button button-link" onClick={closeResponseModal} aria-label="Close response modal">Close</button>
            </div>
            <div className="response-modal-body">
              <div className="relogin-message">{getReloginMessage()}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrokerAngelOne;
