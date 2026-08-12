# Frontend Vite Cache and Auto-Session Reconnection Bug

## The Problem
We recently encountered a bug where the user was immediately reconnected to their previous tmux session upon page refresh, bypassing the A.I.M. Connect Welcome Screen (the homepage). They were getting stuck on the "joshua ascii art screen aim soviergn node - terminal interface" and could not escape it.

## The Root Cause
1. **React State Not Updating**: A previous fix correctly commented out the auto-assignment of `activeSession` in `App.jsx` (`setActiveSession(data.sessions[0])`), intending to leave `activeSession` empty on load and thus render the `<div className="welcome-screen">` overlay.
2. **Missing Build Step**: However, the agent who made the fix failed to run `npm run build` inside the `frontend` directory. As a result, the backend FastAPI server continued serving the stale, cached `index.js` bundle from `frontend/dist/assets/`, which still contained the old auto-reconnection code.
3. **Aggressive Browser Caching**: Additionally, `backend/main.py` was serving `index.html` without any `Cache-Control` headers. Even if we had built the frontend, the browser would likely have aggressively cached the old `index.html` (which points to the old Javascript bundle hash) until the user performed a hard refresh.

## The Fix
1. **Build the Frontend**: We ran `npm run build` in `/home/kingb/aim-connect/frontend` to regenerate the `dist` bundle with the updated `App.jsx` logic.
2. **Cache-Control Headers**: We modified `backend/main.py` to explicitly serve `index.html` with strict cache-busting headers: `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`.

## Standard Operating Procedure (SOP)
Whenever making modifications to the React code in `frontend/src/`, agents MUST:
1. Execute `npm run build` in the `frontend` directory.
2. Ensure the backend properly serves the newly generated assets from `frontend/dist`.
3. Check if the backend needs restarting (usually not necessary for static files, but good practice if FastAPI static routes behave unpredictably).
