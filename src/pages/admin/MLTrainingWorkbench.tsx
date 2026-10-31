import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  CssBaseline,
  Drawer,
  FormControl,
  FormControlLabel,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Tab,
  Tabs,
  TextField,
  ThemeProvider,
  Tooltip,
  Typography,
  createTheme,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip as ChartTooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import {
  analyzeTargets,
  generateMlDataset,
  MlDatasetSummary,
  ModelTrainingRequest,
  ModelTrainingResult,
  TargetAnalysisData,
  TargetAnalysisHorizon,
  TargetAnalysisThreshold,
  trainModel,
} from "../../services/marketService";

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip, Legend);

const workbenchTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#70e0b0" },
    secondary: { main: "#f1bd67" },
    background: { default: "#0c1112", paper: "#151d1e" },
    success: { main: "#65d6a5" },
    warning: { main: "#e9b65e" },
    error: { main: "#f07870" },
    text: { primary: "#e7efec", secondary: "#94a6a0" },
    divider: "rgba(180, 203, 193, .14)",
  },
  typography: {
    fontFamily: '"IBM Plex Sans", "Avenir Next", sans-serif',
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 6 },
});

const timeframeOptions = [
  "ONE_MINUTE", "FIVE_MINUTE", "FIFTEEN_MINUTE", "THIRTY_MINUTE",
  "ONE_HOUR", "ONE_DAY", "ONE_WEEK",
];
const horizonOptions = [5, 10, 12, 15, 20, 30, 45, 60];
const thresholdOptions = [0.2, 0.3, 0.4, 0.5, 0.75, 1, 2];
const workflowSteps = [
  "Analyze target", "Review distribution", "Select candidates", "Generate dataset",
  "Train model", "Compare models", "Backtest", "Promote",
];
const registryStorageKey = "trade-ml-workbench-registry-v1";

type WorkbenchTab = "analysis" | "training" | "results" | "leaderboard" | "registry";
type CandidateQuality = "excellent" | "moderate" | "poor";
type RunStatus = "RUNNING" | "COMPLETED" | "FAILED";
type RegistryStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

interface CandidateRow {
  id: string;
  predictionHorizonBars: number;
  thresholdPct: number;
  validRows: number;
  skippedRows: number;
  buyPercent: number;
  holdPercent: number;
  sellPercent: number;
  directionalPercent: number;
  imbalanceRatio: number | null;
  returnP50: number;
  returnP75: number;
  returnP90: number;
  quality: CandidateQuality;
}

interface TrainingRun {
  id: string;
  candidate: CandidateRow;
  symbolToken: string;
  tradingStyle: "INTRADAY" | "SWING" | "LONG_TERM";
  timeframe: string;
  foldCount: number;
  status: RunStatus;
  stage: string;
  startedAt?: number;
  finishedAt?: number;
  error?: string;
}

interface TrainedModelRecord {
  id: string;
  modelId: string;
  symbolToken: string;
  tradingStyle: string;
  timeframe: string;
  candidate: CandidateRow;
  trainedAt: string;
  result: ModelTrainingResult;
  dataset?: MlDatasetSummary;
}

interface RegistryEntry {
  modelId: string;
  tradingStyle: string;
  timeframe: string;
  status: RegistryStatus;
  createdAt: string;
  promotedAt: string;
  version: number;
}

interface AnalysisForm {
  symbolToken: string;
  tradingStyle: "INTRADAY" | "SWING" | "LONG_TERM";
  timeframe: string;
  horizons: number[];
  thresholds: number[];
}

function flattenTargetAnalysis(data: TargetAnalysisData | null): CandidateRow[] {
  if (!data) return [];
  return data.analysis.flatMap((horizon: TargetAnalysisHorizon) =>
    horizon.thresholdAnalysis.map((threshold: TargetAnalysisThreshold) => {
      const criteria = [
        horizon.validTargetRows > 5000,
        threshold.buy.percentage > 10,
        threshold.sell.percentage > 10,
        threshold.classImbalanceRatio !== null && threshold.classImbalanceRatio < 5,
        threshold.directional.percentage > 55,
      ];
      const passed = criteria.filter(Boolean).length;
      const quality: CandidateQuality = passed === criteria.length ? "excellent" : passed >= 3 ? "moderate" : "poor";
      return {
        id: `${horizon.predictionHorizonBars}-${threshold.thresholdPct}`,
        predictionHorizonBars: horizon.predictionHorizonBars,
        thresholdPct: threshold.thresholdPct,
        validRows: horizon.validTargetRows,
        skippedRows: horizon.skippedRows,
        buyPercent: threshold.buy.percentage,
        holdPercent: threshold.hold.percentage,
        sellPercent: threshold.sell.percentage,
        directionalPercent: threshold.directional.percentage,
        imbalanceRatio: threshold.classImbalanceRatio,
        returnP50: horizon.returnStatistics.p50,
        returnP75: horizon.returnStatistics.p75,
        returnP90: horizon.returnStatistics.p90,
        quality,
      };
    }),
  );
}

function mean(values: Array<number | undefined>): number | null {
  const valid = values.filter((value): value is number => value !== undefined && Number.isFinite(value));
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}

function metric(record: TrainedModelRecord, name: string): number | null {
  const validation = record.result.outOfFold?.overallValidationMetrics;
  const policy = record.result.outOfFold?.finalCandidateSelection?.selectedPolicy;
  switch (name) {
    case "accuracy": return validation?.metrics?.accuracy ?? null;
    case "precision": return mean([validation?.BUY?.precision, validation?.HOLD?.precision, validation?.SELL?.precision]);
    case "recall": return mean([validation?.BUY?.recall, validation?.HOLD?.recall, validation?.SELL?.recall]);
    case "f1": return validation?.metrics?.macroF1 ?? null;
    case "directionalPrecision": return validation?.directionalPrecision ?? null;
    case "winRate": return policy?.winRate ?? null;
    case "netReturn": return policy?.netReturnPct ?? null;
    case "drawdown": return policy?.maxDrawdownPct ?? null;
    case "sharpe": return null;
    case "rocAuc": return null;
    default: return null;
  }
}

function metricText(value: number | null | undefined, digits = 3): string {
  return value == null ? "Not available" : value.toFixed(digits);
}

function readRegistry(): RegistryEntry[] {
  try {
    const stored = localStorage.getItem(registryStorageKey);
    return stored ? JSON.parse(stored) as RegistryEntry[] : [];
  } catch {
    return [];
  }
}

const formatElapsed = (start: number | undefined, finish: number | undefined, now: number) => {
  if (!start) return "Waiting";
  const seconds = Math.max(0, Math.floor(((finish ?? now) - start) / 1000));
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
};

const Workbench: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WorkbenchTab>("analysis");
  const [form, setForm] = useState<AnalysisForm>({
    symbolToken: "14154",
    tradingStyle: "INTRADAY",
    timeframe: "FIVE_MINUTE",
    horizons: [30],
    thresholds: [0.5],
  });
  const [analysis, setAnalysis] = useState<TargetAnalysisData | null>(null);
  const [trainingHorizon, setTrainingHorizon] = useState(30);
  const [trainingThreshold, setTrainingThreshold] = useState(0.5);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [recommendationsVisible, setRecommendationsVisible] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [datasetResults, setDatasetResults] = useState<Record<string, MlDatasetSummary>>({});
  const [datasetLoading, setDatasetLoading] = useState(false);
  const [datasetMessage, setDatasetMessage] = useState("");
  const [trainingRun, setTrainingRun] = useState<TrainingRun | null>(null);
  const [trainingModels, setTrainingModels] = useState<TrainedModelRecord[]>([]);
  const [trainingActive, setTrainingActive] = useState(false);
  const [trainRatio, setTrainRatio] = useState(0.7);
  const [validationRatio, setValidationRatio] = useState(0.15);
  const [testRatio, setTestRatio] = useState(0.15);
  const [purgeEnabled, setPurgeEnabled] = useState(true);
  const [embargoBars, setEmbargoBars] = useState(0);
  const [foldCount, setFoldCount] = useState(4);
  const [validationWindowSessions, setValidationWindowSessions] = useState(60);
  const [expandingWindow, setExpandingWindow] = useState(true);
  const [sessionAligned, setSessionAligned] = useState(true);
  const [walkForwardPurgeEnabled, setWalkForwardPurgeEnabled] = useState(true);
  const [walkForwardEmbargoBars, setWalkForwardEmbargoBars] = useState(0);
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set());
  const [detailModel, setDetailModel] = useState<TrainedModelRecord | null>(null);
  const [registry, setRegistry] = useState<RegistryEntry[]>(readRegistry);
  const [clock, setClock] = useState(Date.now());

  const allCandidates = useMemo(() => flattenTargetAnalysis(analysis), [analysis]);
  const recommendedCandidates = useMemo(
    () => allCandidates.filter((candidate) => candidate.quality === "excellent"),
    [allCandidates],
  );
  const chosenCandidates = useMemo(
    () => allCandidates.filter((candidate) => selectedCandidates.has(candidate.id)),
    [allCandidates, selectedCandidates],
  );
  const primaryCandidate = allCandidates.find((candidate) =>
    candidate.predictionHorizonBars === trainingHorizon && candidate.thresholdPct === trainingThreshold,
  ) ?? {
    id: `manual-${trainingHorizon}-${trainingThreshold}`,
    predictionHorizonBars: trainingHorizon,
    thresholdPct: trainingThreshold,
    validRows: 0,
    skippedRows: 0,
    buyPercent: 0,
    holdPercent: 0,
    sellPercent: 0,
    directionalPercent: 0,
    imbalanceRatio: null,
    returnP50: 0,
    returnP75: 0,
    returnP90: 0,
    quality: "poor" as const,
  };
  const summaryCandidates = [primaryCandidate];
  const targetRows = summaryCandidates.reduce((sum, candidate) => sum + candidate.validRows, 0);
  const generatedCandidateCount = summaryCandidates.filter((candidate) => datasetResults[candidate.id]).length;
  const datasetIsExact = summaryCandidates.length > 0 && generatedCandidateCount === summaryCandidates.length;
  const expectedDatasetRows = datasetIsExact
    ? summaryCandidates.reduce((sum, candidate) => sum + (datasetResults[candidate.id]?.datasetRowCount ?? 0), 0)
    : targetRows;
  const targetDistributionCounts = summaryCandidates.reduce((totals, candidate) => ({
    buy: totals.buy + candidate.validRows * candidate.buyPercent / 100,
    hold: totals.hold + candidate.validRows * candidate.holdPercent / 100,
    sell: totals.sell + candidate.validRows * candidate.sellPercent / 100,
  }), { buy: 0, hold: 0, sell: 0 });
  const generatedDistributionCounts = summaryCandidates.reduce((totals, candidate) => {
    const labels = datasetResults[candidate.id]?.labelDistribution;
    return {
      buy: totals.buy + (labels?.BUY ?? 0),
      hold: totals.hold + (labels?.HOLD ?? 0),
      sell: totals.sell + (labels?.SELL ?? 0),
    };
  }, { buy: 0, hold: 0, sell: 0 });
  const distributionCounts = datasetIsExact ? generatedDistributionCounts : targetDistributionCounts;
  const distributionTotal = distributionCounts.buy + distributionCounts.hold + distributionCounts.sell;
  const distributionPercent = {
    buy: distributionTotal ? distributionCounts.buy / distributionTotal * 100 : 0,
    hold: distributionTotal ? distributionCounts.hold / distributionTotal * 100 : 0,
    sell: distributionTotal ? distributionCounts.sell / distributionTotal * 100 : 0,
  };
  const sortedClassShares = Object.values(distributionPercent).sort((first, second) => first - second);
  const summaryImbalance = sortedClassShares[0] ? sortedClassShares[2] / sortedClassShares[0] : null;
  const summaryFeatureCount = summaryCandidates.map((candidate) => datasetResults[candidate.id]?.featureCount).find((count) => count != null)
    ?? trainingModels.find((model) => summaryCandidates.some((candidate) => candidate.id === model.candidate.id))?.dataset?.featureCount
    ?? null;
  const rankedModels = useMemo(() => [...trainingModels].sort((first, second) => {
    const firstEligible = first.result.outOfFold?.finalCandidateSelection?.eligible ? 1 : 0;
    const secondEligible = second.result.outOfFold?.finalCandidateSelection?.eligible ? 1 : 0;
    return secondEligible - firstEligible || (metric(second, "f1") ?? -1) - (metric(first, "f1") ?? -1);
  }), [trainingModels]);
  const bestModel = rankedModels[0] ?? null;
  const bestAccuracyModel = [...trainingModels].sort((first, second) => (metric(second, "accuracy") ?? -1) - (metric(first, "accuracy") ?? -1))[0] ?? null;
  const bestF1Model = [...trainingModels].sort((first, second) => (metric(second, "f1") ?? -1) - (metric(first, "f1") ?? -1))[0] ?? null;
  const activeRegistryCount = registry.filter((entry) => entry.status === "ACTIVE").length;
  const currentStep = registry.some((entry) => entry.status === "ACTIVE") ? 7
    : trainingModels.length ? 5
      : trainingRun ? 4
        : Object.keys(datasetResults).length ? 3
          : selectedCandidates.size ? 2
            : analysis ? 1 : 0;

  useEffect(() => {
    localStorage.setItem(registryStorageKey, JSON.stringify(registry));
  }, [registry]);

  useEffect(() => {
    if (trainingRun?.status !== "RUNNING") return undefined;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [trainingRun]);

  const setField = <K extends keyof AnalysisForm>(key: K, value: AnalysisForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setAnalysis(null);
    setDatasetResults({});
    setSelectedCandidates(new Set());
    setRecommendationsVisible(false);
  };

  const runAnalysis = async () => {
    setAnalysisLoading(true);
    setAnalysisError("");
    setDatasetResults({});
    setSelectedCandidates(new Set());
    setRecommendationsVisible(false);
    try {
      const response = await analyzeTargets({
        symbolToken: form.symbolToken.trim(),
        tradingStyle: form.tradingStyle,
        timeframe: form.timeframe,
        predictionHorizonsBars: form.horizons,
        thresholdsPct: form.thresholds,
      });
      setAnalysis(response.data.data);
    } catch (error) {
      const message = (error as { response?: { data?: { detail?: string; message?: string } } })
        .response?.data?.detail || (error as { response?: { data?: { message?: string } } })
        .response?.data?.message || "Target analysis could not be completed.";
      setAnalysisError(message);
      setAnalysis(null);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const toggleCandidate = (id: string) => {
    setSelectedCandidates((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const generateSelectedDatasets = async () => {
    if (!chosenCandidates.length) return;
    setDatasetLoading(true);
    setDatasetMessage("");
    let completed = 0;
    for (const candidate of chosenCandidates) {
      try {
        const response = await generateMlDataset({
          symbolToken: form.symbolToken.trim(),
          tradingStyle: form.tradingStyle,
          timeframe: form.timeframe,
          predictionHorizonBars: candidate.predictionHorizonBars,
          buyThresholdPct: candidate.thresholdPct,
          sellThresholdPct: -candidate.thresholdPct,
        });
        setDatasetResults((current) => ({ ...current, [candidate.id]: response.data.data }));
        completed += 1;
        setDatasetMessage(`Generated ${completed} of ${chosenCandidates.length} candidate datasets.`);
      } catch (error) {
        const detail = (error as { response?: { data?: { detail?: string; message?: string } } })
          .response?.data?.detail || (error as { response?: { data?: { message?: string } } })
          .response?.data?.message || "Dataset generation failed.";
        setDatasetMessage(`${completed} of ${chosenCandidates.length} generated. ${candidate.predictionHorizonBars} bars / ${candidate.thresholdPct}%: ${detail}`);
        break;
      }
    }
    setDatasetLoading(false);
  };

  const startTraining = async () => {
    if (!form.symbolToken.trim() || trainingActive) return;
    if (Math.abs(trainRatio + validationRatio + testRatio - 1) > 0.0001) return;

    const candidate = primaryCandidate;
    const startedAt = Date.now();
    const run: TrainingRun = {
      id: `${candidate.id}-${startedAt}`,
      candidate,
      symbolToken: form.symbolToken.trim(),
      tradingStyle: form.tradingStyle,
      timeframe: form.timeframe,
      foldCount,
      status: "RUNNING",
      stage: "Training model and running walk-forward validation",
      startedAt,
    };
    setTrainingRun(run);
    setTrainingActive(true);
    setClock(startedAt);
    try {
      const payload: ModelTrainingRequest = {
        symbolToken: run.symbolToken,
        tradingStyle: run.tradingStyle,
        timeframe: run.timeframe,
        predictionHorizonBars: candidate.predictionHorizonBars,
        buyThresholdPct: candidate.thresholdPct,
        sellThresholdPct: -candidate.thresholdPct,
        trainRatio,
        validationRatio,
        testRatio,
        purgeEnabled,
        embargoBars,
        validationStrategy: "WALK_FORWARD",
        walkForward: {
          foldCount: run.foldCount,
          validationWindowSessions,
          expandingWindow,
          sessionAligned,
          purgeEnabled: walkForwardPurgeEnabled,
          embargoBars: walkForwardEmbargoBars,
        },
      };
      const response = await trainModel(payload);
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || "Training completed without a model result.");
      }
      const result = response.data.data;
      const dataset = datasetResults[candidate.id] ?? (result.dataset ? {
        symbolToken: run.symbolToken,
        tradingStyle: run.tradingStyle,
        timeframe: run.timeframe,
        predictionHorizonBars: candidate.predictionHorizonBars,
        sourceRowCount: result.dataset.sourceRowCount ?? 0,
        datasetRowCount: result.dataset.datasetRowCount ?? 0,
        skippedRowCount: result.dataset.skippedRowCount ?? 0,
        featureCount: result.dataset.featureCount ?? 0,
        labelDistribution: result.dataset.labelDistribution ?? {},
        trainingEligibility: result.dataset.trainingEligibility,
        datasetFingerprint: result.dataset.datasetFingerprint,
      } : undefined);
      const record: TrainedModelRecord = {
        id: run.id,
        modelId: result.modelId || `model-${run.id}`,
        symbolToken: run.symbolToken,
        tradingStyle: run.tradingStyle,
        timeframe: run.timeframe,
        candidate,
        trainedAt: new Date().toISOString(),
        result,
        dataset,
      };
      setTrainingModels((current) => [record, ...current]);
      setTrainingRun({ ...run, status: "COMPLETED", stage: "Training complete", finishedAt: Date.now() });
    } catch (error) {
      const detail = (error as { response?: { data?: { detail?: string; message?: string } } })
        .response?.data?.detail || (error as { response?: { data?: { message?: string } } })
        .response?.data?.message || (error instanceof Error ? error.message : "Training request failed.");
      setTrainingRun({ ...run, status: "FAILED", stage: "Training failed", error: detail, finishedAt: Date.now() });
    } finally {
      setTrainingActive(false);
    }
  };

  const promoteToWorkbenchRegistry = (model: TrainedModelRecord) => {
    const now = new Date().toISOString();
    setRegistry((current) => {
      const nextVersion = current.filter((entry) => entry.modelId === model.modelId).length + 1;
      return [
        {
          modelId: model.modelId,
          tradingStyle: model.tradingStyle,
          timeframe: model.timeframe,
          status: "ACTIVE",
          createdAt: now,
          promotedAt: now,
          version: nextVersion,
        },
        ...current.map((entry) => entry.tradingStyle === model.tradingStyle && entry.status === "ACTIVE"
          ? { ...entry, status: "INACTIVE" as const }
          : entry),
      ];
    });
    setActiveTab("registry");
  };

  const updateRegistryStatus = (modelId: string, status: RegistryStatus) => {
    setRegistry((current) => current.map((entry) => {
      if (status === "ACTIVE" && entry.tradingStyle === registry.find((item) => item.modelId === modelId)?.tradingStyle) {
        return { ...entry, status: entry.modelId === modelId ? "ACTIVE" : "INACTIVE" };
      }
      return entry.modelId === modelId ? { ...entry, status } : entry;
    }));
  };

  const analysisColumns: GridColDef<CandidateRow>[] = [
    { field: "predictionHorizonBars", headerName: "Horizon", width: 90, valueFormatter: (value) => `${value} bars` },
    { field: "thresholdPct", headerName: "Threshold", width: 100, valueFormatter: (value) => `${Number(value).toFixed(2)}%` },
    { field: "validRows", headerName: "Valid rows", width: 110, type: "number" },
    { field: "skippedRows", headerName: "Skipped", width: 95, type: "number" },
    { field: "buyPercent", headerName: "Buy %", width: 85, valueFormatter: (value) => `${Number(value).toFixed(1)}%` },
    { field: "holdPercent", headerName: "Hold %", width: 85, valueFormatter: (value) => `${Number(value).toFixed(1)}%` },
    { field: "sellPercent", headerName: "Sell %", width: 85, valueFormatter: (value) => `${Number(value).toFixed(1)}%` },
    { field: "directionalPercent", headerName: "Directional %", width: 115, valueFormatter: (value) => `${Number(value).toFixed(1)}%` },
    { field: "imbalanceRatio", headerName: "Imbalance", width: 100, valueFormatter: (value) => value == null ? "∞" : Number(value).toFixed(2) },
    { field: "returnP50", headerName: "Return P50", width: 105, valueFormatter: (value) => `${Number(value).toFixed(2)}%` },
    { field: "returnP75", headerName: "Return P75", width: 105, valueFormatter: (value) => `${Number(value).toFixed(2)}%` },
    { field: "returnP90", headerName: "Return P90", width: 105, valueFormatter: (value) => `${Number(value).toFixed(2)}%` },
    { field: "quality", headerName: "Assessment", width: 120, renderCell: ({ value }) => <Chip size="small" className={`quality-chip quality-${value}`} label={String(value).toUpperCase()} /> },
  ];

  const resultColumns: GridColDef<TrainedModelRecord>[] = [
    { field: "modelId", headerName: "Model ID", minWidth: 250, flex: 1 },
    { field: "symbol", headerName: "Symbol", width: 100, valueGetter: (_value, row) => row.symbolToken },
    { field: "tradingStyle", headerName: "Style", width: 120, valueGetter: (_value, row) => row.tradingStyle },
    { field: "timeframe", headerName: "Timeframe", width: 130, valueGetter: (_value, row) => row.timeframe },
    { field: "horizon", headerName: "Horizon", width: 95, valueGetter: (_value, row) => `${row.candidate.predictionHorizonBars} bars` },
    { field: "threshold", headerName: "Threshold", width: 100, valueGetter: (_value, row) => `${row.candidate.thresholdPct.toFixed(2)}%` },
    { field: "algorithm", headerName: "Algorithm", width: 125, valueGetter: () => "XGBoost" },
    { field: "accuracy", headerName: "Accuracy", width: 100, valueGetter: (_value, row) => metricText(metric(row, "accuracy")) },
    { field: "precision", headerName: "Precision", width: 100, valueGetter: (_value, row) => metricText(metric(row, "precision")) },
    { field: "recall", headerName: "Recall", width: 100, valueGetter: (_value, row) => metricText(metric(row, "recall")) },
    { field: "f1", headerName: "Macro F1", width: 100, valueGetter: (_value, row) => metricText(metric(row, "f1")) },
    { field: "rocAuc", headerName: "ROC AUC", width: 100, valueGetter: () => "N/A" },
    { field: "trainedAt", headerName: "Train date", width: 170, valueFormatter: (value) => new Date(String(value)).toLocaleString() },
    {
      field: "actions", headerName: "Actions", width: 270, sortable: false, filterable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <Button size="small" onClick={() => setDetailModel(row)}>Details</Button>
          <Tooltip title="A dedicated server-side backtest endpoint is not available">
            <span><Button size="small" disabled>Backtest</Button></span>
          </Tooltip>
          <Button size="small" onClick={() => promoteToWorkbenchRegistry(row)}>Promote</Button>
          <Button size="small" color="error" onClick={() => setTrainingModels((current) => current.filter((model) => model.id !== row.id))}>Remove</Button>
        </Stack>
      ),
    },
  ];

  const leaderboardColumns: GridColDef<TrainedModelRecord>[] = [
    { field: "rank", headerName: "Rank", width: 70, valueGetter: (_value, row) => rankedModels.findIndex((model) => model.id === row.id) + 1 },
    { field: "modelId", headerName: "Model", minWidth: 250, flex: 1 },
    { field: "accuracy", headerName: "Accuracy", width: 105, valueGetter: (_value, row) => metricText(metric(row, "accuracy")) },
    { field: "precision", headerName: "Precision", width: 105, valueGetter: (_value, row) => metricText(metric(row, "precision")) },
    { field: "recall", headerName: "Recall", width: 100, valueGetter: (_value, row) => metricText(metric(row, "recall")) },
    { field: "f1", headerName: "Macro F1", width: 105, valueGetter: (_value, row) => metricText(metric(row, "f1")) },
    { field: "rocAuc", headerName: "ROC AUC", width: 100, valueGetter: () => "N/A" },
    { field: "winRate", headerName: "Win rate", width: 100, valueGetter: (_value, row) => metric(row, "winRate") == null ? "N/A" : `${metricText(metric(row, "winRate"), 1)}%` },
    { field: "netReturn", headerName: "Net return", width: 110, valueGetter: (_value, row) => metric(row, "netReturn") == null ? "N/A" : `${metricText(metric(row, "netReturn"), 2)}%` },
    { field: "sharpe", headerName: "Sharpe", width: 95, valueGetter: () => "N/A" },
    { field: "drawdown", headerName: "Max DD", width: 100, valueGetter: (_value, row) => metric(row, "drawdown") == null ? "N/A" : `${metricText(metric(row, "drawdown"), 2)}%` },
  ];

  const comparisonModels = trainingModels.filter((model) => selectedModelIds.has(model.id)).slice(0, 5);
  const currentTrainingModel = trainingRun ? trainingModels.find((model) => model.id === trainingRun.id) ?? null : null;
  const comparisonChart = {
    labels: comparisonModels.map((model) => model.modelId.slice(0, 20)),
    datasets: [
      { label: "Accuracy", data: comparisonModels.map((model) => metric(model, "accuracy")), backgroundColor: "#70e0b0" },
      { label: "Macro F1", data: comparisonModels.map((model) => metric(model, "f1")), backgroundColor: "#e9b65e" },
      { label: "Directional precision", data: comparisonModels.map((model) => metric(model, "directionalPrecision")), backgroundColor: "#83aee8" },
    ],
  };
  const comparisonRows = [
    ["Accuracy", "accuracy"], ["Precision", "precision"], ["Recall", "recall"],
    ["Macro F1", "f1"], ["ROC AUC", "rocAuc"], ["Win rate", "winRate"],
    ["Net return", "netReturn"], ["Sharpe ratio", "sharpe"], ["Max drawdown", "drawdown"],
  ] as const;
  const comparisonValue = (model: TrainedModelRecord, name: string) => {
    const value = metric(model, name);
    if (value === null) return "N/A";
    return ["winRate", "netReturn", "drawdown"].includes(name)
      ? `${value.toFixed(2)}%`
      : value.toFixed(3);
  };

  return (
    <ThemeProvider theme={workbenchTheme}>
      <CssBaseline />
      <Box className="ml-workbench">
        <header className="ml-workbench-header">
          <div>
            <Typography className="workbench-eyebrow">QUANT RESEARCH / MODEL LAB</Typography>
            <Typography variant="h4" className="workbench-title">ML Training Workbench</Typography>
            <Typography color="text.secondary">From target diagnostics to validation-ranked model candidates.</Typography>
          </div>
          <div className="workbench-header-meta">
            <span className="live-dot" />
            <span>Gateway route · /ml → ML service</span>
          </div>
        </header>

        <section className="workflow-rail" aria-label="Model workflow">
          <Stepper activeStep={currentStep} alternativeLabel>
            {workflowSteps.map((label, index) => (
              <Step key={label} completed={index < currentStep}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </section>

        <section className="workbench-kpis" aria-label="Model KPIs">
          <Kpi label="Models trained" value={String(trainingModels.length).padStart(2, "0")} detail="this workbench session" />
          <Kpi label="Active models" value={String(activeRegistryCount).padStart(2, "0")} detail="browser registry only" />
          <Kpi label="Best accuracy" value={bestAccuracyModel ? metricText(metric(bestAccuracyModel, "accuracy"), 3) : "—"} detail="out-of-fold" />
          <Kpi label="Best macro F1" value={bestF1Model ? metricText(metric(bestF1Model, "f1"), 3) : "—"} detail="walk-forward" />
          <Kpi label="Best Sharpe" value="N/A" detail="not returned by API" />
          <Kpi label="Top candidate" value={bestModel ? bestModel.modelId.slice(0, 17) : "Awaiting run"} detail={bestModel?.result.outOfFold?.finalCandidateSelection?.eligible ? "eligible" : bestModel ? "validation only" : "no model yet"} />
          <Kpi label="Latest run" value={trainingModels[0] ? new Date(trainingModels[0].trainedAt).toLocaleDateString() : "—"} detail="local session" />
        </section>

        <Tabs className="workbench-tabs" value={activeTab} onChange={(_event, value: WorkbenchTab) => setActiveTab(value)} variant="scrollable" scrollButtons="auto">
          <Tab value="analysis" label="Target Analysis" />
          <Tab value="training" label="Model Training" />
          <Tab value="results" label="Training Results" />
          <Tab value="leaderboard" label="Model Leaderboard" />
          <Tab value="registry" label="Model Registry" />
        </Tabs>

        {activeTab === "analysis" && (
          <Box className="workbench-panel">
            <div className="section-heading">
              <div><Typography variant="h6">Target analysis</Typography><Typography variant="body2" color="text.secondary">Measure label balance before spending time on a training run.</Typography></div>
              {analysis && <Chip size="small" label={`${analysis.sourceRowCount.toLocaleString()} source rows`} variant="outlined" />}
            </div>
            <Paper className="analysis-config" variant="outlined">
              <div className="config-grid">
                <TextField label="Symbol token" value={form.symbolToken} onChange={(event) => setField("symbolToken", event.target.value)} size="small" disabled={analysisLoading || datasetLoading} />
                <FormControl size="small" disabled={analysisLoading || datasetLoading}><InputLabel>Trading style</InputLabel><Select label="Trading style" value={form.tradingStyle} onChange={(event) => setField("tradingStyle", event.target.value as AnalysisForm["tradingStyle"])}>
                  <MenuItem value="INTRADAY">INTRADAY</MenuItem><MenuItem value="SWING">SWING</MenuItem><MenuItem value="LONG_TERM">LONG_TERM</MenuItem>
                </Select></FormControl>
                <FormControl size="small" disabled={analysisLoading || datasetLoading}><InputLabel>Timeframe</InputLabel><Select label="Timeframe" value={form.timeframe} onChange={(event) => setField("timeframe", event.target.value)}>
                  {timeframeOptions.map((timeframe) => <MenuItem value={timeframe} key={timeframe}>{timeframe}</MenuItem>)}
                </Select></FormControl>
                <FormControl size="small" disabled={analysisLoading || datasetLoading}><InputLabel>Prediction horizons</InputLabel><Select multiple label="Prediction horizons" value={form.horizons} onChange={(event) => setField("horizons", event.target.value as number[])} renderValue={(selected) => selected.map((value) => `${value} bars`).join(", ")}>
                  {horizonOptions.map((horizon) => <MenuItem value={horizon} key={horizon}><Checkbox checked={form.horizons.includes(horizon)} />{horizon} bars</MenuItem>)}
                </Select></FormControl>
                <FormControl size="small" disabled={analysisLoading || datasetLoading}><InputLabel>Threshold set (%)</InputLabel><Select multiple label="Threshold set (%)" value={form.thresholds} onChange={(event) => setField("thresholds", event.target.value as number[])} renderValue={(selected) => selected.map((value) => `${Number(value).toFixed(2)}%`).join(", ")}>
                  {thresholdOptions.map((threshold) => <MenuItem value={threshold} key={threshold}><Checkbox checked={form.thresholds.includes(threshold)} />{threshold.toFixed(2)}%</MenuItem>)}
                </Select></FormControl>
                <Button className="run-analysis-button" variant="contained" onClick={() => void runAnalysis()} disabled={analysisLoading || !form.symbolToken.trim() || !form.horizons.length || !form.thresholds.length}>
                  {analysisLoading ? <><CircularProgress size={16} color="inherit" /> Analyzing</> : "Run analysis"}
                </Button>
              </div>
            </Paper>
            {analysisError && <Alert severity="error" className="workbench-alert">{analysisError}</Alert>}
            {analysisLoading && <LinearProgress className="workbench-progress" />}
            <div className="section-heading target-results-heading">
              <div><Typography variant="subtitle1">Target distribution</Typography><Typography variant="caption" color="text.secondary">Select rows to create candidate combinations.</Typography></div>
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="outlined" disabled={!allCandidates.length} onClick={() => setRecommendationsVisible(true)}>Generate best candidates</Button>
                <Button size="small" variant="outlined" disabled={!allCandidates.length} onClick={() => setSelectedCandidates(new Set(allCandidates.map((candidate) => candidate.id)))}>Select all</Button>
              </Stack>
            </div>
            <div className="analysis-grid">
              <DataGrid
                rows={allCandidates}
                columns={analysisColumns}
                checkboxSelection
                disableRowSelectionOnClick
                rowSelectionModel={{ type: "include", ids: selectedCandidates }}
                onRowSelectionModelChange={(model) => setSelectedCandidates(new Set(Array.from(model.ids, String)))}
                getRowClassName={(params) => `candidate-row candidate-${params.row.quality}`}
                initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                pageSizeOptions={[10, 25, 50]}
                slots={{ noRowsOverlay: () => <div className="empty-grid">Run target analysis to populate candidate distributions.</div> }}
              />
            </div>
            {recommendationsVisible && (
              <section className="recommendation-section">
                <div className="section-heading"><div><Typography variant="subtitle1">Recommended candidates</Typography><Typography variant="caption" color="text.secondary">All five configured recommendation gates passed.</Typography></div><Chip size="small" color="success" label={`${recommendedCandidates.length} candidates`} /></div>
                {recommendedCandidates.length ? <div className="candidate-cards">
                  {recommendedCandidates.map((candidate) => (
                    <Paper key={candidate.id} className={`candidate-card ${selectedCandidates.has(candidate.id) ? "candidate-card-selected" : ""}`} variant="outlined">
                      <div className="candidate-card-top"><Chip size="small" color="success" label="EXCELLENT" /><Checkbox size="small" checked={selectedCandidates.has(candidate.id)} onChange={() => toggleCandidate(candidate.id)} slotProps={{ input: { "aria-label": `Select ${candidate.predictionHorizonBars} bars at ${candidate.thresholdPct}%` } }} /></div>
                      <Typography variant="h6">{candidate.predictionHorizonBars} bars <span>/</span> {candidate.thresholdPct.toFixed(2)}%</Typography>
                      <Typography variant="caption" color="text.secondary">{candidate.validRows.toLocaleString()} valid rows · {candidate.directionalPercent.toFixed(1)}% directional</Typography>
                    </Paper>
                  ))}
                </div> : <Alert severity="info">No combination passed every recommendation gate. You can still select candidates from the full table.</Alert>}
              </section>
            )}
            <div className="candidate-action-bar">
              <div><strong>{selectedCandidates.size}</strong> candidates selected <span>·</span> {Object.keys(datasetResults).length} datasets generated</div>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" disabled={!selectedCandidates.size || datasetLoading} onClick={() => void generateSelectedDatasets()}>
                  {datasetLoading ? <><CircularProgress size={15} /> Generating</> : "Generate dataset"}
                </Button>
                <Button variant="contained" disabled={!selectedCandidates.size} onClick={() => setActiveTab("training")}>Model Training</Button>
              </Stack>
            </div>
            {datasetMessage && <Typography className="inline-status" color="text.secondary">{datasetMessage}</Typography>}
          </Box>
        )}

        {activeTab === "training" && (
          <Box className="workbench-panel">
            <div className="section-heading training-page-heading">
              <div><Typography variant="h6">Model training</Typography><Typography variant="body2" color="text.secondary">Review the selected forecast, dataset, and validation before training one model.</Typography></div>
              <Chip size="small" label={trainingActive ? "TRAINING" : trainingRun?.status ?? "READY"} />
            </div>

            <section className="business-step">
              <div className="business-step-heading"><span>01</span><div><Typography variant="subtitle1">Target configuration</Typography><Typography variant="caption" color="text.secondary">Define the market and forecast target.</Typography></div></div>
              <Paper className="business-step-body" variant="outlined">
                <div className="training-target-fields">
                  <TextField label="Symbol token" size="small" value={form.symbolToken} onChange={(event) => setField("symbolToken", event.target.value)} disabled={analysisLoading || datasetLoading} />
                  <FormControl size="small" disabled={analysisLoading || datasetLoading}><InputLabel>Trading style</InputLabel><Select label="Trading style" value={form.tradingStyle} onChange={(event) => setField("tradingStyle", event.target.value as AnalysisForm["tradingStyle"])}><MenuItem value="INTRADAY">INTRADAY</MenuItem><MenuItem value="SWING">SWING</MenuItem><MenuItem value="LONG_TERM">LONG_TERM</MenuItem></Select></FormControl>
                  <FormControl size="small" disabled={analysisLoading || datasetLoading}><InputLabel>Timeframe</InputLabel><Select label="Timeframe" value={form.timeframe} onChange={(event) => setField("timeframe", event.target.value)}>{timeframeOptions.map((timeframe) => <MenuItem value={timeframe} key={timeframe}>{timeframe}</MenuItem>)}</Select></FormControl>
                  <FormControl size="small" disabled={analysisLoading || datasetLoading}><InputLabel>Prediction horizon</InputLabel><Select label="Prediction horizon" value={trainingHorizon} onChange={(event) => setTrainingHorizon(Number(event.target.value))}>{horizonOptions.map((horizon) => <MenuItem value={horizon} key={horizon}>{horizon} bars</MenuItem>)}</Select></FormControl>
                  <FormControl size="small" disabled={analysisLoading || datasetLoading}><InputLabel>Buy threshold %</InputLabel><Select label="Buy threshold %" value={trainingThreshold} onChange={(event) => setTrainingThreshold(Number(event.target.value))}>{thresholdOptions.map((threshold) => <MenuItem value={threshold} key={threshold}>+{threshold.toFixed(2)}% / -{threshold.toFixed(2)}%</MenuItem>)}</Select></FormControl>
                  <TextField label="Sell threshold %" size="small" value={`-${trainingThreshold.toFixed(2)}%`} disabled slotProps={{ input: { readOnly: true } }} helperText="Mirrored from selected buy threshold" />
                </div>
                <div className="prediction-statement">
                  <span className="prediction-spark">↗</span>
                  <div><small>FORECAST TARGET</small><strong>Predict whether price will move <em>+{(primaryCandidate?.thresholdPct ?? form.thresholds[0] ?? 0.5).toFixed(2)}%</em> or <em className="sell-value">-{(primaryCandidate?.thresholdPct ?? form.thresholds[0] ?? 0.5).toFixed(2)}%</em> within the next <em>{primaryCandidate?.predictionHorizonBars ?? form.horizons[0] ?? 30} bars</em>.</strong></div>
                  {chosenCandidates.length > 1 && <Chip size="small" color="warning" label="Select one target to train" />}
                </div>
                {chosenCandidates.length > 0 && <div className="selected-target-list">{chosenCandidates.map((candidate) => <Chip key={candidate.id} size="small" variant="outlined" label={`${candidate.predictionHorizonBars} bars · +${candidate.thresholdPct.toFixed(2)}% / -${candidate.thresholdPct.toFixed(2)}%`} />)}</div>}
                {allCandidates.length === 0 && <Typography className="training-helper" variant="caption">Run Target Analysis, then select one candidate to train.</Typography>}
              </Paper>
            </section>

            <section className="business-step">
              <div className="business-step-heading"><span>02</span><div><Typography variant="subtitle1">Dataset summary</Typography><Typography variant="caption" color="text.secondary">Read-only volume and label balance for the selected target.</Typography></div><Chip size="small" variant="outlined" label={datasetIsExact ? "Generated dataset" : "Estimate from target analysis"} /></div>
              <div className="dataset-summary-grid">
                <Paper className="dataset-summary-panel" variant="outlined">
                  <div className="dataset-count-grid">
                    <SummaryMetric label="Expected rows" value={expectedDatasetRows ? expectedDatasetRows.toLocaleString() : "—"} detail={datasetIsExact ? "generated" : "pre-filter estimate"} />
                    <SummaryMetric label="Training rows" value={expectedDatasetRows ? Math.round(expectedDatasetRows * trainRatio).toLocaleString() : "—"} detail={`${Math.round(trainRatio * 100)}%`} />
                    <SummaryMetric label="Validation rows" value={expectedDatasetRows ? Math.round(expectedDatasetRows * validationRatio).toLocaleString() : "—"} detail={`${Math.round(validationRatio * 100)}%`} />
                    <SummaryMetric label="Test rows" value={expectedDatasetRows ? Math.round(expectedDatasetRows * testRatio).toLocaleString() : "—"} detail={`${Math.round(testRatio * 100)}%`} />
                    <SummaryMetric label="Feature count" value={summaryFeatureCount?.toLocaleString() ?? "Pending"} detail={summaryFeatureCount == null ? "generate dataset to measure" : "dataset schema"} />
                  </div>
                  {!datasetIsExact && <Typography className="training-helper" variant="caption">Estimated from target-valid rows. Feature warmup and invalid rows are removed during dataset generation.</Typography>}
                </Paper>
                <Paper className="distribution-panel" variant="outlined">
                  <div className="distribution-heading"><div><Typography variant="subtitle2">Target distribution</Typography><Typography variant="caption" color="text.secondary">{distributionTotal ? Math.round(distributionTotal).toLocaleString() : "No target analysis"} rows</Typography></div><Typography variant="caption">Imbalance <strong>{summaryImbalance == null ? "—" : `${summaryImbalance.toFixed(2)} : 1`}</strong></Typography></div>
                  <div className="distribution-bar" role="img" aria-label={`BUY ${distributionPercent.buy.toFixed(1)}%, HOLD ${distributionPercent.hold.toFixed(1)}%, SELL ${distributionPercent.sell.toFixed(1)}%`}>
                    <span className="distribution-buy" style={{ width: `${distributionPercent.buy}%` }} /><span className="distribution-hold" style={{ width: `${distributionPercent.hold}%` }} /><span className="distribution-sell" style={{ width: `${distributionPercent.sell}%` }} />
                  </div>
                  <div className="distribution-legend"><DistributionLegend label="BUY" value={distributionPercent.buy} color="buy" /><DistributionLegend label="HOLD" value={distributionPercent.hold} color="hold" /><DistributionLegend label="SELL" value={distributionPercent.sell} color="sell" /></div>
                </Paper>
              </div>
            </section>

            <section className="business-step">
              <div className="business-step-heading"><span>03</span><div><Typography variant="subtitle1">Validation strategy</Typography><Typography variant="caption" color="text.secondary">Chronological validation protects against look-ahead leakage.</Typography></div></div>
              <Paper className="validation-recommendation" variant="outlined">
                <span className="validation-check">✓</span><div className="validation-copy"><strong>Professional Walk-Forward Validation Recommended</strong><span>{foldCount} folds · {validationWindowSessions} session window · expanding window · session aligned · purge enabled</span></div><Chip size="small" color="success" label="Recommended" />
                <details className="advanced-validation"><summary>Advanced Settings</summary>
                  <div className="advanced-validation-grid">
                    <TextField label="Train ratio" type="number" size="small" slotProps={{ htmlInput: { min: 0.01, max: 0.98, step: 0.01 } }} value={trainRatio} onChange={(event) => setTrainRatio(Number(event.target.value))} />
                    <TextField label="Validation ratio" type="number" size="small" slotProps={{ htmlInput: { min: 0.01, max: 0.98, step: 0.01 } }} value={validationRatio} onChange={(event) => setValidationRatio(Number(event.target.value))} />
                    <TextField label="Test ratio" type="number" size="small" slotProps={{ htmlInput: { min: 0.01, max: 0.98, step: 0.01 } }} value={testRatio} onChange={(event) => setTestRatio(Number(event.target.value))} />
                    <TextField label="Folds" type="number" size="small" slotProps={{ htmlInput: { min: 1, max: 20 } }} value={foldCount} onChange={(event) => setFoldCount(Math.max(1, Number(event.target.value)))} />
                    <TextField label="Validation window (sessions)" type="number" size="small" slotProps={{ htmlInput: { min: 1 } }} value={validationWindowSessions} onChange={(event) => setValidationWindowSessions(Math.max(1, Number(event.target.value)))} />
                    <TextField label="Embargo bars" type="number" size="small" slotProps={{ htmlInput: { min: 0 } }} value={embargoBars} onChange={(event) => setEmbargoBars(Math.max(0, Number(event.target.value)))} />
                    <TextField label="Walk-forward embargo bars" type="number" size="small" slotProps={{ htmlInput: { min: 0 } }} value={walkForwardEmbargoBars} onChange={(event) => setWalkForwardEmbargoBars(Math.max(0, Number(event.target.value)))} />
                    <FormControlLabel control={<Checkbox checked={expandingWindow} onChange={(event) => setExpandingWindow(event.target.checked)} />} label="Expanding window" />
                    <FormControlLabel control={<Checkbox checked={sessionAligned} onChange={(event) => setSessionAligned(event.target.checked)} />} label="Session aligned" />
                    <FormControlLabel control={<Checkbox checked={purgeEnabled} onChange={(event) => setPurgeEnabled(event.target.checked)} />} label="Purge dataset split" />
                    <FormControlLabel control={<Checkbox checked={walkForwardPurgeEnabled} onChange={(event) => setWalkForwardPurgeEnabled(event.target.checked)} />} label="Purge walk-forward folds" />
                  </div>
                </details>
              </Paper>
            </section>

            <section className="business-step">
              <div className="business-step-heading"><span>04</span><div><Typography variant="subtitle1">Training settings</Typography><Typography variant="caption" color="text.secondary">A focused baseline with the current API-supported model.</Typography></div></div>
              <Paper className="training-settings-row" variant="outlined">
                <div className="training-setting"><small>ALGORITHM</small><strong>XGBoost</strong><span>Current service model</span></div>
                <div className="training-setting"><small>VALIDATION METHOD</small><strong>Walk Forward</strong><span>{foldCount} chronological folds</span></div>
                <div className="split-visual-setting"><div className="split-heading"><small>TRAIN / VALIDATION / TEST</small><strong>{Math.round(trainRatio * 100)}% / {Math.round(validationRatio * 100)}% / {Math.round(testRatio * 100)}%</strong></div><div className="split-bar"><span className="split-train" style={{ width: `${trainRatio * 100}%` }} /><span className="split-validation" style={{ width: `${validationRatio * 100}%` }} /><span className="split-test" style={{ width: `${testRatio * 100}%` }} /></div><div className="split-legend"><span>Train</span><span>Validation</span><span>Test</span></div></div>
                {Math.abs(trainRatio + validationRatio + testRatio - 1) > 0.0001 && <Typography className="ratio-warning split-ratio-warning">Split ratios must sum to 1.00. Adjust them in Advanced Settings.</Typography>}
              </Paper>
            </section>

            <section className="business-step">
              <div className="business-step-heading"><span>05</span><div><Typography variant="subtitle1">Review and train</Typography><Typography variant="caption" color="text.secondary">Confirm the forecast target and expected data before submitting.</Typography></div></div>
              <Paper className="train-launch-card" variant="outlined">
                <div className="launch-instrument"><small>INSTRUMENT</small><strong>{form.symbolToken.trim() || "Select token"}</strong><span>{form.tradingStyle} · {form.timeframe}</span></div>
                <div className="launch-horizon"><strong>{primaryCandidate?.predictionHorizonBars ?? form.horizons[0] ?? 30}</strong><span>BAR FORECAST</span></div>
                <div className="launch-thresholds"><small>BUY</small><strong>+{(primaryCandidate?.thresholdPct ?? form.thresholds[0] ?? 0.5).toFixed(2)}%</strong><small>SELL</small><strong className="sell-value">-{(primaryCandidate?.thresholdPct ?? form.thresholds[0] ?? 0.5).toFixed(2)}%</strong></div>
                <div className="launch-method"><small>VALIDATION</small><strong>Walk Forward</strong><span>XGBoost</span></div>
                <div className="launch-dataset"><small>EXPECTED DATASET</small><strong>{expectedDatasetRows ? expectedDatasetRows.toLocaleString() : "—"}</strong><span>{datasetIsExact ? "generated rows" : "estimated rows"}</span></div>
                <Button className="start-training-button" variant="contained" disabled={!form.symbolToken.trim() || trainingActive || Math.abs(trainRatio + validationRatio + testRatio - 1) > 0.0001} onClick={() => void startTraining()}>
                  {trainingActive ? <><CircularProgress size={17} color="inherit" /> Training model</> : "TRAIN MODEL"}
                </Button>
                {!allCandidates.some((candidate) => candidate.predictionHorizonBars === trainingHorizon && candidate.thresholdPct === trainingThreshold) && <Typography className="launch-hint" variant="caption">Dataset size and target distribution are estimates until Target Analysis or dataset generation is run. Training can still start with this configuration.</Typography>}
              </Paper>
            </section>

            <section className="business-step training-status-section">
              <div className="business-step-heading"><span>06</span><div><Typography variant="subtitle1">Training status</Typography><Typography variant="caption" color="text.secondary">One synchronous model-training request.</Typography></div></div>
              {!trainingRun ? <EmptyState title="Ready to train" detail="Your run status and model results will appear here after training starts." /> : (
                <Paper className="single-training-run" variant="outlined">
                  <div className="run-status-heading"><div className={`run-status-dot status-${trainingRun.status.toLowerCase()}`} /><div className="run-status-title"><Typography variant="subtitle2">{trainingRun.symbolToken} · {trainingRun.tradingStyle}</Typography><Typography variant="caption" color="text.secondary">{trainingRun.timeframe} · {trainingRun.candidate.predictionHorizonBars} bars · ±{trainingRun.candidate.thresholdPct.toFixed(2)}% · XGBoost · {trainingRun.foldCount}-fold Walk Forward</Typography></div><Chip size="small" className={`status-chip status-chip-${trainingRun.status.toLowerCase()}`} label={trainingRun.status} /></div>
                  {trainingRun.status === "RUNNING" ? <LinearProgress className="single-run-progress" /> : <LinearProgress className="single-run-progress" variant="determinate" value={100} color={trainingRun.status === "FAILED" ? "error" : "primary"} />}
                  <div className="run-metadata"><span>{trainingRun.stage}</span><span>Elapsed {formatElapsed(trainingRun.startedAt, trainingRun.finishedAt, clock)}</span><span>{trainingRun.status === "RUNNING" ? "Live percentage unavailable from API" : "Request finished"}</span></div>
                  {trainingRun.error && <Alert severity="error" className="workbench-alert">{trainingRun.error}</Alert>}
                  {currentTrainingModel && <section className="current-run-result">
                    <div className="current-run-result-heading"><div><Typography variant="overline">TRAINING RESULT</Typography><Typography variant="h6">{currentTrainingModel.modelId}</Typography></div><Chip size="small" color={currentTrainingModel.result.outOfFold?.finalCandidateSelection?.eligible ? "success" : "warning"} label={currentTrainingModel.result.outOfFold?.finalCandidateSelection?.eligible ? "VALIDATION PASSED" : "VALIDATION ONLY"} /></div>
                    <div className="model-score-grid">
                      <SummaryMetric label="Accuracy" value={metricText(metric(currentTrainingModel, "accuracy"))} detail="OOF" />
                      <SummaryMetric label="Precision" value={metricText(metric(currentTrainingModel, "precision"))} detail="macro mean" />
                      <SummaryMetric label="Recall" value={metricText(metric(currentTrainingModel, "recall"))} detail="macro mean" />
                      <SummaryMetric label="F1 score" value={metricText(metric(currentTrainingModel, "f1"))} detail="macro" />
                      <SummaryMetric label="ROC AUC" value="N/A" detail="not provided by API" />
                      <SummaryMetric label="Sharpe ratio" value="N/A" detail="not provided by API" />
                      <SummaryMetric label="Win rate" value={metric(currentTrainingModel, "winRate") == null ? "N/A" : `${metricText(metric(currentTrainingModel, "winRate"), 1)}%`} detail="OOF policy" />
                      <SummaryMetric label="Net profit" value={metric(currentTrainingModel, "netReturn") == null ? "N/A" : `${metricText(metric(currentTrainingModel, "netReturn"), 2)}%`} detail="after modeled costs" />
                    </div>
                    <div className="model-result-actions"><Button size="small" variant="outlined" onClick={() => setDetailModel(currentTrainingModel)}>View Details</Button><Tooltip title="A dedicated model backtest endpoint is not available"><span><Button size="small" variant="outlined" disabled>Backtest</Button></span></Tooltip><Button size="small" variant="contained" onClick={() => promoteToWorkbenchRegistry(currentTrainingModel)}>Promote Model</Button></div>
                  </section>}
                </Paper>
              )}
            </section>
          </Box>
        )}

        {activeTab === "results" && (
          <Box className="workbench-panel">
            <div className="section-heading"><div><Typography variant="h6">Training results</Typography><Typography variant="body2" color="text.secondary">Completed model runs and out-of-fold validation metrics.</Typography></div><Chip size="small" label={`${trainingModels.length} models`} /></div>
            <Alert severity="warning" className="workbench-alert">These scores are validation-only. The locked test set is not evaluated, and model records remain in this browser session.</Alert>
            <div className="results-grid">
              <DataGrid rows={trainingModels} columns={resultColumns} checkboxSelection disableRowSelectionOnClick
                rowSelectionModel={{ type: "include", ids: selectedModelIds }}
                onRowSelectionModelChange={(model) => setSelectedModelIds(new Set(Array.from(model.ids, String)))}
                initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }} pageSizeOptions={[10, 25]} />
            </div>
            {trainingModels.length === 0 && <EmptyState title="No completed runs" detail="Your model results will appear here after training completes." />}
            {selectedModelIds.size > 1 && <Button className="compare-button" variant="contained" onClick={() => setActiveTab("leaderboard")}>Compare {selectedModelIds.size} selected models</Button>}
            {trainingModels.length > 0 && <div className="model-result-cards">{trainingModels.map((model) => (
              <Paper className="model-result-card" key={model.id} variant="outlined">
                <div className="model-result-heading"><div><Typography variant="overline">MODEL SCORE</Typography><Typography variant="h6">{metricText(metric(model, "f1"))}</Typography></div><Chip size="small" color={model.result.outOfFold?.finalCandidateSelection?.eligible ? "success" : "warning"} label={model.result.outOfFold?.finalCandidateSelection?.eligible ? "VALIDATION PASSED" : "VALIDATION ONLY"} /></div>
                <Typography className="model-result-name" variant="subtitle2">{model.modelId}</Typography>
                <Typography className="model-result-config" variant="caption" color="text.secondary">{model.symbolToken} · {model.tradingStyle} · {model.timeframe} · {model.candidate.predictionHorizonBars} bars · ±{model.candidate.thresholdPct.toFixed(2)}%</Typography>
                <div className="model-score-grid">
                  <SummaryMetric label="Accuracy" value={metricText(metric(model, "accuracy"))} detail="OOF" />
                  <SummaryMetric label="Precision" value={metricText(metric(model, "precision"))} detail="macro mean" />
                  <SummaryMetric label="Recall" value={metricText(metric(model, "recall"))} detail="macro mean" />
                  <SummaryMetric label="F1 score" value={metricText(metric(model, "f1"))} detail="macro" />
                  <SummaryMetric label="ROC AUC" value="N/A" detail="not provided" />
                  <SummaryMetric label="Sharpe ratio" value="N/A" detail="not provided" />
                  <SummaryMetric label="Win rate" value={metric(model, "winRate") == null ? "N/A" : `${metricText(metric(model, "winRate"), 1)}%`} detail="OOF policy" />
                  <SummaryMetric label="Net profit" value={metric(model, "netReturn") == null ? "N/A" : `${metricText(metric(model, "netReturn"), 2)}%`} detail="after modeled costs" />
                </div>
                <div className="model-result-actions"><Button size="small" variant="outlined" onClick={() => setDetailModel(model)}>View details</Button><Tooltip title="A dedicated model backtest endpoint is not available"><span><Button size="small" variant="outlined" disabled>Backtest</Button></span></Tooltip><Button size="small" variant="contained" onClick={() => promoteToWorkbenchRegistry(model)}>Promote model</Button></div>
              </Paper>
            ))}</div>}
          </Box>
        )}

        {activeTab === "leaderboard" && (
          <Box className="workbench-panel">
            <div className="section-heading"><div><Typography variant="h6">Model leaderboard</Typography><Typography variant="body2" color="text.secondary">Ranked by gate eligibility, then walk-forward macro F1.</Typography></div>{bestModel && <Chip color={bestModel.result.outOfFold?.finalCandidateSelection?.eligible ? "success" : "warning"} label={bestModel.result.outOfFold?.finalCandidateSelection?.eligible ? "BEST MODEL" : "TOP VALIDATION ONLY"} />}</div>
            <Alert severity="warning" className="workbench-alert">ROC AUC, Sharpe ratio, and a dedicated backtest are not returned by the current API. No production model is promoted from this leaderboard.</Alert>
            <div className="leaderboard-grid">
              <DataGrid rows={rankedModels} columns={leaderboardColumns} checkboxSelection disableRowSelectionOnClick
                rowSelectionModel={{ type: "include", ids: selectedModelIds }}
                onRowSelectionModelChange={(model) => setSelectedModelIds(new Set(Array.from(model.ids, String)))}
                getRowClassName={(params) => params.row.id === bestModel?.id ? "leaderboard-best-row" : ""}
                initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }} pageSizeOptions={[10]} />
            </div>
            {rankedModels.length > 0 && <section className="leaderboard-cards">
              <Typography variant="subtitle1">Top 10 candidates</Typography>
              <div className="ranking-list">{rankedModels.slice(0, 10).map((model, index) => (
                <Paper className={`ranking-card ${index === 0 ? "ranking-card-top" : ""}`} key={model.id} variant="outlined">
                  <span className="ranking-number">{String(index + 1).padStart(2, "0")}</span>
                  <div className="ranking-copy"><Typography variant="subtitle2">{model.modelId}</Typography><Typography variant="caption" color="text.secondary">{model.candidate.predictionHorizonBars} bars · {model.candidate.thresholdPct.toFixed(2)}% · {model.timeframe}</Typography></div>
                  <strong>{metricText(metric(model, "f1"))}</strong>
                  {index === 0 && <Chip size="small" color={model.result.outOfFold?.finalCandidateSelection?.eligible ? "success" : "warning"} label={model.result.outOfFold?.finalCandidateSelection?.eligible ? "BEST MODEL" : "BEST VALIDATION"} />}
                  <Button size="small" onClick={() => setDetailModel(model)}>Details</Button>
                </Paper>
              ))}</div>
            </section>}
            <section className="comparison-section">
              <div className="section-heading"><div><Typography variant="subtitle1">Model comparison</Typography><Typography variant="caption" color="text.secondary">Select models in the table; chart compares available 0–1 metrics.</Typography></div><Typography variant="caption">{comparisonModels.length} / 5</Typography></div>
              {comparisonModels.length > 1 ? <>
                <div className="comparison-chart"><Bar data={comparisonChart} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 1, ticks: { color: "#94a6a0" }, grid: { color: "rgba(180,203,193,.12)" } }, x: { ticks: { color: "#94a6a0" }, grid: { display: false } } }, plugins: { legend: { labels: { color: "#e7efec" } } } }} /></div>
                <div className="compare-metrics-wrap"><table className="compare-metrics"><thead><tr><th>Metric</th>{comparisonModels.map((model) => <th key={model.id}>{model.modelId}</th>)}</tr></thead><tbody>
                  {comparisonRows.map(([label, key]) => <tr key={key}><th>{label}</th>{comparisonModels.map((model) => <td key={model.id}>{comparisonValue(model, key)}</td>)}</tr>)}
                </tbody></table></div>
              </> : <EmptyState title="Select at least two models" detail="Use the leaderboard checkboxes to compare validation and strategy metrics side by side." />}
            </section>
          </Box>
        )}

        {activeTab === "registry" && (
          <Box className="workbench-panel">
            <div className="section-heading"><div><Typography variant="h6">Model registry</Typography><Typography variant="body2" color="text.secondary">Browser-persisted approval list for this workbench.</Typography></div><Chip size="small" label={`${registry.length} entries`} /></div>
            <Alert severity="error" className="workbench-alert">This registry is stored in this browser only. Activate, rollback, and promotion do not change the ML service’s production model; a server-side registry API is required for deployment.</Alert>
            {registry.length === 0 ? <EmptyState title="No approved models" detail="Promote a trained candidate to add a local registry record." /> : (
              <div className="registry-table-wrap"><table className="registry-table"><thead><tr><th>Model name</th><th>Version</th><th>Style / timeframe</th><th>Status</th><th>Created</th><th>Promoted</th><th>Actions</th></tr></thead><tbody>
                {registry.map((entry) => <tr key={`${entry.modelId}-${entry.version}`}>
                  <td><strong>{entry.modelId}</strong></td><td>v{entry.version}</td><td>{entry.tradingStyle} · {entry.timeframe}</td>
                  <td><Chip size="small" label={entry.status} color={entry.status === "ACTIVE" ? "success" : entry.status === "ARCHIVED" ? "default" : "warning"} /></td>
                  <td>{new Date(entry.createdAt).toLocaleString()}</td><td>{new Date(entry.promotedAt).toLocaleString()}</td>
                  <td><Stack direction="row" spacing={0.5}>
                    {entry.status !== "ACTIVE" && <Button size="small" onClick={() => updateRegistryStatus(entry.modelId, "ACTIVE")}>{registry.some((candidate) => candidate.tradingStyle === entry.tradingStyle && candidate.status === "ACTIVE") ? "Rollback" : "Activate"}</Button>}
                    {entry.status === "ACTIVE" && <Button size="small" onClick={() => updateRegistryStatus(entry.modelId, "INACTIVE")}>Deactivate</Button>}
                    {entry.status !== "ARCHIVED" && <Button size="small" color="warning" onClick={() => updateRegistryStatus(entry.modelId, "ARCHIVED")}>Archive</Button>}
                  </Stack></td>
                </tr>)}
              </tbody></table></div>
            )}
          </Box>
        )}

        <footer className="workbench-footnote">
          <span>Connected through gateway <code>localhost:7090/ml/api/v1</code></span>
          <span>Validation remains separate from the locked test set</span>
        </footer>

        <Drawer anchor="right" open={Boolean(detailModel)} onClose={() => setDetailModel(null)} slotProps={{ paper: { className: "model-detail-drawer" } }}>
          {detailModel && <ModelDetails model={detailModel} onPromote={() => promoteToWorkbenchRegistry(detailModel)} onClose={() => setDetailModel(null)} />}
        </Drawer>
      </Box>
    </ThemeProvider>
  );
};

const Kpi: React.FC<{ label: string; value: string; detail: string }> = ({ label, value, detail }) => (
  <Paper className="kpi-tile" variant="outlined"><span>{label}</span><strong title={value}>{value}</strong><small>{detail}</small></Paper>
);

const SummaryMetric: React.FC<{ label: string; value: string; detail: string }> = ({ label, value, detail }) => (
  <div className="dataset-summary-metric"><small>{label}</small><strong>{value}</strong><span>{detail}</span></div>
);

const DistributionLegend: React.FC<{ label: string; value: number; color: "buy" | "hold" | "sell" }> = ({ label, value, color }) => (
  <span className="distribution-legend-item"><i className={`legend-swatch legend-${color}`} /><span>{label}</span><strong>{value.toFixed(1)}%</strong></span>
);

const EmptyState: React.FC<{ title: string; detail: string }> = ({ title, detail }) => (
  <div className="empty-state"><span className="empty-state-mark">—</span><Typography variant="subtitle2">{title}</Typography><Typography variant="body2" color="text.secondary">{detail}</Typography></div>
);

const ModelDetails: React.FC<{ model: TrainedModelRecord; onPromote: () => void; onClose: () => void }> = ({ model, onPromote, onClose }) => {
  const result = model.result;
  const validation = result.outOfFold?.overallValidationMetrics;
  const selectedPolicy = result.outOfFold?.finalCandidateSelection?.selectedPolicy;
  const importance = result.walkForward?.aggregate?.featureImportance?.ranking?.slice(0, 10) ?? [];
  const lastFold = result.walkForward?.folds?.at(-1);
  return (
    <div className="detail-content">
      <div className="detail-header"><div><Typography className="workbench-eyebrow">MODEL DETAILS</Typography><Typography variant="h6">{model.modelId}</Typography></div><Button onClick={onClose}>Close</Button></div>
      <Typography variant="caption" color="text.secondary">{model.candidate.predictionHorizonBars} bars · threshold {model.candidate.thresholdPct.toFixed(2)}% · trained {new Date(model.trainedAt).toLocaleString()}</Typography>
      <div className="detail-actions"><Button variant="contained" onClick={onPromote}>Promote to local registry</Button><Tooltip title="No dedicated backtest API is available"><span><Button variant="outlined" disabled>Backtest</Button></span></Tooltip></div>
      <DetailSection title="Model configuration"><DetailLine label="Algorithm" value="XGBoost (server-selected)" /><DetailLine label="Validation" value={result.validationStrategy || "WALK_FORWARD"} /><DetailLine label="Model status" value={result.lifecycleStatus || result.status || "—"} /><DetailLine label="Model ID" value={model.modelId} /></DetailSection>
      <DetailSection title="Dataset summary"><DetailLine label="Rows" value={model.dataset?.datasetRowCount?.toLocaleString() ?? "Included in training response"} /><DetailLine label="Features" value={model.dataset?.featureCount?.toLocaleString() ?? "—"} /><DetailLine label="Eligibility" value={model.dataset?.trainingEligibility?.eligible === false ? "Ineligible" : model.dataset?.trainingEligibility?.eligible ? "Eligible" : "Not reported"} /><DetailLine label="Test set" value={result.testLocked ? "Locked · not evaluated" : "Not reported"} /></DetailSection>
      <DetailSection title="Validation metrics"><DetailLine label="Accuracy" value={metricText(metric(model, "accuracy"))} /><DetailLine label="Balanced accuracy" value={metricText(validation?.metrics?.balancedAccuracy ?? null)} /><DetailLine label="Macro F1" value={metricText(metric(model, "f1"))} /><DetailLine label="Directional precision" value={metricText(validation?.directionalPrecision ?? null)} /></DetailSection>
      <DetailSection title="Class metrics"><div className="detail-class-grid">{(["BUY", "HOLD", "SELL"] as const).map((label) => <div key={label}><strong>{label}</strong><span>P {metricText(validation?.[label]?.precision)}</span><span>R {metricText(validation?.[label]?.recall)}</span><span>F1 {metricText(validation?.[label]?.f1)}</span></div>)}</div></DetailSection>
      <DetailSection title="Feature importance">{importance.length ? <ol className="importance-list">{importance.map((item) => <li key={item.feature}><span>{item.feature}</span><strong>{item.combinedImportancePct?.toFixed(2) ?? "—"}%</strong></li>)}</ol> : <Typography variant="body2" color="text.secondary">Not supplied by this model response.</Typography>}</DetailSection>
      <DetailSection title="Confusion matrix">{lastFold?.confusionMatrix?.matrix ? <div className="confusion-wrap"><table><thead><tr><th>Actual / predicted</th>{lastFold.confusionMatrix.classOrder?.map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{lastFold.confusionMatrix.matrix.map((row, index) => <tr key={lastFold.confusionMatrix?.classOrder?.[index] ?? index}><th>{lastFold.confusionMatrix?.classOrder?.[index] ?? index}</th>{row.map((count, column) => <td key={column}>{count}</td>)}</tr>)}</tbody></table></div> : <Typography variant="body2" color="text.secondary">Not supplied by this model response.</Typography>}</DetailSection>
      <DetailSection title="OOF policy backtest">{selectedPolicy ? <><DetailLine label="Trades" value={String(selectedPolicy.tradeCount ?? "—")} /><DetailLine label="Win rate" value={selectedPolicy.winRate == null ? "—" : `${selectedPolicy.winRate.toFixed(1)}%`} /><DetailLine label="Net return" value={selectedPolicy.netReturnPct == null ? "—" : `${selectedPolicy.netReturnPct.toFixed(2)}%`} /><DetailLine label="Profit factor" value={metricText(selectedPolicy.profitFactor ?? null)} /><DetailLine label="Max drawdown" value={selectedPolicy.maxDrawdownPct == null ? "—" : `${selectedPolicy.maxDrawdownPct.toFixed(2)}%`} /></> : <Typography variant="body2" color="text.secondary">No selected policy metrics were returned.</Typography>}<Typography variant="caption" color="text.secondary">This is validation-only policy analysis, not a locked-test backtest.</Typography></DetailSection>
      <DetailSection title="ROC, SHAP, and logs"><Typography variant="body2" color="text.secondary">ROC AUC and SHAP values are not provided by the current API. Live stage logs are unavailable because model training is a synchronous request.</Typography><DetailLine label="Final candidate" value={result.outOfFold?.finalCandidateSelection?.eligible ? "Eligible" : "Rejected by validation gates"} /></DetailSection>
    </div>
  );
};

const DetailSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="detail-section"><Typography variant="overline">{title}</Typography>{children}</section>
);

const DetailLine: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="detail-line"><span>{label}</span><strong>{value}</strong></div>
);

export default Workbench;
