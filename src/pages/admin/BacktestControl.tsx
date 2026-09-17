import React, { useEffect, useState } from "react";
import { Button, Card, Col, Form, Row, Spinner, Stack, Tab, Tabs } from "react-bootstrap";
import {
  backfillAllIndicators,
  backfillIndicators,
  BackfillSymbol,
  getCandleBackfillStatus,
  getBacktestReport,
  getFnoStockSymbols,
  runBacktest,
  runLive,
} from "../../services/marketService";
import { useMode } from "../../context/ModeContext";
import StrategyConfigPage from "../trader/StrategyConfig";

const BacktestControl: React.FC = () => {
  const [timeframe, setTimeframe] = useState("ONE_MINUTE");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const { mode, setMode } = useMode();
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState<any | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("backtest");
  const [indicatorTimeframe, setIndicatorTimeframe] = useState("ONE_MINUTE");
  const [indicatorLoading, setIndicatorLoading] = useState(false);
  const [indicatorAllLoading, setIndicatorAllLoading] = useState(false);
  const [indicatorRunId, setIndicatorRunId] = useState<string | null>(null);
  const [indicatorMessage, setIndicatorMessage] = useState<string | null>(null);
  const [indicatorSymbols, setIndicatorSymbols] = useState<BackfillSymbol[]>([]);
  const [selectedIndicatorRows, setSelectedIndicatorRows] = useState<Set<number>>(new Set());
  const [indicatorCandleStatus, setIndicatorCandleStatus] = useState<Record<string, {
    status: string;
    candleCount?: number;
    updatedAt?: string;
  }>>({});

  const isProcessing = backtestLoading || liveLoading;

  const toIsoInstant = (dateTimeLocal: string) => {
    if (!dateTimeLocal) {
      return undefined;
    }
    const date = new Date(dateTimeLocal);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  };

  const handleRunBacktest = async () => {
    setBacktestLoading(true);
    setRunId(null);
    setMessage(null);
    try {
      const response = await runBacktest({
        timeframe,
        startDatetime: toIsoInstant(startTime),
        endDatetime: toIsoInstant(endTime),
      });

      const nextRunId = response?.data?.runId || response?.data?.data?.runId || null;
      setRunId(nextRunId);
      setMessage(
        nextRunId
          ? `Market Data run started. Run ID: ${nextRunId}`
          : "Market Data run started."
      );
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Unable to start Market Data run");
    } finally {
      setBacktestLoading(false);
    }
  };

  const handleRunLive = async () => {
    setLiveLoading(true);
    setRunId(null);
    setMessage(null);
    try {
      const response = await runLive({
        timeframe,
        startDatetime: toIsoInstant(startTime),
        endDatetime: toIsoInstant(endTime),
      });
      const nextRunId = response?.data?.runId || response?.data?.data?.runId || null;
      setRunId(nextRunId);
      setMessage(
        nextRunId
          ? `Market Data run started. Run ID: ${nextRunId}`
          : "Market Data run started."
      );
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Unable to start Market Data run");
    } finally {
      setLiveLoading(false);
    }
  };

  const handleRun = async () => {
    if (mode === "live") {
      await handleRunLive();
    } else {
      await handleRunBacktest();
    }
  };

  const handleModeChange = (newMode: "backtest" | "live") => {
    setMode(newMode);
    setRunId(null);
    setMessage(null);
    setReport(null);
  };

  const handleLoadReport = async () => {
    setReportLoading(true);
    setMessage(null);
    try {
      const response = await getBacktestReport({
        timeframe,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
      });
      setReport(response.data.data);
      setMessage("Market Data report loaded");
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Unable to load Market Data report");
    } finally {
      setReportLoading(false);
    }
  };

  const getIndicatorRunId = (response: any) => response?.data?.data ?? response?.data?.runId ?? null;

  const handleAllIndicatorBackfill = async () => {
    setIndicatorAllLoading(true);
    setIndicatorRunId(null);
    setIndicatorMessage(null);
    try {
      const response = await backfillAllIndicators();
      setIndicatorRunId(getIndicatorRunId(response));
      setIndicatorMessage("Indicator backfill for all symbols started.");
    } catch (error: any) {
      setIndicatorMessage(error.response?.data?.message || "Unable to start indicator backfill.");
    } finally {
      setIndicatorAllLoading(false);
    }
  };

  const loadIndicatorSymbols = async () => {
    setIndicatorMessage(null);
    try {
      const response = await getFnoStockSymbols();
      const rows = (Array.isArray(response.data) ? response.data : []).map((item: {
        symboltoken: string;
        tradingsymbol: string;
      }) => ({ token: item.symboltoken, symbol: item.tradingsymbol }));
      setIndicatorSymbols(rows);
      setSelectedIndicatorRows(new Set(rows.map((_, index) => index)));

      if (rows.length > 0) {
        const statusResponse = await getCandleBackfillStatus(
          rows.map((row) => row.token), indicatorTimeframe);
        const statusData = statusResponse.data?.data ?? {};
        setIndicatorCandleStatus(statusData);
      } else {
        setIndicatorCandleStatus({});
      }
    } catch (error: any) {
      setIndicatorSymbols([]);
      setSelectedIndicatorRows(new Set());
      setIndicatorCandleStatus({});
      setIndicatorMessage(error.response?.data?.message || "Unable to load indicator symbols.");
    }
  };

  const handleSelectedIndicatorBackfill = async () => {
    const selectedSymbols = Array.from(selectedIndicatorRows)
      .map((index) => indicatorSymbols[index])
      .filter((item): item is BackfillSymbol => Boolean(item));
    if (selectedSymbols.length === 0) {
      setIndicatorMessage("Select at least one symbol.");
      return;
    }

    setIndicatorLoading(true);
    setIndicatorRunId(null);
    setIndicatorMessage(null);
    try {
      const responses = await Promise.all(
        selectedSymbols.map((item) => backfillIndicators({
          symbol: item.symbol,
          timeframe: indicatorTimeframe,
        })),
      );
      const runIds = responses
        .map((response) => getIndicatorRunId(response))
        .filter((runId): runId is string => Boolean(runId));
      setIndicatorRunId(runIds[0] ?? null);
      setIndicatorMessage(`Indicator backfill started for ${selectedSymbols.length} symbol${selectedSymbols.length === 1 ? "" : "s"}.`);
    } catch (error: any) {
      setIndicatorMessage(error.response?.data?.message || "Unable to start selected indicator backfill.");
    } finally {
      setIndicatorLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "indicator-backfill") {
      void loadIndicatorSymbols();
    }
  }, [activeTab, indicatorTimeframe]);

  return (
    <Card className="mb-4">
      <Card.Body>
        <Card.Title>Market Data Control</Card.Title>
        <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || "backtest")} className="mb-4">
          <Tab eventKey="backtest" title="Backtest">
            <Form>
              <Form.Group className="mb-3" controlId="backtestTimeframe">
                <Form.Label>Timeframe</Form.Label>
                <Form.Control value={timeframe} onChange={(e) => setTimeframe(e.target.value)} />
              </Form.Group>
              {mode === "backtest" && (
                <>
                  <Form.Group className="mb-3" controlId="backtestStartTime">
                    <Form.Label>Start Time (optional)</Form.Label>
                    <Form.Control
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="backtestEndTime">
                    <Form.Label>End Time (optional)</Form.Label>
                    <Form.Control
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </Form.Group>
                </>
              )}
              <Stack direction="horizontal" gap={2} className="mb-3">
                <Button variant="primary" onClick={handleRun} disabled={isProcessing}>
                  {mode === "live"
                    ? liveLoading
                      ? <><Spinner animation="border" size="sm" /> Live…</>
                      : "Run Live"
                    : backtestLoading
                      ? <><Spinner animation="border" size="sm" /> Running…</>
                      : "Run Market Data"}
                </Button>
                {mode === "backtest" && (
                  <Button variant="secondary" onClick={handleLoadReport} disabled={reportLoading}>
                    {reportLoading ? <><Spinner animation="border" size="sm" /> Loading…</> : "Load Report"}
                  </Button>
                )}
              </Stack>
              {message && <p className="mt-3">{message}</p>}
              {runId && (
                <div className="mt-3 mb-2 p-2 border rounded bg-light">
                  <strong>Run ID:</strong> <code>{runId}</code>
                </div>
              )}
              {report && (
                <div className="mt-4">
                  <h5>Market Data Report</h5>
                  <p>
                    Indicators: {report.indicators?.length ?? 0}, Patterns: {report.patterns?.length ?? 0}
                  </p>
                  <pre style={{ maxHeight: 400, overflow: "auto", background: "#f8f9fa", padding: 12 }}>
                    {JSON.stringify(report, null, 2)}
                  </pre>
                </div>
              )}
            </Form>
          </Tab>
          <Tab eventKey="chart" title="Chart">
            <div className="py-4">
              <h5>Chart View</h5>
              <p className="text-muted">Select a symbol and run a Market Data process to view chart details here.</p>
              <div className="border rounded p-3" style={{ minHeight: 260, background: '#ffffff' }}>
                <p className="mb-0 text-secondary">Chart rendering will appear in this panel.</p>
              </div>
            </div>
          </Tab>
          <Tab eventKey="indicator-backfill" title="Indicator Backfill">
            <div className="py-3">
              <h5>Historical indicator backfill</h5>
              <p className="text-muted">
                Calculate indicators from backtest candles in the market service.
              </p>
              <Row className="g-3 mb-3 align-items-end">
                <Col md={6}>
                  <Form.Label htmlFor="indicator-timeframe">Timeframe</Form.Label>
                  <Form.Select
                    id="indicator-timeframe"
                    value={indicatorTimeframe}
                    onChange={(event) => setIndicatorTimeframe(event.target.value)}
                  >
                    <option value="ONE_MINUTE">ONE_MINUTE</option>
                    <option value="FIVE_MINUTE">FIVE_MINUTE</option>
                    <option value="FIFTEEN_MINUTE">FIFTEEN_MINUTE</option>
                    <option value="THIRTY_MINUTE">THIRTY_MINUTE</option>
                    <option value="ONE_HOUR">ONE_HOUR</option>
                    <option value="ONE_DAY">ONE_DAY</option>
                  </Form.Select>
                </Col>
                <Col md="auto">
                  <Button variant="outline-secondary" onClick={() => void loadIndicatorSymbols()}>
                    Refresh Symbols
                  </Button>
                </Col>
              </Row>
              <div className="border rounded mb-3">
                <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
                  <Form.Check
                    type="checkbox"
                    label={selectedIndicatorRows.size === indicatorSymbols.length && indicatorSymbols.length > 0 ? "Unselect all" : "Select all"}
                    checked={indicatorSymbols.length > 0 && selectedIndicatorRows.size === indicatorSymbols.length}
                    onChange={() => setSelectedIndicatorRows(
                      selectedIndicatorRows.size === indicatorSymbols.length
                        ? new Set()
                        : new Set(indicatorSymbols.map((_, index) => index)),
                    )}
                  />
                  <span className="text-muted">{indicatorSymbols.length} rows loaded</span>
                </div>
                <div style={{ maxHeight: 420, overflowY: "auto" }}>
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th aria-label="Select" />
                        <th>Token ID</th>
                        <th>Symbol Name</th>
                        <th>Status</th>
                        <th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {indicatorSymbols.length === 0 ? (
                        <tr><td colSpan={5} className="text-center text-muted py-4">No symbols loaded.</td></tr>
                      ) : indicatorSymbols.map((item, index) => {
                        const status = indicatorCandleStatus[item.token];
                        return (
                          <tr key={`${item.token}-${index}`}>
                            <td>
                              <Form.Check
                                type="checkbox"
                                aria-label={`Select ${item.symbol}`}
                                checked={selectedIndicatorRows.has(index)}
                                onChange={() => {
                                  const next = new Set(selectedIndicatorRows);
                                  if (next.has(index)) next.delete(index);
                                  else next.add(index);
                                  setSelectedIndicatorRows(next);
                                }}
                              />
                            </td>
                            <td>{item.token}</td>
                            <td>{item.symbol}</td>
                            <td>{status ? `Backfilled (${status.candleCount ?? 0} candles)` : "Not backfilled"}</td>
                            <td>{status?.updatedAt ? new Date(status.updatedAt).toLocaleString() : "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <Stack direction="horizontal" gap={2} className="mb-3">
                <Button
                  variant="primary"
                  onClick={() => void handleSelectedIndicatorBackfill()}
                  disabled={indicatorLoading || indicatorAllLoading}
                >
                  {indicatorLoading
                    ? <><Spinner animation="border" size="sm" /> Starting…</>
                    : `Backfill Selected (${selectedIndicatorRows.size})`}
                </Button>
                <Button
                  variant="outline-secondary"
                  onClick={() => void handleAllIndicatorBackfill()}
                  disabled={indicatorLoading || indicatorAllLoading}
                >
                  {indicatorAllLoading
                    ? <><Spinner animation="border" size="sm" /> Starting…</>
                    : "Backfill All"}
                </Button>
              </Stack>
              {indicatorMessage && <p className="mt-3">{indicatorMessage}</p>}
              {indicatorRunId && (
                <div className="mt-3 mb-2 p-2 border rounded bg-light">
                  <strong>Run ID:</strong> <code>{indicatorRunId}</code>
                </div>
              )}
            </div>
          </Tab>
          <Tab eventKey="strategy-config" title="Strategy Config">
            <div className="py-3">
              <StrategyConfigPage />
            </div>
          </Tab>
        </Tabs>
      </Card.Body>
    </Card>
  );
};

export default BacktestControl;
