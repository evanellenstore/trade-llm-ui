import React, { useEffect, useState } from "react";
import { Button, Card, Col, Form, Row, Spinner, Stack, Tab, Tabs } from "react-bootstrap";
import {
  backfillIndicators,
  BackfillSymbol,
  getFnoStockSymbols,
  getIndicatorBackfillStatus,
  getDatasetDiagnostics,
  generateAllTrainingDatasets,
  generateTrainingDataset,
  DatasetDiagnosticData,
} from "../../services/marketService";
import StrategyConfigPage from "../trader/StrategyConfig";

const BacktestControl: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("indicator-backfill");
  const [indicatorTimeframe, setIndicatorTimeframe] = useState("ONE_MINUTE");
  const [indicatorLoading, setIndicatorLoading] = useState(false);
  const [indicatorRunId, setIndicatorRunId] = useState<string | null>(null);
  const [indicatorMessage, setIndicatorMessage] = useState<string | null>(null);
  const [indicatorSymbols, setIndicatorSymbols] = useState<BackfillSymbol[]>([]);
  const [selectedIndicatorRows, setSelectedIndicatorRows] = useState<Set<number>>(new Set());
  const [indicatorStatus, setIndicatorStatus] = useState<Record<string, {
    indicatorCount: number;
    updatedAt?: string;
  }>>({});
  const [trainingSymbol, setTrainingSymbol] = useState("");
  const [trainingTimeframe, setTrainingTimeframe] = useState("FIVE_MINUTE");
  const [trainingLoading, setTrainingLoading] = useState(false);
  const [trainingMessage, setTrainingMessage] = useState<string | null>(null);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticMessage, setDiagnosticMessage] = useState<string | null>(null);
  const [diagnosticData, setDiagnosticData] = useState<DatasetDiagnosticData | null>(null);
  const [diagnosticStyle, setDiagnosticStyle] = useState<"INTRADAY" | "SWING" | "LONG_TERM">("SWING");
  const [diagnosticHorizon, setDiagnosticHorizon] = useState(20);
  const [diagnosticLabel, setDiagnosticLabel] = useState("");
  const [diagnosticLimit, setDiagnosticLimit] = useState(20);

  const getIndicatorRunId = (response: any) => response?.data?.data ?? response?.data?.runId ?? null;

  const getTrainingSymbolToken = () => {
    const selected = indicatorSymbols.find((item) => item.symbol === trainingSymbol || item.token === trainingSymbol);
    return selected?.token ?? trainingSymbol;
  };

  const loadDatasetDiagnostics = async () => {
    if (!trainingSymbol) {
      setDiagnosticMessage("Select a symbol first.");
      return;
    }
    setDiagnosticLoading(true);
    setDiagnosticMessage(null);
    try {
      const response = await getDatasetDiagnostics({
        symbolToken: getTrainingSymbolToken(),
        tradingStyle: diagnosticStyle,
        timeframe: trainingTimeframe,
        predictionHorizonBars: diagnosticHorizon,
        buyThresholdPct: 0.15,
        sellThresholdPct: -0.15,
        ...(diagnosticLabel ? { label: diagnosticLabel as "BUY" | "HOLD" | "SELL" } : {}),
        limit: diagnosticLimit,
      });
      setDiagnosticData(response.data.data);
    } catch (error: any) {
      setDiagnosticData(null);
      setDiagnosticMessage(error.response?.data?.detail || error.response?.data?.message || "Unable to load dataset diagnostics.");
    } finally {
      setDiagnosticLoading(false);
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
      setSelectedIndicatorRows(new Set());

      if (rows.length > 0) {
        const statusResponse = await getIndicatorBackfillStatus(
          rows.map((row) => row.token), indicatorTimeframe);
        const statusRows = statusResponse.data?.data ?? [];
        setIndicatorStatus(Object.fromEntries(statusRows.map((item: {
          symbolToken: string;
          indicatorCount: number;
          updatedAt?: string;
        }) => [item.symbolToken, item])));
      } else {
        setIndicatorStatus({});
      }
    } catch (error: any) {
      setIndicatorSymbols([]);
      setSelectedIndicatorRows(new Set());
      setIndicatorStatus({});
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
      const response = await backfillIndicators({
        symbolTokens: selectedSymbols.map((item) => item.token),
        timeframe: indicatorTimeframe,
      });
      setIndicatorRunId(getIndicatorRunId(response));
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
                        const status = indicatorStatus[item.token];
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
                            <td>{status ? `Generated (${status.indicatorCount} indicators)` : "Not generated"}</td>
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
                  disabled={indicatorLoading}
                >
                  {indicatorLoading
                    ? <><Spinner animation="border" size="sm" /> Starting…</>
                    : `Backfill Indicator Selected (${selectedIndicatorRows.size})`}
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
          <Tab eventKey="training-dataset" title="Training Dataset">
            <div className="py-3">
              <h5>Generate ML training data</h5>
              <p className="text-muted">Build labeled rows from backtest candles and indicators.</p>
              <Row className="g-3 mb-3 align-items-end">
                <Col md={5}>
                  <Form.Label htmlFor="training-symbol">Symbol</Form.Label>
                  <Form.Select id="training-symbol" value={trainingSymbol}
                    onChange={(event) => setTrainingSymbol(event.target.value)}>
                    <option value="">Select a symbol</option>
                    {indicatorSymbols.map((item) => <option key={item.token} value={item.symbol}>{item.symbol}</option>)}
                  </Form.Select>
                </Col>
                <Col md={4}>
                  <Form.Label htmlFor="training-timeframe">Timeframe</Form.Label>
                  <Form.Select id="training-timeframe" value={trainingTimeframe}
                    onChange={(event) => setTrainingTimeframe(event.target.value)}>
                    <option value="ONE_MINUTE">ONE_MINUTE</option>
                    <option value="FIVE_MINUTE">FIVE_MINUTE</option>
                    <option value="FIFTEEN_MINUTE">FIFTEEN_MINUTE</option>
                    <option value="ONE_HOUR">ONE_HOUR</option>
                  </Form.Select>
                </Col>
                <Col md="auto">
                  <Button variant="primary" disabled={trainingLoading || !trainingSymbol}
                    onClick={async () => {
                      setTrainingLoading(true);
                      setTrainingMessage(null);
                      try {
                        const response = await generateTrainingDataset(trainingSymbol, trainingTimeframe);
                        const result = response.data?.data;
                        setTrainingMessage(`Generated ${result?.generated ?? 0} of ${result?.processed ?? 0} processed rows.`);
                      } catch (error: any) {
                        setTrainingMessage(error.response?.data?.message || "Unable to generate training data.");
                      } finally {
                        setTrainingLoading(false);
                      }
                    }}>
                    {trainingLoading ? <><Spinner animation="border" size="sm" /> Generating…</> : "Generate selected"}
                  </Button>
                </Col>
              </Row>
              <Button variant="outline-primary" disabled={trainingLoading}
                onClick={async () => {
                  setTrainingLoading(true);
                  setTrainingMessage(null);
                  try {
                    const response = await generateAllTrainingDatasets();
                    const result = response.data?.data;
                    setTrainingMessage(`Generated ${result?.generated ?? 0} of ${result?.processed ?? 0} processed rows across all combinations.`);
                  } catch (error: any) {
                    setTrainingMessage(error.response?.data?.message || "Unable to generate all training data.");
                  } finally {
                    setTrainingLoading(false);
                  }
                }}>
                Generate all configured combinations
              </Button>
              {trainingMessage && <p className="mt-3 mb-0">{trainingMessage}</p>}
              <hr className="my-4" />
              <h5>Dataset diagnostics</h5>
              <p className="text-muted">Inspect bounded labeled samples and target-candle lineage before training.</p>
              <Row className="g-3 align-items-end">
                <Col md={3}>
                  <Form.Label htmlFor="diagnostic-style">Trading style</Form.Label>
                  <Form.Select id="diagnostic-style" value={diagnosticStyle}
                    onChange={(event) => setDiagnosticStyle(event.target.value as typeof diagnosticStyle)}>
                    <option value="INTRADAY">INTRADAY</option>
                    <option value="SWING">SWING</option>
                    <option value="LONG_TERM">LONG_TERM</option>
                  </Form.Select>
                </Col>
                <Col md={2}>
                  <Form.Label htmlFor="diagnostic-horizon">Horizon bars</Form.Label>
                  <Form.Control id="diagnostic-horizon" type="number" min={1} value={diagnosticHorizon}
                    onChange={(event) => setDiagnosticHorizon(Number(event.target.value))} />
                </Col>
                <Col md={2}>
                  <Form.Label htmlFor="diagnostic-label">Label</Form.Label>
                  <Form.Select id="diagnostic-label" value={diagnosticLabel}
                    onChange={(event) => setDiagnosticLabel(event.target.value)}>
                    <option value="">All labels</option>
                    <option value="BUY">BUY</option>
                    <option value="HOLD">HOLD</option>
                    <option value="SELL">SELL</option>
                  </Form.Select>
                </Col>
                <Col md={2}>
                  <Form.Label htmlFor="diagnostic-limit">Sample limit</Form.Label>
                  <Form.Control id="diagnostic-limit" type="number" min={1} max={100} value={diagnosticLimit}
                    onChange={(event) => setDiagnosticLimit(Math.min(100, Math.max(1, Number(event.target.value))))} />
                </Col>
                <Col md="auto">
                  <Button variant="outline-primary" onClick={() => void loadDatasetDiagnostics()}
                    disabled={diagnosticLoading || !trainingSymbol}>
                    {diagnosticLoading ? <><Spinner animation="border" size="sm" /> Loading…</> : "Load diagnostics"}
                  </Button>
                </Col>
              </Row>
              {diagnosticMessage && <p className="mt-3 mb-0 text-danger">{diagnosticMessage}</p>}
              {diagnosticData && (
                <div className="mt-3">
                  <div className="small text-muted mb-2">
                    {diagnosticData.symbolToken} · {diagnosticData.timeframe} · {diagnosticData.tradingStyle} · {diagnosticData.sampleCount} samples
                  </div>
                  <div className="table-responsive border rounded">
                    <table className="table table-sm table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Source candle</th>
                          <th>Target candle</th>
                          <th>Close</th>
                          <th>Future close</th>
                          <th>Return %</th>
                          <th>Label</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diagnosticData.samples.length === 0 ? (
                          <tr><td colSpan={6} className="text-center text-muted py-3">No diagnostic samples matched.</td></tr>
                        ) : diagnosticData.samples.map((sample, index) => (
                          <tr key={`${sample.candleTime}-${index}`}>
                            <td>{sample.candleTime ? new Date(sample.candleTime).toLocaleString() : "-"}</td>
                            <td>{sample.targetCandleTime ? new Date(sample.targetCandleTime).toLocaleString() : "-"}</td>
                            <td>{sample.currentClose?.toFixed(2) ?? "-"}</td>
                            <td>{sample.futureClose?.toFixed(2) ?? "-"}</td>
                            <td>{sample.futureReturnPct?.toFixed(3) ?? "-"}</td>
                            <td><strong>{sample.label ?? "-"}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </Tab>
        </Tabs>
      </Card.Body>
    </Card>
  );
};

export default BacktestControl;
