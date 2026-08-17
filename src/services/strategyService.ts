import api from './api';

export interface StrategyConfig {
  strategyName: string;
  enabled: boolean;
  timeframe: string;
  priority: number;
}

export interface StrategyConfigRequest {
  strategyName: string;
  enabled: boolean;
  timeframe: string;
  priority: number;
}

class StrategyService {
  /**
   * Get all strategy configurations
   */
  async getAllStrategies(): Promise<StrategyConfig[]> {
    try {
      const response = await api.get('/strategy/strategies');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch strategies:', error);
      throw error;
    }
  }

  /**
   * Enable a strategy by name
   */
  async enableStrategy(strategyName: string): Promise<StrategyConfig> {
    try {
      const response = await api.put(`/strategy/strategies/${strategyName}/enable`);
      return response.data;
    } catch (error) {
      console.error(`Failed to enable strategy ${strategyName}:`, error);
      throw error;
    }
  }

  /**
   * Disable a strategy by name
   */
  async disableStrategy(strategyName: string): Promise<StrategyConfig> {
    try {
      const response = await api.put(`/strategy/strategies/${strategyName}/disable`);
      return response.data;
    } catch (error) {
      console.error(`Failed to disable strategy ${strategyName}:`, error);
      throw error;
    }
  }

  /**
   * Create a new strategy configuration
   */
  async createStrategy(strategyConfig: StrategyConfigRequest): Promise<StrategyConfig> {
    try {
      const response = await api.post('/strategy/strategies', strategyConfig);
      return response.data;
    } catch (error) {
      console.error('Failed to create strategy:', error);
      throw error;
    }
  }

  /**
   * Update strategy configuration
   */
  async updateStrategy(strategyName: string, strategyConfig: Partial<StrategyConfigRequest>): Promise<StrategyConfig> {
    try {
      const response = await api.put(`/strategy/strategies/${strategyName}`, strategyConfig);
      return response.data;
    } catch (error) {
      console.error(`Failed to update strategy ${strategyName}:`, error);
      throw error;
    }
  }

  /**
   * Delete a strategy
   */
  async deleteStrategy(strategyName: string): Promise<void> {
    try {
      await api.delete(`/strategy/strategies/${strategyName}`);
    } catch (error) {
      console.error(`Failed to delete strategy ${strategyName}:`, error);
      throw error;
    }
  }
}

export default new StrategyService();
