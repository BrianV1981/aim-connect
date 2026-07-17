# DISPATCH — aim-connect security work order

**From:** A.I.M. Orchestrator / Technical Auditor on **tmux session `aim-grok`** (also active on `grok-audit`)  
**To:** Agent in **tmux session `aim-connect`**  
**Date:** 2026-07-12  
**Authority:** Operator directed orchestrator to assign tickets and coordinate work.  
**Role split:** You implement. Orchestrator audits, prioritizes, and accepts closes. Do not freestyle product vision without filing tickets first.

---

## 1. Mandatory first read

Read the full deep-dive audit (absolute path):

```
/home/kingb/grok-audit/artifacts/AUDIT_AIM_CONNECT_2026-07-12.md
```

Also skim this dispatch end-to-end before coding.

**Repo:** `/home/kingb/aim-connect` · remote `BrianV1981/aim-connect` · branch discipline: **never push raw WIP to `main`/`master` without Operator override.** Prefer `gh issue create` then feature branches / worktrees.

---

## 2. Mission

1. **Open GitHub issues** for every P0 and each major P1 in the audit (one issue per discrete fix when possible).  
2. **Implement fixes** issue-by-issue (strict GitOps: branch → TDD where practical → PR or local verify → close).  
3. **Report back to orchestrator after each ticket is closed.**  
4. **Ask the orchestrator** (do not guess) on any ambiguity, blast-radius, or secret-handling question.

---

## 3. Priority ticket map (file these first)

Use titles close to these so the orchestrator can track them:

### P0 — immediate (security freeze)

| Suggested title | Summary |
|-----------------|--------|
| **P0: Remove DEBUG log that prints TOTP PIN and secret** | Delete `print(f"DEBUG: Received PIN... Secret loaded: ...")` in `backend/main.py`. Never log OTPs/secrets. |
| **P0: Untrack `backend/totp.secret` from git** | `git rm --cached backend/totp.secret`; ensure `.gitignore`; do **not** print secret; document that Operator must rotate TOTP. History purge = Operator decision — ask orchestrator before filter-repo/BFG. |
| **P0: WebSocket must not accept raw TOTP** | WS auth: **only** `VALID_API_TOKENS` (issued after full `/api/auth` with TOTP+password). Remove `totp_instance.verify(token)` from WS path. |

### P1 — next

| Suggested title | Summary |
|-----------------|--------|
| **P1: Default AIM_WORKSPACE sandbox + drop hardcoded `/home/kingb`** | Backend default not entire `$HOME`; frontend must not hardcode operator home. |
| **P1: API token TTL + logout/revocation** | Bound token lifetime; optional logout endpoint; cap `VALID_API_TOKENS`. |
| **P1: Align README/CHANGELOG with dual-layer auth + secret hygiene truth** | Kill “no passwords” / “totp never tracked” false claims. |
| **P1: Explicit gitignore + CI guard for secrets** | Ignore `password.hash`, `totp.secret`; CI fails if secrets appear in tree. |
| **P1: Pin requirements + track VERSION** | Reproducible backend deps; VERSION in repo. |

P2 items (error status codes, Docker multi-stage, modularize `main.py`, etc.) — file only after P0s are closed unless blocked.

**Open issue #21** (hybrid macros): either close as shipped with evidence or file residual gaps — report which.

---

## 4. Constraints (blast radius)

- **Do not** force-push `master` or rewrite public history without orchestrator + Operator approval.  
- **Do not** print TOTP secrets, password hashes, or `.env` values into chat, commits, or issues.  
- **Do not** disable auth “temporarily” to test on a public URL.  
- Prefer local verify: `pytest backend/test_auth.py`, path/auth probes from audit.  
- HTTPS / ngrok ops: do not expose a broken auth build intentionally.  
- Destructive host cleanup (filter-repo, mass delete) — **ask first**.

---

## 5. How to report to the orchestrator

**Reply target:** tmux session **`aim-grok`** (orchestrator). If unreachable, **`grok-audit`**.

Use the **chalkboard + short paste** protocol (write a reply file, paste a short pointer). Example reply path:

```
/home/kingb/aim-connect/docs/REPORT_TO_AIM_GROK.md
```

### After opening issues (first structured reply)

```text
1. AGREED (issue numbers created, titles)
2. DISAGREE / CORRECT (any audit finding you contest + reason)
3. QUESTIONS (blockers only)
4. NEXT (which issue you start first)
```

### After **each** ticket is closed

Append or write a short report:

```text
TICKET CLOSED: #<n> <title>
BRANCH / COMMIT: ...
VERIFY: commands run + results
RESIDUAL RISK: none | ...
QUESTIONS: none | ...
NEXT TICKET: #<m> or DONE-P0
```

Paste a **one-line pointer** into `aim-grok`, e.g.:

`[REPORT from aim-connect] Closed #N — read /home/kingb/aim-connect/docs/REPORT_TO_AIM_GROK.md`

Do **not** open an open-ended chat loop. One structured report per event.

### Questions anytime

Same structure under `QUESTIONS` only — wait for orchestrator answer before risky work.

---

## 6. Orchestrator identity

- **Who:** Technical Auditor / orchestrator for the Operator’s multi-project fleet.  
- **Where:** tmux **`aim-grok`** (primary), workspace also on **`grok-audit`**.  
- **Job:** Audit → dispatch → accept closed tickets → re-audit. You implement.

---

## 7. Success criteria for this sprint

- [ ] All P0 issues filed and **closed with verify**  
- [ ] DEBUG secret log gone  
- [ ] `totp.secret` not tracked on `master`  
- [ ] WS rejects pure TOTP without prior `/api/auth` token  
- [ ] Structured report after each close to `aim-grok`  
- [ ] Orchestrator can re-audit and raise grade above C− for internet exposure

---

*End of dispatch. Execute. Report. Do not freestyle scope expansion into roadmap features (WebAuthn, hub/spoke) until P0/P1 security sprint is done.*
