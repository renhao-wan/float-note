import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize from 'rehype-sanitize';
import { invoke } from '@tauri-apps/api/core';

interface MarkdownRendererProps {
  content: string;
  syntaxHighlighting?: boolean;
  style?: React.CSSProperties;
  className?: string;
  onDoubleClick?: () => void;
  title?: string;
}

// Load image from local file system using Rust command
async function loadLocalImage(path: string): Promise<string> {
  try {
    console.log('[FLOATNOTE] Loading image from path:', path);
    // Call Rust command to read the image file and return as base64
    const base64Data = await invoke<string>('read_image_as_base64', { path });
    console.log('[FLOATNOTE] Image loaded successfully, data length:', base64Data.length);
    return base64Data;
  } catch (error) {
    console.error('[FLOATNOTE] Failed to load image:', error);
    throw error;
  }
}

// Cache for loaded images
const imageCache = new Map<string, string>();

function SafeImage({ src, alt }: { src?: string; alt?: string }) {
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>('');

  useEffect(() => {
    if (!src) {
      setImageSrc('');
      return;
    }

    // If it's a data URL or external URL, use as-is
    if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
      setImageSrc(src);
      return;
    }

    // If it's a relative path to attachments, load from local file system
    if (src.startsWith('./attachments/') || src.startsWith('attachments/')) {
      // Check cache first
      const cached = imageCache.get(src);
      if (cached) {
        setImageSrc(cached);
        return;
      }

      const loadImage = async () => {
        try {
          // Remove leading ./ if present
          const cleanPath = src.startsWith('./') ? src.substring(2) : src;
          // Load image using Rust command
          const base64Data = await loadLocalImage(cleanPath);
          // Cache the result
          imageCache.set(src, base64Data);
          setImageSrc(base64Data);
        } catch (error) {
          console.error('[FLOATNOTE] Failed to load local image:', error);
          setHasError(true);
        }
      };
      loadImage();
      return;
    }

    setImageSrc(src);
  }, [src]);

  if (hasError) {
    return <span className="text-muted-foreground text-sm italic">图片加载失败: {alt || src}</span>;
  }

  if (!imageSrc) {
    return <span className="text-muted-foreground text-sm italic">加载中...</span>;
  }

  return (
    <img
      src={imageSrc}
      alt={alt || ''}
      className="max-w-full h-auto rounded-lg my-4 shadow-lg"
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}

export function MarkdownRenderer({
  content,
  syntaxHighlighting = true,
  style,
  className = "w-full h-full overflow-y-auto scrollbar-hide prose prose-invert max-w-none prose-table:border-collapse prose-th:border prose-th:border-border/30 prose-th:bg-muted/30 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-td:border prose-td:border-border/30 prose-td:px-3 prose-td:py-2",
  onDoubleClick,
  title,
}: MarkdownRendererProps) {
  return (
    <div 
      className={className}
      onDoubleClick={onDoubleClick}
      title={title}
      style={style}
    >
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize, ...(syntaxHighlighting ? [rehypeHighlight] : [])]}
        components={{
          h1: ({children}) => <h1 className="text-2xl font-semibold mb-4 mt-6 first:mt-0 text-foreground">{children}</h1>,
          h2: ({children}) => <h2 className="text-xl font-semibold mb-3 mt-5 text-foreground">{children}</h2>,
          h3: ({children}) => <h3 className="text-lg font-semibold mb-2 mt-4 text-foreground">{children}</h3>,
          p: ({children}) => <p className="mb-4 leading-relaxed text-foreground">{children}</p>,
          blockquote: ({children}) => (
            <blockquote className="border-l-4 border-l-primary/60 bg-muted/20 pl-4 py-2 my-4 italic text-foreground">
              {children}
            </blockquote>
          ),
          code: ({node, children, ...props}: {node?: any, children?: React.ReactNode, className?: string}) => {
            // 判断是否为内联代码：检查父元素是否为 pre
            const isInline = !props.className || !props.className.includes('hljs');
            return isInline ? (
              <code className="bg-muted px-1.5 py-0.5 rounded-xl text-sm font-mono text-foreground" {...props}>{children}</code>
            ) : (
              <code className="block text-foreground" {...props}>{children}</code>
            );
          },
          pre: ({children}) => (
            <pre className="bg-muted/50 border border-border/30 rounded-2xl p-4 overflow-x-auto my-4 text-foreground">
              {children}
            </pre>
          ),
          ul: ({children}) => <ul className="list-disc list-inside mb-4 space-y-1 text-foreground">{children}</ul>,
          ol: ({children}) => <ol className="list-decimal list-inside mb-4 space-y-1 text-foreground">{children}</ol>,
          li: ({children}) => <li className="leading-relaxed">{children}</li>,
          a: ({href, children}) => {
            const safeHref = href && /^(https?:\/\/|mailto:|\/|#)/.test(href) ? href : '#';
            return <a href={safeHref} className="text-primary hover:underline font-medium" target="_blank" rel="noopener noreferrer">{children}</a>;
          },
          strong: ({children}) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({children}) => <em className="italic text-foreground">{children}</em>,
          hr: () => <hr className="border-border/30 my-6" />,
          table: ({children}) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-border/30">
                {children}
              </table>
            </div>
          ),
          th: ({children}) => (
            <th className="border border-border/30 bg-muted/30 px-3 py-2 text-left font-semibold text-foreground">
              {children}
            </th>
          ),
          td: ({children}) => (
            <td className="border border-border/30 px-3 py-2 text-foreground">{children}</td>
          ),
          img: ({src, alt}) => <SafeImage src={src} alt={alt} />,
          input: ({type, checked, ...props}) => (
            <input
              type={type}
              checked={checked}
              className="mr-2 rounded border-border accent-primary"
              readOnly
              {...props}
            />
          ),
          sup: ({children, ...props}) => (
            <sup className="text-primary font-medium" {...props}>
              {children}
            </sup>
          ),
          section: ({children, ...props}) => {
            // 检查是否为脚注部分
            const isFootnotes = (props as any)['data-footnotes'] === '';
            return isFootnotes ? (
              <section className="mt-8 pt-4 border-t border-border/30" {...props}>
                <h2 className="text-sm font-semibold text-muted-foreground mb-2">脚注</h2>
                {children}
              </section>
            ) : (
              <section {...props}>{children}</section>
            );
          },
          del: ({children}) => (
            <del className="line-through text-muted-foreground opacity-70">{children}</del>
          )
        }}
      >
        {content || '*Empty note*'}
      </ReactMarkdown>
    </div>
  );
}