import { useEffect, useState } from 'react';
import { useToastStore, Toast } from '../../stores/toast-store';

// Toast 类型对应的图标
const icons: Record<Toast['type'], React.ReactNode> = {
  success: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  warning: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

// Toast 类型对应的颜色
const typeColors: Record<Toast['type'], string> = {
  success: 'text-emerald-400',
  error: 'text-destructive',
  warning: 'text-amber-400',
  info: 'text-primary',
};

// 单个 Toast 组件
function ToastItem({ toast }: { toast: Toast }) {
  const { dismiss } = useToastStore();
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // 进入动画
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => dismiss(toast.id), 200);
  };

  // 自动消失
  useEffect(() => {
    if (toast.duration === Infinity) return;
    const timer = setTimeout(() => {
      handleDismiss();
    }, toast.duration || 3000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration]);

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 min-w-[280px] max-w-[400px]
        bg-card/95 backdrop-blur-sm border border-border/30 rounded-xl
        shadow-lg shadow-black/20
        transition-all duration-200 ease-out
        ${isVisible && !isLeaving ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
      onClick={handleDismiss}
    >
      <span className={`flex-shrink-0 ${typeColors[toast.type]}`}>
        {icons[toast.type]}
      </span>
      <span className="text-sm text-foreground/90 flex-1">{toast.message}</span>
      <button
        className="flex-shrink-0 text-muted-foreground/50 hover:text-foreground/70 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss();
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

// Toast 容器组件
export function ToastContainer() {
  const { toasts } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col-reverse gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
