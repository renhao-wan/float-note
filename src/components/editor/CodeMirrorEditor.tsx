import { useEffect, useRef, useCallback } from 'react';
import { EditorView, keymap, ViewUpdate, placeholder } from '@codemirror/view';
import { EditorState, Extension, Compartment } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { defaultKeymap, indentWithTab, history, historyKeymap } from '@codemirror/commands';
import { vim, getCM, Vim } from '@replit/codemirror-vim';
import { listen } from '@tauri-apps/api/event';
import { readText } from '@tauri-apps/plugin-clipboard-manager';

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  onVimStatusChange?: (status: { mode: string; subMode?: string }) => void;
  placeholder?: string;
  vimMode?: boolean;
  fontSize?: number;
  fontFamily?: string;
  lineHeight?: number;
  className?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
  typewriterMode?: boolean;
  wordWrap?: boolean;
}

export function CodeMirrorEditor({
  value,
  onChange,
  onSave,
  onVimStatusChange,
  placeholder: placeholderText = 'Start typing...',
  vimMode = false,
  fontSize = 15,
  fontFamily = 'system-ui',
  lineHeight = 1.6,
  className = '',
  readOnly = false,
  autoFocus = false,
  typewriterMode = false,
  wordWrap = true,
}: CodeMirrorEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onVimStatusChangeRef = useRef(onVimStatusChange);
  onVimStatusChangeRef.current = onVimStatusChange;

  // Compartment for theme (font, size, etc.)
  const themeCompartment = useRef(new Compartment());
  // Compartment for vim mode
  const vimCompartment = useRef(new Compartment());
  // Compartment for typewriter mode
  const typewriterCompartment = useRef(new Compartment());
  // Compartment for word wrap
  const wordWrapCompartment = useRef(new Compartment());
  // Compartment for read-only
  const readOnlyCompartment = useRef(new Compartment());

  // Create the editor theme
  const createTheme = useCallback(() => {
    return EditorView.theme({
      '&': {
        height: '100%',
        fontSize: `${fontSize}px`,
        fontFamily: fontFamily,
        backgroundColor: 'hsl(var(--background))',
      },
      '.cm-content': {
        padding: '20px',
        lineHeight: `${lineHeight}`,
        caretColor: '#5a9e96 !important',
        backgroundColor: 'transparent',
      },
      '.cm-focused': {
        outline: 'none',
      },
      '.cm-editor': {
        height: '100%',
        outline: 'none',
        backgroundColor: 'hsl(var(--card) / 0.3)',
        borderRadius: '0',
        caretColor: '#5a9e96 !important',
      },
      '.cm-editor.cm-focused': {
        outline: 'none',
        backgroundColor: 'hsl(var(--card) / 0.4)',
        caretColor: '#5a9e96 !important',
      },
      '.cm-scroller': {
        fontFamily: fontFamily,
        fontSize: `${fontSize}px`,
        lineHeight: `${lineHeight}`,
        backgroundColor: 'transparent',
        caretColor: '#5a9e96 !important',
        scrollbarWidth: 'none',
      },
      '.cm-placeholder': {
        color: 'var(--muted-foreground)',
        opacity: 0.4,
      },
      '.cm-gutters': {
        display: 'none',
      },
      '.cm-content.typewriter-mode': {
        paddingTop: '50vh',
        paddingBottom: '50vh',
      },
      '.cm-selectionBackground': {
        backgroundColor: 'var(--primary)' + '30',
      },
      '.cm-focused .cm-selectionBackground': {
        backgroundColor: 'var(--primary)' + '40',
      },
      '.cm-cursor, .cm-cursor-primary': {
        visibility: 'visible !important',
        borderLeft: '2px solid #5a9e96 !important',
        caretColor: '#5a9e96 !important',
      },
      '.cm-searchMatch': {
        backgroundColor: 'var(--primary)' + '30',
        outline: '1px solid ' + 'var(--primary)' + '50',
      },
      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: 'var(--primary)' + '60',
      },
    });
  }, [fontSize, fontFamily, lineHeight]);

  // Create vim extensions
  const createVimExtensions = useCallback((enabled: boolean): Extension[] => {
    if (!enabled) return [];

    return [
      vim(),
      EditorView.editorAttributes.of({ class: 'cm-vim-mode' }),
      keymap.of([{
        key: 'Delete',
        run: (view) => {
          const cm = getCM(view);
          if (cm && cm.state.vim && !cm.state.vim.insertMode) return true;
          return false;
        }
      }]),
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (!update.view.hasFocus) return;
        const cm = getCM(update.view);
        if (!cm?.state?.vim) return;

        const vimState = cm.state.vim;
        const mode = vimState.insertMode ? 'INSERT' :
                     vimState.visualMode ? 'VISUAL' : 'NORMAL';

        onVimStatusChangeRef.current?.({ mode, subMode: vimState.status });

        const editorDom = update.view.dom;
        editorDom.classList.remove('cm-vim-insert-mode', 'cm-vim-visual-mode', 'cm-vim-normal-mode', 'cm-vim-visual-line');

        if (vimState.insertMode) {
          editorDom.classList.add('cm-vim-insert-mode');
        } else if (vimState.visualMode) {
          editorDom.classList.add('cm-vim-visual-mode');
          if (vimState.visualLine) editorDom.classList.add('cm-vim-visual-line');
        } else {
          editorDom.classList.add('cm-vim-normal-mode');
        }
      }),
    ];
  }, []);

  // Create typewriter extensions
  const createTypewriterExtensions = useCallback((enabled: boolean): Extension[] => {
    if (!enabled) return [];

    return [
      EditorView.contentAttributes.of({ class: 'typewriter-mode' }),
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.selectionSet || update.docChanged) {
          requestAnimationFrame(() => {
            const head = update.view.state.selection.main.head;
            const coords = update.view.coordsAtPos(head);
            if (coords) {
              const scroller = update.view.scrollDOM;
              const scrollerRect = scroller.getBoundingClientRect();
              const targetY = scrollerRect.height / 2;
              const currentY = coords.top - scrollerRect.top;
              scroller.scrollTo({
                top: scroller.scrollTop + (currentY - targetY),
                behavior: 'smooth',
              });
            }
          });
        }
      }),
    ];
  }, []);

  // Initialize editor - runs once on mount
  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    const extensions: Extension[] = [
      themeCompartment.current.of(createTheme()),
      vimCompartment.current.of(createVimExtensions(vimMode)),
      typewriterCompartment.current.of(createTypewriterExtensions(typewriterMode)),
      wordWrapCompartment.current.of(wordWrap ? EditorView.lineWrapping : []),
      readOnlyCompartment.current.of(EditorState.readOnly.of(readOnly)),
      markdown(),
      history(),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        indentWithTab,
        { key: 'Cmd-s', run: () => { onSaveRef.current?.(); return true; } },
      ]),
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
      EditorView.contentAttributes.of({
        'aria-label': 'Note editor',
        'aria-multiline': 'true',
        'role': 'textbox',
      }),
    ];

    if (placeholderText) {
      extensions.push(placeholder(placeholderText));
    }

    const startState = EditorState.create({ doc: value, extensions });
    const view = new EditorView({ state: startState, parent: editorRef.current });
    viewRef.current = view;

    if (vimMode) {
      Vim.defineEx('write', 'w', () => onSaveRef.current?.());
      Vim.defineEx('wq', 'wq', () => onSaveRef.current?.());
    }

    if (autoFocus) view.focus();

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Paste listener - set up once
  useEffect(() => {
    const unlistenPromise = listen('menu-paste', async () => {
      try {
        const text = await readText();
        if (text && viewRef.current) {
          const view = viewRef.current;
          const cm = getCM(view);
          if (cm?.state?.vim && !cm.state.vim.insertMode) {
            view.dispatch({
              changes: { from: view.state.selection.main.head, insert: text }
            });
          } else {
            view.dispatch({
              changes: {
                from: view.state.selection.main.from,
                to: view.state.selection.main.to,
                insert: text
              }
            });
          }
        }
      } catch (err) {
        console.error('[FLOATNOTE] Failed to paste:', err);
      }
    });
    return () => { unlistenPromise.then(fn => fn()); };
  }, []);

  // Update content when value prop changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentValue = view.state.doc.toString();
    if (currentValue !== value) {
      view.dispatch({
        changes: { from: 0, to: currentValue.length, insert: value },
      });
    }
  }, [value]);

  // Update theme compartment when appearance settings change
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: themeCompartment.current.reconfigure(createTheme()),
    });
  }, [createTheme]);

  // Update vim compartment when vimMode changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: vimCompartment.current.reconfigure(createVimExtensions(vimMode)),
    });
    if (vimMode) {
      Vim.defineEx('write', 'w', () => onSaveRef.current?.());
      Vim.defineEx('wq', 'wq', () => onSaveRef.current?.());
    }
  }, [vimMode, createVimExtensions]);

  // Update typewriter compartment when typewriterMode changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: typewriterCompartment.current.reconfigure(createTypewriterExtensions(typewriterMode)),
    });
  }, [typewriterMode, createTypewriterExtensions]);

  // Update word wrap compartment
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: wordWrapCompartment.current.reconfigure(wordWrap ? EditorView.lineWrapping : []),
    });
  }, [wordWrap]);

  // Update read-only compartment
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: readOnlyCompartment.current.reconfigure(EditorState.readOnly.of(readOnly)),
    });
  }, [readOnly]);

  return (
    <div
      ref={editorRef}
      className={`h-full w-full overflow-x-hidden ${className}`}
      style={{
        '--primary': 'hsl(var(--primary))',
        '--background': 'hsl(var(--background))',
        '--foreground': 'hsl(var(--foreground))',
        '--muted-foreground': 'hsl(var(--muted-foreground))',
        '--border': 'hsl(var(--border))',
        '--cursor-normal': '#3b82f6',
        '--cursor-insert': '#10b981',
        '--cursor-visual': '#8b5cf6',
        '--cursor-command': '#f59e0b',
      } as React.CSSProperties}
    />
  );
}
