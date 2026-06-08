interface TagBadgeProps {
  name: string;
  color?: string;
  size?: 'sm' | 'md';
  removable?: boolean;
  onRemove?: (tagName: string) => void;
  onClick?: (tagName: string) => void;
}

export function TagBadge({
  name,
  color,
  size = 'sm',
  removable = false,
  onRemove,
  onClick,
}: TagBadgeProps) {
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
  };

  const bgColor = color || 'var(--color-primary)';
  const bgOpacity = '15%';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-mono transition-colors ${
        sizeClasses[size]
      } ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
      style={{
        backgroundColor: `${bgColor}${bgOpacity}`,
        color: bgColor,
        border: `1px solid ${bgColor}30`,
      }}
      onClick={() => onClick?.(name)}
    >
      <span className="truncate max-w-[100px]">{name}</span>
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(name);
          }}
          className="ml-0.5 hover:opacity-70 transition-opacity"
          title={`Remove tag: ${name}`}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </span>
  );
}
