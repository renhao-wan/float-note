import { useState, useEffect, useCallback } from 'react';
import { Slider } from '../ui/Slider';
import { Eye, EyeOff } from '../../lib/lucide';
import { transparencyManager } from '../../lib/transparency';
import { TRANSPARENCY_CONFIG } from '../../lib/transparency/constants';
import { useTranslation } from 'react-i18next';

interface DetachedWindowOpacitySliderProps {
  windowLabel: string;
  initialOpacity?: number;
  onOpacityChange?: (opacity: number) => void;
}

export const DetachedWindowOpacitySlider = ({
  windowLabel,
  initialOpacity = TRANSPARENCY_CONFIG.defaultOpacity,
  onOpacityChange,
}: DetachedWindowOpacitySliderProps) => {
  const { t } = useTranslation();
  const [opacity, setOpacity] = useState(initialOpacity);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // 应用透明度到窗口
  const applyOpacity = useCallback(async (value: number) => {
    try {
      await transparencyManager.setOpacity(windowLabel, value);
      setOpacity(value);
      onOpacityChange?.(value);
    } catch (error) {
      console.error('[OPACITY_SLIDER] Failed to apply opacity:', error);
    }
  }, [windowLabel, onOpacityChange]);

  // 处理滑块变化
  const handleSliderChange = useCallback((value: number[]) => {
    const newOpacity = value[0];
    setOpacity(newOpacity); // 立即更新 UI

    // 防抖：停止拖动 100ms 后才应用透明度
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      applyOpacity(newOpacity);
    }, 100);

    setDebounceTimer(timer);
  }, [debounceTimer, applyOpacity]);

  // 初始化时加载当前透明度
  useEffect(() => {
    const loadOpacity = async () => {
      const currentOpacity = await transparencyManager.getOpacity(windowLabel);
      setOpacity(currentOpacity);
    };
    loadOpacity();
  }, [windowLabel]);

  // 清理防抖定时器
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return (
    <div className="flex items-center gap-2 px-2">
      {/* 透明度图标 */}
      <div className="flex items-center">
        {opacity < 0.8 ? (
          <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>

      {/* 透明度滑块 */}
      <div className="w-20">
        <Slider
          value={[opacity]}
          onValueChange={handleSliderChange}
          min={TRANSPARENCY_CONFIG.range.min}
          max={TRANSPARENCY_CONFIG.range.max}
          step={TRANSPARENCY_CONFIG.range.step}
          className="w-full"
        />
      </div>

      {/* 透明度百分比 */}
      <span className="text-xs text-muted-foreground min-w-[2.5rem] text-right">
        {Math.round(opacity * 100)}%
      </span>
    </div>
  );
};
