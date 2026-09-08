import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Campaign, SessionNote } from '../../types';
import { 
  Plus, Trash2, Edit3, Eye, Columns, 
  Bold, Italic, Heading1, Heading2, List, Quote, Table 
} from 'lucide-react';
import { MarkdownViewer } from '../Common/MarkdownViewer';

interface SessionNotesProps {
  currentCampaign: Campaign | null;
}

export const SessionNotes: React.FC<SessionNotesProps> = ({ currentCampaign }) => {
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [viewMode, setViewMode] = useState<'preview' | 'edit' | 'split'>('preview');
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const notes = useLiveQuery(
    () => currentCampaign ? db.sessionNotes.where('campaignId').equals(currentCampaign.id).reverse().sortBy('updatedAt') : [],
    [currentCampaign?.id]
  );

  useEffect(() => {
    if (!activeNoteId && notes && notes.length > 0) {
      handleSelectNote(notes[0]);
    }
  }, [notes, activeNoteId]);

  if (!currentCampaign) {
    return <div className="p-4 text-dm-textMuted text-sm">Выберите или создайте кампанию для создания заметок.</div>;
  }

  const handleSelectNote = (note: SessionNote) => {
    setActiveNoteId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
  };

  const handleCreateNote = async () => {
    const newNote: SessionNote = {
      id: crypto.randomUUID(),
      campaignId: currentCampaign.id,
      title: 'Новая заметка',
      content: '# Новая заметка\n\n- [ ] Цель квеста\n- [ ] Награда\n\n### Заметки мастера:\n> В таверне сидит таинственный незнакомец...',
      updatedAt: Date.now()
    };
    await db.sessionNotes.add(newNote);
    handleSelectNote(newNote);
    setViewMode('split');
  };

  const handleUpdateNote = async (title: string, content: string) => {
    if (!activeNoteId) return;
    setEditTitle(title);
    setEditContent(content);
    await db.sessionNotes.update(activeNoteId, {
      title: title.trim() || 'Без названия',
      content,
      updatedAt: Date.now()
    });
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await db.sessionNotes.delete(id);
    setDeletingNoteId(null);
    if (activeNoteId === id) {
      setActiveNoteId(null);
      setEditTitle('');
      setEditContent('');
    }
  };

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('notes-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = editContent.substring(start, end);
    const replacement = `${prefix}${selected || 'текст'}${suffix}`;
    const newContent = editContent.substring(0, start) + replacement + editContent.substring(end);
    
    handleUpdateNote(editTitle, newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected.length || 5));
    }, 50);
  };

  const activeNote = notes?.find(n => n.id === activeNoteId);

  return (
    <div className="flex flex-col h-full bg-dm-bg rounded-lg border border-dm-border overflow-hidden relative">
      {/* Top Bar with Note Tabs */}
      <div className="flex items-center gap-2 p-2 bg-dm-panel border-b border-dm-border overflow-x-auto custom-scrollbar shrink-0">
        <button
          onClick={handleCreateNote}
          className="flex items-center gap-1 shrink-0 px-3 py-1.5 rounded-md bg-dm-success/15 text-dm-success hover:bg-dm-success/25 transition-colors border border-dm-success/30 text-xs font-semibold"
          title="Создать новую заметку с поддержкой Markdown"
        >
          <Plus className="w-3.5 h-3.5" />
          Новая заметка
        </button>
        <div className="w-px h-6 bg-dm-border mx-1 shrink-0" />
        
        {notes?.map(note => {
          const isSelected = activeNoteId === note.id;
          const isDeleting = deletingNoteId === note.id;

          return (
            <div 
              key={note.id}
              onClick={() => handleSelectNote(note)}
              className={`flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors border ${
                isSelected 
                  ? 'bg-dm-card border-dm-accent text-dm-text' 
                  : 'bg-dm-panelAlt border-dm-border text-dm-textMuted hover:border-dm-textMuted hover:text-dm-text'
              }`}
            >
              <span className="max-w-[120px] truncate">{note.title}</span>

              {isDeleting ? (
                <div className="flex items-center gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleDeleteNote(note.id, e)}
                    className="text-[9px] px-1 rounded bg-dm-danger text-white font-bold hover:bg-dm-dangerHover"
                  >
                    Да
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeletingNoteId(null); }}
                    className="text-[9px] px-0.5 text-dm-textMuted"
                  >
                    Нет
                  </button>
                </div>
              ) : (
                <button 
                  onClick={(e) => { e.stopPropagation(); setDeletingNoteId(note.id); }}
                  className="text-dm-textSubtle hover:text-dm-danger p-0.5 rounded transition-colors ml-0.5"
                  title="Удалить заметку"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Main Note Editor & Markdown Area */}
      <div className="flex-1 overflow-hidden flex flex-col p-3">
        {activeNote ? (
          <div className="flex flex-col h-full gap-2">
            {/* Note Header & View Mode Switcher */}
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-dm-border shrink-0">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => handleUpdateNote(e.target.value, editContent)}
                className="bg-dm-bg border border-dm-border rounded px-3 py-1 text-base font-bold text-dm-text focus:outline-none focus:border-dm-accent flex-1"
                placeholder="Заголовок заметки..."
              />

              {/* View Mode Controls: Preview | Edit | Split */}
              <div className="flex items-center gap-1 bg-dm-card p-1 rounded-md border border-dm-border shrink-0">
                <button
                  onClick={() => setViewMode('preview')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                    viewMode === 'preview'
                      ? 'bg-dm-accent text-white font-semibold shadow'
                      : 'text-dm-textMuted hover:text-dm-text'
                  }`}
                  title="Только просмотр Markdown"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Просмотр</span>
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                    viewMode === 'split'
                      ? 'bg-dm-accent text-white font-semibold shadow'
                      : 'text-dm-textMuted hover:text-dm-text'
                  }`}
                  title="Сплит: редактор слева, превью справа"
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>Сплит</span>
                </button>
                <button
                  onClick={() => setViewMode('edit')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                    viewMode === 'edit'
                      ? 'bg-dm-accent text-white font-semibold shadow'
                      : 'text-dm-textMuted hover:text-dm-text'
                  }`}
                  title="Только редактор Markdown"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Редактор</span>
                </button>
              </div>
            </div>

            {/* Markdown Quick Toolbar (visible in edit or split mode) */}
            {(viewMode === 'edit' || viewMode === 'split') && (
              <div className="flex items-center gap-1 py-1 px-2 bg-dm-panel rounded border border-dm-border text-xs shrink-0 overflow-x-auto custom-scrollbar">
                <span className="text-[10px] text-dm-textMuted mr-1 font-semibold uppercase">MD:</span>
                <button
                  onClick={() => insertMarkdown('**', '**')}
                  className="p-1 rounded hover:bg-dm-card text-dm-textMuted hover:text-dm-text"
                  title="Жирный (**текст**)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertMarkdown('*', '*')}
                  className="p-1 rounded hover:bg-dm-card text-dm-textMuted hover:text-dm-text"
                  title="Курсив (*текст*)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-3.5 bg-dm-border mx-0.5" />
                <button
                  onClick={() => insertMarkdown('# ')}
                  className="p-1 rounded hover:bg-dm-card text-dm-textMuted hover:text-dm-text"
                  title="Заголовок 1 (# текст)"
                >
                  <Heading1 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertMarkdown('## ')}
                  className="p-1 rounded hover:bg-dm-card text-dm-textMuted hover:text-dm-text"
                  title="Заголовок 2 (## текст)"
                >
                  <Heading2 className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-3.5 bg-dm-border mx-0.5" />
                <button
                  onClick={() => insertMarkdown('- ')}
                  className="p-1 rounded hover:bg-dm-card text-dm-textMuted hover:text-dm-text"
                  title="Список (- пункт)"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertMarkdown('> ')}
                  className="p-1 rounded hover:bg-dm-card text-dm-textMuted hover:text-dm-text"
                  title="Цитата (> текст)"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertMarkdown('| Колонка 1 | Колонка 2 |\n|---|---|\n| Данные 1 | Данные 2 |\n')}
                  className="p-1 rounded hover:bg-dm-card text-dm-textMuted hover:text-dm-text"
                  title="Таблица"
                >
                  <Table className="w-3.5 h-3.5" />
                </button>
                <span className="ml-auto text-[10px] text-dm-textSubtle">Автосохранение</span>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex gap-3">
              {/* Editor Pane */}
              {(viewMode === 'edit' || viewMode === 'split') && (
                <div className="flex-1 h-full flex flex-col">
                  <textarea
                    id="notes-textarea"
                    value={editContent}
                    onChange={(e) => handleUpdateNote(editTitle, e.target.value)}
                    className="flex-1 bg-dm-bg border border-dm-border rounded-lg p-3 text-xs text-dm-text resize-none focus:outline-none focus:border-dm-accent custom-scrollbar font-mono leading-relaxed"
                    placeholder="Пишите заметки с разметкой Markdown (# заголовок, **жирный**, - списки, > цитаты)..."
                  />
                </div>
              )}

              {/* Preview Pane */}
              {(viewMode === 'preview' || viewMode === 'split') && (
                <div className="flex-1 h-full overflow-y-auto bg-dm-panel p-4 rounded-lg border border-dm-border custom-scrollbar">
                  {editContent ? (
                    <MarkdownViewer content={editContent} />
                  ) : (
                    <div className="text-dm-textSubtle italic text-xs">
                      Заметка пуста. Переключитесь в режим «Редактор» или «Сплит» для ввода текста.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-dm-textMuted text-xs">
            Выберите заметку из списка или создайте новую.
          </div>
        )}
      </div>
    </div>
  );
};
