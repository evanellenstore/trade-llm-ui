import api from "./api";

export interface BacktestRequest {
  symbol?: string;
  timeframe?: string;
  runId?: string;
  startDatetime?: string;
  endDatetime?: string;
}

export const runBacktest = async (payload: BacktestRequest) => {
  return api.post("/market/api/backtest/run", payload);
};

export const runLive = async (payload?: BacktestRequest) => {
  return api.post("/market/api/live/run", payload || {});
};





export const getBacktestReport = async (payload: {
  symbol?: string;
  timeframe?: string;
  runId?: string;
  startTime?: string;
  endTime?: string;
}) => {
  const params = new URLSearchParams();
  if (payload.symbol) params.append("symbol", payload.symbol);
  if (payload.timeframe) params.append("timeframe", payload.timeframe);
  if (payload.runId) params.append("runId", payload.runId);
  if (payload.startTime) params.append("startTime", payload.startTime);
  if (payload.endTime) params.append("endTime", payload.endTime);
  return api.get(`/market/backtest/report?${params.toString()}`);
};

export const getSymbols = async () => {
  return api.get("/market/symbols");
};

export const getCandles = async (symbol: string, timeframe = "ONE_MINUTE", limit = 100) => {
  return api.get("/market/candles", { params: { symbol, timeframe, limit } });
};

export interface BackfillSymbol {
  token: string;
  symbol: string;
}

export const getFnoStockSymbols = async (exchange = "NSE") => {
  return api.get("/broker/api/job/fnoStockSymbols", { params: { exchange } });
};

export const getCandleBackfillStatus = async (tokens: string[], timeframe: string) => {
  const params = new URLSearchParams();
  tokens.forEach((token) => params.append("symbolTokens", token));
  params.set("timeframe", timeframe);
  return api.get("/history/candles/status", { params });
};

export const getIndicatorBackfillStatus = async (tokens: string[], timeframe: string) => {
  const params = new URLSearchParams();
  tokens.forEach((token) => params.append("symbolTokens", token));
  params.set("timeframe", timeframe);
  return api.post("/market/indicator/status", null, { params });
};

export interface IndicatorBackfillRequest {
  symbol: string;
  timeframe: string;
  source?: "BACKTEST";
}

export const backfillIndicators = async (payload: IndicatorBackfillRequest) => {
  return api.post("/market/indicator/backfill", {
    ...payload,
    source: payload.source ?? "BACKTEST",
  });
};

export const backfillAllIndicators = async () => {
  return api.post("/market/indicator/backfill/all");
};

