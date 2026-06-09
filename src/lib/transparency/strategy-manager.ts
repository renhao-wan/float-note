import { TransparencyStrategy, WindowOpacityState } from './types';
import { TRANSPARENCY_CONFIG } from './constants';
import { MacOSTransparencyStrategy } from './strategies/macos';
import { WindowsTransparencyStrategy } from './strategies/windows';
import { LinuxTransparencyStrategy } from './strategies/linux';

/**
 * 检测当前平台
 * 使用 userAgent 替代已废弃的 navigator.platform
 * @returns 平台标识：'macos' | 'windows' | 'linux' | 'unknown'
 */
function detectPlatform(): 'macos' | 'windows' | 'linux' | 'unknown' {
  // 优先使用 navigator.userAgent（更可靠）
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('mac') || ua.includes('darwin')) return 'macos';
    if (ua.includes('win')) return 'windows';
    if (ua.includes('linux')) return 'linux';
  }

  // 回退到 navigator.platform（兼容旧代码）
  if (typeof navigator !== 'undefined' && navigator.platform) {
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('mac')) return 'macos';
    if (platform.includes('win')) return 'windows';
    if (platform.includes('linux')) return 'linux';
  }

  return 'unknown';
}

/**
 * 透明度范围验证函数
 * @param opacity 待验证的透明度值
 * @returns 验证后的透明度值（在有效范围内）
 */
export function validateOpacityRange(opacity: number): number {
  return Math.max(
    TRANSPARENCY_CONFIG.range.min,
    Math.min(TRANSPARENCY_CONFIG.range.max, opacity)
  );
}

/**
 * 透明度策略管理器
 * 负责管理平台策略实例，提供统一的透明度控制 API
 */
export class TransparencyStrategyManager {
  private strategy: TransparencyStrategy;
  private opacityStates: Map<string, WindowOpacityState> = new Map();

  constructor() {
    this.strategy = this.createStrategy();
  }

  /**
   * 根据当前平台创建策略实例
   */
  private createStrategy(): TransparencyStrategy {
    const platform = detectPlatform();

    if (platform === 'macos') {
      return new MacOSTransparencyStrategy();
    } else if (platform === 'windows') {
      return new WindowsTransparencyStrategy();
    } else if (platform === 'linux') {
      return new LinuxTransparencyStrategy();
    }

    // 默认回退到 macOS 策略（开发环境）
    console.warn(
      '[TRANSPARENCY] Unknown platform, falling back to macOS strategy'
    );
    return new MacOSTransparencyStrategy();
  }

  /**
   * 设置窗口透明度
   * @param windowLabel 窗口标签
   * @param opacity 透明度值（0.2-1.0）
   */
  async setOpacity(windowLabel: string, opacity: number): Promise<void> {
    // 验证透明度范围
    const clampedOpacity = validateOpacityRange(opacity);

    // 调用平台策略
    await this.strategy.setOpacity(windowLabel, clampedOpacity);

    // 更新状态
    this.opacityStates.set(windowLabel, {
      windowLabel,
      opacity: clampedOpacity,
      isCustom: clampedOpacity !== TRANSPARENCY_CONFIG.defaultOpacity,
    });
  }

  /**
   * 获取窗口透明度
   * @param windowLabel 窗口标签
   * @returns 当前透明度值
   */
  async getOpacity(windowLabel: string): Promise<number> {
    const state = this.opacityStates.get(windowLabel);
    if (state) {
      return state.opacity;
    }

    // 尝试从策略层获取实际透明度
    try {
      const actualOpacity = await this.strategy.getOpacity(windowLabel);
      if (actualOpacity !== undefined && actualOpacity !== null) {
        // 缓存结果
        this.opacityStates.set(windowLabel, {
          windowLabel,
          opacity: actualOpacity,
          isCustom: actualOpacity !== TRANSPARENCY_CONFIG.defaultOpacity,
        });
        return actualOpacity;
      }
    } catch {
      // 策略层不支持查询，回退到默认值
    }

    return TRANSPARENCY_CONFIG.defaultOpacity;
  }

  /**
   * 获取窗口透明度状态
   * @param windowLabel 窗口标签
   * @returns 窗口透明度状态
   */
  getWindowState(windowLabel: string): WindowOpacityState | null {
    return this.opacityStates.get(windowLabel) || null;
  }

  /**
   * 检查是否支持系统级透明
   * @returns 是否支持
   */
  isSupported(): boolean {
    return this.strategy.isSupported();
  }

  /**
   * 获取当前平台名称
   * @returns 平台名称
   */
  getPlatformName(): string {
    return this.strategy.getPlatformName();
  }

  /**
   * 重置窗口透明度为默认值
   * @param windowLabel 窗口标签
   */
  async resetOpacity(windowLabel: string): Promise<void> {
    await this.setOpacity(windowLabel, TRANSPARENCY_CONFIG.defaultOpacity);
  }

  /**
   * 获取所有窗口的透明度状态
   * @returns 窗口透明度状态数组
   */
  getAllWindowStates(): WindowOpacityState[] {
    return Array.from(this.opacityStates.values());
  }
}

// 懒加载单例
let _transparencyManager: TransparencyStrategyManager | null = null;

/**
 * 获取透明度策略管理器单例
 * 使用懒加载避免 SSR 环境问题
 */
export function getTransparencyManager(): TransparencyStrategyManager {
  if (!_transparencyManager) {
    _transparencyManager = new TransparencyStrategyManager();
  }
  return _transparencyManager;
}

// 保持向后兼容的导出（仅在浏览器环境创建）
export const transparencyManager =
  typeof window !== 'undefined' ? getTransparencyManager() : null;
