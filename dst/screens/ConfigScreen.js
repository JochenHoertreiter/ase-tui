import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
/*
**  Agentic Software Engineering (ASE) - Terminal User Interface (TUI)
**  Copyright (c) 2026 Jochen Hörtreiter <Jochen.Hoertreiter@googlemail.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/
import { useEffect, useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import { execa } from "execa";
import stripAnsi from "strip-ansi";
import SelectList from "../components/SelectList.js";
import { logError } from "../components/Logger.js";
/*  parse "ase config list" table output into a map of key -> { value, scope }  */
const parseConfigList = (stdout) => {
    const map = new Map();
    for (const raw of stdout.split("\n")) {
        const line = stripAnsi(raw);
        if (!line.includes("│"))
            continue;
        const cols = line.split("│").map((c) => c.trim()).filter((_, i) => i > 0);
        if (cols.length < 3)
            continue;
        const [key, value, scope] = cols;
        if (!key || key === "KEY")
            continue;
        map.set(key, { value, scope });
    }
    return map;
};
const PRESET_ITEMS = [
    { label: "default", value: "default" },
    { label: "vibe", value: "vibe" },
    { label: "pro", value: "pro" },
    { label: "industry", value: "industry" }
];
const buildRows = (userMap, projectMap) => {
    const keys = new Set([...userMap.keys(), ...projectMap.keys()]);
    const get = (map, scope, key) => {
        const e = map.get(key);
        return e?.scope === scope ? e.value : "";
    };
    return [...keys].sort().map((key) => ({
        key,
        default: get(userMap, "default", key) || get(projectMap, "default", key),
        user: get(userMap, "user", key),
        project: get(projectMap, "project", key)
    }));
};
const COL_W = { key: 16, default: 12, user: 12, project: 12 };
const pad = (s, w) => s.length >= w ? s.slice(0, w) : s + " ".repeat(w - s.length);
const ConfigScreen = ({ escBlockedRef, onHint, screenWidth: _screenWidth, screenHeight: _screenHeight }) => {
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);
    const [error, setError] = useState("");
    const [mode, setMode] = useState("view");
    const [selectedRow, setSelectedRow] = useState(0);
    const [presetIdx, setPresetIdx] = useState(0);
    const [inputVal, setInputVal] = useState("");
    const [output, setOutput] = useState(null);
    const reload = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const [userRes, projectRes] = await Promise.all([
                execa("ase", ["config", "--scope", "user", "list"]),
                execa("ase", ["config", "--scope", "project", "list"])
            ]);
            const userMap = parseConfigList(userRes.stdout);
            const projectMap = parseConfigList(projectRes.stdout);
            setRows(buildRows(userMap, projectMap));
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
        setLoading(false);
    }, []);
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const [userRes, projectRes] = await Promise.all([
                    execa("ase", ["config", "--scope", "user", "list"]),
                    execa("ase", ["config", "--scope", "project", "list"])
                ]);
                if (!cancelled) {
                    const userMap = parseConfigList(userRes.stdout);
                    const projectMap = parseConfigList(projectRes.stdout);
                    setRows(buildRows(userMap, projectMap));
                    setLoading(false);
                }
            }
            catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : String(e));
                    setLoading(false);
                }
            }
        };
        load().catch((e) => { logError("ConfigScreen", "unexpected", e); });
        return () => { cancelled = true; };
    }, []);
    /*  sync escBlockedRef so App's global ESC handler knows when to block  */
    useEffect(() => {
        escBlockedRef.current = mode !== "view";
        return () => { escBlockedRef.current = false; };
    }, [mode, escBlockedRef]);
    /*  delegate mode-dependent hint text to the master hint bar  */
    useEffect(() => {
        if (mode === "edit")
            onHint([
                { key: "⏎", desc: "save" },
                { key: "ESC", desc: "cancel" }
            ]);
        else if (mode === "preset")
            onHint([
                { key: "↑ ↓", desc: "navigate presets" },
                { key: "⏎", desc: "select preset" },
                { key: "ESC", desc: "back" }
            ]);
        else
            onHint([
                { key: "↑ ↓", desc: "navigate keys" },
                { key: "⏎", desc: "edit value" },
                { key: "i", desc: "init preset" }
            ]);
    }, [mode, onHint]);
    useInput((input, key) => {
        if (mode === "view") {
            if (key.upArrow)
                setSelectedRow((r) => Math.max(0, r - 1));
            else if (key.downArrow)
                setSelectedRow((r) => Math.min(rows.length - 1, r + 1));
            else if (key.return && rows.length > 0) {
                const row = rows[selectedRow];
                const current = row.project || row.user || row.default;
                setInputVal(current);
                setMode("edit");
            }
            else if (input === "i") {
                setPresetIdx(0);
                setMode("preset");
            }
        }
        else if (mode === "preset") {
            if (key.escape)
                setMode("view");
            else if (key.upArrow)
                setPresetIdx((i) => Math.max(0, i - 1));
            else if (key.downArrow)
                setPresetIdx((i) => Math.min(PRESET_ITEMS.length - 1, i + 1));
            else if (key.return)
                handlePresetSelect(PRESET_ITEMS[presetIdx]).catch((e) => {
                    logError("ConfigScreen", "unexpected", e);
                });
        }
        else if (mode === "edit") {
            if (key.escape) {
                setMode("view");
                setInputVal("");
            }
            else if (key.return) {
                const row = rows[selectedRow];
                const k = row.key;
                const v = inputVal.trim();
                /*  optimistic state update — no reload flicker  */
                setRows((prev) => prev.map((r, i) => i === selectedRow ? { ...r, project: v } : r));
                setMode("view");
                setInputVal("");
                execa("ase", ["config", "--scope", "project", "set", k, v])
                    .then(() => { setOutput(`Set ${k} = ${v}`); })
                    .catch((err) => {
                    setOutput(`Error: ${err instanceof Error ? err.message : String(err)}`);
                    /*  revert optimistic update on failure  */
                    reload().catch(() => { });
                });
            }
            else if (key.backspace || key.delete)
                setInputVal((v) => v.slice(0, -1));
            else if (input && !key.ctrl && !key.meta)
                setInputVal((v) => v + input);
        }
    });
    const handlePresetSelect = async (item) => {
        setMode("view");
        try {
            await execa("ase", ["config", "--scope", "project", "init", item.value]);
            setOutput(`Applied preset: ${item.value}`);
            reload().catch(() => { });
        }
        catch (err) {
            setOutput(`Error: ${err instanceof Error ? err.message : String(err)}`);
        }
    };
    const hdr = (_jsxs(Text, { children: [_jsxs(Text, { color: 'blue', children: ["  ", pad("KEY", COL_W.key)] }), "  ", _jsx(Text, { color: 'blue', children: pad("DEFAULT", COL_W.default) }), "  ", _jsx(Text, { color: 'blue', children: pad("USER", COL_W.user) }), "  ", _jsx(Text, { color: 'blue', children: pad("PROJECT", COL_W.project) })] }));
    const sep = (_jsx(Text, { color: 'gray', children: "─".repeat(COL_W.key + COL_W.default + COL_W.user + COL_W.project + 8) }));
    return (_jsx(Box, { flexDirection: 'column', padding: 1, children: loading ?
            _jsxs(Text, { children: [_jsx(Spinner, { type: 'dots' }), " Loading..."] }) :
            error ?
                _jsx(Text, { color: 'red', children: error }) :
                _jsxs(Box, { flexDirection: 'column', children: [hdr, sep, rows.map((r, i) => {
                            const isSelected = i === selectedRow;
                            const indicator = isSelected ? _jsx(Text, { color: 'cyan', children: "\u25B6 " }) : _jsx(Text, { children: "  " });
                            const projectCol = (mode === "edit" && isSelected) ?
                                _jsxs(Text, { color: 'cyan', children: [pad(inputVal, COL_W.project), _jsx(Text, { color: 'cyan', children: "\u2588" })] }) :
                                _jsx(Text, { color: 'cyan', children: pad(r.project, COL_W.project) });
                            return (_jsxs(Text, { children: [indicator, _jsx(Text, { color: 'white', children: pad(r.key, COL_W.key) }), "  ", _jsx(Text, { color: 'gray', children: pad(r.default, COL_W.default) }), "  ", _jsx(Text, { color: 'yellow', children: pad(r.user, COL_W.user) }), "  ", projectCol] }, r.key));
                        }), _jsx(Text, { children: " " }), mode === "preset" ?
                            _jsx(Box, { flexDirection: 'column', children: _jsx(SelectList, { items: PRESET_ITEMS, selectedIndex: presetIdx, isFocused: true, header: 'Select preset:' }) }) :
                            null, output !== null && _jsx(Text, { color: 'yellow', children: output })] }) }));
};
export default ConfigScreen;
