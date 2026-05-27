@echo off
rem ##
rem ##  Agentic Software Engineering (ASE) - Terminal User Interface (TUI)
rem ##  Copyright (c) 2026 Jochen Hörtreiter <Jochen.Hoertreiter@googlemail.com>
rem ##  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
rem ##

setlocal

rem #   resolve our base directory
set "basedir=%~dp0"

rem #   pass-through execution
node "%basedir%ase-tui.cjs" %*

endlocal

