import React, { Suspense, lazy, useEffect, useState } from "react";
import axios from "axios";
import { Badge, Button, Card, Col, Form, Row, Spinner, Stack, Tab, Tabs } from "react-bootstrap";
import {
  backfillIndicators,
  BackfillSymbol,
  getFnoStockSymbols,
  getIndicatorBackfillStatus,
  getDatasetDiagnostics,
  generateAllTrainingDatasets,
  generateTrainingDataset,
  DatasetDiagnosticData,
  ModelTrainingRequest,
  ModelTrainingResult,
  trainModel,
} from "../../services/marketService";
import StrategyConfigPage from "../trader/StrategyConfig";
import "./MLTrainingWorkbench.css";

const MLTrainingWorkbench = lazy(() => import("./MLTrainingWorkbench"));

const BacktestControl: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("ml-training-workbench");
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
  const [trainingTimeframe, setTrainingTimeframe] = useState("ONE_MINUTE");
  const [trainingLoading, setTrainingLoading] = useState(false);
  const [trainingMessage, setTrainingMessage] = useState<string | null>(null);
  const [modelTrainingLoading, setModelTrainingLoading] = useState(false);
  const [modelTrainingMessage, setModelTrainingMessage] = useState<string | null>(null);
  const [modelTrainingResult, setModelTrainingResult] = useState<ModelTrainingResult | null>(null);
  const [modelTrainingStyle, setModelTrainingStyle] = useState<"INTRADAY" | "SWING" | "LONG_TERM">("INTRADAY");
  const [modelTrainingHorizon, setModelTrainingHorizon] = useState(30);
  const [buyThresholdPct, setBuyThresholdPct] = useState(0.5);
  const [sellThresholdPct, setSellThresholdPct] = useState(-0.5);
  const [trainRatio, setTrainRatio] = useState(0.7);
  const [validationRatio, setValidationRatio] = useState(0.15);
  const [testRatio, setTestRatio] = useState(0.15);
  const [purgeEnabled, setPurgeEnabled] = useState(true);
  const [embargoBars, setEmbargoBars] = useState(0);
  const [walkForwardFoldCount, setWalkForwardFoldCount] = useState(4);
  const [validationWindowSessions, setValidationWindowSessions] = useState(60);
  const [expandingWindow, setExpandingWindow] = useState(true);
  const [sessionAligned, setSessionAligned] = useState(true);
  const [walkForwardPurgeEnabled, setWalkForwardPurgeEnabled] = useState(true);
  const [walkForwardEmbargoBars, setWalkForwardEmbargoBars] = useState(0);
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

  const handleModelTraining = async () => {
    if (!trainingSymbol) {
      setModelTrainingMessage("Select a symbol first.");
      return;
    }
    if (Math.abs(trainRatio + validationRatio + testRatio - 1) > 0.0001) {
      setModelTrainingMessage("Train, validation, and test ratios must sum to 1.00.");
      return;
    }

    const payload: ModelTrainingRequest = {
      symbolToken: getTrainingSymbolToken(),
      tradingStyle: modelTrainingStyle,
      timeframe: trainingTimeframe,
      predictionHorizonBars: modelTrainingHorizon,
      buyThresholdPct,
      sellThresholdPct,
      trainRatio,
      validationRatio,
      testRatio,
      purgeEnabled,
      embargoBars,
      validationStrategy: "WALK_FORWARD",
      walkForward: {
        foldCount: walkForwardFoldCount,
        validationWindowSessions,
        expandingWindow,
        sessionAligned,
        purgeEnabled: walkForwardPurgeEnabled,
        embargoBars: walkForwardEmbargoBars,
      },
    };

    setModelTrainingLoading(true);
    setModelTrainingMessage(null);
    setModelTrainingResult(null);
    try {
      const response = await trainModel(payload);
      const result = response.data?.data;
      if (response.data?.success && result) {
        setModelTrainingResult(result);
        setModelTrainingMessage(response.data.message || "Model training completed.");
      } else {
        setModelTrainingMessage(response.data?.message || "The training endpoint responded without a result report.");
      }
    } catch (error: unknown) {
      const responseData = axios.isAxiosError<{ detail?: string; message?: string }>(error)
        ? error.response?.data
        : undefined;
      const status = axios.isAxiosError(error) && error.response?.status
        ? ` (HTTP ${error.response.status})`
        : "";
      setModelTrainingMessage(`${responseData?.detail || responseData?.message || "Unable to train model."}${status}`);
    } finally {
      setModelTrainingLoading(false);
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
    <Card className="mb-4 market-data-workbench-shell">
      <Card.Body>
        <Card.Title>Market Data Control</Card.Title>
        <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || "backtest")} className="mb-4">
          <Tab eventKey="ml-training-workbench" title="ML Training Workbench">
            <Suspense fallback={<div className="p-4 text-muted">Loading ML workbench…</div>}>
              <MLTrainingWorkbench />
            </Suspense>
          </Tab>
          <Tab eventKey="indicator-backfill" title="Indicator Backfill">
            <div className="workbench-panel control-workbench-panel">
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
            <div className="workbench-panel control-workbench-panel strategy-config-workbench">
              <StrategyConfigPage />
            </div>
          </Tab>
          {activeTab === "training-dataset" && <Tab eventKey="training-dataset" title="Training Dataset">
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
              <h5>Train and validate model</h5>
              <p className="text-muted">Run walk-forward validation. The locked test set is not evaluated during training.</p>
              <Row className="g-3 mb-3">
                <Col md={3}>
                  <Form.Label htmlFor="model-training-style">Trading style</Form.Label>
                  <Form.Select id="model-training-style" value={modelTrainingStyle}
                    onChange={(event) => setModelTrainingStyle(event.target.value as typeof modelTrainingStyle)}>
                    <option value="INTRADAY">INTRADAY</option>
                    <option value="SWING">SWING</option>
                    <option value="LONG_TERM">LONG_TERM</option>
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Label htmlFor="model-training-horizon">Prediction horizon (bars)</Form.Label>
                  <Form.Control id="model-training-horizon" type="number" min={1} value={modelTrainingHorizon}
                    onChange={(event) => setModelTrainingHorizon(Math.max(1, Number(event.target.value)))} />
                </Col>
                <Col md={3}>
                  <Form.Label htmlFor="model-buy-threshold">Buy threshold (%)</Form.Label>
                  <Form.Control id="model-buy-threshold" type="number" step="0.01" value={buyThresholdPct}
                    onChange={(event) => setBuyThresholdPct(Number(event.target.value))} />
                </Col>
                <Col md={3}>
                  <Form.Label htmlFor="model-sell-threshold">Sell threshold (%)</Form.Label>
                  <Form.Control id="model-sell-threshold" type="number" step="0.01" value={sellThresholdPct}
                    onChange={(event) => setSellThresholdPct(Number(event.target.value))} />
                </Col>
              </Row>
              <Row className="g-3 mb-3">
                <Col md={2}>
                  <Form.Label htmlFor="model-train-ratio">Train ratio</Form.Label>
                  <Form.Control id="model-train-ratio" type="number" min={0.01} max={0.98} step="0.01" value={trainRatio}
                    onChange={(event) => setTrainRatio(Number(event.target.value))} />
                </Col>
                <Col md={2}>
                  <Form.Label htmlFor="model-validation-ratio">Validation ratio</Form.Label>
                  <Form.Control id="model-validation-ratio" type="number" min={0.01} max={0.98} step="0.01" value={validationRatio}
                    onChange={(event) => setValidationRatio(Number(event.target.value))} />
                </Col>
                <Col md={2}>
                  <Form.Label htmlFor="model-test-ratio">Test ratio</Form.Label>
                  <Form.Control id="model-test-ratio" type="number" min={0.01} max={0.98} step="0.01" value={testRatio}
                    onChange={(event) => setTestRatio(Number(event.target.value))} />
                </Col>
                <Col md={2}>
                  <Form.Label htmlFor="model-embargo">Embargo bars</Form.Label>
                  <Form.Control id="model-embargo" type="number" min={0} value={embargoBars}
                    onChange={(event) => setEmbargoBars(Math.max(0, Number(event.target.value)))} />
                </Col>
                <Col md={2}>
                  <Form.Label htmlFor="model-fold-count">Walk-forward folds</Form.Label>
                  <Form.Control id="model-fold-count" type="number" min={2} value={walkForwardFoldCount}
                    onChange={(event) => setWalkForwardFoldCount(Math.max(2, Number(event.target.value)))} />
                </Col>
                <Col md={2}>
                  <Form.Label htmlFor="model-validation-sessions">Validation sessions</Form.Label>
                  <Form.Control id="model-validation-sessions" type="number" min={1} value={validationWindowSessions}
                    onChange={(event) => setValidationWindowSessions(Math.max(1, Number(event.target.value)))} />
                </Col>
              </Row>
              <Row className="g-3 mb-3 align-items-end">
                <Col md={2}>
                  <Form.Label htmlFor="model-walk-forward-embargo">Walk-forward embargo bars</Form.Label>
                  <Form.Control id="model-walk-forward-embargo" type="number" min={0} value={walkForwardEmbargoBars}
                    onChange={(event) => setWalkForwardEmbargoBars(Math.max(0, Number(event.target.value)))} />
                </Col>
                <Col md={2}>
                  <Form.Check type="switch" id="model-purge-enabled" label="Purge enabled" checked={purgeEnabled}
                    onChange={(event) => setPurgeEnabled(event.target.checked)} />
                </Col>
                <Col md={2}>
                  <Form.Check type="switch" id="model-expanding-window" label="Expanding window" checked={expandingWindow}
                    onChange={(event) => setExpandingWindow(event.target.checked)} />
                </Col>
                <Col md={2}>
                  <Form.Check type="switch" id="model-session-aligned" label="Session aligned" checked={sessionAligned}
                    onChange={(event) => setSessionAligned(event.target.checked)} />
                </Col>
                <Col md={2}>
                  <Form.Check type="switch" id="model-walk-forward-purge" label="Walk-forward purge" checked={walkForwardPurgeEnabled}
                    onChange={(event) => setWalkForwardPurgeEnabled(event.target.checked)} />
                </Col>
                <Col md="auto">
                  <Button variant="primary" onClick={() => void handleModelTraining()}
                    disabled={modelTrainingLoading || !trainingSymbol}>
                    {modelTrainingLoading ? <><Spinner animation="border" size="sm" /> Training…</> : "Train model"}
                  </Button>
                </Col>
              </Row>
              {Math.abs(trainRatio + validationRatio + testRatio - 1) > 0.0001 && (
                <p className="text-danger small mb-3">Split ratios must add up to 1.00. Current total: {(trainRatio + validationRatio + testRatio).toFixed(2)}</p>
              )}
              {modelTrainingMessage && (
                <p className={`mt-3 mb-0 ${modelTrainingResult ? "" : "text-danger"}`} role="status">{modelTrainingMessage}</p>
              )}
              {modelTrainingResult && (() => {
                const validation = modelTrainingResult.outOfFold?.overallValidationMetrics;
                const aggregate = modelTrainingResult.walkForward?.aggregate;
                const selection = modelTrainingResult.outOfFold?.finalCandidateSelection;
                const formatMetric = (value?: number | null, digits = 3) => value == null ? "-" : value.toFixed(digits);
                return (
                  <section className="mt-3 pt-3 border-top" aria-label="Model training results">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                      <div>
                        <strong>{modelTrainingResult.modelId || "Training result"}</strong>
                        <div className="small text-muted">{modelTrainingResult.status || modelTrainingResult.lifecycleStatus} · {modelTrainingResult.validationStrategy || "WALK_FORWARD"}</div>
                      </div>
                      <Badge bg={selection?.eligible ? "success" : "danger"}>
                        {selection?.eligible ? "Candidate eligible" : "Candidate rejected"}
                      </Badge>
                    </div>
                    {selection?.recommendation && <p className="small mb-3">{selection.recommendation}</p>}
                    <Row className="g-3 mb-3">
                      <Col sm={6} md={3}><div className="border rounded p-2 h-100"><small className="text-muted d-block">Walk-forward macro F1</small><strong>{formatMetric(aggregate?.macroF1?.mean)}</strong></div></Col>
                      <Col sm={6} md={3}><div className="border rounded p-2 h-100"><small className="text-muted d-block">Balanced accuracy</small><strong>{formatMetric(aggregate?.balancedAccuracy?.mean)}</strong></div></Col>
                      <Col sm={6} md={3}><div className="border rounded p-2 h-100"><small className="text-muted d-block">OOF directional precision</small><strong>{formatMetric(validation?.directionalPrecision)}</strong><span className="small text-muted"> ({validation?.directionalPredictionCount ?? 0} directional predictions)</span></div></Col>
                      <Col sm={6} md={3}><div className="border rounded p-2 h-100"><small className="text-muted d-block">Locked test set</small><strong>{modelTrainingResult.testLocked ? "Locked" : "Not locked"}</strong><span className="small text-muted"> · {modelTrainingResult.testEvaluated ? "evaluated" : "not evaluated"}</span></div></Col>
                    </Row>
                    {selection?.selectedPolicy && (
                      <p className="small mb-3">
                        Selected policy: {selection.selectedPolicy.tradeCount ?? 0} trades · net return {formatMetric(selection.selectedPolicy.netReturnPct, 2)}% · profit factor {formatMetric(selection.selectedPolicy.profitFactor)}.
                        {selection.selectedPolicy.reason ? ` ${selection.selectedPolicy.reason}` : ""}
                      </p>
                    )}
                    {modelTrainingResult.dataset?.trainingEligibility?.eligible === false && (
                      <p className="text-danger small mb-3">
                        Dataset is marked ineligible: {modelTrainingResult.dataset.trainingEligibility.reasons?.join(", ") || "see training report"}.
                      </p>
                    )}
                    <div className="table-responsive border rounded mb-3">
                      <table className="table table-sm mb-0">
                        <thead className="table-light"><tr><th>Class</th><th>Precision</th><th>Recall</th><th>F1</th></tr></thead>
                        <tbody>
                          {(["BUY", "HOLD", "SELL"] as const).map((label) => {
                            const score = validation?.[label];
                            return <tr key={label}><th scope="row">{label}</th><td>{formatMetric(score?.precision)}</td><td>{formatMetric(score?.recall)}</td><td>{formatMetric(score?.f1)}</td></tr>;
                          })}
                        </tbody>
                      </table>
                    </div>
                    <details>
                      <summary className="small">Walk-forward fold metrics ({modelTrainingResult.walkForward?.foldCount ?? modelTrainingResult.walkForward?.folds?.length ?? 0})</summary>
                      <div className="table-responsive border rounded mt-2">
                        <table className="table table-sm mb-0">
                          <thead className="table-light"><tr><th>Fold</th><th>Accuracy</th><th>Balanced accuracy</th><th>Macro F1</th><th>Log loss</th></tr></thead>
                          <tbody>{modelTrainingResult.walkForward?.folds?.map((fold) => (
                            <tr key={fold.foldNumber}><th scope="row">{fold.foldNumber}</th><td>{formatMetric(fold.metrics?.accuracy)}</td><td>{formatMetric(fold.metrics?.balancedAccuracy)}</td><td>{formatMetric(fold.metrics?.macroF1)}</td><td>{formatMetric(fold.metrics?.logLoss)}</td></tr>
                          ))}</tbody>
                        </table>
                      </div>
                    </details>
                  </section>
                );
              })()}
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
          </Tab>}
        </Tabs>
      </Card.Body>
    </Card>
  );
};

export default BacktestControl;
