
# ase-tui

**Agentic Software Engineering (ASE) — Terminal User Interface**

`ase-tui` is a keyboard-driven TUI companion for the `ase` CLI tool.
It provides a live, tab-based interface to inspect and control the ASE
environment directly from the terminal — without leaving the shell.

## Screens

| Tab | Purpose |
|-----|---------|
| **Config** | Displays all ASE configuration keys with their values across the `default`, `user`, and `project` scopes |
| **Service** | Shows the current ASE service status and lets you start or stop the service with live streaming output |
| **Task** | Lists all available task IDs and lets you switch the active project task |
| **Setup** | Runs ASE setup operations — install, update, or uninstall |

## Keybindings

| Key | Action |
|-----|--------|
| `◀` / `▶` | Navigate between tabs |
| `↑` / `↓` | Scroll output |
| `Q` / `ESC` | Quit |

## Prerequisites

- Node.js ≥ 22
- `ase` CLI installed and on the `PATH`

## Installation

Install globally directly from GitHub:

```sh
npm install -g github:JochenHoertreiter/ase-tui
```

This registers the `ase-tui` command globally so it is available in any shell.
No local build step is required — the pre-built `dst/` output is included in the repository.

## Execution

Start the TUI from any directory by running:

```sh
ase-tui
```

The interface opens in an alternate screen buffer and returns you to the
normal terminal on exit (`Q` or `ESC`).

## Development

```sh
# Build once
npm start build

# Build and watch for source changes
npm start build-watch

# Lint
npm start lint

# Clean build output
npm start clean
```

## License

GPL-3.0-only — © 2026 Jochen Hörtreiter
