import { ReactNode } from 'react';

interface WindowWrapperProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function WindowWrapper({ children, className = '', style }: WindowWrapperProps) {
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