import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/*
**  Agentic Software Engineering (ASE) - Terminal User Interface (TUI)
**  Copyright (c) 2026 Jochen Hörtreiter <Jochen.Hoertreiter@googlemail.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/
import { useState, useRef, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import { DateTime } from "luxon";
import { execa } from "execa";
import { runCommand } from "./Screen.js";
import OutputBox from "../components/OutputBox.js";
import SelectList from "../components/SelectList.js";
import { logError } from "../components/Logger.js";
/*  parse the tool values out of the "-t, --tool" option of "ase setup install --help"  */
const parseToolList = (stdout) => {
    const block = stdout.split(/^ {2}-/m).find((s) => s.startsWith("t, --tool"));
    if (block === undefined)
        return [];
    const head = block.split("(default:")[0];
    return [...head.matchAll(/"([^"]+)"/g)].map((m) => ({ label: m[1], value: m[1] }));
};
const actions = [
    { label: "Install", value: "install" },
    { label: "Update", value: "update" },
    { label: "Uninstall", value: "uninstall" },
    { label: "Enable", value: "enable" },
    { label: "Disable", value: "disable" }
];
const SetupScreen = ({ escBlockedRef, onHint, screenWidth, screenHeight }) => {
    const [loading, setLoading] = useState(true);
    const [tools, setTools] = useState([]);
    const [running, setRunning] = useState(false);
    const [selected, setSelected] = useState(0);
    const [selectedTool, setSelectedTool] = useState(0);
    const [focus, setFocus] = useState("tools");
    const [outputs, setOutputs] = useState({});
    const runningRef = useRef(false);
    /*  the tool list is derived from the CLI, so it never drifts from "ase setup install"  */
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await execa("ase", ["setup", "install", "--help"]);
                if (!cancelled) {
                    setTools(parseToolList(res.stdout));
                    setLoading(false);
                }
            }
            catch (e) {
                if (!cancelled) {
                    setTools([]);
                    setLoading(false);
                }
            }
        };
        load().catch((e) => { logError("SetupScreen", "unexpected", e); });
        return () => { cancelled = true; };
    }, []);
    /*  output remembered per command and tool; switching either shows its last output  */
    const outputKey = tools.length > 0 ? `${actions[selected].value}:${tools[selectedTool].value}` : "";
    const lines = outputs[outputKey] ?? [];
    /*  sync escBlockedRef so App's global ESC handler knows when to block  */
    useEffect(() => {
        escBlockedRef.current = focus !== "tools";
        return () => { escBlockedRef.current = false; };
    }, [focus, escBlockedRef]);
    /*  delegate focus-dependent hint text to the master hint bar  */
    useEffect(() => {
        if (focus === "tools")
            onHint([
                { key: "↑ ↓", desc: "navigate tools" },
                { key: "⏎", desc: "select tool" }
            ]);
        else if (focus === "commands")
            onHint([
                { key: "↑ ↓", desc: "navigate commands" },
                { key: "⏎", desc: "execute command" },
                { key: "o", desc: "output" },
                { key: "ESC", desc: "back" }
            ]);
        else
            onHint([
                { key: "↑ ↓ / PgUp/PgDn", desc: "scroll output" },
                { key: "ESC", desc: "back" }
            ]);
    }, [focus, onHint]);
    const handleSelect = async (cmd, tool) => {
        if (runningRef.current)
            return;
        const key = `${cmd.value}:${tool.value}`;
        runningRef.current = true;
        setRunning(true);
        setOutputs((prev) => ({ ...prev, [key]: [] }));
        let count = 0;
        try {
            await runCommand(["setup", cmd.value, "--tool", tool.value], (line) => {
                setOutputs((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), line] }));
                count++;
            });
            if (count === 0)
                setOutputs((prev) => ({ ...prev, [key]: [`[${DateTime.now().toFormat("yyyy-LL-dd HH:mm:ss.SSS")}] done`] }));
        }
        catch (err) {
            setOutputs((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), `Error: ${err instanceof Error ? err.message : String(err)}`] }));
        }
        finally {
            runningRef.current = false;
            setRunning(false);
        }
    };
    useInput((input, key) => {
        if (runningRef.current)
            return;
        if (focus === "tools") {
            if (key.upArrow)
                setSelectedTool((t) => Math.max(0, t - 1));
            else if (key.downArrow)
                setSelectedTool((t) => Math.min(tools.length - 1, t + 1));
            else if (key.return && tools.length > 0)
                setFocus("commands");
        }
        else if (focus === "commands") {
            if (key.upArrow)
                setSelected((s) => Math.max(0, s - 1));
            else if (key.downArrow)
                setSelected((s) => Math.min(actions.length - 1, s + 1));
            else if (key.escape)
                setFocus("tools");
            else if (key.return) {
                setFocus("output");
                handleSelect(actions[selected], tools[selectedTool]).catch((e) => {
                    logError("SetupScreen", "unexpected", e);
                });
            }
            else if (input === "o")
                setFocus("output");
        }
        else if (focus === "output") {
            if (key.escape)
                setFocus("commands");
            /*  ↑↓ and pageUp/pageDown are handled by OutputBox internally  */
        }
    });
    /* left columns: fixed widths for tool and action list */
    const toolsW = 16;
    const actionsW = 20;
    const outputW = Math.max(1, screenWidth - toolsW - actionsW);
    const outputH = Math.max(1, screenHeight - 1);
    return (_jsx(Box, { flexDirection: 'column', padding: 1, children: loading ?
            _jsxs(Text, { children: [_jsx(Spinner, { type: 'dots' }), " Loading tools..."] }) :
            _jsxs(Box, { flexDirection: 'row', children: [_jsx(Box, { flexDirection: 'column', width: toolsW, children: _jsx(SelectList, { items: tools, selectedIndex: selectedTool, isFocused: focus === "tools", header: 'Tools', maxVisible: outputH + 1 }) }), _jsx(Box, { flexDirection: 'column', width: actionsW, children: _jsx(SelectList, { items: actions, selectedIndex: selected, isFocused: focus === "commands", header: 'Commands', maxVisible: outputH + 1, busyIndex: running ? selected : undefined }) }), _jsxs(Box, { flexDirection: 'column', width: outputW, children: [_jsx(Text, { color: focus === "output" ? "cyan" : "gray", children: "Command output" }), _jsx(OutputBox, { lines: lines, active: focus === "output", maxVisible: outputH, contentWidth: outputW, borderColor: focus === "output" ? "cyan" : "gray" })] })] }) }));
};
export default SetupScreen;
