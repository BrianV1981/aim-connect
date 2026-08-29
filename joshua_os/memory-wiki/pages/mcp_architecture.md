# MCP Architecture Pivot (August 2026)

## The Revelation
The project has undergone a fundamental architectural pivot from a "CLI wrapper" model to a "Bring Your Own Agent" model powered by the Model Context Protocol (MCP).

Previously, the strategy for `leaddeeds.com/analyst` was to host our own AI orchestrator (J.O.S.H.U.A.) running fat LLM CLI processes (OpenCode, Grok CLI, AGY, or `dsh`) inside `bwrap` sandboxes, reading their output logs, and streaming them to a custom React frontend.

**The new paradigm:** LeadDeeds is a Real Estate Data Platform that natively plugs into any AI Agent.

We are dropping the burden of building the agent UI and orchestration. Instead, we are building a multi-tenant **MCP Server** (`aim-mcp`). 
End users (analysts) will use their local agent of choice (Antigravity 2.0 app, Claude Desktop, Cursor, `dsh` web) and connect to our remote MCP server via SSE transport.

## Key Changes
1. **The MCP Server**: The backend will host an MCP server that exposes tools (e.g., Lead manipulation, Database queries, SMS sending) and the LeadDeeds database schema.
2. **The Client**: Users will bring their own compute and LLM API keys. They will configure their local agents to connect to our MCP Server URL. This leverages the billion-dollar R&D of Google (Antigravity) and Anthropic (Claude) for the chat UI, trajectory tracking, and local context window management.
3. **The Web Analyst Page (Feature Frozen)**: The existing `leaddeeds.com/analyst` page and its underlying J.O.S.H.U.A. architecture (CLI wrappers/tmux/bwrap) are not being sunset, but they are now feature-frozen. They will remain online as a baseline, generic chat interface for users who do not want to use an MCP client. It will maintain standard database access and basic memory skills (`aim-memory-wiki` and `aim-handoff`), but will *not* evolve to support complex features like parallel subagent nodes. The primary strategy is to push power users toward MCP server usage.

## Architectural Wins
- **Server Load**: We no longer need to spin up 50 instances of 500MB CLI Node processes on our servers. The backend only handles API/MCP transport requests.
- **UI Independence**: We no longer have to maintain a complex React agent chat interface that competes with desktop apps.
- **Extensibility**: By adopting the open MCP standard, any future AI client that supports MCP can instantly become a "LeadDeeds Analyst" just by pointing to our URL.

## Next Steps
- Strip complex features (like parallel subagent nodes) from the current web analyst page.
- Build the `aim-mcp` Python/Node server to wrap the LeadDeeds database interactions into MCP Tool schemas.
- Implement an authentication layer over the SSE transport to ensure only active LeadDeeds customers can connect their local agents.
