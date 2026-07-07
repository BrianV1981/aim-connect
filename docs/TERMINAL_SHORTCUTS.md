# Hacker Keyboard: Essential Terminal Shortcuts

The Sovereign Keyboard features a sticky `Ctrl` modifier key designed to send raw ASCII control bytes directly to the terminal. This allows for native, low-level interactions with `readline` (the engine powering your bash prompt), `tmux`, and `vim`.

Below is a cheat sheet of the most powerful and universally supported terminal shortcuts you can now execute effortlessly from your mobile device.

## The Navigation Speedhacks
* **`Ctrl` + `A`**: Instantly jump your cursor to the absolute **START** of the line. (Incredible when you type a long command and realize you forgot `sudo` at the beginning).
* **`Ctrl` + `E`**: Instantly jump your cursor to the absolute **END** of the line.
* **`Ctrl` + `R`**: **Reverse Search History.** This is magic. Tap this, then start typing a piece of a command you ran 3 days ago. It will instantly search your history and autocomplete it.

## The Destruction Speedhacks
* **`Ctrl` + `W`**: Delete the word immediately behind the cursor.
* **`Ctrl` + `U`**: Delete *everything* from your cursor to the start of the line. (Essentially a lightning-fast "clear this line" button).
* **`Ctrl` + `K`**: Delete *everything* from your cursor to the end of the line.

## The System Controls
* **`Ctrl` + `L`** (lowercase L): Instantly clears the screen (identical to typing `clear` and hitting enter).
* **`Ctrl` + `C`**: Sends SIGINT (Interrupt). Instantly kills or cancels the currently running foreground process or script.
* **`Ctrl` + `D`**: Sends EOF (End of File). If you are on an empty prompt, this instantly closes the terminal, exits the SSH session, or logs you out.
* **`Ctrl` + `Z`**: Suspends whatever app is currently running and throws it into the background so you get your bash prompt back (you can bring it back to the foreground by typing `fg`).

---
*Note: Because the `Ctrl` key operates at the raw byte level, it will perfectly interface with advanced terminal multiplexers like Tmux (`Ctrl+B` prefix) and text editors like Nano (`Ctrl+O` to save, `Ctrl+X` to exit).*
