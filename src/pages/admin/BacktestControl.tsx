import React, { useEffect, useState } from "react";
import { Button, Card, Form, Spinner, Stack, Tab, Tabs } from "react-bootstrap";
import { getBacktestReport, runBacktest, runLive } from "../../services/marketService";
import { useMode } from "../../context/ModeContext";

const BacktestControl: React.FC = () => {
  const [timeframe, setTimeframe] = useState("ONE_MINUTE");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const { mode, setMode } = useMode();
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState<any | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("backtest");

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
    setMessage(null);
    try {
      const response = await runBacktest({
        timeframe,
        startDatetime: toIsoInstant(startTime),
        endDatetime: toIsoInstant(endTime),
      });
      setMessage("Market Data run started.");
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Unable to start Market Data run");
    } finally {
      setBacktestLoading(false);
    }
  };

  const handleRunLive = async () => {
    setLiveLoading(true);
    setMessage(null);
    try {
      const response = await runLive();
    } catch (error: any) {
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
        </Tabs>
      </Card.Body>
    </Card>
  );
};

export default BacktestControl;
