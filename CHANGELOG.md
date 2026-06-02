# ChangeLog

## 0.0.5 (2026-06-02)

-   FEATURE:     add central `Logger` component with log levels, ring buffer, `ASE_TUI_DEBUG` gate, file sink, `useDebugLog` hook and `DebugPanel`
-   FEATURE:     add `AGENTS.md` with agent instructions for build/test, generated `dst/` files, and versioning
-   IMPROVEMENT: route all screen logging through central `Logger` instead of inline `console.*` calls
-   BUGFIX:      wrong `OutputBox` height led to render errors; lines got skipped/cut
-   REFACTOR:    extract `HintBar` into its own component
-   REFACTOR:    `OutputBox` uses `Logger` file sink instead of its own `outputbox.log`

## 0.0.4 (2026-05-28)

-   IMPROVEMENT: add right-aligned line numbers to `OutputBox` output lines
-   REFACTOR:    move `OutputBox` component from `screens/` into `components/` folder
-   REFACTOR:    centralize terminal size calculation in `ase-tui`, pass `screenWidth`/`screenHeight` as props to all screens

## 0.0.3 (2026-05-28)

-   IMPROVEMENT: differentiate hint bar keystroke and description colors via `HintSegment`
-   IMPROVEMENT: memoize `onHint` callback via `useCallback` to avoid unnecessary re-renders
-   IMPROVEMENT: load task preview on demand instead of eagerly on task selection
-   IMPROVEMENT: show spinner in preview header while asynchronously loading preview content
-   IMPROVEMENT: guard `switch`/`delete` actions with `running`/`runningRef` to block concurrent ops
-   BUGFIX:      use `runningRef.current` in `useInput` to avoid stale-closure on `running` state
-   BUGFIX:      clamp `selected` index to valid range after purge empties the task list
-   BUGFIX:      change `else if` to `if` for `actions`/`preview` branches in `useInput`
-   REFACTOR:    remove `Mode` type; integrate `"rename"` directly into `Focus` union type
-   REFACTOR:    extract `errMsg()` helper to deduplicate error-message string coercion
-   CLEANUP:     correct hint-bar key symbols (`◀ ▶`→`← →`, `Q`→`q`, `P`→`p`)
-   CLEANUP:     remove inline rename hint text; hint bar now covers rename instructions

## 0.0.2 (2026-05-27)

-   FEATURE:     add dynamic global hint bar via `onHint` callback in `ase-tui`/`TaskScreen`
-   FEATURE:     add "Task Preview" header and dynamic `borderColor` prop to `OutputBox`
-   IMPROVEMENT: navigate to preview via `p` key from tasks/actions focus; ESC restores previous focus
-   IMPROVEMENT: `return` in actions focus executes action directly without implicit preview jump
-   CLEANUP:     reformat ternary expression in `ConfigScreen` to match code style

## 0.0.1 (2026-05-27)

-   FEATURE:     initial TUI with Config, Service, Task, and Setup screens
-   FEATURE:     Unix and Windows bin-wrapper (`bin/ase-tui`, `bin/ase-tui.bat`, `bin/ase-tui.cjs`)
-   FEATURE:     README with installation and execution instructions
-   FEATURE:     add MCP tab and MCPScreen component to TUI
-   FEATURE:     add inline config editing and preset initialization in ConfigScreen
-   FEATURE:     add task actions (switch, delete, rename, purge) and preview panel in TaskScreen
-   FEATURE:     add Enable/Disable actions to SetupScreen
-   IMPROVEMENT: block global ESC quit when TaskScreen focus is within sub-panels
