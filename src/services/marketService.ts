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
  symbolTokens: string[];
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

export const generateTrainingDataset = async (symbol: string, timeframe: string) => {
  return api.post("/history/../training/generate", null, { params: { symbol, timeframe } });
};

export const generateAllTrainingDatasets = async () => {
  return api.post("/history/../training/generate/all");
};

export interface DatasetDiagnosticRequest {
  symbolToken: string;
  tradingStyle: "INTRADAY" | "SWING" | "LONG_TERM";
  timeframe: string;
  predictionHorizonBars: number;
  buyThresholdPct: number;
  sellThresholdPct: number;
  label?: "BUY" | "HOLD" | "SELL";
  limit: number;
}

export interface DatasetDiagnosticSample {
  candleTime?: string;
  tradingDate?: string;
  currentClose?: number;
  targetCandleTime?: string;
  targetTradingDate?: string;
  futureClose?: number;
  futureReturnPct?: number;
  buyThresholdPct?: number;
  sellThresholdPct?: number;
  label?: string;
}

export interface DatasetDiagnosticData {
  symbolToken?: string;
  tradingStyle?: string;
  timeframe?: string;
  predictionHorizonBars?: number;
  sampleCount: number;
  samples: DatasetDiagnosticSample[];
}

export const getDatasetDiagnostics = (payload: DatasetDiagnosticRequest) => {
  return api.post<{ success: boolean; message: string; data: DatasetDiagnosticData }>(
    "/ml/api/v1/dataset/samples",
    payload,
  );
};

export interface TargetAnalysisRequest {
  symbolToken: string;
  tradingStyle: "INTRADAY" | "SWING" | "LONG_TERM";
  timeframe: string;
  predictionHorizonsBars: number[];
  thresholdsPct: number[];
}

export interface TargetAnalysisThreshold {
  thresholdPct: number;
  buy: { count: number; percentage: number };
  hold: { count: number; percentage: number };
  sell: { count: number; percentage: number };
  directional: { count: number; percentage: number };
  classImbalanceRatio: number | null;
  majorityClassPct: number;
  minorityClassPct: number;
}

export interface TargetAnalysisHorizon {
  predictionHorizonBars: number;
  validTargetRows: number;
  skippedRows: number;
  returnStatistics: { p50: number; p75: number; p90: number };
  thresholdAnalysis: TargetAnalysisThreshold[];
}

export interface TargetAnalysisData {
  symbolToken: string;
  tradingStyle: string;
  timeframe: string;
  sourceRowCount: number;
  analysis: TargetAnalysisHorizon[];
}

export const analyzeTargets = (payload: TargetAnalysisRequest) => {
  return api.post<{ success: boolean; message: string; data: TargetAnalysisData }>(
    "/ml/api/v1/dataset/analyze-target",
    payload,
  );
};

export interface MlDatasetRequest {
  symbolToken: string;
  tradingStyle: "INTRADAY" | "SWING" | "LONG_TERM";
  timeframe: string;
  predictionHorizonBars: number;
  buyThresholdPct: number;
  sellThresholdPct: number;
}

export interface MlDatasetSummary {
  symbolToken: string;
  tradingStyle: string;
  timeframe: string;
  predictionHorizonBars: number;
  sourceRowCount: number;
  datasetRowCount: number;
  skippedRowCount: number;
  featureCount: number;
  labelDistribution: Record<string, number>;
  trainingEligibility?: { eligible: boolean; reasons: string[] };
  datasetFingerprint?: string;
}

export const generateMlDataset = (payload: MlDatasetRequest) => {
  return api.post<{ success: boolean; message: string; data: MlDatasetSummary }>(
    "/ml/api/v1/dataset/generate",
    payload,
  );
};

export interface ModelTrainingRequest {
  symbolToken: string;
  tradingStyle: "INTRADAY" | "SWING" | "LONG_TERM";
  timeframe: string;
  predictionHorizonBars: number;
  buyThresholdPct: number;
  sellThresholdPct: number;
  trainRatio: number;
  validationRatio: number;
  testRatio: number;
  purgeEnabled: boolean;
  embargoBars: number;
  validationStrategy: "WALK_FORWARD";
  walkForward: {
    foldCount: number;
    validationWindowSessions: number;
    expandingWindow: boolean;
    sessionAligned: boolean;
    purgeEnabled: boolean;
    embargoBars: number;
  };
}

export interface ModelTrainingResult {
  status?: string;
  lifecycleStatus?: string;
  modelId?: string;
  selectedHyperparameters?: Record<string, number | string | boolean>;
  validationStrategy?: string;
  testLocked?: boolean;
  testEvaluated?: boolean;
  walkForward?: {
    foldCount?: number;
    folds?: Array<{
      foldNumber: number;
      metrics?: { accuracy?: number; balancedAccuracy?: number; macroF1?: number; logLoss?: number };
      classMetrics?: Record<string, { precision?: number; recall?: number; f1?: number; support?: number }>;
      confusionMatrix?: { classOrder?: string[]; matrix?: number[][] };
    }>;
    aggregate?: {
      macroF1?: { mean?: number };
      balancedAccuracy?: { mean?: number };
      logLoss?: { mean?: number };
      worstFold?: number;
      featureImportance?: {
        ranking?: Array<{ feature: string; combinedImportancePct?: number }>;
      };
    };
  };
  outOfFold?: {
    predictionCount?: number;
    overallValidationMetrics?: {
      coveragePct?: number;
      directionalPredictionCount?: number;
      directionalPrecision?: number | null;
      metrics?: { accuracy?: number; balancedAccuracy?: number; macroF1?: number };
      BUY?: { precision?: number; recall?: number; f1?: number };
      SELL?: { precision?: number; recall?: number; f1?: number };
      HOLD?: { precision?: number; recall?: number; f1?: number };
    };
    backtests?: Array<{
      policyType?: string;
      confidenceThreshold?: number;
      tradeCount?: number;
      winRate?: number | null;
      netReturnPct?: number | null;
      profitFactor?: number | null;
      maxDrawdownPct?: number | null;
      sharpeRatio?: number | null;
    }>;
    finalCandidateSelection?: {
      eligible?: boolean;
      recommendation?: string;
      selectedPolicy?: {
        tradeCount?: number;
        netReturnPct?: number;
        winRate?: number;
        profitFactor?: number;
        maxDrawdownPct?: number;
        reason?: string;
      };
    };
  };
  dataset?: {
    sourceRowCount?: number;
    datasetRowCount?: number;
    skippedRowCount?: number;
    featureCount?: number;
    labelDistribution?: Record<string, number>;
    trainingEligibility?: { eligible?: boolean; reasons?: string[] };
    datasetFingerprint?: string;
  };
}

export const trainModel = (payload: ModelTrainingRequest) => {
  return api.post<{ success: boolean; message: string; data: ModelTrainingResult }>(
    "/ml/api/v1/model/train",
    payload,
  );
};

