import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';

interface SplitViewProps {
  children: [React.ReactNode, React.ReactNode];
}

export const SplitView: React.FC<SplitViewProps> = ({ children }) => {
  const [leftWidth, setLeftWidth] = useState<number>(() => {
    const saved = localStorage.getItem('dm_split_left_width');
    return saved ? Math.min(Math.max(parseFloat(saved), 30), 70) : 50;
  });

  const [isRightCollapsed, setIsRightCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('dm_split_right_collapsed') === 'true';
  });

  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const startDragging = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (isRightCollapsed) return;
    setIsDragging(true);
  }, [isRightCollapsed]);

  const toggleRightCollapse = useCallback(() => {
    setIsRightCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('dm_split_right_collapsed', String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      let newPercent = (offsetX / rect.width) * 100;

      // Restrict between 30% and 70%
      if (newPercent < 30) newPercent = 30;
      if (newPercent > 70) newPercent = 70;

      setLeftWidth(newPercent);
      localStorage.setItem('dm_split_left_width', newPercent.toFixed(1));
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const [leftChild, rightChild] = children;

  return (
    <div ref={containerRef} className="flex h-full w-full overflow-hidden relative">
      {/* Левая панель */}
      <div
        style={{
          width: isRightCollapsed ? '100%' : `${leftWidth}%`,
          transition: isDragging ? 'none' : 'width 0.2s ease-out',
        }}
        className="h-full overflow-hidden flex flex-col"
      >
        {leftChild}
      </div>

      {/* Ресайзер с кнопкой свернуть/развернуть */}
      <div
        className={`relative z-20 flex items-center justify-center shrink-0 w-2.5 bg-dm-panelAlt border-x border-dm-border hover:bg-dm-accent/40 transition-colors ${
          isRightCollapsed ? 'cursor-default' : 'cursor-col-resize'
        } ${isDragging ? 'bg-dm-accent/50' : ''}`}
        onMouseDown={startDragging}
        title={isRightCollapsed ? 'Панель свернута' : 'Перетащите для изменения размера'}
      >
        {/* Ручка захвата */}
        {!isRightCollapsed && (
          <GripVertical className="w-3 h-3 text-dm-textSubtle pointer-events-none" />
        )}

        {/* Кнопка быстрого схлопывания/восстановления в 1 клик */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleRightCollapse();
          }}
          className="absolute top-1/2 -translate-y-1/2 -left-3 w-6 h-9 rounded-md bg-dm-card border border-dm-border flex items-center justify-center text-dm-textMuted hover:text-dm-text hover:bg-dm-cardHover hover:border-dm-accent transition-all shadow-md z-30"
          title={isRightCollapsed ? 'Развернуть правую панель' : 'Свернуть правую панель (фокус на бой)'}
        >
          {isRightCollapsed ? (
            <ChevronLeft className="w-4 h-4 text-dm-accent" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Правая панель */}
      <div
        style={{
          width: isRightCollapsed ? '0%' : `${100 - leftWidth}%`,
          display: isRightCollapsed ? 'none' : 'flex',
          transition: isDragging ? 'none' : 'width 0.2s ease-out',
        }}
        className="h-full overflow-hidden flex-col bg-dm-panel"
      >
        {rightChild}
      </div>
    </div>
  );
};

