import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { getCandles, getSymbols } from '../../services/marketService';
import { sendMessage } from '../../services/aiService';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

type Candle = {
  symbol?: string;
  close: number;
  startTime?: string;
  endTime?: string;
};

type ApiEnvelope<T> = { data?: T };

const MarketAnalysis = () => {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [symbol, setSymbol] = useState('');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loadingSymbols, setLoadingSymbols] = useState(true);
  const [loadingCandles, setLoadingCandles] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<unknown>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSymbols = async () => {
      try {
        const response = await getSymbols();
        const payload = response.data as ApiEnvelope<string[]> | string[];
        const availableSymbols = Array.isArray(payload) ? payload : payload.data ?? [];
        setSymbols(availableSymbols);
        if (availableSymbols.length > 0) setSymbol(availableSymbols[0]);
      } catch {
        setError('Unable to load market symbols.');
      } finally {
        setLoadingSymbols(false);
      }
    };

    void loadSymbols();
  }, []);

  const loadCandles = async () => {
    if (!symbol) return;
    setLoadingCandles(true);
    setError('');
    try {
      const response = await getCandles(symbol, 'ONE_MINUTE', 100);
      const payload = response.data as ApiEnvelope<Candle[]> | Candle[];
      setCandles(Array.isArray(payload) ? payload : payload.data ?? []);
    } catch {
      setError(`Unable to load candles for ${symbol}.`);
      setCandles([]);
    } finally {
      setLoadingCandles(false);
    }
  };

  useEffect(() => {
    void loadCandles();
  }, [symbol]);

  const chartData = useMemo(() => ({
    labels: candles.map((candle) => {
      const value = candle.startTime ?? candle.endTime;
      return value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    }),
    datasets: [{
      label: `${symbol} close`,
      data: candles.map((candle) => candle.close),
      borderColor: '#176b87',
      backgroundColor: 'rgba(23, 107, 135, 0.12)',
      fill: true,
      tension: 0.25,
      pointRadius: 0,
    }],
  }), [candles, symbol]);

  const askAi = async () => {
    if (!symbol) return;
    setAiLoading(true);
    setError('');
    try {
      const result = await sendMessage(
        `Analyze ${symbol} using the current market graph. Return trend, support, resistance, risk, and a concise signal.`,
      );
      setAiResult(result);
    } catch {
      setError('AI analysis could not be loaded. The market graph is still available.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="container-fluid py-4">
      <Row className="align-items-end g-3 mb-4">
        <Col>
          <Badge bg="dark" className="mb-2">MARKET ANALYSIS</Badge>
          <h2 className="mb-1">Live market graph</h2>
          <p className="text-muted mb-0">The graph loads first. AI analysis appears alongside it when ready.</p>
        </Col>
        <Col md="4">
          <Form.Label htmlFor="market-symbol">Stock</Form.Label>
          <Form.Select id="market-symbol" value={symbol} onChange={(event) => setSymbol(event.target.value)} disabled={loadingSymbols}>
            {symbols.length === 0 && <option value="">No symbols available</option>}
            {symbols.map((item) => <option key={item} value={item}>{item}</option>)}
          </Form.Select>
        </Col>
      </Row>

      {error && <Alert variant="warning">{error}</Alert>}

      <Row className="g-4">
        <Col lg={8}>
          <Card className="h-100 shadow-sm">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <strong>{symbol || 'Market'} price graph</strong>
              <Button variant="outline-secondary" size="sm" onClick={() => void loadCandles()} disabled={loadingCandles || !symbol}>
                {loadingCandles ? <Spinner size="sm" /> : 'Refresh'}
              </Button>
            </Card.Header>
            <Card.Body style={{ minHeight: '360px' }}>
              {candles.length > 0 ? (
                <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: false } } }} height={300} />
              ) : (
                <div className="h-100 d-flex align-items-center justify-content-center text-muted">
                  {loadingCandles ? 'Loading market data…' : 'No candle data available.'}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="h-100 shadow-sm">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <strong>AI analysis</strong>
              <Button variant="primary" size="sm" onClick={() => void askAi()} disabled={aiLoading || !symbol}>
                {aiLoading ? <Spinner size="sm" /> : 'Ask AI'}
              </Button>
            </Card.Header>
            <Card.Body>
              {aiResult ? <pre className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(aiResult, null, 2)}</pre> : (
                <p className="text-muted mb-0">Ask AI after the graph loads to add analysis beside the chart.</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MarketAnalysis;