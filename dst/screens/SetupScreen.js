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
import { runCommand } from "./Screen.js";
import OutputBox from "../components/OutputBox.js";
import SelectList from "../components/SelectList.js";
const actions = [
    { label: "Install", value: "install" },
    { label: "Update", value: "update" },
    { label: "Uninstall", value: "uninstall" },
    { label: "Enable", value: "enable" },
    { label: "Disable", value: "disable" }
];
const SetupScreen = ({ escBlockedRef, onHint, screenWidth, screenHeight }) => {
    const [running, setRunning] = useState(false);
    const [selected, setSelected] = useState(0);
    const [focus, setFocus] = useState("commands");
    const [outputs, setOutputs] = useState({});
    const runningRef = useRef(false);
    /*  output remembered per command; switching commands shows its last output  */
    const lines = outputs[actions[selected].value] ?? [];
    /*  sync escBlockedRef so App's global ESC handler knows when to block  */
    useEffect(() => {
        escBlockedRef.current = focus !== "commands";
        return () => { escBlockedRef.current = false; };
    }, [focus, escBlockedRef]);
    /*  delegate focus-dependent hint text to the master hint bar  */
    useEffect(() => {
        if (focus === "commands")
            onHint([
                { key: "↑ ↓", desc: "navigate actions" },
                { key: "⏎", desc: "execute action" },
                { key: "o", desc: "output" }
            ]);
        else
            onHint([
                { key: "↑ ↓ / PgUp/PgDn", desc: "scroll output" },
                { key: "ESC", desc: "back" }
            ]);
    }, [focus, onHint]);
    const handleSelect = async (item) => {
        if (runningRef.current)
            return;
        runningRef.current = true;
        setRunning(true);
        setOutputs((prev) => ({ ...prev, [item.value]: [] }));
        let count = 0;
        try {
            await runCommand(["setup", item.value], (line) => {
                setOutputs((prev) => ({ ...prev, [item.value]: [...(prev[item.value] ?? []), line] }));
                count++;
            });
            if (count === 0)
                setOutputs((prev) => ({ ...prev, [item.value]: [`[${DateTime.now().toFormat("yyyy-LL-dd HH:mm:ss.SSS")}] done`] }));
        }
        catch (err) {
            setOutputs((prev) => ({ ...prev, [item.value]: [...(prev[item.value] ?? []), `Error: ${err instanceof Error ? err.message : String(err)}`] }));
        }
        finally {
            runningRef.current = false;
            setRunning(false);
        }
    };
    useInput((input, key) => {
        if (runningRef.current)
            return;
        /*  focus: commands  */
        if (focus === "commands") {
            if (key.upArrow)
                setSelected((s) => Math.max(0, s - 1));
            else if (key.downArrow)
                setSelected((s) => Math.min(actions.length - 1, s + 1));
            else if (key.return && actions.length > 0) {
                setFocus("output");
                handleSelect(actions[selected]).catch(() => { });
            }
            else if (input === "o")
                setFocus("output");
        }
        /*  focus: output  */
        if (focus === "output") {
            if (key.escape)
                setFocus("commands");
            /*  ↑↓ and pageUp/pageDown are handled by OutputBox internally  */
        }
    });
    /* left column: fixed width for action list */
    const actionsW = 20;
    const outputW = Math.max(1, screenWidth - actionsW);
    const outputH = Math.max(1, screenHeight - 1);
    return (_jsxs(Box, { flexDirection: 'row', padding: 1, children: [_jsx(Box, { flexDirection: 'column', width: actionsW, children: running ?
                    _jsxs(Box, { flexDirection: 'column', children: [_jsx(Text, { color: focus === "commands" ? "cyan" : "gray", children: "Commands" }), _jsxs(Text, { children: [_jsx(Spinner, { type: 'dots' }), " Running..."] })] }) :
                    _jsx(SelectList, { items: actions, selectedIndex: selected, isFocused: focus === "commands", header: 'Commands' }) }), _jsxs(Box, { flexDirection: 'column', width: outputW, children: [_jsx(Text, { color: focus === "output" ? "cyan" : "gray", children: "Command output" }), _jsx(OutputBox, { lines: lines, active: focus === "output", maxVisible: outputH, contentWidth: outputW, borderColor: focus === "output" ? "cyan" : "gray" })] })] }));
};
export default SetupScreen;
