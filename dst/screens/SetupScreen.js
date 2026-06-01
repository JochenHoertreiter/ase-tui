import { jsx as _jsx } from "react/jsx-runtime";
/*
**  Agentic Software Engineering (ASE) - Terminal User Interface (TUI)
**  Copyright (c) 2026 Jochen Hörtreiter <Jochen.Hoertreiter@googlemail.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/
import ActionScreen from "./ActionScreen.js";
const actions = [
    { label: "Install", value: "install" },
    { label: "Update", value: "update" },
    { label: "Uninstall", value: "uninstall" },
    { label: "Enable", value: "enable" },
    { label: "Disable", value: "disable" }
];
const SetupScreen = ({ screenWidth, screenHeight }) => _jsx(ActionScreen, { command: 'setup', actions: actions, listHeader: 'Commands', screenWidth: screenWidth, screenHeight: screenHeight });
export default SetupScreen;
