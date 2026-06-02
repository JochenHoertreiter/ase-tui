import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/*
**  Agentic Software Engineering (ASE) - Terminal User Interface (TUI)
**  Copyright (c) 2026 Jochen Hörtreiter <Jochen.Hoertreiter@googlemail.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/
import { useEffect, useState } from "react";
import { Box, Text } from "ink";
import fs from "node:fs";
import path from "node:path";
import OutputBox from "./OutputBox.js";
/*  global debug gate: logging is silent unless ASE_TUI_DEBUG is set  */
const enabled = Boolean(process.env.ASE_TUI_DEBUG);
/*  file sink: append one JSON line per entry to this file when enabled  */
const logDir = path.resolve(".ase-tui");
const logFile = path.join(logDir, "ase-tui.log");
/*  module-level ring buffer of the most recent entries  */
const BUFFER_MAX = 200;
const buffer = [];
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());
const errText = (err) => err instanceof Error ? (err.stack ?? err.message) : String(err);
/*  core logging primitive: append to the ring buffer and mirror to console  */
export const log = (scope, level, msg, err) => {
    if (!enabled)
        return;
    const entry = { ts: Date.now(), scope, level, msg, err };
    buffer.push(entry);
    if (buffer.length > BUFFER_MAX)
        buffer.shift();
    fs.mkdirSync(logDir, { recursive: true });
    const record = err === undefined ? { ts: entry.ts, scope, level, msg } : { ts: entry.ts, scope, level, msg, data: err };
    fs.appendFileSync(logFile, JSON.stringify(record) + "\n", "utf8");
    const tag = `[ase-tui] ${scope}: ${msg}`;
    const sink = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    if (err === undefined)
        sink(tag);
    else
        sink(tag, errText(err));
    notify();
};
/*  convenience wrappers per level  */
export const logDebug = (scope, msg, err) => log(scope, "debug", msg, err);
export const logInfo = (scope, msg, err) => log(scope, "info", msg, err);
export const logWarn = (scope, msg, err) => log(scope, "warn", msg, err);
export const logError = (scope, msg, err) => log(scope, "error", msg, err);
/*  React hook returning the current buffered entries, kept in sync via subscription  */
export const useDebugLog = () => {
    const [entries, setEntries] = useState(() => buffer.slice());
    useEffect(() => {
        const sync = () => setEntries(buffer.slice());
        listeners.add(sync);
        sync();
        return () => { listeners.delete(sync); };
    }, []);
    return entries;
};
const levelColor = (level) => level === "error" ? "red" : level === "warn" ? "yellow" : level === "info" ? "cyan" : "gray";
const fmt = (e) => {
    const time = new Date(e.ts).toISOString().slice(11, 19);
    const base = `${time} ${e.level.toUpperCase().padEnd(5)} ${e.scope}: ${e.msg}`;
    return e.err === undefined ? base : `${base} — ${errText(e.err)}`;
};
/*  optional in-TUI overlay rendering the buffered entries; opt-in per screen  */
const DebugPanel = ({ active, maxVisible, contentWidth, borderColor = "gray" }) => {
    const entries = useDebugLog();
    if (!enabled)
        return null;
    const lines = entries.map(fmt);
    return (_jsxs(Box, { flexDirection: 'column', width: contentWidth, children: [_jsx(Text, { color: borderColor, children: "Debug Log" }), _jsx(OutputBox, { lines: lines, active: active, maxVisible: maxVisible, contentWidth: contentWidth, borderColor: borderColor })] }));
};
export default DebugPanel;
