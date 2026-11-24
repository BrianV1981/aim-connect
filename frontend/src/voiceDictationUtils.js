export function classifyVoiceCommand(
  rawTranscript,
  {
    macroLibrary = [],
    voiceAutoEnter = true,
    voiceAutoSend = true,
    voiceAutoExecute = true,
  } = {}
) {
  const lowerTrimmed = String(rawTranscript || '').trim().toLowerCase();
  if (!lowerTrimmed) {
    return { kind: 'empty', macro: null };
  }
  const matchingMacro = (Array.isArray(macroLibrary) ? macroLibrary : []).find(
    (m) => m?.voiceTrigger && String(m.voiceTrigger).trim().toLowerCase() === lowerTrimmed
  );
  if (matchingMacro) {
    return { kind: 'macro', macro: matchingMacro };
  }
  if (
    (lowerTrimmed === 'enter' && voiceAutoEnter) ||
    (lowerTrimmed === 'send' && voiceAutoSend) ||
    (lowerTrimmed === 'execute' && voiceAutoExecute)
  ) {
    return { kind: 'submit', macro: null };
  }
  return { kind: 'dictation', macro: null };
}

export function formatDictationTranscript(
  rawTranscript,
  {
    voiceAutoCapitalize = true,
    voiceSlashes = true,
    lastEndedWithSpace = false,
    lastEndedSentence = true,
  } = {}
) {
  const lowerTrimmed = String(rawTranscript || '').trim().toLowerCase();
  let finalPayload = String(rawTranscript || '').trim().replace(/\s+/g, ' ');
  if (!finalPayload) {
    return {
      text: '',
      ptyPayload: '',
      appendSpace: '',
      endedWithSpace: lastEndedWithSpace,
      endedSentence: lastEndedSentence,
      startsWithTightPunct: false,
    };
  }

  if (voiceAutoCapitalize && lastEndedSentence) {
    finalPayload = finalPayload.trimStart();
    finalPayload = finalPayload.charAt(0).toUpperCase() + finalPayload.slice(1);
  }

  if (voiceSlashes) {
    finalPayload = finalPayload
      .replace(/\s*\bback\s?slash\b\s*/gi, '\\')
      .replace(/\s*\b(?:forward\s)?slash\b\s*/gi, '/')
      .replace(/\s*\bdash\b\s*/gi, '-');
  }

  finalPayload = finalPayload
    .replace(/\bdot dot dot\b/gi, '...')
    .replace(/\bdot dot\b/gi, '..')
    .replace(/\bcomma\b/gi, ',')
    .replace(/\bperiod\b/gi, '.')
    .replace(/\bquestion mark\b/gi, '?')
    .replace(/\b(?:open|left)\s+paren(?:thesis)?\b\s*/gi, '(')
    .replace(/\s*\b(?:close|right)\s+paren(?:thesis)?\b/gi, ')')
    .replace(/\bquote\b\s*/gi, '"')
    .replace(/\s*\bunquote\b/gi, '"')
    .replace(/\s+([.,?!])/g, '$1');

  if (voiceAutoCapitalize) {
    finalPayload = finalPayload.replace(
      /([.?!])\s+([a-z])/g,
      (_match, p1, p2) => `${p1} ${p2.toUpperCase()}`
    );
  }

  const startsWithPunctuation = /^[.,?!)]/.test(finalPayload.trimStart());
  const startsWithUnquote = finalPayload.startsWith('"') && lowerTrimmed.startsWith('unquote');
  const startsWithTightPunct = startsWithPunctuation || startsWithUnquote;

  const prefix = lastEndedWithSpace && startsWithTightPunct ? '\b' : '';

  let appendSpace = ' ';
  if (
    finalPayload.endsWith('(') ||
    finalPayload.endsWith('/') ||
    finalPayload.endsWith('\\') ||
    finalPayload.endsWith('-')
  ) {
    appendSpace = '';
  }
  if (
    finalPayload.endsWith('"') &&
    lowerTrimmed.endsWith('quote') &&
    !lowerTrimmed.endsWith('unquote')
  ) {
    appendSpace = '';
  }

  return {
    text: finalPayload,
    ptyPayload: `${prefix}${finalPayload}${appendSpace}`,
    appendSpace,
    endedWithSpace: appendSpace === ' ',
    endedSentence: /[.?!]\s*$/.test(finalPayload) || /[.?!]$/.test(finalPayload.trimEnd()),
    startsWithTightPunct,
  };
}

export function appendDictatedTextToComposer(currentText, formatted) {
  const base = typeof currentText === 'string' ? currentText : '';
  const chunk = formatted?.text || '';
  if (!chunk) return base;

  const trimmedRight = base.replace(/\s+$/, '');
  const hadTrailingSpace = base.length > trimmedRight.length;

  if (!trimmedRight) {
    return `${chunk}${formatted.appendSpace || ''}`;
  }

  const needsTightAttach = Boolean(formatted?.startsWithTightPunct);
  const needsNoSpaceBefore =
    trimmedRight.endsWith('(') ||
    trimmedRight.endsWith('/') ||
    trimmedRight.endsWith('\\') ||
    trimmedRight.endsWith('-');

  if (needsTightAttach || needsNoSpaceBefore) {
    return `${trimmedRight}${chunk}${formatted.appendSpace || ''}`;
  }

  const sep = hadTrailingSpace ? ' ' : ' ';
  return `${trimmedRight}${sep}${chunk}${formatted.appendSpace || ''}`;
}

export function buildComposerDisplayValue(committedText, interimText) {
  const committed = typeof committedText === 'string' ? committedText : '';
  const interim = typeof interimText === 'string' ? interimText.trim() : '';
  if (!interim) return committed;
  if (!committed) return interim;
  const startsTight = /^[.,?!)]/.test(interim);
  if (startsTight) {
    return `${committed.replace(/\s+$/, '')}${interim}`;
  }
  const endsWithSpace = /\s$/.test(committed);
  const endsWithOpenChar = /[(\\/-]$/.test(committed);
  if (endsWithSpace || endsWithOpenChar) {
    return `${committed}${interim}`;
  }
  return `${committed} ${interim}`;
}
