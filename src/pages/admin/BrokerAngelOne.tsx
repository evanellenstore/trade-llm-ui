import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useMode } from '../../context/ModeContext';
import './BrokerAngelOne.css';

const loginEndpoint = '/broker/api/angelOne/login/byTtop';
const reloginEndpoint = '/broker/api/angelOne/relogin';
const subscriptionsEndpoint = '/broker/api/angelOne/subscriptions';
const saveFnoStockEndpoint = '/broker/api/job/saveFNOStock';
const fnoStockSymbolsEndpoint = '/broker/api/job/fnoStockSymbols';
const candleStatusEndpoint = '/history/candles/status';

const BrokerAngelOne: React.FC = () => {
  const { mode } = useMode();
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
  const [subscriptionName, setSubscriptionName] = useState('');
  const [subscriptionSymbols, setSubscriptionSymbols] = useState<Array<{ token: string; symbol: string }>>([]);
  const [selectedSubscriptionRows, setSelectedSubscriptionRows] = useState<Set<number>>(new Set());
  const [subscriptionFormError, setSubscriptionFormError] = useState('');
  const [activeTab, setActiveTab] = useState<'session' | 'fno' | 'subscriptions' | 'backfill'>('session');
  const [currentSubscriptions, setCurrentSubscriptions] = useState<Array<{ token: string; symbol: string }>>([]);
  const [subscriptionHistory, setSubscriptionHistory] = useState<Array<{
    subscriptionId: string;
    subscriptionName: string;
    createdAt: string;
    symbols: Record<string, string>;
    active?: boolean;
  }>>([]);
  const [selectedCurrentRows, setSelectedCurrentRows] = useState<Set<number>>(new Set());
  const [currentLoading, setCurrentLoading] = useState(false);
  const [backfillFromDate, setBackfillFromDate] = useState('2024-09-16T11:15');
  const [backfillToDate, setBackfillToDate] = useState('2026-09-16T12:00');
  const [backfillInterval, setBackfillInterval] = useState('ONE_MINUTE');
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [selectedBackfillRows, setSelectedBackfillRows] = useState<Set<number>>(new Set());
  const [backfillStatus, setBackfillStatus] = useState<Record<string, {
    status: 'pending' | 'filled' | 'failed' | 'backfilled';
    candleCount?: number;
    updatedAt?: string;
  }>>({});
  const tabItems = [
    { id: 'session', title: 'Broker session', description: 'Authenticate a broker session with TTOP or refresh an existing AngelOne session.' },
    { id: 'fno', title: 'FNO master import', description: 'Refresh the broker database with the latest FNO master data before loading symbols.' },
    { id: 'subscriptions', title: 'Broker subscriptions', description: 'Choose an exchange and register broker subscriptions from one panel.' },
    { id: 'backfill', title: 'Candle backfill', description: 'Load historical candles into the history service for a broker symbol.' },
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
        params: { ttop: trimmedTtop, mode },
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
      const url = trimmedTtop
        ? `${reloginEndpoint}?ttop=${encodeURIComponent(trimmedTtop)}&mode=${encodeURIComponent(mode)}`
        : `${reloginEndpoint}?mode=${encodeURIComponent(mode)}`;
      const result = await api.get(url);
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
      const [result, tokenMap] = await Promise.all([
        api.get(fnoStockSymbolsEndpoint, { params: { exchange: selectedExchange } }),
        loadCurrentSubscriptions(selectedExchange),
      ]);
      if (result.status >= 200 && result.status < 300 && Array.isArray(result.data)) {
        const symbols = result.data as Array<{ symboltoken: string; tradingsymbol: string }>;
        if (symbols.length === 0) {
          setError(`No FNO symbols found for exchange ${selectedExchange}.`);
        } else {
          const rows = symbols.map((item) => ({ token: item.symboltoken, symbol: item.tradingsymbol }));
          setSubscriptionSymbols(rows);
          setSelectedBackfillRows(new Set());
          setBackfillStatus({});
          void loadBackfillStatus(rows);
          // preselect only those tokens already subscribed
          if (tokenMap && Object.keys(tokenMap).length > 0) {
            const pre = new Set<number>();
            rows.forEach((r, idx) => {
              if (tokenMap[r.token]) pre.add(idx);
            });
            setSelectedSubscriptionRows(pre);
          } else {
            setSelectedSubscriptionRows(new Set(rows.map((_, index) => index)));
          }
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

  const loadBackfillStatus = async (rows = subscriptionSymbols) => {
    if (rows.length === 0) {
      setBackfillStatus({});
      return;
    }

    try {
      const params = new URLSearchParams();
      rows.forEach((item) => params.append('symbolTokens', item.token));
      params.set('timeframe', backfillInterval);
      const result = await api.get(candleStatusEndpoint, {
        params,
      });
      const data = (result.data as { data?: Record<string, {
        status: 'backfilled';
        candleCount: number;
        updatedAt?: string;
      }> }).data;
      setBackfillStatus(Object.fromEntries(
        Object.entries(data ?? {}).map(([token, item]) => [token, {
          status: item.status,
          candleCount: item.candleCount,
          updatedAt: item.updatedAt,
        }]),
      ));
    } catch (err: unknown) {
      setBackfillStatus({});
      const message = err instanceof Error ? err.message : 'Unable to load candle status.';
      setError(message);
    }
  };

  const handleTabChange = (tab: 'session' | 'fno' | 'subscriptions' | 'backfill') => {
    setActiveTab(tab);
    if (tab === 'backfill') {
      void loadBackfillStatus(subscriptionSymbols);
    }
  };

  // Sync selection to tokens currently subscribed
  const handleSyncSelection = async () => {
    setError('');
    try {
      const tokenMap = await loadCurrentSubscriptions();
      if (!tokenMap || Object.keys(tokenMap).length === 0) {
        setToastMessage('No current subscriptions to sync.');
        setShowToast(true);
        return;
      }
      const pre = new Set<number>();
      subscriptionSymbols.forEach((r, idx) => {
        if (tokenMap[r.token]) pre.add(idx);
      });
      setSelectedSubscriptionRows(pre);
    } catch (err) {
      // loadCurrentSubscriptions will set error
    }
  };

  const handleDeleteFromSubmit = async () => {
    if (selectedSubscriptionRows.size === 0) {
      setToastMessage('No subscriptions selected to delete');
      setShowToast(true);
      return;
    }
    if (typeof window !== 'undefined' && !window.confirm('Remove selected subscriptions?')) return;
    setSubscriptionLoading(true);
    try {
      const symbols = Array.from(selectedSubscriptionRows).reduce((acc, index) => {
        const item = subscriptionSymbols[index];
        if (item && item.token) acc[item.token] = item.symbol;
        return acc;
      }, {} as Record<string, string>);
      const payload = { exchange: subscriptionExchange, symbols };
      const result = await api.delete(subscriptionsEndpoint, { data: payload });
      if (result.status >= 200 && result.status < 300) {
        setToastMessage('Subscriptions deleted');
        setShowToast(true);
        await loadFnoStockSymbols(subscriptionExchange);
        await loadCurrentSubscriptions(subscriptionExchange);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete failed.';
      const serverMessage = (err as { response?: { data?: unknown } })?.response?.data;
      setError(typeof serverMessage === 'string' ? serverMessage : message);
    } finally {
      setSubscriptionLoading(false);
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
    // Load both FNO symbols and current subscriptions on mount
    (async () => {
      await loadFnoStockSymbols(subscriptionExchange);
      await loadCurrentSubscriptions(subscriptionExchange);
    })();
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
    await loadCurrentSubscriptions(nextExchange);
  };

  const loadCurrentSubscriptions = async (exchange?: string): Promise<Record<string, string>> => {
    const selectedExchange = exchange ?? subscriptionExchange;
    setCurrentLoading(true);
    setError('');
    try {
      const url = `${subscriptionsEndpoint}?exchange=${encodeURIComponent(selectedExchange)}&_=${Date.now()}`;
      const result = await api.get(url);
      if (result.status >= 200 && result.status < 300 && result.data) {
        const data = result.data as any;
        const tokenMap = data.tokenMap ?? {};
        setSubscriptionHistory(Array.isArray(data.subscriptions) ? data.subscriptions : []);
        const rows = Object.keys(tokenMap).map((t) => ({ token: t, symbol: tokenMap[t] }));
        setCurrentSubscriptions(rows);
        setSelectedCurrentRows(new Set());
        return tokenMap;
      } else {
        setCurrentSubscriptions([]);
        return {};
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load current subscriptions.';
      const serverMessage = (err as { response?: { data?: unknown } })?.response?.data;
      setError(typeof serverMessage === 'string' ? serverMessage : message);
      return {};
    } finally {
      setCurrentLoading(false);
    }
  };

  const handleStartSubscription = async (subscriptionId: string) => {
    setSubscriptionLoading(true);
    try {
      await api.post(`${subscriptionsEndpoint}/${encodeURIComponent(subscriptionId)}/start`);
      setToastMessage('Subscription started');
      setShowToast(true);
      await loadCurrentSubscriptions(subscriptionExchange);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start subscription.';
      setError(message);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleDeleteSubscription = async (subscriptionId: string) => {
    if (typeof window !== 'undefined' && !window.confirm('Delete this saved subscription?')) return;
    setSubscriptionLoading(true);
    try {
      await api.delete(`${subscriptionsEndpoint}/${encodeURIComponent(subscriptionId)}`);
      setSubscriptionHistory((current) => current.filter(
        (subscription) => subscription.subscriptionId !== subscriptionId,
      ));
      setToastMessage('Subscription deleted');
      setShowToast(true);
      await loadCurrentSubscriptions(subscriptionExchange);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete subscription.';
      setError(message);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleUpdateCurrentSubscriptions = async () => {
    if (selectedCurrentRows.size === 0) {
      setToastMessage('No subscriptions selected to update');
      setShowToast(true);
      return;
    }
    setSubscriptionLoading(true);
    try {
      const symbols = Array.from(selectedCurrentRows).reduce((acc, index) => {
        const item = currentSubscriptions[index];
        if (item && item.token && item.symbol) {
          acc[item.token] = item.symbol;
        }
        return acc;
      }, {} as Record<string, string>);
      const payload = { exchange: subscriptionExchange, symbols };
      const result = await api.post(subscriptionsEndpoint, payload);
      if (result.status >= 200 && result.status < 300) {
        setToastMessage('Subscriptions updated');
        setShowToast(true);
        await loadCurrentSubscriptions();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Update failed.';
      const serverMessage = (err as { response?: { data?: unknown } })?.response?.data;
      setError(typeof serverMessage === 'string' ? serverMessage : message);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleDeleteCurrentSubscriptions = async () => {
    if (selectedCurrentRows.size === 0) {
      setToastMessage('No subscriptions selected to delete');
      setShowToast(true);
      return;
    }
    if (typeof window !== 'undefined' && !window.confirm('Remove selected subscriptions?')) return;
    setSubscriptionLoading(true);
    try {
      const symbols = Array.from(selectedCurrentRows).reduce((acc, index) => {
        const item = currentSubscriptions[index];
        if (item && item.token) {
          acc[item.token] = item.symbol;
        }
        return acc;
      }, {} as Record<string, string>);
      const payload = { exchange: subscriptionExchange, symbols };
      const result = await api.delete(subscriptionsEndpoint, { data: payload });
      if (result.status >= 200 && result.status < 300) {
        setToastMessage('Subscriptions deleted');
        setShowToast(true);
        await loadCurrentSubscriptions();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete failed.';
      const serverMessage = (err as { response?: { data?: unknown } })?.response?.data;
      setError(typeof serverMessage === 'string' ? serverMessage : message);
    } finally {
      setSubscriptionLoading(false);
    }
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
        subscriptionName: subscriptionName.trim() || undefined,
        symbols,
      };

      const result = await api.post(subscriptionsEndpoint, payload);
      setResponse({ status: result.status, payload: result.data });
      if (result.status >= 200 && result.status < 300) {
        // show a popup/modal with server response and a toast
        setResponseFromRelogin(false);
        setShowResponseModal(true);
        setToastMessage('Subscription is done');
        setShowToast(true);
        setSubscriptionName('');
        await loadCurrentSubscriptions(subscriptionExchange);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Subscriptions update failed.';
      const serverMessage = (err as { response?: { data?: unknown } })?.response?.data;
      setError(typeof serverMessage === 'string' ? serverMessage : message);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleBackfill = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!backfillFromDate || !backfillToDate) {
        setError('Both from and to dates are required.');
      setResponse(null);
      return;
    }

    if (backfillFromDate >= backfillToDate) {
      setError('The from date must be earlier than the to date.');
      setResponse(null);
      return;
    }

    setBackfillLoading(true);
    setError('');
    setResponse(null);
    try {
      const symbolsToBackfill = Array.from(selectedBackfillRows)
        .map((index) => subscriptionSymbols[index])
        .filter((item): item is { token: string; symbol: string } => Boolean(item?.token && item.symbol));

      if (symbolsToBackfill.length === 0) {
        setError('Select at least one symbol to backfill.');
        return;
      }

      setBackfillStatus((current) => ({
        ...current,
        ...Object.fromEntries(symbolsToBackfill.map((item) => [item.token, { status: 'pending' }])),
      }));
      const result = await api.post('/history/candles/backfill', {
        symbols: symbolsToBackfill.map((item) => ({
          tradingSymbol: item.symbol,
          symbolToken: item.token,
        })),
        fromDate: backfillFromDate.replace('T', ' '),
        toDate: backfillToDate.replace('T', ' '),
        interval: backfillInterval,
        exchange: 'NSE',
      });
      const payload = (result.data as { data?: {
        savedCandles?: number;
        successfulSymbols?: string[];
        failedSymbols?: string[];
      } }).data;
      const successfulSymbols = payload?.successfulSymbols ?? [];
      const failures = payload?.failedSymbols ?? [];
      const successfulTokens = new Set(symbolsToBackfill
        .filter((item) => successfulSymbols.includes(item.symbol))
        .map((item) => item.token));
      const failedTokens = new Set(symbolsToBackfill
        .filter((item) => failures.includes(item.symbol))
        .map((item) => item.token));
      setBackfillStatus((current) => ({
        ...current,
        ...Object.fromEntries(symbolsToBackfill.map((item) => [
          item.token,
          { status: successfulTokens.has(item.token) ? 'filled' : failedTokens.has(item.token) ? 'failed' : 'pending' },
        ])),
      }));

      setResponse({
        status: result.status,
        payload: {
          requestedSymbols: symbolsToBackfill.length,
          savedCandles: payload?.savedCandles ?? 0,
          successfulSymbols,
          failedSymbols: failures,
        },
      });
      if (failures.length === 0) {
        setToastMessage(`Candle backfill completed for ${symbolsToBackfill.length} symbol${symbolsToBackfill.length === 1 ? '' : 's'}.`);
        setShowToast(true);
      } else if (failures.length > 0) {
        setError(`Backfill completed with ${failures.length} failed symbol${failures.length === 1 ? '' : 's'}.`);
      }
      await loadBackfillStatus();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Candle backfill failed.';
      const serverMessage = (err as { response?: { data?: unknown } })?.response?.data;
      setError(typeof serverMessage === 'string' ? serverMessage : message);
    } finally {
      setBackfillLoading(false);
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
              onClick={() => handleTabChange(tab.id as 'session' | 'fno' | 'subscriptions' | 'backfill')}
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
                  <>
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
                  </>
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

              {subscriptionHistory.length > 0 && (
                <div className="table-card" style={{ marginTop: '20px' }}>
                  <div className="table-toolbar">
                    <strong>Subscription history</strong>
                    <span className="table-note">{subscriptionHistory.length} saved subscriptions</span>
                  </div>
                  <div className="table-scroll">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Subscription ID</th>
                          <th>Created</th>
                          <th>Stocks</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subscriptionHistory.map((subscription) => (
                          <tr key={subscription.subscriptionId}>
                            <td>{subscription.subscriptionName}</td>
                            <td>{subscription.subscriptionId}</td>
                            <td>{new Date(subscription.createdAt).toLocaleString()}</td>
                            <td>{Object.keys(subscription.symbols ?? {}).length}</td>
                            <td>
                              <div className="button-group">
                                <button
                                  className="button button-small button-primary"
                                  type="button"
                                  disabled={subscriptionLoading}
                                  onClick={() => void handleStartSubscription(subscription.subscriptionId)}
                                >
                                  Start
                                </button>
                                <button
                                  className="button button-small button-danger"
                                  type="button"
                                  disabled={subscriptionLoading}
                                  onClick={() => void handleDeleteSubscription(subscription.subscriptionId)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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
                <div className="form-group">
                  <label className="form-label" htmlFor="subscription-name">Subscription name</label>
                  <input
                    id="subscription-name"
                    className="form-control"
                    value={subscriptionName}
                    onChange={(event) => setSubscriptionName(event.target.value)}
                    placeholder="e.g. Banking watchlist"
                    maxLength={120}
                  />
                  <p className="form-text">
                    A unique ID and creation time are generated when this subscription is submitted.
                  </p>
                </div>
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
                    {subscriptionLoading ? 'Saving…' : 'Submit subscriptions'}
                  </button>
                  <button className="button button-outline-primary" type="button" onClick={handleSyncSelection} disabled={currentLoading}>
                    {currentLoading ? <span className="spinner" aria-hidden="true" /> : null}
                    Sync selection
                    Delete selected
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'backfill' && (
            <div className="tab-section">
              <div className="section-header section-header-sm">
                <div>
                  <h5>Historical candle backfill</h5>
                  <p className="section-text">Fetch candles from AngelOne and save them in the history service.</p>
                </div>
              </div>

              <form onSubmit={handleBackfill} className="form-stack">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="backfill-from-date">From date</label>
                    <input id="backfill-from-date" type="datetime-local" className="form-control" value={backfillFromDate} onChange={(event) => setBackfillFromDate(event.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="backfill-to-date">To date</label>
                    <input id="backfill-to-date" type="datetime-local" className="form-control" value={backfillToDate} onChange={(event) => setBackfillToDate(event.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="backfill-interval">Interval</label>
                  <select id="backfill-interval" className="form-control" value={backfillInterval} onChange={(event) => setBackfillInterval(event.target.value)}>
                    <option value="ONE_MINUTE">One minute</option>
                    <option value="THREE_MINUTE">Three minutes</option>
                    <option value="FIVE_MINUTE">Five minutes</option>
                    <option value="TEN_MINUTE">Ten minutes</option>
                    <option value="FIFTEEN_MINUTE">Fifteen minutes</option>
                    <option value="THIRTY_MINUTE">Thirty minutes</option>
                    <option value="ONE_HOUR">One hour</option>
                    <option value="ONE_DAY">One day</option>
                  </select>
                </div>
                <div className="table-card">
                  <div className="table-toolbar">
                    <label className="checkbox-field">
                      <input
                        type="checkbox"
                        checked={subscriptionSymbols.length > 0 && selectedBackfillRows.size === subscriptionSymbols.length}
                        onChange={() => {
                          if (selectedBackfillRows.size === subscriptionSymbols.length) {
                            setSelectedBackfillRows(new Set());
                          } else {
                            setSelectedBackfillRows(new Set(subscriptionSymbols.map((_, index) => index)));
                          }
                        }}
                      />
                      {selectedBackfillRows.size === subscriptionSymbols.length ? 'Unselect all' : 'Select all'}
                    </label>
                    <span className="table-note">{subscriptionSymbols.length} {subscriptionSymbols.length === 1 ? 'row' : 'rows'} loaded</span>
                  </div>
                  <div className="table-scroll">
                    <table className="table">
                      <thead>
                        <tr>
                          <th />
                          <th>Token ID</th>
                          <th>Symbol Name</th>
                          <th>Status</th>
                          <th>Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subscriptionSymbols.length === 0 ? (
                          <tr><td colSpan={5} className="table-empty">Load FNO symbols to choose backfill symbols.</td></tr>
                        ) : subscriptionSymbols.map((item, index) => (
                          <tr key={`backfill-${item.token}-${index}`}>
                            <td className="table-checkbox">
                              <input
                                type="checkbox"
                                checked={selectedBackfillRows.has(index)}
                                onChange={() => {
                                  const nextSelected = new Set(selectedBackfillRows);
                                  if (nextSelected.has(index)) nextSelected.delete(index);
                                  else nextSelected.add(index);
                                  setSelectedBackfillRows(nextSelected);
                                }}
                              />
                            </td>
                            <td>{item.token}</td>
                            <td>{item.symbol}</td>
                            <td>
                              {backfillStatus[item.token]?.status === 'filled' && <span className="badge badge-success">Filled</span>}
                              {backfillStatus[item.token]?.status === 'pending' && <span className="badge badge-info">Pending</span>}
                              {backfillStatus[item.token]?.status === 'failed' && <span className="badge badge-danger">Failed</span>}
                              {backfillStatus[item.token]?.status === 'backfilled' && <span className="badge backfill-status-badge">Backfilled</span>}
                              {!backfillStatus[item.token] && <span className="table-note">Not backfilled</span>}
                              {backfillStatus[item.token]?.candleCount !== undefined && (
                                <span className="table-note"> ({backfillStatus[item.token].candleCount} candles)</span>
                              )}
                            </td>
                            <td>{backfillStatus[item.token]?.updatedAt ? new Date(backfillStatus[item.token].updatedAt as string).toLocaleString() : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="button-group">
                  <button className="button button-primary" type="submit" disabled={backfillLoading}>
                    {backfillLoading ? <span className="spinner" aria-hidden="true" /> : null}
                    {backfillLoading ? 'Backfilling…' : `Backfill ${selectedBackfillRows.size > 0 ? `${selectedBackfillRows.size} symbols` : 'candles'}`}
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
            <div className="response-modal-footer">
              <div className="modal-status">
                {response && response.status >= 200 && response.status < 300 ? (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="12" fill="#DCFCE7" />
                    <path d="M7.5 12.5l2.5 2.5L16.5 9" stroke="#166534" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="12" fill="#FEE2E2" />
                    <path d="M12 7.5v5" stroke="#991b1b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="15.5" r="0.5" fill="#991b1b" />
                  </svg>
                )}
              </div>
              <div className="modal-actions">
                <button className="button button-primary" type="button" onClick={closeResponseModal}>OK</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BrokerAngelOne;
