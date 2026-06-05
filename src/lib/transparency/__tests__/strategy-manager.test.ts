import { TransparencyStrategyManager } from '../strategy-manager';
import { TRANSPARENCY_CONFIG } from '../constants';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

describe('TransparencyStrategyManager', () => {
  let manager: TransparencyStrategyManager;

  beforeEach(() => {
    // Mock navigator.platform for consistent strategy selection
    Object.defineProperty(navigator, 'platform', {
      value: 'MacIntel',
      writable: true,
      configurable: true,
    });

    manager = new TransparencyStrategyManager();
  });

  describe('setOpacity', () => {
    it('should clamp opacity to valid range', async () => {
      const windowLabel = 'test-window';

      // 测试低于最小值
      await manager.setOpacity(windowLabel, 0.1);
      const opacity1 = await manager.getOpacity(windowLabel);
      expect(opacity1).toBe(TRANSPARENCY_CONFIG.range.min);

      // 测试高于最大值
      await manager.setOpacity(windowLabel, 1.5);
      const opacity2 = await manager.getOpacity(windowLabel);
      expect(opacity2).toBe(TRANSPARENCY_CONFIG.range.max);

      // 测试正常值
      await manager.setOpacity(windowLabel, 0.7);
      const opacity3 = await manager.getOpacity(windowLabel);
      expect(opacity3).toBe(0.7);
    });

    it('should update window state', async () => {
      const windowLabel = 'test-window';

      await manager.setOpacity(windowLabel, 0.8);
      const state = manager.getWindowState(windowLabel);

      expect(state).toEqual({
        windowLabel,
        opacity: 0.8,
        isCustom: true,
      });
    });

    it('should handle default opacity correctly', async () => {
      const windowLabel = 'test-window';

      await manager.setOpacity(windowLabel, TRANSPARENCY_CONFIG.defaultOpacity);
      const state = manager.getWindowState(windowLabel);

      expect(state?.isCustom).toBe(false);
    });
  });

  describe('getOpacity', () => {
    it('should return default opacity for unknown window', async () => {
      const opacity = await manager.getOpacity('unknown-window');
      expect(opacity).toBe(TRANSPARENCY_CONFIG.defaultOpacity);
    });
  });

  describe('resetOpacity', () => {
    it('should reset to default opacity', async () => {
      const windowLabel = 'test-window';

      await manager.setOpacity(windowLabel, 0.5);
      await manager.resetOpacity(windowLabel);

      const opacity = await manager.getOpacity(windowLabel);
      expect(opacity).toBe(TRANSPARENCY_CONFIG.defaultOpacity);
    });
  });
});
