const FILE_URI_HASH_RE = /^#L(\d+)(?:-L?(\d+))?$/i;

const INLINE_TOKEN_PATTERN =
  '(``[^`]+``|`[^`\\n]+`|\\[(?:`[^`\\n]+`|[^\\]\\n])+\\]\\((?:[^)\\s]+)\\)|\\*\\*\\*[^*\\n]+\\*\\*\\*|\\*\\*[^*\\n]+\\*\\*|__[^_\\n]+__|~~[^~\\n]+~~|\\*[^*\\s][^*\\n]*\\*|\\bhttps?:\\/\\/[^\\s<>()]+[^\\s<>().,;:\'"!?\\]])';

export function parseFileUriTarget(rawHref) {
  const trimmed = String(rawHref || '').trim();
  if (!trimmed.toLowerCase().startsWith('file://')) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'file:') return null;
    let filePath = decodeURIComponent(parsed.pathname || '');
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

export function isSafeExternalUrl(rawHref) {
  const trimmed = String(rawHref || '').trim();
  return /^(https?:\/\/|mailto:)/i.test(trimmed);
}

export function resolveRelativeFileHref(rawHref, baseFilePath = '') {
  const trimmed = String(rawHref || '').trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//') || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return null;
  }
  const [pathPart, hashPart = ''] = trimmed.split('#', 2);
  if (!pathPart) return null;
  let line = null;
  let endLine = null;
  const m = FILE_URI_HASH_RE.exec(hashPart ? `#${hashPart}` : '');
  if (m) {
    line = parseInt(m[1], 10);
    if (m[2]) endLine = parseInt(m[2], 10);
  }
  if (pathPart.startsWith('/')) {
    return { path: pathPart, line, endLine };
  }
  if (!baseFilePath || !baseFilePath.startsWith('/')) {
    return null;
  }
  const baseDir = baseFilePath.slice(0, Math.max(0, baseFilePath.lastIndexOf('/')));
  const combined = `${baseDir}/${pathPart}`;
  const segments = [];
  for (const seg of combined.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') {
      segments.pop();
    } else {
      segments.push(seg);
    }
  }
  return { path: `/${segments.join('/')}`, line, endLine };
}

export function tokenizeInlineMarkdown(text, depth = 0) {
  const str = String(text || '').slice(0, 32000);
  if (!str) return [];
  if (depth > 5) return [{ type: 'text', value: str }];

  // CRITICAL (#265): Always create a fresh local RegExp per stack frame so recursive
  // calls never reset or mutate the caller's .lastIndex cursor.
  const tokenRe = new RegExp(INLINE_TOKEN_PATTERN, 'g');
  const tokens = [];
  let lastIdx = 0;
  let match;

  while ((match = tokenRe.exec(str)) !== null) {
    const matchStart = match.index;
    const tok = match[0] || '';
    const nextCursor = Math.max(matchStart + 1, matchStart + tok.length);
    tokenRe.lastIndex = nextCursor;

    if (matchStart > lastIdx) {
      tokens.push({ type: 'text', value: str.slice(lastIdx, matchStart) });
    }

    if (tok.startsWith('``') && tok.endsWith('``') && tok.length > 4) {
      tokens.push({ type: 'code', value: tok.slice(2, -2) });
    } else if (tok.startsWith('`') && tok.endsWith('`') && tok.length >= 2) {
      tokens.push({ type: 'code', value: tok.slice(1, -1) });
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
          tokens.push({
            type: 'file_link',
            label: cleanLabel,
            path: fileTarget.path,
            line: fileTarget.line,
            endLine: fileTarget.endLine,
          });
        } else if (isSafeExternalUrl(rawHref)) {
          tokens.push({
            type: 'ext_link',
            href: rawHref,
            children: tokenizeInlineMarkdown(rawLabel, depth + 1),
          });
        } else if (!rawHref.startsWith('#') && !rawHref.startsWith('//') && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(rawHref)) {
          tokens.push({
            type: 'rel_link',
            label: cleanLabel,
            href: rawHref,
          });
        } else {
          tokens.push({ type: 'text', value: cleanLabel });
        }
      } else {
        tokens.push({ type: 'text', value: tok });
      }
    } else if (tok.startsWith('***') && tok.endsWith('***') && tok.length > 6) {
      tokens.push({
        type: 'bold_italic',
        children: tokenizeInlineMarkdown(tok.slice(3, -3), depth + 1),
      });
    } else if (
      ((tok.startsWith('**') && tok.endsWith('**')) ||
        (tok.startsWith('__') && tok.endsWith('__'))) &&
      tok.length > 4
    ) {
      tokens.push({
        type: 'bold',
        children: tokenizeInlineMarkdown(tok.slice(2, -2), depth + 1),
      });
    } else if (tok.startsWith('~~') && tok.endsWith('~~') && tok.length > 4) {
      tokens.push({
        type: 'strike',
        children: tokenizeInlineMarkdown(tok.slice(2, -2), depth + 1),
      });
    } else if (tok.startsWith('*') && tok.endsWith('*') && tok.length > 2) {
      tokens.push({
        type: 'italic',
        children: tokenizeInlineMarkdown(tok.slice(1, -1), depth + 1),
      });
    } else if (/^https?:\/\//i.test(tok)) {
      tokens.push({
        type: 'ext_link',
        href: tok,
        children: [{ type: 'text', value: tok }],
      });
    } else {
      tokens.push({ type: 'text', value: tok });
    }

    lastIdx = nextCursor;
  }

  if (lastIdx < str.length) {
    tokens.push({ type: 'text', value: str.slice(lastIdx) });
  }
  return tokens;
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

export function parseMarkdownBlocks(rawText, depth = 0) {
  const safeRaw = String(rawText || '').slice(0, 64000).replace(/\r\n/g, '\n');
  if (!safeRaw.trim()) return [];
  if (depth > 4) {
    return [{ type: 'paragraph', lines: safeRaw.split('\n') }];
  }

  const lines = safeRaw.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const outerStart = i;
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

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

    if (HR_RE.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }

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

    if (trimmed.startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join('\n') });
      continue;
    }

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
            items.push({ textLines: [itemText], subBlocks: [] });
            i += 1;
            continue;
          }
          if (curIndent > baseIndent && items.length > 0) {
            const subLines = [];
            while (i < lines.length) {
              const subCur = lines[i];
              if (!subCur.trim()) break;
              const subSpaces = (subCur.match(/^(\s*)/)?.[1] || '').length;
              if (subSpaces <= baseIndent) break;
              subLines.push(subCur.slice(Math.min(subCur.length, baseIndent + 2)));
              i += 1;
            }
            if (subLines.length > 0) {
              items[items.length - 1].subBlocks.push(
                ...parseMarkdownBlocks(subLines.join('\n'), depth + 1)
              );
            }
            continue;
          }
          break;
        }

        const leadingSpaces = (cur.match(/^(\s*)/)?.[1] || '').length;
        if (leadingSpaces >= baseIndent + 2 && items.length > 0 && !FENCE_OPEN_RE.test(cur)) {
          items[items.length - 1].textLines.push(cur.trim());
          i += 1;
          continue;
        }

        break;
      }

      blocks.push({ type: 'list', ordered, start: startNum, items });
      if (i <= outerStart) i = outerStart + 1;
      continue;
    }

    const paraLines = [line];
    i += 1;
    while (i < lines.length && !isBlockBoundary(lines[i], lines[i + 1] || '')) {
      paraLines.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: 'paragraph', lines: paraLines });
    if (i <= outerStart) i = outerStart + 1;
  }

  return blocks;
}
