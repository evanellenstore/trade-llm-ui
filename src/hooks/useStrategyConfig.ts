import { useState, useCallback, useEffect } from 'react';
import strategyService, { StrategyConfig, StrategyConfigRequest } from '../services/strategyService';

interface UseStrategyConfigResult {
  strategies: StrategyConfig[];
  loading: boolean;
  error: string | null;
  loadStrategies: () => Promise<void>;
  createStrategy: (config: StrategyConfigRequest) => Promise<void>;
  updateStrategy: (strategyName: string, config: Partial<StrategyConfigRequest>) => Promise<void>;
  deleteStrategy: (strategyName: string) => Promise<void>;
  enableStrategy: (strategyName: string) => Promise<void>;
  disableStrategy: (strategyName: string) => Promise<void>;
  toggleStrategy: (strategy: StrategyConfig) => Promise<void>;
  clearError: () => void;
}

/**
 * Custom hook for managing strategy configuration state and operations
 * Provides a centralized interface for all strategy-related API calls
 */
export const useStrategyConfig = (): UseStrategyConfigResult => {
  const [strategies, setStrategies] = useState<StrategyConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load all strategies from the backend
   */
  const loadStrategies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await strategyService.getAllStrategies();
      setStrategies(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load strategies';
      setError(errorMessage);
      console.error('Error loading strategies:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new strategy
   */
  const createStrategy = useCallback(async (config: StrategyConfigRequest) => {
    try {
      setError(null);
      await strategyService.createStrategy(config);
      await loadStrategies();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create strategy';
      setError(errorMessage);
      console.error('Error creating strategy:', err);
      throw err;
    }
  }, [loadStrategies]);

  /**
   * Update an existing strategy
   */
  const updateStrategy = useCallback(async (strategyName: string, config: Partial<StrategyConfigRequest>) => {
    try {
      setError(null);
      await strategyService.updateStrategy(strategyName, config);
      await loadStrategies();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update strategy';
      setError(errorMessage);
      console.error('Error updating strategy:', err);
      throw err;
    }
  }, [loadStrategies]);

  /**
   * Delete a strategy
   */
  const deleteStrategy = useCallback(async (strategyName: string) => {
    try {
      setError(null);
      await strategyService.deleteStrategy(strategyName);
      await loadStrategies();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete strategy';
      setError(errorMessage);
      console.error('Error deleting strategy:', err);
      throw err;
    }
  }, [loadStrategies]);

  /**
   * Enable a specific strategy
   */
  const enableStrategy = useCallback(async (strategyName: string) => {
    try {
      setError(null);
      await strategyService.enableStrategy(strategyName);
      await loadStrategies();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enable strategy';
      setError(errorMessage);
      console.error('Error enabling strategy:', err);
      throw err;
    }
  }, [loadStrategies]);

  /**
   * Disable a specific strategy
   */
  const disableStrategy = useCallback(async (strategyName: string) => {
    try {
      setError(null);
      await strategyService.disableStrategy(strategyName);
      await loadStrategies();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disable strategy';
      setError(errorMessage);
      console.error('Error disabling strategy:', err);
      throw err;
    }
  }, [loadStrategies]);

  /**
   * Toggle strategy enabled/disabled status
   */
  const toggleStrategy = useCallback(async (strategy: StrategyConfig) => {
    if (strategy.enabled) {
      await disableStrategy(strategy.strategyName);
    } else {
      await enableStrategy(strategy.strategyName);
    }
  }, [enableStrategy, disableStrategy]);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Load strategies on mount
   */
  useEffect(() => {
    loadStrategies();
  }, [loadStrategies]);

  return {
    strategies,
    loading,
    error,
    loadStrategies,
    createStrategy,
    updateStrategy,
    deleteStrategy,
    enableStrategy,
    disableStrategy,
    toggleStrategy,
    clearError
  };
};

export default useStrategyConfig;
