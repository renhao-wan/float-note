import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NoteTemplate, CreateTemplateRequest } from '../../types/template';
import { templatesApi } from '../../services/templates-api';
import { toast } from '../../stores/toast-store';

interface TemplatePanelProps {
  onSelectTemplate: (template: NoteTemplate) => void;
  selectedTemplateId?: string | null;
  onTemplateSelect?: (template: NoteTemplate | null) => void;
}

export function TemplatePanel({ onSelectTemplate: _onSelectTemplate, selectedTemplateId, onTemplateSelect }: TemplatePanelProps) {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NoteTemplate | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formContent, setFormContent] = useState('');

  // Load templates
  const loadTemplates = async () => {
    try {
      const data = await templatesApi.getAllTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('[FLOATNOTE] Failed to load templates:', error);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // Reset form
  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormContent('');
    setIsCreating(false);
    setEditingTemplate(null);
  };

  // Start creating new template
  const handleStartCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  // Start editing template
  const handleStartEdit = (template: NoteTemplate) => {
    setFormName(template.name);
    setFormDescription(template.description);
    setFormContent(template.content);
    setEditingTemplate(template);
    setIsCreating(true);
  };

  // Save template (create or update)
  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error(t('templates.nameRequired'));
      return;
    }

    try {
      const request: CreateTemplateRequest = {
        name: formName.trim(),
        description: formDescription.trim(),
        content: formContent,
      };

      if (editingTemplate) {
        // Update existing template
        await templatesApi.updateTemplate(editingTemplate.id, request);
        toast.success(t('templates.updateSuccess'));
      } else {
        // Create new template
        await templatesApi.createTemplate(request);
        toast.success(t('templates.createSuccess'));
      }

      // Reload templates and reset form
      const data = await templatesApi.getAllTemplates();
      setTemplates(data);
      resetForm();
    } catch (error) {
      console.error('[FLOATNOTE] Failed to save template:', error);
      toast.error(editingTemplate ? t('templates.updateFailed') : t('templates.createFailed'));
    }
  };

  // Delete template
  const handleDelete = async (template: NoteTemplate) => {
    if (!window.confirm(t('templates.confirmDelete', { name: template.name }))) {
      return;
    }

    try {
      await templatesApi.deleteTemplate(template.id);
      toast.success(t('templates.deleteSuccess'));
      // Reload templates
      const data = await templatesApi.getAllTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('[FLOATNOTE] Failed to delete template:', error);
      toast.error(t('templates.deleteFailed'));
    }
  };

  // Group templates
  const builtinTemplates = templates.filter(t => t.is_builtin);
  const customTemplates = templates.filter(t => !t.is_builtin);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-[76px] flex flex-col justify-center px-4 border-b border-border/20 pt-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 pt-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary/80">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <h2 className="text-sm font-medium text-foreground/90">{t('sidebar.templates')}</h2>
          </div>
          <button
            onClick={handleStartCreate}
            className="text-muted-foreground hover:text-primary p-1 rounded-md transition-all duration-200 hover:bg-primary/10"
            title={t('templates.createTemplate')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isCreating ? (
          /* Template Editor Form */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">
                {editingTemplate ? t('templates.editTemplate') : t('templates.createTemplate')}
              </h3>
              <button
                onClick={resetForm}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Name */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                {t('templates.name')} *
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t('templates.namePlaceholder')}
                className="w-full px-3 py-2 text-sm bg-background/60 border border-border/30 rounded-lg focus:outline-none focus:border-primary/40"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                {t('templates.description')}
              </label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder={t('templates.descriptionPlaceholder')}
                className="w-full px-3 py-2 text-sm bg-background/60 border border-border/30 rounded-lg focus:outline-none focus:border-primary/40"
              />
            </div>

            {/* Content */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                {t('templates.content')}
              </label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder={t('templates.contentPlaceholder')}
                rows={10}
                className="w-full px-3 py-2 text-sm bg-background/60 border border-border/30 rounded-lg focus:outline-none focus:border-primary/40 resize-none font-mono"
              />
            </div>

            {/* Variables hint */}
            <div className="bg-muted/10 rounded-lg p-3 text-xs text-muted-foreground/60">
              <div className="font-medium mb-1">{t('templates.variables')}:</div>
              <div className="font-mono space-y-0.5">
                <div>{'{{title}}'} - {t('templates.varTitle')}</div>
                <div>{'{{date}}'} - {t('templates.varDate')}</div>
                <div>{'{{time}}'} - {t('templates.varTime')}</div>
                <div>{'{{datetime}}'} - {t('templates.varDatetime')}</div>
                <div>{'{{weekday}}'} - {t('templates.varWeekday')}</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                {t('common.save')}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border/30 rounded-lg transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
          /* Template List */
          <div className="space-y-4">
            {/* Builtin templates */}
            {builtinTemplates.length > 0 && (
              <div>
                <h3 className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wide mb-2 px-1">
                  {t('templates.builtin')}
                </h3>
                <div className="space-y-0.5">
                  {builtinTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => onTemplateSelect?.(template)}
                      className={`w-full text-left p-2.5 rounded-lg transition-colors ${
                        selectedTemplateId === template.id
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-primary/5 border border-transparent'
                      }`}
                    >
                      <div className="text-sm text-foreground/80">
                        {template.name}
                      </div>
                      {template.description && (
                        <div className="text-[10px] text-muted-foreground/50 mt-0.5 truncate">
                          {template.description}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom templates */}
            <div>
              <h3 className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wide mb-2 px-1">
                {t('templates.custom')}
              </h3>
              {customTemplates.length === 0 ? (
                <div className="text-xs text-muted-foreground/40 text-center py-4">
                  {t('templates.noCustomTemplates')}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {customTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg transition-colors group ${
                        selectedTemplateId === template.id
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-primary/5 border border-transparent'
                      }`}
                    >
                      <button
                        onClick={() => onTemplateSelect?.(template)}
                        className="flex-1 text-left"
                      >
                        <div className="text-sm text-foreground/80">
                          {template.name}
                        </div>
                        {template.description && (
                          <div className="text-[10px] text-muted-foreground/50 mt-0.5 truncate">
                            {template.description}
                          </div>
                        )}
                      </button>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(template);
                          }}
                          className="p-1 text-muted-foreground/40 hover:text-primary transition-colors"
                          title={t('common.edit')}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(template);
                          }}
                          className="p-1 text-muted-foreground/40 hover:text-red-500 transition-colors"
                          title={t('common.delete')}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
