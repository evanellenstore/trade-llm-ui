import React, { useEffect, useState } from "react";
import { Button, Card, Col, Form, Row, Spinner, Stack, Tab, Tabs } from "react-bootstrap";
import {
  backfillIndicators,
  BackfillSymbol,
  getFnoStockSymbols,
  getIndicatorBackfillStatus,
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

  const getIndicatorRunId = (response: any) => response?.data?.data ?? response?.data?.runId ?? null;

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
        </Tabs>
      </Card.Body>
    </Card>
  );
};

export default BacktestControl;
