import { useMemo, useState } from 'react';
import {
  parseMarkdownBlocks,
  resolveRelativeFileHref,
  tokenizeInlineMarkdown,
} from '../markdownParser';
import { copyTextToClipboard } from '../scrollbackSelection';
import Icon from './Icons';

function renderInlineTokens(tokens, onOpenFileLink, baseFilePath = '', keyPrefix = 'in') {
  if (!Array.isArray(tokens) || tokens.length === 0) return null;
  return tokens.map((tok, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (tok.type === 'text') {
      return tok.value;
    }
    if (tok.type === 'code') {
      return (
        <code key={key} className="md-inline-code">
          {tok.value}
        </code>
      );
    }
    if (tok.type === 'file_link') {
      const lineBadge =
        tok.line && !tok.label.includes(`#L${tok.line}`) && !tok.label.includes(`:${tok.line}`)
          ? `:${tok.line}`
          : '';
      return (
        <button
          key={key}
          type="button"
          className="md-file-link"
          onClick={() => onOpenFileLink?.(tok.path, tok.line, tok.endLine)}
          title={`Open in Files pane: ${tok.path}${tok.line ? ` (line ${tok.line})` : ''}`}
        >
          <Icon name="files" size={11} />
          <span>
            {tok.label}
            {lineBadge}
          </span>
        </button>
      );
    }
    if (tok.type === 'rel_link') {
      const resolved = resolveRelativeFileHref(tok.href, baseFilePath);
      if (resolved && onOpenFileLink) {
        return (
          <button
            key={key}
            type="button"
            className="md-file-link"
            onClick={() => onOpenFileLink(resolved.path, resolved.line, resolved.endLine)}
            title={`Open linked file: ${resolved.path}`}
          >
            <Icon name="files" size={11} />
            <span>{tok.label}</span>
          </button>
        );
      }
      return tok.label;
    }
    if (tok.type === 'ext_link') {
      return (
        <a
          key={key}
          href={tok.href}
          target="_blank"
          rel="noopener noreferrer"
          className="md-ext-link"
        >
          {renderInlineTokens(tok.children, onOpenFileLink, baseFilePath, `${key}-l`)}
        </a>
      );
    }
    if (tok.type === 'bold_italic') {
      return (
        <strong key={key}>
          <em>{renderInlineTokens(tok.children, onOpenFileLink, baseFilePath, `${key}-bi`)}</em>
        </strong>
      );
    }
    if (tok.type === 'bold') {
      return (
        <strong key={key}>
          {renderInlineTokens(tok.children, onOpenFileLink, baseFilePath, `${key}-b`)}
        </strong>
      );
    }
    if (tok.type === 'strike') {
      return (
        <del key={key}>
          {renderInlineTokens(tok.children, onOpenFileLink, baseFilePath, `${key}-s`)}
        </del>
      );
    }
    if (tok.type === 'italic') {
      return (
        <em key={key}>
          {renderInlineTokens(tok.children, onOpenFileLink, baseFilePath, `${key}-i`)}
        </em>
      );
    }
    return tok.value || null;
  });
}

function renderInlineText(text, onOpenFileLink, baseFilePath, keyPrefix) {
  return renderInlineTokens(tokenizeInlineMarkdown(text), onOpenFileLink, baseFilePath, keyPrefix);
}

function CodeBlockCard({ lang, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyTextToClipboard(code);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <div className="md-code-card">
      <div className="md-code-hdr">
        <span>{(lang || 'code').toUpperCase()}</span>
        <button
          type="button"
          className={`md-code-copy-btn ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
          title="Copy code block"
        >
          <Icon name={copied ? 'check' : 'copyText'} size={11} />
          <span>{copied ? 'COPIED' : 'COPY'}</span>
        </button>
      </div>
      <pre className="md-code-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderBlockNodes(blocks, onOpenFileLink, baseFilePath = '', keyPrefix = 'md') {
  return blocks.map((blk, bIdx) => {
    const key = `${keyPrefix}-${bIdx}`;
    if (blk.type === 'code') {
      return <CodeBlockCard key={key} lang={blk.lang} code={blk.code} />;
    }
    if (blk.type === 'hr') {
      return <hr key={key} className="md-hr" />;
    }
    if (blk.type === 'heading') {
      const Tag = `h${Math.min(6, Math.max(1, blk.level))}`;
      return (
        <Tag key={key} className={`md-heading md-h${blk.level}`}>
          {renderInlineText(blk.text, onOpenFileLink, baseFilePath, key)}
        </Tag>
      );
    }
    if (blk.type === 'blockquote') {
      return (
        <blockquote key={key} className="md-blockquote">
          {renderInlineText(blk.text, onOpenFileLink, baseFilePath, key)}
        </blockquote>
      );
    }
    if (blk.type === 'table') {
      return (
        <div key={key} className="md-table-wrap">
          <table className="md-table">
            <thead>
              <tr>
                {blk.headers.map((hCell, cIdx) => (
                  <th key={`${key}-th-${cIdx}`}>
                    {renderInlineText(hCell, onOpenFileLink, baseFilePath, `${key}-th-${cIdx}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {blk.rows.map((rCells, rIdx) => (
                <tr key={`${key}-tr-${rIdx}`}>
                  {rCells.map((cell, cIdx) => (
                    <td key={`${key}-td-${rIdx}-${cIdx}`}>
                      {renderInlineText(cell, onOpenFileLink, baseFilePath, `${key}-td-${rIdx}-${cIdx}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (blk.type === 'list') {
      const ListTag = blk.ordered ? 'ol' : 'ul';
      return (
        <ListTag
          key={key}
          className={`md-list ${blk.ordered ? 'md-ol' : 'md-ul'}`}
          start={blk.ordered && blk.start !== 1 ? blk.start : undefined}
        >
          {blk.items.map((item, iIdx) => (
            <li key={`${key}-li-${iIdx}`} className="md-li">
              <div>
                {renderInlineText(
                  item.textLines.join(' '),
                  onOpenFileLink,
                  baseFilePath,
                  `${key}-li-${iIdx}`
                )}
              </div>
              {Array.isArray(item.subBlocks) && item.subBlocks.length > 0 && (
                <div className="ld-markdown-body">
                  {renderBlockNodes(item.subBlocks, onOpenFileLink, baseFilePath, `${key}-sub-${iIdx}`)}
                </div>
              )}
            </li>
          ))}
        </ListTag>
      );
    }
    return (
      <p key={key} className="md-p">
        {blk.lines.map((ln, lIdx) => (
          <span key={`${key}-ln-${lIdx}`}>
            {lIdx > 0 && <br />}
            {renderInlineText(ln, onOpenFileLink, baseFilePath, `${key}-ln-${lIdx}`)}
          </span>
        ))}
      </p>
    );
  });
}

export default function MarkdownBody({ content, fontSize = 14, baseFilePath = '', onOpenFileLink }) {
  const blocks = useMemo(() => parseMarkdownBlocks(content), [content]);
  if (blocks.length === 0) return null;

  return (
    <div className="ld-markdown-body" style={{ fontSize: `${fontSize}px` }}>
      {renderBlockNodes(blocks, onOpenFileLink, baseFilePath, 'md')}
    </div>
  );
}
