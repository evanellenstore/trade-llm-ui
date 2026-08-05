import React, { useState } from 'react';
import { Alert, Badge, Button, ButtonGroup, Card, Container, Form, Spinner, Toast } from 'react-bootstrap';
import api from '../../services/api';

const loginEndpoint = '/broker/api/angelOne/login/byTtop';
const reloginEndpoint = '/broker/api/angelOne/relogin';
const subscriptionsEndpoint = '/broker/api/angelOne/subscriptions';
const saveFnoStockEndpoint = '/broker/api/job/saveFNOStock';

const BrokerAngelOneDocs: React.FC = () => {
  const [ttop, setTtop] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [response, setResponse] = useState<{ status: number; payload: unknown } | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState('');
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [reloginLoading, setReloginLoading] = useState(false);
  const [showInput, setShowInput] = useState(true);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [fnoStockLoading, setFnoStockLoading] = useState(false);
  const [subscriptionExchange, setSubscriptionExchange] = useState('NSE');
  const [subscriptionSymbols, setSubscriptionSymbols] = useState<Array<{ token: string; symbol: string }>>([
    { token: '', symbol: '' },
  ]);
  const [subscriptionFormError, setSubscriptionFormError] = useState('');
  const [subscriptionFieldErrors, setSubscriptionFieldErrors] = useState<Record<number, { token?: string; symbol?: string }>>({});

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
      if (result.status >= 200 && result.status < 300) {
        // Show a generic success message instead of raw server payload
        setToastMessage('Login successful!');
        setShowToast(true);
      }
      setLastCheckedAt(new Date().toLocaleString());
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : 'Broker login check failed.';

      const serverMessage = (err as { response?: { data?: unknown } })?.response?.data;
      setError(typeof serverMessage === 'string' ? serverMessage : message);
      setLastCheckedAt(new Date().toLocaleString());
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
      if (result.status >= 200 && result.status < 300) {
        setToastMessage('Re-login successful!');
        setShowToast(true);
      }
      setLastCheckedAt(new Date().toLocaleString());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Re-login failed.';
      const serverMessage = (err as { response?: { data?: unknown } })?.response?.data;
      setError(typeof serverMessage === 'string' ? serverMessage : message);
      setLastCheckedAt(new Date().toLocaleString());
    } finally {
      setReloginLoading(false);
    }
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

    setSubscriptionFieldErrors(nextFieldErrors);
    setSubscriptionFormError(formError);
    return formError === '';
  };

  const handleSaveFnoStocks = async () => {
    if (typeof window !== 'undefined' && !window.confirm('This will trigger the broker service to import FNO stock master data. Continue?')) {
      return;
    }

    setError('');
    setResponse(null);
    setFnoStockLoading(true);

    try {
      const result = await api.get(saveFnoStockEndpoint);
      setResponse({ status: result.status, payload: result.data });
      if (result.status >= 200 && result.status < 300) {
        setToastMessage('FNO stock import triggered successfully!');
        setShowToast(true);
      }
      setLastCheckedAt(new Date().toLocaleString());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'FNO stock import failed.';
      const serverMessage = (err as { response?: { data?: unknown } })?.response?.data;
      setError(typeof serverMessage === 'string' ? serverMessage : message);
      setLastCheckedAt(new Date().toLocaleString());
    } finally {
      setFnoStockLoading(false);
    }
  };

  const handleSubscriptions = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setResponse(null);
    setSubscriptionFormError('');
    setSubscriptionFieldErrors({});

    if (!validateSubscriptionForm()) {
      return;
    }

    setSubscriptionLoading(true);
    try {
      const symbols = subscriptionSymbols.reduce((acc, item) => {
        if (item.token.trim() && item.symbol.trim()) {
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
      setLastCheckedAt(new Date().toLocaleString());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Subscriptions update failed.';
      const serverMessage = (err as { response?: { data?: unknown } })?.response?.data;
      setError(typeof serverMessage === 'string' ? serverMessage : message);
      setLastCheckedAt(new Date().toLocaleString());
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

  const addSubscriptionRow = () => {
    setSubscriptionSymbols((prev) => [...prev, { token: '', symbol: '' }]);
  };

  const removeSubscriptionRow = (index: number) => {
    setSubscriptionSymbols((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateSubscriptionRow = (index: number, field: 'token' | 'symbol', value: string) => {
    setSubscriptionSymbols((prev) => prev.map((item, idx) => idx === index ? { ...item, [field]: value } : item));
  };

  const statusVariant = (status?: number) => {
    if (!status) return 'secondary';
    if (status >= 200 && status < 300) return 'success';
    if (status >= 400 && status < 500) return 'warning';
    return 'danger';
  };

  return (
    <Container fluid className="py-4">
      <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1060 }}>
        <Toast onClose={() => setShowToast(false)} show={showToast} bg="success" autohide delay={3000}>
          <Toast.Header>
            <strong className="me-auto">Broker</strong>
            <small>now</small>
          </Toast.Header>
          <Toast.Body className="text-white">{toastMessage}</Toast.Body>
        </Toast>
      </div>

      <Alert variant="info" className="mx-auto mb-4 d-flex flex-column flex-md-row justify-content-between align-items-start gap-2" style={{ maxWidth: 760 }}>
        <div>
          <div className="fw-semibold">Quick FNO import</div>
          <div className="text-muted">Trigger the broker service to load the latest FNO master data in one click.</div>
        </div>
        <Button variant="primary" size="lg" onClick={handleSaveFnoStocks} disabled={fnoStockLoading}>
          {fnoStockLoading ? <><Spinner animation="border" size="sm" className="me-2" />Importing...</> : 'Import FNO stocks'}
        </Button>
      </Alert>

      <div className="mx-auto" style={{ maxWidth: 760 }}>
        <Card className="border-0 shadow-sm mb-4">
          <Card.Header className="bg-white border-bottom-0">
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
              <div>
                <h4 className="mb-1">AngelOne Broker Login</h4>
                <p className="mb-0 text-muted">Use the TTOP input to login a trader, or re-login existing broker sessions.</p>
              </div>
              <Badge bg="info" text="dark" className="align-self-center">Admin tool</Badge>
            </div>
          </Card.Header>
          <Card.Body className="bg-white">
            <Form onSubmit={handleLogin}>
              {showInput ? (
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">TTOP Identifier</Form.Label>
                  <Form.Control
                    size="lg"
                    value={ttop}
                    onChange={(event) => setTtop(event.target.value)}
                    placeholder="Login with TTOP"
                    aria-label="Login with TTOP"
                  />
                  <Form.Text className="text-muted">Enter the trader's TTOP when logging in. Use relogin if you want to refresh an existing session.</Form.Text>
                </Form.Group>
              ) : (
                <div className="mb-3 rounded-3 border border-secondary-subtle p-3 bg-light">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-semibold">Re-login mode</div>
                      <div className="text-muted">TTOP input is hidden while re-login is active.</div>
                    </div>
                    <Button variant="link" size="sm" onClick={() => setShowInput(true)}>Show input</Button>
                  </div>
                </div>
              )}

              <div className="d-flex flex-wrap gap-2 align-items-center">
                <ButtonGroup className="me-2">
                  <Button variant="primary" size="lg" type="submit" disabled={loading} aria-live="polite">
                    {loading ? <><Spinner animation="border" size="sm" className="me-2" />Checking...</> : 'Login with TTOP'}
                  </Button>
                  <Button variant="outline-primary" size="lg" type="button" disabled={reloginLoading} onClick={handleRelogin}>
                    {reloginLoading ? <><Spinner animation="border" size="sm" className="me-2" />Re-login...</> : 'Re-login'}
                  </Button>
                </ButtonGroup>

                {showInput && (
                  <Button variant="outline-secondary" size="lg" type="button" onClick={() => setTtop('')}>
                    Reset
                  </Button>
                )}
              </div>
            </Form>
          </Card.Body>
        </Card>
      </div>

      <div className="mx-auto" style={{ maxWidth: 760 }}>
        <Card className="border-0 shadow-sm mb-4">
          <Card.Header className="bg-white border-bottom-0">
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
              <div>
                <h5 className="mb-1">FNO stock import</h5>
                <p className="mb-0 text-muted">Trigger the broker service to load FNO stock master data for the configured exchange.</p>
              </div>
              <Badge bg="info" text="dark" className="align-self-center">Import</Badge>
            </div>
          </Card.Header>
          <Card.Body className="bg-white">
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <Button variant="primary" size="lg" onClick={handleSaveFnoStocks} disabled={fnoStockLoading}>
                {fnoStockLoading ? <><Spinner animation="border" size="sm" className="me-2" />Importing...</> : 'Import FNO stocks'}
              </Button>
            </div>
          </Card.Body>
        </Card>
      </div>

      <div className="mx-auto" style={{ maxWidth: 760 }}>
        <Card className="border-0 shadow-sm mb-4">
          <Card.Header className="bg-white border-bottom-0">
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
              <div>
                <h5 className="mb-1">Broker Subscriptions</h5>
                <p className="mb-0 text-muted">Send subscription metadata for AngelOne to register symbols on the chosen exchange.</p>
              </div>
              <Badge bg="secondary" className="align-self-center">New feature</Badge>
            </div>
          </Card.Header>
          <Card.Body className="bg-white">
            <Form onSubmit={handleSubscriptions}>
              <div className="row g-3 mb-3">
                <div className="col-12 col-md-4">
                  <Form.Label className="fw-semibold">Exchange</Form.Label>
                  <Form.Select value={subscriptionExchange} onChange={(event) => setSubscriptionExchange(event.target.value)}>
                    <option value="NSE">NSE</option>
                    <option value="BSE">BSE</option>
                  </Form.Select>
                </div>
                <div className="col-12 col-md-8">
                  <Form.Label className="fw-semibold">Symbols</Form.Label>
                  <div className="border rounded-3 p-3 bg-light">
                    {subscriptionSymbols.map((item, index) => (
                      <div key={`${item.token}-${index}`} className="d-flex flex-wrap gap-2 align-items-start mb-2">
                        <Form.Group className="flex-grow-1" controlId={`subscription-token-${index}`}>
                          <Form.Control
                            type="text"
                            placeholder="Token ID"
                            value={item.token}
                            onChange={(event) => updateSubscriptionRow(index, 'token', event.target.value)}
                            className="flex-grow-1"
                            isInvalid={Boolean(subscriptionFieldErrors[index]?.token)}
                          />
                          <Form.Control.Feedback type="invalid">
                            {subscriptionFieldErrors[index]?.token}
                          </Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className="flex-grow-2" controlId={`subscription-symbol-${index}`}>
                          <Form.Control
                            type="text"
                            placeholder="Symbol Name"
                            value={item.symbol}
                            onChange={(event) => updateSubscriptionRow(index, 'symbol', event.target.value)}
                            className="flex-grow-2"
                            isInvalid={Boolean(subscriptionFieldErrors[index]?.symbol)}
                          />
                          <Form.Control.Feedback type="invalid">
                            {subscriptionFieldErrors[index]?.symbol}
                          </Form.Control.Feedback>
                        </Form.Group>

                        {subscriptionSymbols.length > 1 && (
                          <Button variant="outline-danger" size="sm" onClick={() => removeSubscriptionRow(index)}>
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button variant="outline-primary" size="sm" onClick={addSubscriptionRow}>
                      Add symbol
                    </Button>
                  </div>
                </div>
              </div>

              {subscriptionFormError && (
                <Alert variant="warning" className="mb-3 py-2">
                  {subscriptionFormError}
                </Alert>
              )}

              <div className="d-flex flex-wrap gap-2 align-items-center">
                <Button variant="success" type="submit" disabled={subscriptionLoading}>
                  {subscriptionLoading ? <><Spinner animation="border" size="sm" className="me-2" />Submitting...</> : 'Submit subscriptions'}
                </Button>
                <Button variant="outline-secondary" type="button" onClick={() => {
                  setSubscriptionExchange('NSE');
                  setSubscriptionSymbols([{ token: '', symbol: '' }]);
                  setSubscriptionFormError('');
                  setSubscriptionFieldErrors({});
                }}>
                  Reset subscriptions
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </div>

      {error && <Alert variant="danger" className="py-3">{error}</Alert>}
      {response && !(response.status >= 200 && response.status < 300) && (
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body className="p-4">
            <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
              <div>
                <h6 className="mb-1">Response details</h6>
                <small className="text-muted">Status code and payload from the broker service.</small>
              </div>
              <Badge bg={statusVariant(response.status)}>{response.status}</Badge>
            </div>

            <div className="d-flex flex-wrap gap-2 justify-content-end mb-3">
              <Button size="sm" variant="outline-secondary" onClick={() => setShowRaw((s) => !s)}>
                {showRaw ? 'Pretty' : 'Raw'}
              </Button>
              <Button size="sm" variant="outline-primary" onClick={copyToClipboard}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>

            <div className="rounded-3 bg-light p-3" style={{ whiteSpace: showRaw ? 'pre' : 'pre-wrap', maxHeight: '320px', overflow: 'auto', fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>
              {renderPayload()}
            </div>
            {lastCheckedAt && <div className="text-muted small mt-3">Checked at {lastCheckedAt}</div>}
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default BrokerAngelOneDocs;
