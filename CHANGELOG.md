
# ChangeLog

## 0.0.3 (2026-05-27)

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
