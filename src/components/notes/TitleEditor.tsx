import { useState, useEffect, useRef } from 'react';

interface TitleEditorProps {
  title: string;
  onTitleChange: (title: string) => void | Promise<void>;
  className?: string;
  placeholder?: string;
}

export function TitleEditor({
  title,
  onTitleChange,
  className = "",
  placeholder = "Untitled"
}: TitleEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditValue(title);
  }, [title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditValue(title);
  };

  const handleSaveEdit = async () => {
    const finalTitle = editValue.trim() || placeholder;
    if (finalTitle !== title) {
      await onTitleChange(finalTitle);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditValue(title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const displayTitle = title.trim() || placeholder;

  return (
    <div ref={containerRef} className="relative group/title">
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSaveEdit}
          onKeyDown={handleKeyDown}
          className={`bg-transparent border-b-2 border-primary/50 outline-none w-full ${className}`}
          placeholder={placeholder}
        />
      ) : (
        <div
          onClick={handleStartEdit}
          className={`cursor-text rounded transition-colors ${className} ${
            !title.trim() ? 'text-muted-foreground/60 italic' : ''
          }`}
          title="Click to edit title"
        >
          <span className="truncate block">{displayTitle}</span>
          {/* Edit indicator on hover */}
          <svg
            className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover/title:opacity-50 transition-opacity w-3.5 h-3.5 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </div>
      )}
    </div>
  );
}