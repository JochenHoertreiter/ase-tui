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
import cliTruncate from "cli-truncate";
import OutputBox from "../components/OutputBox.js";
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
/*  derive each key's effective scope/value by priority project > user > default  */
const buildRows = (userMap, projectMap) => {
    const keys = new Set([...userMap.keys(), ...projectMap.keys()]);
    const get = (map, scope, key) => {
        const e = map.get(key);
        return e?.scope === scope ? e.value : "";
    };
    return [...keys].sort().map((key) => {
        const project = get(projectMap, "project", key);
        const user = get(userMap, "user", key);
        const dflt = get(userMap, "default", key) || get(projectMap, "default", key);
        if (project)
            return { key, scope: "Project", value: project };
        if (user)
            return { key, scope: "User", value: user };
        return { key, scope: "default", value: dflt };
    });
};
const pad = (s, w) => s.length >= w ? s.slice(0, w) : s + " ".repeat(w - s.length);
/*  color each scope by its override rank: default (base) < User < Project (active override)  */
const scopeColor = (scope) => scope === "Project" ? "green" :
    scope === "User" ? "blue" :
        "gray";
const ConfigScreen = ({ escBlockedRef, onHint, screenWidth, screenHeight }) => {
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);
    const [error, setError] = useState("");
    const [mode, setMode] = useState("view");
    const [selectedRow, setSelectedRow] = useState(0);
    const [presetIdx, setPresetIdx] = useState(0);
    const [inputVal, setInputVal] = useState("");
    const [output, setOutput] = useState([]);
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
        else if (mode === "output")
            onHint([
                { key: "↑ ↓ / PgUp/PgDn", desc: "scroll output" },
                { key: "ESC", desc: "back" }
            ]);
        else
            onHint([
                { key: "↑ ↓", desc: "navigate keys" },
                { key: "⏎", desc: "edit value" },
                { key: "i", desc: "init preset" },
                { key: "o", desc: "output" }
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
                setInputVal(row.value);
                setMode("edit");
            }
            else if (input === "i") {
                setPresetIdx(0);
                setMode("preset");
            }
            else if (input === "o")
                setMode("output");
        }
        else if (mode === "output") {
            if (key.escape)
                setMode("view");
            /*  ↑↓ and pageUp/pageDown are handled by OutputBox internally  */
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
                setMode("view");
                setInputVal("");
                if (v === "") {
                    /*  empty value deletes the project override; effective scope/value recomputed on reload  */
                    execa("ase", ["config", "--scope", "project", "delete", k])
                        .then(() => {
                        setOutput([`Deleted ${k}`]);
                        reload().catch(() => { });
                    })
                        .catch((err) => {
                        setOutput([`Error: ${err instanceof Error ? err.message : String(err)}`]);
                        reload().catch(() => { });
                    });
                }
                else {
                    /*  optimistic state update — no reload flicker  */
                    setRows((prev) => prev.map((r, i) => i === selectedRow ? { ...r, scope: "Project", value: v } : r));
                    execa("ase", ["config", "--scope", "project", "set", k, v])
                        .then(() => { setOutput([`Set ${k} = ${v}`]); })
                        .catch((err) => {
                        setOutput([`Error: ${err instanceof Error ? err.message : String(err)}`]);
                        /*  revert optimistic update on failure  */
                        reload().catch(() => { });
                    });
                }
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
            setOutput([`Applied preset: ${item.value}`]);
            reload().catch(() => { });
        }
        catch (err) {
            setOutput([`Error: ${err instanceof Error ? err.message : String(err)}`]);
        }
    };
    /* dynamic column widths: KEY/SCOPE fit longest cell, VALUE fits longest cell but clamped to screen width */
    const colW = (header, cells) => cells.reduce((m, c) => Math.max(m, c.length), header.length);
    const keyW = colW("KEY", rows.map((r) => r.key));
    const scopeW = colW("SCOPE", rows.map((r) => r.scope));
    /* 2 indicator + 2 inter-column gaps of 2 chars each = 6 chars of fixed chrome */
    const valueAvail = Math.max(1, screenWidth - keyW - scopeW - 6);
    const valueW = Math.min(colW("VALUE", rows.map((r) => r.value)), valueAvail);
    const hdr = (_jsxs(Text, { children: [_jsxs(Text, { color: 'cyan', children: ["  ", pad("KEY", keyW)] }), "  ", _jsx(Text, { color: 'cyan', children: pad("SCOPE", scopeW) }), "  ", _jsx(Text, { color: 'cyan', children: pad("VALUE", valueW) })] }));
    const sep = (_jsx(Text, { color: 'gray', children: "─".repeat(keyW + scopeW + valueW + 6) }));
    /* output pane height: screen minus table (hdr + sep + rows + blank), the output header and padding */
    const tableH = 2 + rows.length + 1;
    const presetH = mode === "preset" ? PRESET_ITEMS.length + 1 : 0;
    const outputW = Math.max(1, screenWidth - 2);
    const outputH = Math.max(1, screenHeight - tableH - presetH - 2);
    return (_jsx(Box, { flexDirection: 'column', padding: 1, children: loading ?
            _jsxs(Text, { children: [_jsx(Spinner, { type: 'dots' }), " Loading..."] }) :
            error ?
                _jsx(Text, { color: 'red', children: error }) :
                _jsxs(Box, { flexDirection: 'column', children: [hdr, sep, rows.map((r, i) => {
                            const isSelected = i === selectedRow;
                            const indicator = isSelected ? _jsx(Text, { color: 'cyan', children: "\u25B6 " }) : _jsx(Text, { children: "  " });
                            const valueCol = (mode === "edit" && isSelected) ?
                                _jsxs(Text, { color: 'cyan', children: [inputVal, _jsx(Text, { color: 'cyan', children: "\u2588" })] }) :
                                _jsx(Text, { color: 'white', children: pad(cliTruncate(r.value, valueW), valueW) });
                            return (_jsxs(Text, { children: [indicator, _jsx(Text, { color: 'white', children: pad(r.key, keyW) }), "  ", _jsx(Text, { color: scopeColor(r.scope), children: pad(r.scope, scopeW) }), "  ", valueCol] }, r.key));
                        }), _jsx(Text, { children: " " }), mode === "preset" ?
                            _jsx(Box, { flexDirection: 'column', children: _jsx(SelectList, { items: PRESET_ITEMS, selectedIndex: presetIdx, isFocused: true, header: 'Select preset:', maxVisible: PRESET_ITEMS.length + 1 }) }) :
                            null, _jsx(Text, { color: mode === "output" ? "cyan" : "gray", children: "Config output" }), _jsx(OutputBox, { lines: output, active: mode === "output", maxVisible: outputH, contentWidth: outputW, borderColor: mode === "output" ? "cyan" : "gray" })] }) }));
};
export default ConfigScreen;
