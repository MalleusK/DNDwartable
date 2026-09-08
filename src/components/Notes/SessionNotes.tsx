import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Campaign, SessionNote } from '../../types';

import { Plus, Trash2, Edit3, Save, X } from 'lucide-react';

interface SessionNotesProps {
  currentCampaign: Campaign | null;
}

export const SessionNotes: React.FC<SessionNotesProps> = ({ currentCampaign }) => {
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

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
    setIsEditing(false);
  };

  const handleCreateNote = async () => {
    const newNote: SessionNote = {
      id: crypto.randomUUID(),
      campaignId: currentCampaign.id,
      title: 'Новая заметка',
      content: '',
      updatedAt: Date.now()
    };
    await db.sessionNotes.add(newNote);
    handleSelectNote(newNote);
    setIsEditing(true);
  };

  const handleSaveNote = async () => {
    if (!activeNoteId) return;
    await db.sessionNotes.update(activeNoteId, {
      title: editTitle.trim() || 'Без названия',
      content: editContent,
      updatedAt: Date.now()
    });
    setIsEditing(false);
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Удалить заметку?')) {
      await db.sessionNotes.delete(id);
      if (activeNoteId === id) {
        setActiveNoteId(null);
        setEditTitle('');
        setEditContent('');
        setIsEditing(false);
      }
    }
  };

  const activeNote = notes?.find(n => n.id === activeNoteId);

  return (
    <div className="flex flex-col h-full bg-dm-bg rounded-lg border border-dm-border overflow-hidden relative">
      
      {/* Список заметок (сверху или слева - сделаем сверху для компактности, если заметок немного, либо выпадающим списком. Сделаем горизонтальный скролл) */}
      <div className="flex items-center gap-2 p-2 bg-dm-panel border-b border-dm-border overflow-x-auto custom-scrollbar shrink-0">
        <button
          onClick={handleCreateNote}
          className="flex items-center gap-1 shrink-0 px-3 py-1.5 rounded-md bg-dm-success/10 text-dm-success hover:bg-dm-success/20 transition-colors border border-dm-success/30 text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          Создать
        </button>
        <div className="w-px h-6 bg-dm-border mx-1 shrink-0" />
        
        {notes?.map(note => (
          <div 
            key={note.id}
            onClick={() => handleSelectNote(note)}
            className={`flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors border ${
              activeNoteId === note.id 
                ? 'bg-dm-card border-dm-accent text-dm-text' 
                : 'bg-dm-panelAlt border-dm-border text-dm-textMuted hover:border-dm-textMuted hover:text-dm-text'
            }`}
          >
            <span className="max-w-[120px] truncate">{note.title}</span>
            <button 
              onClick={(e) => handleDeleteNote(note.id, e)}
              className="text-dm-textSubtle hover:text-dm-danger p-0.5 rounded"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Область редактирования / просмотра */}
      <div className="flex-1 overflow-hidden flex flex-col p-4">
        {activeNote ? (
          isEditing ? (
            <div className="flex flex-col h-full gap-3">
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="bg-dm-bg border border-dm-border rounded px-3 py-1.5 text-lg font-bold text-dm-text focus:outline-none focus:border-dm-accent flex-1"
                  placeholder="Заголовок..."
                />
                <div className="flex gap-2 ml-4">
                  <button onClick={() => setIsEditing(false)} className="p-2 rounded bg-dm-card text-dm-textMuted hover:text-dm-text border border-dm-border">
                    <X className="w-4 h-4" />
                  </button>
                  <button onClick={handleSaveNote} className="p-2 rounded bg-dm-accent text-white hover:bg-dm-accentHover border border-dm-accent shadow-lg shadow-dm-accent/20">
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="flex-1 bg-dm-bg border border-dm-border rounded-lg p-3 text-sm text-dm-text resize-none focus:outline-none focus:border-dm-accent custom-scrollbar font-mono leading-relaxed"
                placeholder="Заметки мастера (Markdown не поддерживается, просто текст)..."
              />
            </div>
          ) : (
            <div className="flex flex-col h-full gap-4">
              <div className="flex items-center justify-between border-b border-dm-border pb-2 shrink-0">
                <h3 className="text-lg font-bold text-dm-text">{activeNote.title}</h3>
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-dm-card hover:bg-dm-cardHover text-dm-textMuted hover:text-dm-text border border-dm-border text-xs transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Редактировать
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar prose prose-sm prose-invert max-w-none">
                {activeNote.content ? (
                  <p className="whitespace-pre-wrap leading-relaxed text-dm-text text-sm">{activeNote.content}</p>
                ) : (
                  <div className="text-dm-textSubtle italic text-sm">Заметка пуста.</div>
                )}
              </div>
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-full text-dm-textMuted text-sm">
            Выберите заметку из списка или создайте новую.
          </div>
        )}
      </div>
    </div>
  );
};

