import React, { useMemo } from 'react';
import {
  parseReleaseNotes,
  cleanReleaseNotesText,
  type FormattedInline,
  type ReleaseBlock,
} from '../utils/release-notes-parser';

export interface ReleaseNotesRendererProps {
  content?: string;
  isLight?: boolean;
  className?: string;
}

function renderInlines(inlines: FormattedInline[], isLight?: boolean): React.ReactNode {
  return inlines.map((item, idx) => {
    switch (item.type) {
      case 'bold':
        return (
          <strong
            key={idx}
            className={`font-semibold ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}
          >
            {item.content}
          </strong>
        );
      case 'italic':
        return (
          <em key={idx} className="italic">
            {item.content}
          </em>
        );
      case 'code':
        return (
          <code
            key={idx}
            className={`px-1 py-0.5 rounded text-[11px] font-mono ${
              isLight ? 'bg-slate-200 text-slate-800' : 'bg-zinc-800 text-zinc-200'
            }`}
          >
            {item.content}
          </code>
        );
      case 'link':
        return (
          <a
            key={idx}
            href={item.url || '#'}
            onClick={(e) => {
              e.preventDefault();
              if (item.url) {
                window.open(item.url, '_blank', 'noopener,noreferrer');
              }
            }}
            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline font-medium cursor-pointer"
            title={item.url}
          >
            {item.content}
          </a>
        );
      case 'text':
      default:
        return <span key={idx}>{item.content}</span>;
    }
  });
}

function renderBlock(block: ReleaseBlock, index: number, isLight?: boolean): React.ReactNode {
  switch (block.type) {
    case 'heading': {
      if (block.level === 1) {
        return (
          <h2
            key={index}
            className={`text-sm font-bold tracking-tight mt-2.5 mb-1 flex items-center gap-1.5 ${
              isLight ? 'text-blue-600' : 'text-blue-400'
            }`}
          >
            {renderInlines(block.inlines, isLight)}
          </h2>
        );
      }
      if (block.level === 2) {
        return (
          <h3
            key={index}
            className={`text-xs font-bold mt-2.5 mb-1 ${
              isLight ? 'text-slate-900' : 'text-zinc-100'
            }`}
          >
            {renderInlines(block.inlines, isLight)}
          </h3>
        );
      }
      if (block.level === 3) {
        return (
          <h4
            key={index}
            className={`text-xs font-semibold mt-2 mb-0.5 ${
              isLight ? 'text-slate-800' : 'text-zinc-200'
            }`}
          >
            {renderInlines(block.inlines, isLight)}
          </h4>
        );
      }
      return (
        <h5
          key={index}
          className={`text-[11px] font-semibold mt-1.5 mb-0.5 ${
            isLight ? 'text-slate-700' : 'text-zinc-300'
          }`}
        >
          {renderInlines(block.inlines, isLight)}
        </h5>
      );
    }

    case 'paragraph': {
      return (
        <p
          key={index}
          className={`text-xs leading-relaxed mb-2 ${
            isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'
          }`}
        >
          {renderInlines(block.inlines, isLight)}
        </p>
      );
    }

    case 'divider': {
      return (
        <hr
          key={index}
          className={`my-2.5 border-t ${
            isLight ? 'border-slate-200' : 'border-[#27272a]'
          }`}
        />
      );
    }

    case 'list': {
      const ListTag = block.ordered ? 'ol' : 'ul';
      return (
        <ListTag
          key={index}
          className={`space-y-1 mb-2 text-xs pl-4 leading-relaxed ${
            block.ordered ? 'list-decimal' : 'list-disc'
          } ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}
        >
          {block.items.map((item, itemIdx) => (
            <li key={itemIdx}>{renderInlines(item, isLight)}</li>
          ))}
        </ListTag>
      );
    }

    case 'codeblock': {
      return (
        <pre
          key={index}
          className={`p-2.5 rounded-lg font-mono text-[11px] overflow-x-auto my-2 border ${
            isLight
              ? 'bg-slate-100 border-slate-200 text-slate-800'
              : 'bg-black/40 border-zinc-800 text-zinc-200'
          }`}
        >
          <code>{block.content}</code>
        </pre>
      );
    }

    default:
      return null;
  }
}

export function ReleaseNotesRenderer({
  content = '',
  isLight = false,
  className = '',
}: ReleaseNotesRendererProps) {
  const blocks = useMemo(() => {
    return parseReleaseNotes(content);
  }, [content]);

  if (!content || !content.trim()) {
    return null;
  }

  // Se por alguma razão o parser não identificou blocos (ex.: texto plano curto sem marcações)
  if (blocks.length === 0) {
    const fallbackText = cleanReleaseNotesText(content);
    return (
      <div
        className={`text-xs leading-relaxed whitespace-pre-wrap ${
          isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'
        } ${className}`}
      >
        {fallbackText}
      </div>
    );
  }

  return (
    <div
      className={`space-y-0.5 text-xs select-text ${
        isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'
      } ${className}`}
    >
      {blocks.map((block, idx) => renderBlock(block, idx, isLight))}
    </div>
  );
}

