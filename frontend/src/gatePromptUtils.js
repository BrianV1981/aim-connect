export function resolveGateBannerModel(fleetItem) {
  if (!fleetItem || fleetItem.status !== 'WAITING') {
    return null;
  }

  const browserHold = fleetItem.browser_waiting_for_human;
  if (browserHold && !fleetItem.gate_info) {
    return {
      kind: 'browser_hold',
      title: 'BROWSER 2FA / LOGIN GATE',
      question:
        browserHold.reason ||
        'Agent is waiting for human login or 2FA completion in the Co-Pilot Browser.',
      details: browserHold.url ? [browserHold.url] : [],
      actions: [],
    };
  }

  const gate = fleetItem.gate_info || null;
  const kind = gate?.kind || 'yn_prompt';
  const rawPreview = String(fleetItem.preview || '').replace(/^GATE:\s*/i, '').trim();
  const question =
    String(gate?.question || '').trim() ||
    rawPreview ||
    'Interactive approval prompt active in terminal.';
  const details = Array.isArray(gate?.details)
    ? gate.details.map((ln) => String(ln || '').trim()).filter(Boolean)
    : [];

  if (kind === 'opencode_permission') {
    return {
      kind,
      title: gate?.title || 'OPENCODE PERMISSION REQUIRED',
      question,
      details,
      actions: [
        { id: 'allow-once', label: 'ALLOW ONCE', payload: '\r', variant: 'primary' },
        { id: 'allow-always', label: 'ALLOW ALWAYS', payload: '\x1b[C\r', variant: 'secondary' },
        { id: 'reject', label: 'REJECT (ESC)', payload: '\x1b', variant: 'danger' },
      ],
    };
  }

  if (kind === 'opencode_confirm') {
    return {
      kind,
      title: gate?.title || 'CONFIRM PERMISSION ACTION',
      question,
      details,
      actions: [
        { id: 'confirm', label: 'CONFIRM (ENTER)', payload: '\r', variant: 'primary' },
        { id: 'cancel', label: 'CANCEL (ESC)', payload: '\x1b', variant: 'danger' },
      ],
    };
  }

  if (kind === 'numbered_choice' && Array.isArray(gate?.options) && gate.options.length >= 2) {
    const numActions = gate.options.slice(0, 4).map((opt, idx) => ({
      id: `opt-${opt.key}`,
      label: `${opt.key}. ${opt.label}`,
      payload: `${opt.key}\r`,
      variant: idx === 0 ? 'primary' : 'secondary',
    }));
    numActions.push({ id: 'cancel', label: 'CANCEL (ESC)', payload: '\x1b', variant: 'danger' });
    return {
      kind,
      title: gate?.title || 'APPROVAL REQUIRED',
      question,
      details,
      actions: numActions,
    };
  }

  return {
    kind: 'yn_prompt',
    title: gate?.title || 'TERMINAL CONFIRMATION GATE',
    question,
    details,
    actions: [
      { id: 'approve-y', label: 'APPROVE (y)', payload: 'y\r', variant: 'primary' },
      { id: 'decline-n', label: 'DECLINE (n)', payload: 'n\r', variant: 'danger' },
    ],
  };
}
