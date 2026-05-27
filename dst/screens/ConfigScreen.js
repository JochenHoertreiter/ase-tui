import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/*
**  Agentic Software Engineering (ASE)
**  Copyright (c) 2025-2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/
import { useEffect, useState } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { execa } from "execa";
import stripAnsi from "strip-ansi";
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
const ConfigScreen = () => {
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);
    const [error, setError] = useState("");
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
        load().catch((e) => { console.error("[ase-tui] unexpected:", e); });
        return () => { cancelled = true; };
    }, []);
    const hdr = (_jsxs(Text, { children: [_jsx(Text, { color: 'blue', children: pad("KEY", COL_W.key) }), "  ", _jsx(Text, { color: 'blue', children: pad("DEFAULT", COL_W.default) }), "  ", _jsx(Text, { color: 'blue', children: pad("USER", COL_W.user) }), "  ", _jsx(Text, { color: 'blue', children: pad("PROJECT", COL_W.project) })] }));
    const sep = (_jsx(Text, { color: 'gray', children: "─".repeat(COL_W.key + COL_W.default + COL_W.user + COL_W.project + 6) }));
    return (_jsx(Box, { flexDirection: 'column', padding: 1, children: loading ?
            _jsxs(Text, { children: [_jsx(Spinner, { type: 'dots' }), " Loading..."] }) :
            error ?
                _jsx(Text, { color: 'red', children: error }) :
                _jsxs(Box, { flexDirection: 'column', children: [hdr, sep, rows.map((r) => _jsxs(Text, { children: [_jsx(Text, { color: 'white', children: pad(r.key, COL_W.key) }), "  ", _jsx(Text, { color: 'gray', children: pad(r.default, COL_W.default) }), "  ", _jsx(Text, { color: 'yellow', children: pad(r.user, COL_W.user) }), "  ", _jsx(Text, { color: 'cyan', children: pad(r.project, COL_W.project) })] }, r.key))] }) }));
};
export default ConfigScreen;
