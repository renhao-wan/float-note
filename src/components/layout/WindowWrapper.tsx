import { ReactNode } from 'react';
import { useConfigStore } from '../../stores/config-store';

interface WindowWrapperProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function WindowWrapper({ children, className = '', style }: WindowWrapperProps) {
  const { config } = useConfigStore();
  
  // Defensive check for config
  if (!config) {
    return (
      <div
        className={`w-full h-full text-foreground flex flex-col rounded-lg overflow-hidden border border-border/30 shadow-elegant ${className}`}
        style={{
          backgroundColor: `hsl(var(--background))`,
          height: '100%',
          ...style,
        }}
      >
        {children}
      </div>
    );
  }
  
  const windowOpacity = config.appearance?.detachedWindowOpacity;
  
  return (
    <div
      className={`w-full h-full text-foreground flex flex-col rounded-lg overflow-hidden border border-border/30 shadow-elegant ${className}`}
      style={{
        backgroundColor: windowOpacity !== undefined
          ? `hsl(var(--background) / ${windowOpacity})`
          : `hsl(var(--background))`,
        height: '100%',
        ...style,
      }}
    >
      {children}
    </div>
  );
}