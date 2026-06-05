import { TransparencyStrategy } from './types';

/**
 * 透明度策略管理器
 * 负责管理不同平台的透明度策略实现
 */
export class TransparencyStrategyManager {
  private strategy: TransparencyStrategy | null = null;

  /**
   * 设置透明度策略
   * @param strategy 平台特定的透明度策略
   */
  setStrategy(strategy: TransparencyStrategy): void {
    this.strategy = strategy;
  }

  /**
   * 获取当前策略
   * @returns 当前透明度策略
   */
  getStrategy(): TransparencyStrategy | null {
    return this.strategy;
  }

  /**
   * 检查是否已设置策略
   */
  hasStrategy(): boolean {
    return this.strategy !== null;
  }
}

/**
 * 全局透明度策略管理器实例
 */
export const transparencyManager = new TransparencyStrategyManager();