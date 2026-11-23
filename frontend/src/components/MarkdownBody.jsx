import { useState } from 'react';
import { copyTextToClipboard } from '../scrollbackSelection';
import Icon from './Icons';

const FILE_URI_HASH_RE = /^#L(\d+)(?:-L?(\d+))?$/i;

export function parseFileUriTarget(rawHref) {
  const trimmed = String(rawHref || '').trim();
  if (!trimmed.toLowerCase().startsWith('file://')) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'file:') return null;
    let filePath = decodeURIComponent(parsed.pathname || '');
    // Normalize Windows /C:/... style paths if ever present while keeping POSIX /home/... intact
    if (/^\/[A-Za-z]:\//.test(filePath)) {
      filePath = filePath.slice(1);
    }
    if (!filePath) return null;
    let line = null;
    let endLine = null;
    const m = FILE_URI_HASH_RE.exec(parsed.hash || '');
    if (m) {
      line = parseInt(m[1], 10);
      if (m[2]) endLine = parseInt(m[2], 10);
    }
    return { path: filePath, line, endLine };
  } catch {
    return null;
  }
}

function isSafeExternalUrl(rawHref) {
  const trimmed = String(rawHref || '').trim();
  return /^(https?:\/\/|mailto:)/i.test(trimmed);
}

const INLINE_TOKEN_RE =
  /(``[^`]+``|`[^`\n]+`|\[(?:`[^`\n]+`|[^\]\n])+\]\((?:[^)\s]+)\)|\*\*\*[^*\n]+\*\*\*|\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|\*[^*\s][^*\n]*\*|\bhttps?:\/\/[^\s<>()]+[^\s<>().,;:'"!?\]])/g;

export function renderInlineMarkdown(text, onOpenFileLink, keyPrefix = 'in') {
  const str = String(text || '');
  if (!str) return null;

  const nodes = [];
  let lastIdx = 0;
  let match;
  let partIdx = 0;
  INLINE_TOKEN_RE.lastIndex = 0;

  while ((match = INLINE_TOKEN_RE.exec(str)) !== null) {
    if (match.index > lastIdx) {
      nodes.push(str.slice(lastIdx, match.index));
    }
    const tok = match[0];
    const key = `${keyPrefix}-${partIdx++}`;

    if (tok.startsWith('``') && tok.endsWith('``') && tok.length > 4) {
      nodes.push(
        <code key={key} className="md-inline-code">
          {tok.slice(2, -2)}
        </code>
      );
    } else if (tok.startsWith('`') && tok.endsWith('`')) {
      nodes.push(
        <code key={key} className="md-inline-code">
          {tok.slice(1, -1)}
        </code>
      );
    } else if (tok.startsWith('[')) {
      const closeBracket = tok.lastIndexOf('](');
      if (closeBracket > 0 && tok.endsWith(')')) {
        const rawLabel = tok.slice(1, closeBracket);
        const rawHref = tok.slice(closeBracket + 2, -1).trim();
        const cleanLabel =
          rawLabel.startsWith('`') && rawLabel.endsWith('`') && rawLabel.length > 2
            ? rawLabel.slice(1, -1)
            : rawLabel;
        const fileTarget = parseFileUriTarget(rawHref);
        if (fileTarget) {
          const lineBadge =
            fileTarget.line && !cleanLabel.includes(`#L${fileTarget.line}`) && !cleanLabel.includes(`:${fileTarget.line}`)
              ? `:${fileTarget.line}`
              : '';
          nodes.push(
            <button
              key={key}
              type="button"
              className="md-file-link"
              onClick={() => onOpenFileLink?.(fileTarget.path, fileTarget.line, fileTarget.endLine)}
              title={`Open in Files pane: ${fileTarget.path}${fileTarget.line ? ` (line ${fileTarget.line})` : ''}`}
            >
              <Icon name="files" size={11} />
              <span>
                {cleanLabel}
                {lineBadge}
              </span>
            </button>
          );
        } else if (isSafeExternalUrl(rawHref)) {
          nodes.push(
            <a
              key={key}
              href={rawHref}
              target="_blank"
              rel="noopener noreferrer"
              className="md-ext-link"
            >
              {renderInlineMarkdown(rawLabel, onOpenFileLink, `${key}-lbl`)}
            </a>
          );
        } else {
          nodes.push(cleanLabel);
        }
      } else {
        nodes.push(tok);
      }
    } else if (tok.startsWith('***') && tok.endsWith('***')) {
      nodes.push(
        <strong key={key}>
          <em>{renderInlineMarkdown(tok.slice(3, -3), onOpenFileLink, `${key}-bi`)}</em>
        </strong>
      );
    } else if ((tok.startsWith('**') && tok.endsWith('**')) || (tok.startsWith('__') && tok.endsWith('__'))) {
      nodes.push(
        <strong key={key}>
          {renderInlineMarkdown(tok.slice(2, -2), onOpenFileLink, `${key}-b`)}
        </strong>
      );
    } else if (tok.startsWith('~~') && tok.endsWith('~~')) {
      nodes.push(
        <del key={key}>
          {renderInlineMarkdown(tok.slice(2, -2), onOpenFileLink, `${key}-s`)}
        </del>
      );
    } else if (tok.startsWith('*') && tok.endsWith('*')) {
      nodes.push(
        <em key={key}>
          {renderInlineMarkdown(tok.slice(1, -1), onOpenFileLink, `${key}-i`)}
        </em>
      );
    } else if (/^https?:\/\//i.test(tok)) {
      nodes.push(
        <a
          key={key}
          href={tok}
          target="_blank"
          rel="noopener noreferrer"
          className="md-ext-link"
        >
          {tok}
        </a>
      );
    } else {
      nodes.push(tok);
    }

    lastIdx = INLINE_TOKEN_RE.lastIndex;
  }

  if (lastIdx < str.length) {
    nodes.push(str.slice(lastIdx));
  }
  return nodes;
}

const FENCE_OPEN_RE = /^(\s*)(`{3,}|~{3,})([A-Za-z0-9_+.-]*)\s*$/;
const HEADING_RE = /^(#{1,6})\s+(.+?)\s*$/;
const HR_RE = /^(?:-{3,}|\*{3,}|_{3,})\s*$/;
const UL_ITEM_RE = /^(\s*)[-*+]\s+(.*)$/;
const OL_ITEM_RE = /^(\s*)(\d+)[.)]\s+(.*)$/;
const TABLE_SEP_RE = /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/;

function splitTableRow(line) {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
  return trimmed.split('|').map((c) => c.trim());
}

function isBlockBoundary(line, nextLine = '') {
  const s = line.trim();
  if (!s) return true;
  if (FENCE_OPEN_RE.test(line)) return true;
  if (HEADING_RE.test(s)) return true;
  if (HR_RE.test(s)) return true;
  if (s.startsWith('>')) return true;
  if (UL_ITEM_RE.test(line) || OL_ITEM_RE.test(line)) return true;
  if (s.includes('|') && nextLine && TABLE_SEP_RE.test(nextLine)) return true;
  return false;
}

export function parseMarkdownBlocks(rawText) {
  const lines = String(rawText || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // 1. Fenced code blocks
    const fenceMatch = FENCE_OPEN_RE.exec(line);
    if (fenceMatch) {
      const fenceChars = fenceMatch[2];
      const lang = (fenceMatch[3] || '').trim();
      const codeLines = [];
      i += 1;
      while (i < lines.length) {
        if (lines[i].trim().startsWith(fenceChars)) {
          i += 1;
          break;
        }
        codeLines.push(lines[i]);
        i += 1;
      }
      blocks.push({ type: 'code', lang, code: codeLines.join('\n') });
      continue;
    }

    // 2. Horizontal rule
    if (HR_RE.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }

    // 3. ATX Heading
    const headingMatch = HEADING_RE.exec(trimmed);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
      i += 1;
      continue;
    }

    // 4. GFM Pipe Table
    if (trimmed.includes('|') && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1])) {
      const headers = splitTableRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
        rows.push(splitTableRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    // 5. Blockquote
    if (trimmed.startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join('\n') });
      continue;
    }

    // 6. Ordered or Unordered Lists (preserving numbering across blank lines & nested sub-bullets)
    const ulMatch = UL_ITEM_RE.exec(line);
    const olMatch = !ulMatch ? OL_ITEM_RE.exec(line) : null;
    if (ulMatch || olMatch) {
      const ordered = Boolean(olMatch);
      const startNum = olMatch ? parseInt(olMatch[2], 10) || 1 : 1;
      const baseIndent = (ulMatch ? ulMatch[1] : olMatch[1]).length;
      const items = [];

      while (i < lines.length) {
        const cur = lines[i];
        if (!cur.trim()) {
          // Look ahead across a single blank line if the list continues at baseIndent
          const nextNonEmpty = lines[i + 1] || '';
          const nextSameList = ordered
            ? OL_ITEM_RE.exec(nextNonEmpty)
            : UL_ITEM_RE.exec(nextNonEmpty);
          const nextIndentedSub =
            UL_ITEM_RE.exec(nextNonEmpty) || OL_ITEM_RE.exec(nextNonEmpty);
          if (
            (nextSameList && nextSameList[1].length >= baseIndent) ||
            (nextIndentedSub && nextIndentedSub[1].length > baseIndent)
          ) {
            i += 1;
            continue;
          }
          break;
        }

        const curUl = UL_ITEM_RE.exec(cur);
        const curOl = !curUl ? OL_ITEM_RE.exec(cur) : null;
        if (curUl || curOl) {
          const curIndent = (curUl ? curUl[1] : curOl[1]).length;
          const isSameTopType = ordered ? Boolean(curOl) : Boolean(curUl);
          if (curIndent === baseIndent && isSameTopType) {
            const itemText = curUl ? curUl[2] : curOl[3];
            items.push({ textLines: [itemText], subLines: [] });
            i += 1;
            continue;
          }
          if (curIndent > baseIndent && items.length > 0) {
            items[items.length - 1].subLines.push(cur.slice(Math.min(cur.length, baseIndent + 2)));
            i += 1;
            continue;
          }
          break;
        }

        // Indented continuation line belonging to the current list item
        const leadingSpaces = (cur.match(/^(\s*)/)?.[1] || '').length;
        if (leadingSpaces >= baseIndent + 2 && items.length > 0 && !FENCE_OPEN_RE.test(cur)) {
          const activeItem = items[items.length - 1];
          if (activeItem.subLines.length > 0) {
            activeItem.subLines.push(cur.slice(Math.min(cur.length, baseIndent + 2)));
          } else {
            activeItem.textLines.push(cur.trim());
          }
          i += 1;
          continue;
        }

        break;
      }

      blocks.push({ type: 'list', ordered, start: startNum, items });
      continue;
    }

    // 7. Standard Paragraph
    const paraLines = [line];
    i += 1;
    while (i < lines.length && !isBlockBoundary(lines[i], lines[i + 1] || '')) {
      paraLines.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: 'paragraph', lines: paraLines });
  }

  return blocks;
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

export default function MarkdownBody({ content, fontSize = 14, onOpenFileLink }) {
  const blocks = parseMarkdownBlocks(content);
  if (blocks.length === 0) return null;

  return (
    <div className="ld-markdown-body" style={{ fontSize: `${fontSize}px` }}>
      {blocks.map((blk, bIdx) => {
        const key = `md-b-${bIdx}`;
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
              {renderInlineMarkdown(blk.text, onOpenFileLink, key)}
            </Tag>
          );
        }
        if (blk.type === 'blockquote') {
          return (
            <blockquote key={key} className="md-blockquote">
              {renderInlineMarkdown(blk.text, onOpenFileLink, key)}
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
                        {renderInlineMarkdown(hCell, onOpenFileLink, `${key}-th-${cIdx}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {blk.rows.map((rCells, rIdx) => (
                    <tr key={`${key}-tr-${rIdx}`}>
                      {rCells.map((cell, cIdx) => (
                        <td key={`${key}-td-${rIdx}-${cIdx}`}>
                          {renderInlineMarkdown(cell, onOpenFileLink, `${key}-td-${rIdx}-${cIdx}`)}
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
                    {renderInlineMarkdown(
                      item.textLines.join(' '),
                      onOpenFileLink,
                      `${key}-li-${iIdx}`
                    )}
                  </div>
                  {item.subLines.length > 0 && (
                    <MarkdownBody
                      content={item.subLines.join('\n')}
                      fontSize={fontSize}
                      onOpenFileLink={onOpenFileLink}
                    />
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
                {renderInlineMarkdown(ln, onOpenFileLink, `${key}-ln-${lIdx}`)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
