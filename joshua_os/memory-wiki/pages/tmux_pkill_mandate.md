# Tmux Process Restart Mandate

When restarting a foreground process inside a tmux session (e.g., `uvicorn`), **NEVER** chain a `pkill` command and a `tmux send-keys` start command together without an explicit external wait or by explicitly sending the start command *only* after confirming the TTY has reset.

If you run a command like `pkill -f "uvicorn" ; tmux send-keys "uvicorn" Enter`, the keystrokes will be injected into the dying process's buffer right before it exits. This effectively swallows the start command, leaving the tmux pane sitting at a dead bash prompt.

## Correct Approach
You MUST issue the `pkill` externally, wait for the process to actually die and release the prompt, and ONLY THEN send the new start command into the tmux pane.

Example:
```bash
# 1. Kill the process from the outside
pkill -9 -f "uvicorn main:app"

# 2. Wait a moment for the process to release the TTY in the pane
sleep 1

# 3. Clear the pane and send the restart command
tmux send-keys -t aim-connect-workspace C-c "clear" Enter "uvicorn main:app --host 0.0.0.0 --port 8000" Enter
```
