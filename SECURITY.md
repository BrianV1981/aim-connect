# Security & Threat Model

## Residual SPA Risk (XSS)
The A.I.M. Connect frontend is a Single Page Application (SPA). As part of the architecture, critical secrets—including the `API Token` and the `End-to-End Encryption (E2EE) Secret`—are stored in the browser's `localStorage`.

**Threat:** If an attacker successfully executes a Cross-Site Scripting (XSS) attack against the application, they can read `localStorage` and exfiltrate these secrets. This represents a full compromise of the active session and encrypted data.

**Mitigation:** 
- The application employs a strict `Content-Security-Policy` (CSP) enforced by the FastAPI backend.
- We have mitigated path traversal and shell injection vulnerabilities in the File and Terminal APIs.
- We make **no false "XSS-proof" claims**. Because the frontend relies on complex components like the Monaco Code Editor and xterm.js, the attack surface for XSS remains non-zero. 
- (Note: As of Audit #4, we have attempted to tighten the CSP by removing `'unsafe-eval'`. If Monaco breaks in your specific deployment, you may need to re-add it, but we prioritize a strict CSP by default).

**Operator Advice:** Always run A.I.M. Connect in an isolated, trusted environment. Do not blindly execute or render untrusted third-party HTML/JS payloads within the workspace.
