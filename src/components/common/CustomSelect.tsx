import { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  className?: string;
}

export function CustomSelect({ value, options, onChange, className = '' }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownWidth, setDropdownWidth] = useState<number | undefined>(undefined);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      setDropdownWidth(buttonRef.current.offsetWidth);
    }
  }, [isOpen]);

  return (
    <div ref={selectRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2 py-1.5 bg-card/30 border border-border/30 rounded-lg text-foreground text-xs focus:outline-none focus:border-primary/40 hover:bg-card/50 transition-colors cursor-pointer font-mono flex items-center justify-between gap-1"
      >
        <span className="truncate">{selectedOption?.label || '-'}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="M6 8l4 4 4-4" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 bg-card border border-border/30 rounded-lg shadow-elegant overflow-hidden z-50 max-h-48 overflow-y-auto"
          style={{ width: dropdownWidth }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-2 py-1.5 text-xs text-left transition-colors whitespace-nowrap ${
                option.value === value
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground hover:bg-card/50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
