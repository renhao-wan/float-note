import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NoteTemplate } from '../../types/template';
import { templatesApi } from '../../services/templates-api';
import { toast } from '../../stores/toast-store';

interface TemplateSelectorProps {
  onSelect: (template: NoteTemplate) => void;
  onCreateEmpty: () => void;
  onClose: () => void;
}

export function TemplateSelector({ onSelect, onCreateEmpty, onClose }: TemplateSelectorProps) {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<NoteTemplate | null>(null);

  // Load templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const data = await templatesApi.getAllTemplates();
        setTemplates(data);
      } catch (error) {
        console.error('[FLOATNOTE] Failed to load templates:', error);
        toast.error(t('templates.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplates();
  }, [t]);

  const handleSelect = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate);
    }
  };

  // Group templates by builtin/custom
  const builtinTemplates = templates.filter(t => t.is_builtin);
  const customTemplates = templates.filter(t => !t.is_builtin);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border/30 rounded-lg shadow-xl w-[480px] max-h-[60vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
          <h2 className="text-lg font-medium text-foreground">
            {t('templates.selectTemplate')}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Template list */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground/60 py-8">
              {t('common.loading')}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Empty note option */}
              <div>
                <h3 className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wide mb-2">
                  {t('templates.quickStart')}
                </h3>
                <button
                  onClick={onCreateEmpty}
                  className="w-full text-left p-3 rounded-lg border border-border/30 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/60">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="12" y1="18" x2="12" y2="12"/>
                      <line x1="9" y1="15" x2="15" y2="15"/>
                    </svg>
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {t('templates.blankNote')}
                      </div>
                      <div className="text-xs text-muted-foreground/60 mt-0.5">
                        {t('templates.blankNoteDescription')}
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              {/* Builtin templates */}
              {builtinTemplates.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wide mb-2">
                    {t('templates.builtin')}
                  </h3>
                  <div className="space-y-2">
                    {builtinTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedTemplate?.id === template.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border/30 hover:border-primary/50 hover:bg-primary/5'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-foreground">
                              {template.name}
                            </div>
                            <div className="text-xs text-muted-foreground/60 mt-1">
                              {template.description}
                            </div>
                          </div>
                          {selectedTemplate?.id === template.id && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                              <polyline points="20,6 9,17 4,12"/>
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom templates */}
              {customTemplates.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wide mb-2">
                    {t('templates.custom')}
                  </h3>
                  <div className="space-y-2">
                    {customTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedTemplate?.id === template.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border/30 hover:border-primary/50 hover:bg-primary/5'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-foreground">
                              {template.name}
                            </div>
                            <div className="text-xs text-muted-foreground/60 mt-1">
                              {template.description}
                            </div>
                          </div>
                          {selectedTemplate?.id === template.id && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                              <polyline points="20,6 9,17 4,12"/>
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/30">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedTemplate}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            {t('templates.useTemplate')}
          </button>
        </div>
      </div>
    </div>
  );
}
