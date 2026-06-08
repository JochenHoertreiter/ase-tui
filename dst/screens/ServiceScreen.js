import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/*
**  Agentic Software Engineering (ASE) - Terminal User Interface (TUI)
**  Copyright (c) 2026 Jochen Hörtreiter <Jochen.Hoertreiter@googlemail.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/
import { useEffect, useState, useRef } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import { execa } from "execa";
import { DateTime } from "luxon";
import { runCommand } from "./Screen.js";
import OutputBox from "../components/OutputBox.js";
import SelectList from "../components/SelectList.js";
import { logError } from "../components/Logger.js";
const actions = [
    { label: "Start service", value: "start" },
    { label: "Stop service", value: "stop" }
];
const ServiceScreen = ({ escBlockedRef, onHint, screenWidth, screenHeight }) => {
    const [statusLoading, setStatusLoading] = useState(true);
    const [status, setStatus] = useState("");
    const [running, setRunning] = useState(false);
    const [selected, setSelected] = useState(0);
    const [focus, setFocus] = useState("actions");
    const [lines, setLines] = useState([]);
    const runningRef = useRef(false);
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await execa("ase", ["service", "status"]);
                if (!cancelled)
                    setStatus(res.stdout.trim());
            }
            catch (_) {
                if (!cancelled)
                    setStatus("unavailable");
            }
            if (!cancelled)
                setStatusLoading(false);
        };
        load().catch((e) => { logError("ServiceScreen", "unexpected", e); });
        return () => { cancelled = true; };
    }, []);
    /*  sync escBlockedRef so App's global ESC handler knows when to block  */
    useEffect(() => {
        escBlockedRef.current = focus !== "actions";
        return () => { escBlockedRef.current = false; };
    }, [focus, escBlockedRef]);
    /*  delegate focus-dependent hint text to the master hint bar  */
    useEffect(() => {
        if (focus === "actions")
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
        setLines([]);
        let count = 0;
        try {
            await runCommand(["service", item.value], (line) => {
                setLines((prev) => [...prev, line]);
                count++;
            });
            let newStatus;
            try {
                const r = await execa("ase", ["service", "status"]);
                newStatus = r.stdout.trim();
            }
            catch (_) {
                newStatus = "unavailable";
            }
            setStatus(newStatus);
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
    useInput((input, key) => {
        if (runningRef.current)
            return;
        /*  focus: actions  */
        if (focus === "actions") {
            if (key.upArrow)
                setSelected((s) => Math.max(0, s - 1));
            else if (key.downArrow)
                setSelected((s) => Math.min(actions.length - 1, s + 1));
            else if (key.return) {
                setFocus("output");
                handleSelect(actions[selected]).catch(() => { });
            }
            else if (input === "o")
                setFocus("output");
        }
        /*  focus: output  */
        if (focus === "output") {
            if (key.escape)
                setFocus("actions");
            /*  ↑↓ and pageUp/pageDown are handled by OutputBox internally  */
        }
    });
    /* layout: action list | output (1 status + 1 blank + 1 header + 1 padding = 4) */
    const actionsW = 20;
    const outputW = Math.max(1, screenWidth - actionsW);
    const outputH = Math.max(1, screenHeight - 4);
    return (_jsxs(Box, { flexDirection: 'column', padding: 1, children: [statusLoading ?
                _jsxs(Text, { children: [_jsx(Spinner, { type: 'dots' }), " Loading status..."] }) :
                _jsxs(Text, { children: ["Status: ", _jsx(Text, { color: 'green', children: status })] }), _jsx(Text, { children: " " }), _jsxs(Box, { flexDirection: 'row', children: [_jsx(Box, { flexDirection: 'column', width: actionsW, children: _jsx(SelectList, { items: actions, selectedIndex: selected, isFocused: focus === "actions", header: 'Service', maxVisible: outputH + 1, busyIndex: running ? selected : undefined }) }), _jsxs(Box, { flexDirection: 'column', width: outputW, children: [_jsx(Text, { color: focus === "output" ? "cyan" : "gray", children: "Service output" }), _jsx(OutputBox, { lines: lines, active: focus === "output", maxVisible: outputH, contentWidth: outputW, borderColor: focus === "output" ? "cyan" : "gray" })] })] })] }));
};
export default ServiceScreen;
