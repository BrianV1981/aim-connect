# AIM-Connect Native: Architectural Whitepaper

**Status:** Exploratory / Conceptual
**Objective:** Evaluate the transition of AIM-Connect from a Progressive Web App (PWA) to a Native Mobile Application (React Native / Expo) to achieve absolute hardware sovereignty.

---

## 1. The Catalyst: Why Consider Native?

AIM-Connect was built as a PWA to achieve frictionless deployment. However, web browsers (Safari/Chrome) aggressively sandbox web applications, leading to friction that cannot be solved with pure JavaScript:

*   **Canvas Hijacking (`xterm.js`):** Terminal emulators render via `<canvas>`. This completely breaks native OS touch events, meaning the user cannot long-press to paste, nor use the native magnifying glass for cursor placement.
*   **Aggressive Suspension:** When a user switches to another app (e.g., to read a text message), iOS/Android suspends the browser tab after ~30 seconds. This instantly kills the Tmux WebSocket, forcing a reconnection sequence upon returning.
*   **Hardware Abstraction:** Web APIs for Voice Dictation (`SpeechRecognition`) and Haptics (`navigator.vibrate`) are unreliable across different OS versions and often require constant permission prompts.

---

## 2. The Proposed Architecture

The transition to native would be a **Frontend-Only Rewrite**.

*   **The Backend (Untouched):** The Python FastAPI / Tmux orchestrator remains exactly as it is. It will continue to serve REST endpoints and the WebSocket.
*   **The Frontend (React Native + Expo):** We spin up a new repository (`aim-connect-mobile`). We translate our React `App.jsx` into React Native `<View>` components. Expo is chosen to allow rapid, over-the-air (OTA) javascript updates to bypass App Store review delays.

---

## 3. Solving the "Multi-Server" UX Problem

Currently, the user's favorite feature is the ability to install isolated PWAs for different servers (e.g., a Blue icon for "Agent Box", a Red icon for "Prod DB"). Native apps usually force users into a single App icon, requiring a bloated "Server Hub" UI inside the app.

**The Native Solution: The Widget Pattern**
We build a single Native App, but we deploy it alongside **Deep-Linked OS Widgets**. 
1. The user installs the single `AIM-Connect` app.
2. The user uses the iOS/Android Widget screen to place custom colored 1x1 widgets on their home screen.
3. Each widget is configured with a specific server URL (e.g., `aim://connect?server=192.168.1.50`).
4. Tapping a widget instantly launches the Native App, bypasses the UI, and connects directly to that server. 
*Result:* The user retains the feeling of having multiple isolated apps on their home screen.

---

## 4. Native Superpowers Unlocked

By executing as a native binary, we gain access to ring-0 mobile APIs:

*   **Native Terminal Buffer:** We can ditch `xterm.js` and use a native `TextInput` or native text rendering layer. This restores flawless OS-level copy/paste, magnifying glass cursors, and spellcheck/autocorrect behaviors.
*   **Persistent Background Threads:** The app can request "Background Audio" or "Background Fetch" permissions, allowing the WebSocket to stay alive indefinitely even when the app is minimized.
*   **System-Level Voice Dictation:** We hook directly into `SFSpeechRecognizer` (iOS) and `SpeechRecognizer` (Android) for instantaneous, offline-capable, punctuation-aware dictation that doesn't rely on the clunky web prompt overlay.
*   **Zero-Latency Haptics:** Direct access to the `UIImpactFeedbackGenerator`, providing distinct, satisfying physical clicks for the sovereign keyboard that never fail.

---

## 5. The Trade-Offs (Deployment Friction)

The absolute biggest loss in moving to Native is deployment speed.

*   **The PWA Way:** Write code `->` `git push` `->` Refresh phone browser `->` Code is live.
*   **The Native Way:** Write code `->` Compile `.apk` / TestFlight build `->` Wait for Apple Review (if distributed) `->` Sideload onto device.
*   *Mitigation:* Using Expo's EAS Update service allows us to push JavaScript updates "Over-The-Air" instantly, retaining *most* of the PWA's deployment speed, provided we don't change the underlying native libraries.

---

## 6. Strategic Conclusion

If AIM-Connect is purely a personal tool where deployment speed is the highest priority, the PWA is sufficient. 

However, if the minor UX frictions (pasting, socket drops, synthetic keyboards) compound into significant workflow blockers, a React Native port using the "Widget Deep-Link Pattern" represents the ultimate evolution of the project. It delivers uncompromised hardware control while preserving the "One Tap, One Server" mental model.
