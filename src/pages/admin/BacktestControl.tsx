import React, { useEffect, useState } from "react";
import { Button, Card, Form, Spinner, Stack } from "react-bootstrap";
import { getBacktestReport, getSymbols, runBacktest, runLive } from "../../services/marketService";
import { useMode } from "../../context/ModeContext";

const BacktestControl: React.FC = () => {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [symbol, setSymbol] = useState("");
  const [timeframe, setTimeframe] = useState("ONE_MINUTE");
  const [runId, setRunId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const { mode, setMode } = useMode();
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState<any | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [symbolsLoading, setSymbolsLoading] = useState(false);

  const isProcessing = backtestLoading || liveLoading;

  const handleRunBacktest = async () => {
    setBacktestLoading(true);
    setMessage(null);
    try {
      const response = await runBacktest({
        symbol,
        timeframe,
        runId: runId || undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
      });
      const returnedRunId = response.data.data.runId;
      if (returnedRunId) {
        setRunId(returnedRunId);
      }
      setMessage(`Backtest started. runId=${returnedRunId}`);
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Unable to start backtest");
    } finally {
      setBacktestLoading(false);
    }
  };

  const handleRunLive = async () => {
    setLiveLoading(true);
    setMessage(null);
    try {
      const response = await runLive();
      setMessage(response.data.message || "Live processing started");
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Unable to start live processing");
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
    setMessage(null);
    setReport(null);
  };

  const loadSymbols = async () => {
    setSymbolsLoading(true);
    try {
      const response = await getSymbols();
      setSymbols(response.data.data || []);
      if (response.data.data?.length > 0) {
        setSymbol(response.data.data[0]);
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Unable to load symbols");
    } finally {
      setSymbolsLoading(false);
    }
  };

  useEffect(() => {
    loadSymbols();
  }, []);

  const handleLoadReport = async () => {
    setReportLoading(true);
    setMessage(null);
    try {
      const response = await getBacktestReport({
        symbol,
        timeframe,
        runId: runId || undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
      });
      setReport(response.data.data);
      setMessage("Backtest report loaded");
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Unable to load backtest report");
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <Card className="mb-4">
      <Card.Body>
        <Card.Title>Market Indicator Runner</Card.Title>
        <Form>
          <Form.Group className="mb-3" controlId="backtestSymbol">
            <Form.Label>Symbol</Form.Label>
            <Form.Select value={symbol} onChange={(e) => setSymbol(e.target.value)} disabled={symbolsLoading}>
              {symbolsLoading ? <option>Loading symbols...</option> : null}
              {symbols.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
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
              <Form.Group className="mb-3" controlId="backtestRunId">
                <Form.Label>Run ID (optional)</Form.Label>
                <Form.Control value={runId} onChange={(e) => setRunId(e.target.value)} placeholder="leave blank to auto-generate" />
              </Form.Group>
            </>
          )}
          <Stack direction="horizontal" gap={2} className="mb-3">
            <Button variant="primary" onClick={handleRun} disabled={isProcessing || !symbol}>
              {mode === "live"
                ? liveLoading
                  ? <><Spinner animation="border" size="sm" /> Live…</>
                  : "Run Live"
                : backtestLoading
                  ? <><Spinner animation="border" size="sm" /> Backtest…</>
                  : "Run Backtest"}
            </Button>
            {mode === "backtest" && (
              <Button variant="secondary" onClick={handleLoadReport} disabled={reportLoading || !symbol}>
                {reportLoading ? <><Spinner animation="border" size="sm" /> Loading…</> : "Load Report"}
              </Button>
            )}
          </Stack>
        </Form>
        {message && <p className="mt-3">{message}</p>}
        {report && (
          <div className="mt-4">
            <h5>Backtest Report</h5>
            <p>
              Indicators: {report.indicators?.length ?? 0}, Patterns: {report.patterns?.length ?? 0}
            </p>
            <pre style={{ maxHeight: 400, overflow: "auto", background: "#f8f9fa", padding: 12 }}>
              {JSON.stringify(report, null, 2)}
            </pre>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default BacktestControl;
