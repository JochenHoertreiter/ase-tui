import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/*
**  Agentic Software Engineering (ASE) - Terminal User Interface (TUI)
**  Copyright (c) 2026 Jochen Hörtreiter <Jochen.Hoertreiter@googlemail.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/
import { useState, useEffect, useRef, useCallback } from "react";
import { render, Box, Text, useInput, useApp, useStdout } from "ink";
import cliTruncate from "cli-truncate";
import ConfigScreen from "./screens/ConfigScreen.js";
import ServiceScreen from "./screens/ServiceScreen.js";
import TaskScreen from "./screens/TaskScreen.js";
import SetupScreen from "./screens/SetupScreen.js";
import MCPScreen from "./screens/MCPScreen.js";
import HintBar from "./components/HintBar.js";
/* fixed line counts for layout budgeting */
const HEADER_LINES = 5; /* 1 title + 3 tab-bar (border+content+border) + 1 padding */
const HINT_LINES = 1; /* 1 hint bar at bottom */
const SCREEN_PAD_H = 2; /* padding={1} inside each screen = 1 left + 1 right */
/* tab border styles */
const BORDER_ACTIVE = {
    topLeft: "╭", top: "─", topRight: "╮",
    bottomLeft: "╯", bottom: " ", bottomRight: "╰",
    left: "│", right: "│"
};
const BORDER_INACTIVE = {
    topLeft: "╭", top: "─", topRight: "╮",
    bottomLeft: "┴", bottom: "─", bottomRight: "┴",
    left: "│", right: "│"
};
const tabs = [
    { label: "Config", value: "config" },
    { label: "Service", value: "service" },
    { label: "Task", value: "task" },
    { label: "Setup", value: "setup" },
    { label: "MCP", value: "mcp" }
];
const TITLE = "⧉ ASE — Agentic Software Engineering - Terminal User Interface (tui)";
const BASE_HINT = [
    { key: "← →", desc: "navigate tabs" },
    { key: "q", desc: "quit" }
];
const App = () => {
    const { exit } = useApp();
    const { stdout } = useStdout();
    const escBlockedRef = useRef(false);
    const [tab, setTab] = useState(0);
    const [hint, setHint] = useState(BASE_HINT);
    const termSize = () => ({ termW: stdout.columns ?? 80, termH: stdout.rows ?? 24 });
    const [{ termW, termH }, setTermSize] = useState(termSize);
    useEffect(() => {
        const onResize = () => setTermSize(termSize());
        stdout.on("resize", onResize);
        return () => { stdout.off("resize", onResize); };
    }, [stdout]);
    const screenW = Math.max(1, termW - SCREEN_PAD_H);
    const screenH = Math.max(1, termH - HEADER_LINES - HINT_LINES);
    const contentH = screenH + HINT_LINES;
    useInput((input, key) => {
        if ((input === "q" || input === "Q" || key.escape) && !escBlockedRef.current)
            exit();
        else if (key.leftArrow) {
            setTab((t) => (t - 1 + tabs.length) % tabs.length);
            setHint(BASE_HINT);
        }
        else if (key.rightArrow) {
            setTab((t) => (t + 1) % tabs.length);
            setHint(BASE_HINT);
        }
    });
    /* available width inside paddingLeft={1} container */
    const innerW = Math.max(1, termW - 1);
    const screen = tabs[tab].value;
    /* each tab occupies: 1 (left border) + 1 (paddingLeft) + label + 1 (paddingRight) + 1 (right border) */
    const tabsWidth = 1 + tabs.reduce((sum, t) => sum + t.label.length + 4, 0);
    const restW = Math.max(0, termW - tabsWidth - 1);
    const onHintCb = useCallback((s) => setHint(s ? [...s, ...BASE_HINT] : BASE_HINT), [setHint]);
    return (_jsxs(Box, { flexDirection: 'column', width: termW, height: termH, children: [_jsx(Box, { paddingLeft: 1, children: _jsx(Text, { bold: true, color: 'cyan', children: cliTruncate(TITLE, innerW) }) }), _jsxs(Box, { flexDirection: 'row', paddingLeft: 1, children: [tabs.map((t, i) => i === tab ?
                        _jsx(Box, { borderStyle: BORDER_ACTIVE, borderColor: 'gray', paddingLeft: 1, paddingRight: 1, children: _jsx(Text, { color: 'cyan', children: t.label }) }, t.value) :
                        _jsx(Box, { borderStyle: BORDER_INACTIVE, borderColor: 'gray', paddingLeft: 1, paddingRight: 1, children: _jsx(Text, { color: 'gray', children: t.label }) }, t.value)), _jsx(Box, { alignSelf: 'flex-end', children: _jsx(Text, { color: 'gray', children: "─".repeat(restW) }) })] }), _jsxs(Box, { height: contentH, children: [screen === "config" && _jsx(ConfigScreen, { escBlockedRef: escBlockedRef, onHint: onHintCb, screenWidth: screenW, screenHeight: screenH }), screen === "service" && _jsx(ServiceScreen, { escBlockedRef: escBlockedRef, onHint: onHintCb, screenWidth: screenW, screenHeight: screenH }), screen === "task" && _jsx(TaskScreen, { escBlockedRef: escBlockedRef, onHint: onHintCb, screenWidth: screenW, screenHeight: screenH }), screen === "setup" && _jsx(SetupScreen, { escBlockedRef: escBlockedRef, onHint: onHintCb, screenWidth: screenW, screenHeight: screenH }), screen === "mcp" && _jsx(MCPScreen, { escBlockedRef: escBlockedRef, onHint: onHintCb, screenWidth: screenW, screenHeight: screenH })] }), _jsx(HintBar, { hint: hint, width: termW })] }));
};
render(_jsx(App, {}), { alternateScreen: true });
