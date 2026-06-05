/**
 * 透明度策略接口
 * 定义平台特定的透明度控制方法
 */
export interface TransparencyStrategy {
  /**
   * 设置窗口透明度
   * @param windowLabel 窗口标签（Tauri 窗口标识）
   * @param opacity 透明度值（0.2-1.0）
   */
  setOpacity(windowLabel: string, opacity: number): Promise<void>;

  /**
   * 获取窗口透明度
   * @param windowLabel 窗口标签
   * @returns 当前透明度值
   */
  getOpacity(windowLabel: string): Promise<number>;

  /**
   * 检查当前平台是否支持系统级透明
   */
  isSupported(): boolean;

  /**
   * 获取平台名称（用于日志和调试）
   */
  getPlatformName(): string;
}

/**
 * 透明度配置
 */
export interface TransparencyConfig {
  /** 透明度范围 */
  range: {
    min: number;  // 0.2
    max: number;  // 1.0
    step: number; // 0.1
  };
  /** 默认透明度 */
  defaultOpacity: number;  // 0.9
}

/**
 * 窗口透明度状态
 */
export interface WindowOpacityState {
  windowLabel: string;
  opacity: number;
  isCustom: boolean;  // 是否覆盖全局默认值
}