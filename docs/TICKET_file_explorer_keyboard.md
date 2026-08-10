# TICKET: File Explorer Missing Sovereign Keyboard & Macro Buttons

## Overview
The Sovereign Keyboard button and other terminal utility buttons (like Scroll/Copy) are currently hidden or non-functional when the user is in the "Files" (File Explorer) view and editing a file. The user relies on the custom keyboard and utilities across the entire app, not just the terminal.

## Expected Behavior
1. The Sovereign Keyboard button should be visible and functional while editing files.
2. The Scroll/Copy button and other relevant utilities should remain accessible in the File Explorer view.
3. The Sovereign Keyboard, when active, should correctly insert characters into the Monaco Editor instead of the Xterm.js terminal if the user is currently editing a file.

## Plan (GitOps / TDD)
1. Create a branch `fix/file-explorer-keyboard`.
2. Analyze `App.jsx` to see how `showKeyboard`, `showFiles`, and the MacroBar interact.
3. Determine if the custom `Keyboard` component currently emits events exclusively to the `ws.current` socket or if it can dispatch native KeyboardEvents that the Monaco editor can intercept, or if we need to pass a context/callback down to the keyboard.
4. Ensure the buttons are rendered when `showFiles` is active.
5. Write/Run tests if applicable, commit, and merge.
