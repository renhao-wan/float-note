import { invoke } from '@tauri-apps/api/core';
import { TransparencyStrategy } from '../types';

/**
 * macOS 透明度策略
 * 使用 NSWindow.setAlphaValue API 实现系统级透明
 */
export class MacOSTransparencyStrategy implements TransparencyStrategy {
  /**
   * 设置窗口透明度
   * @param windowLabel 窗口标签
   * @param opacity 透明度值（0.2-1.0）
   */
  async setOpacity(windowLabel: string, opacity: number): Promise<void> {
    try {
      await invoke('set_detached_window_opacity_macos', {
        windowLabel,
        opacity,
      });
    } catch (error) {
      console.error('[MACOS_TRANSPARENCY] Failed to set opacity:', error);
      throw error;
    }
  }

  /**
   * 获取窗口透明度
   * @param windowLabel 窗口标签
   * @returns 当前透明度值
   */
  async getOpacity(windowLabel: string): Promise<number> {
    try {
      const opacity = await invoke<number>('get_detached_window_opacity_macos', {
        windowLabel,
      });
      return opacity;
    } catch (error) {
      console.error('[MACOS_TRANSPARENCY] Failed to get opacity:', error);
      return 1.0; // 默认不透明
    }
  }

  /**
   * 检查是否支持系统级透明
   * @returns true（macOS 原生支持）
   */
  isSupported(): boolean {
    return true;
  }

  /**
   * 获取平台名称
   * @returns 'macOS'
   */
  getPlatformName(): string {
    return 'macOS';
  }
}
