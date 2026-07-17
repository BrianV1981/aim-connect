# Feature Brief: Native HTML Scrollback & Copy Mode Overlay

**Target:** `aim-connect` Frontend (`App.jsx`)
**Inspiration:** [tmuxy (GitHub)](https://github.com/flplima/tmuxy)

## The Problem
Currently, `aim-connect` enables mobile scrolling by intercepting `touchstart` and `touchmove` events and translating them into synthetic `WheelEvent`s that are fed into `xterm.js`. 
While this successfully triggers `tmux`'s native mouse scrolling, it suffers from two major UX issues on mobile:
1. **No Momentum Scrolling:** The scrolling stops the exact millisecond the user's finger leaves the screen. It feels rigid and unnatural on iOS/Android.
2. **Broken Native Text Selection:** Because `xterm.js` renders text in a rigid canvas/DOM grid optimized for desktop terminals, mobile users cannot easily long-press to bring up native OS text selection cursors (the "lollipops"). Copying and pasting scrollback text is nearly impossible on a phone.

## The Solution (The `tmuxy` Method)
We need to bypass `xterm.js` entirely when the user wants to scroll or copy text, replacing it with a native HTML overlay. 

When a user swipes up (or explicitly enters "Copy Mode"):
1. **Hide the Terminal:** The live `xterm.js` canvas is temporarily hidden (e.g., `display: none` or obscured via z-index).
2. **Fetch Scrollback:** The frontend requests the full pane history via the backend. The backend executes `tmux capture-pane -S - -e` to grab the scrollback buffer (with ANSI color codes).
3. **Render Native HTML:** The frontend parses the ANSI text and renders it inside a standard `<div style="overflow-y: scroll; -webkit-overflow-scrolling: touch;">`.
4. **Native UX Unlocked:** Because it is now just standard HTML text, the mobile browser's native momentum/inertia scrolling takes over. Furthermore, the user can long-press anywhere to trigger native iOS/Android text selection to easily copy/paste.
5. **Exit:** When the user scrolls back to the very bottom, or taps an "Exit" button, the HTML overlay is destroyed, and the live `xterm.js` canvas is revealed again.

## Implementation Steps for the Agent

1. **Backend Endpoint:**
   Create a new FastAPI endpoint (e.g., `/api/scrollback/{session_name}`) that executes `tmux capture-pane -t {session_name} -S - -e -p` and returns the raw ANSI string.

2. **Frontend State (in `App.jsx`):**
   - Add a state variable `isNativeScrollMode` (boolean).
   - Add a state variable `scrollbackContent` (string or parsed HTML).

3. **Event Interception:**
   - Modify the existing `handleTouchStart`/`handleTouchMove` logic.
   - If the user swipes down (scrolling up the terminal) and we are at the bottom of the terminal, trigger the transition:
     - Set `isNativeScrollMode = true`.
     - Fetch the scrollback from the backend.
     - Convert the ANSI color codes to HTML (using a lightweight library like `ansi_up` or a custom parser).

4. **Render the Overlay:**
   - In the JSX, conditionally render a fullscreen overlay `div` on top of the `Terminal` component when `isNativeScrollMode` is true.
   - Inject the parsed HTML scrollback into this `div`.
   - Ensure the `div` has `overflow-y: auto` so the browser handles the scrolling natively.
   - Automatically scroll the `div` to the bottom upon initial render so the user's swipe feels continuous.

5. **Exit Strategy:**
   - Add an `onScroll` listener to the overlay `div`. If the user scrolls all the way back to the bottom (`scrollTop + clientHeight >= scrollHeight`), automatically set `isNativeScrollMode = false` to return to the live terminal.
   - (Optional) Add a floating "X" button to manually close the scrollback view.
