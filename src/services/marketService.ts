import api from "./api";

export interface BacktestRequest {
  symbol: string;
  timeframe?: string;
  runId?: string;
  startDatetime?: string;
  endDatetime?: string;
}

export const runBacktest = async (payload: BacktestRequest) => {
  return api.post("/market/api/backtest/run", payload);
};

export const runLive = async () => {
  return api.post("/market/run-live");
};





export const getBacktestReport = async (payload: {
  symbol: string;
  timeframe?: string;
  runId?: string;
  startTime?: string;
  endTime?: string;
}) => {
  const params = new URLSearchParams();
  params.append("symbol", payload.symbol);
  if (payload.timeframe) params.append("timeframe", payload.timeframe);
  if (payload.runId) params.append("runId", payload.runId);
  if (payload.startTime) params.append("startTime", payload.startTime);
  if (payload.endTime) params.append("endTime", payload.endTime);
  return api.get(`/market/backtest/report?${params.toString()}`);
};

export const getSymbols = async () => {
  return api.get("/market/symbols");
};
