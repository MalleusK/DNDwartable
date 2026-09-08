import React, { useMemo } from 'react';
import { marked } from 'marked';

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content, className = '' }) => {
  const html = useMemo(() => {
    if (!content) return '';
    try {
      // Pre-process shorthands:
      // >> text -> > [!READ] text (Read aloud for players)
      // >! text -> > [!DM] text (Secret notes for DM)
      const preprocessed = content
        .split('\n')
        .map(line => {
          if (/^\s*>>\s*(.*)$/.test(line)) {
            return line.replace(/^\s*>>\s*(.*)$/, '> [!READ] $1');
          }
          if (/^\s*>!\s*(.*)$/.test(line)) {
            return line.replace(/^\s*>!\s*(.*)$/, '> [!DM] $1');
          }
          return line;
        })
        .join('\n');

      let parsed = marked.parse(preprocessed, {
        gfm: true,
        breaks: true,
      }) as string;

      // Post-process callouts into distinctive stylized blockquotes:
      // 1. Read-aloud callout (Golden / Amber parchment style)
      parsed = parsed.replace(
        /<blockquote>\s*<p>\[!(READ|SAY|ЗАЧИТАТЬ|ИГРОКАМ)\](?:\s*<br\s*\/?>)?\s*/gi,
        '<blockquote class="callout-read-aloud"><div class="callout-badge callout-badge-read"><span class="icon">🗣️</span> ЗАЧИТАТЬ ИГРОКАМ</div><p>'
      );

      // 2. DM Secret callout (Purple / Mystic DM-only notes)
      parsed = parsed.replace(
        /<blockquote>\s*<p>\[!(DM|SECRET|МАСТЕРУ|СЕКРЕТ)\](?:\s*<br\s*\/?>)?\s*/gi,
        '<blockquote class="callout-dm-secret"><div class="callout-badge callout-badge-dm"><span class="icon">🤫</span> ДЛЯ МАСТЕРА</div><p>'
      );

      return parsed;
    } catch (err) {
      console.error('Markdown parse error:', err);
      return content;
    }
  }, [content]);

  return (
    <div
      className={`markdown-content prose prose-invert max-w-none text-dm-text text-sm leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
