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
import { execa } from "execa";
import { DateTime } from "luxon";
import { useScreen, SelectIndicator, SelectItem, runCommand } from "./Screen.js";
import OutputBox from "./OutputBox.js";
const actions = [
    { label: "Start service", value: "start" },
    { label: "Stop service", value: "stop" }
];
const ServiceScreen = () => {
    const { contentWidth, contentHeight } = useScreen();
    const [statusLoading, setStatusLoading] = useState(true);
    const [status, setStatus] = useState("");
    const [running, setRunning] = useState(false);
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
        load().catch((e) => { console.error("[ase-tui] unexpected:", e); });
        return () => { cancelled = true; };
    }, []);
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
    /* header lines: 1 status + 1 blank + 1 spinner/select + 1 padding = 4 */
    const outputH = Math.max(1, contentHeight - 4);
    return (_jsxs(Box, { flexDirection: 'column', padding: 1, children: [statusLoading ?
                _jsxs(Text, { children: [_jsx(Spinner, { type: 'dots' }), " Loading status..."] }) :
                _jsxs(Text, { children: ["Status: ", _jsx(Text, { color: 'green', children: status })] }), _jsx(Text, { children: " " }), running ?
                _jsxs(Text, { children: [_jsx(Spinner, { type: 'dots' }), " Running..."] }) :
                _jsx(SelectInput, { items: actions, onSelect: handleSelect, indicatorComponent: SelectIndicator, itemComponent: SelectItem }), _jsx(OutputBox, { lines: lines, active: !running, maxVisible: outputH, contentWidth: contentWidth })] }));
};
export default ServiceScreen;
