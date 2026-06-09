import { TransparencyConfig } from './types';

/**
 * 透明度配置常量
 */
export const TRANSPARENCY_CONFIG: TransparencyConfig = {
  range: {
    min: 0.2,
    max: 1.0,
    step: 0.1,
  },
  defaultOpacity: 0.9,
};

/**
 * 透明度存储键名
 */
export const OPACITY_STORAGE_KEY = 'detached-window-opacity';
