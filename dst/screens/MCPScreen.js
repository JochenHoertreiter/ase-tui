import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/*
**  Agentic Software Engineering (ASE)
**  Copyright (c) 2025-2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/
import { useEffect, useState, useRef } from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import { DateTime } from "luxon";
import stripAnsi from "strip-ansi";
import { execa } from "execa";
import { SelectIndicator, SelectItem, runCommand } from "./Screen.js";
import OutputBox from "../components/OutputBox.js";
/*  parse "ase setup mcp list" table output into server list  */
const parseMcpList = (stdout) => {
    const servers = [];
    for (const raw of stdout.split("\n")) {
        const line = stripAnsi(raw);
        if (!line.includes("│"))
            continue;
        const cols = line.split("│").map((c) => c.trim()).filter((_, i) => i > 0);
        if (cols.length < 2)
            continue;
        const [id, name] = cols;
        if (!id || id === "ID")
            continue;
        servers.push({ id, name });
    }
    return servers;
};
const ACTIONS = [
    { label: "Activate", value: "activate" },
    { label: "Deactivate", value: "deactivate" }
];
const MCPScreen = ({ screenWidth, screenHeight }) => {
    const [loading, setLoading] = useState(true);
    const [servers, setServers] = useState([]);
    const [selected, setSelected] = useState(0);
    const [running, setRunning] = useState(false);
    const [lines, setLines] = useState([]);
    const runningRef = useRef(false);
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await execa("ase", ["setup", "mcp", "list"]);
                if (!cancelled) {
                    setServers(parseMcpList(res.stdout));
                    setLoading(false);
                }
            }
            catch (e) {
                if (!cancelled) {
                    setServers([]);
                    setLoading(false);
                }
            }
        };
        load().catch((e) => { console.error("[ase-tui] unexpected:", e); });
        return () => { cancelled = true; };
    }, []);
    const serverItems = servers.map((s, i) => ({
        label: `[${s.id}] ${s.name}`,
        value: String(i)
    }));
    const handleServerSelect = (item) => {
        setSelected(Number(item.value));
    };
    const handleActionSelect = async (item) => {
        if (runningRef.current)
            return;
        const srv = servers[selected];
        if (!srv)
            return;
        runningRef.current = true;
        setRunning(true);
        setLines([]);
        let count = 0;
        try {
            await runCommand(["setup", "mcp", item.value, srv.id], (line) => {
                setLines((prev) => [...prev, line]);
                count++;
            });
            if (count === 0)
                setLines([`[${DateTime.now().toFormat("yyyy-LL-dd HH:mm:ss.SSS")}] done`]);
        }
        catch (err) {
            setLines((prev) => [...prev, `Error: ${err instanceof Error ? err.message : String(err)}`]);
        }
        finally {
            runningRef.current = false;
            setRunning(false);
        }
    };
    /* layout: server list | action list | output */
    const serversW = 28;
    const actionsW = 16;
    const outputW = Math.max(1, screenWidth - serversW - actionsW);
    const outputH = Math.max(1, screenHeight - 2);
    return (_jsx(Box, { flexDirection: 'column', padding: 1, children: loading ?
            _jsxs(Text, { children: [_jsx(Spinner, { type: 'dots' }), " Loading MCP servers..."] }) :
            _jsxs(Box, { flexDirection: 'row', children: [_jsxs(Box, { flexDirection: 'column', width: serversW, children: [_jsx(Text, { color: 'blue', children: "MCP Servers" }), _jsx(SelectInput, { items: serverItems, onSelect: handleServerSelect, indicatorComponent: SelectIndicator, itemComponent: SelectItem })] }), _jsxs(Box, { flexDirection: 'column', width: actionsW, children: [_jsx(Text, { color: 'blue', children: "Action" }), running ?
                                _jsxs(Text, { children: [_jsx(Spinner, { type: 'dots' }), " Running..."] }) :
                                _jsx(SelectInput, { items: ACTIONS, onSelect: handleActionSelect, indicatorComponent: SelectIndicator, itemComponent: SelectItem })] }), _jsx(OutputBox, { lines: lines, active: !running, maxVisible: outputH, contentWidth: outputW })] }) }));
};
export default MCPScreen;
