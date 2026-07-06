# Contributing to AIM-Connect

First off, thank you for considering contributing to AIM-Connect! 

> ⚠️ **Project Status:** This project is maintained by a single developer in my spare time. While I am actively developing it, please be patient with feature requests, bug fixes, and PR reviews. 

As a solo maintainer, this document outlines the rules of engagement to help keep the project sustainable and ensure we align on architectural decisions before you invest your valuable time.

## 1. Security Reporting 🚨

Because AIM-Connect involves **root-level terminal access**, security is our highest priority. 
**If you discover a security vulnerability, PLEASE DO NOT OPEN A PUBLIC ISSUE.** 
Instead, please email me directly so we can patch it responsibly before disclosure.

## 2. Reporting Bugs

If you find a bug, please open an Issue. To help me fix it quickly, your Issue **must** include:
*   **OS and Browser Version**
*   **Deployment Method** (Docker vs. manual `startup.sh`)
*   **Steps to Reproduce**
*   **Expected Behavior vs. Actual Behavior**
*   **Logs** (e.g. `docker logs aim-connect` or browser console errors)

Issues like *"It doesn't work"* will be closed.

## 3. Suggesting Enhancements

Before requesting a new feature, please read the `ROADMAP.md` (or `docs/DEEPSEEK_AUDIT.md`) to see if it is already planned. If it is a brand new idea, open an Issue to propose it.

## 4. Pull Requests (The Golden Rule)

**Please open an Issue discussing your proposed change BEFORE submitting a Pull Request.**

Because this is a solo project with a very specific, minimal "Sovereign" philosophy, I want to ensure we agree on the design approach before you spend hours writing code. 
*   **Small bug fixes** (typos, CSS tweaks, obvious logical errors) can be submitted as PRs immediately.
*   **Large features or architectural shifts** submitted without prior discussion will likely be rejected to prevent scope creep.

## 5. Development Setup

If you are hacking on the codebase locally:

1. **Backend:**
   * Uses standard Python 3.11+. 
   * `cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt`
   * Run the dev server manually: `uvicorn main:app --reload`
2. **Frontend:**
   * Uses Node v20+, React, and Vite.
   * `cd frontend && npm install`
   * Run the dev server: `npm run dev`

*(Note: In development, you will have two servers running. In production, the backend serves the built frontend statically.)*

---
Thank you for respecting these boundaries and helping to keep the AIM-Connect ecosystem clean and focused!
