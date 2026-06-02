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
const ServiceScreen = ({ onHint, screenWidth, screenHeight }) => {
    const [statusLoading, setStatusLoading] = useState(true);
    const [status, setStatus] = useState("");
    const [running, setRunning] = useState(false);
    const [selected, setSelected] = useState(0);
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
    /*  delegate hint text to the master hint bar  */
    useEffect(() => {
        onHint([
            { key: "↑ ↓", desc: "navigate actions" },
            { key: "⏎", desc: "execute action" }
        ]);
    }, [onHint]);
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
    useInput((_input, key) => {
        if (runningRef.current)
            return;
        if (key.upArrow)
            setSelected((s) => Math.max(0, s - 1));
        else if (key.downArrow)
            setSelected((s) => Math.min(actions.length - 1, s + 1));
        else if (key.return)
            handleSelect(actions[selected]).catch(() => { });
    });
    /* own elements: 1 status + 1 blank + 1 spinner/select + 1 padding = 4 */
    const outputH = Math.max(1, screenHeight - 4);
    return (_jsxs(Box, { flexDirection: 'column', padding: 1, children: [statusLoading ?
                _jsxs(Text, { children: [_jsx(Spinner, { type: 'dots' }), " Loading status..."] }) :
                _jsxs(Text, { children: ["Status: ", _jsx(Text, { color: 'green', children: status })] }), _jsx(Text, { children: " " }), running ?
                _jsxs(Text, { children: [_jsx(Spinner, { type: 'dots' }), " Running..."] }) :
                _jsx(SelectList, { items: actions, selectedIndex: selected, isFocused: true }), _jsx(OutputBox, { lines: lines, active: !running, maxVisible: outputH, contentWidth: screenWidth })] }));
};
export default ServiceScreen;
