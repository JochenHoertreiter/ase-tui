import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/*
**  Agentic Software Engineering (ASE)
**  Copyright (c) 2025-2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/
import { useEffect, useState } from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import { execa } from "execa";
import { SelectIndicator, SelectItem } from "./Screen.js";
const TaskScreen = () => {
    const [loading, setLoading] = useState(true);
    const [currentTask, setCurrentTask] = useState("");
    const [tasks, setTasks] = useState([]);
    const [output, setOutput] = useState(null);
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const [idRes, listRes] = await Promise.all([
                    execa("ase", ["config", "get", "agent.task"]),
                    execa("ase", ["task", "list"])
                ]);
                const ids = listRes.stdout.trim().split("\n").filter(Boolean);
                if (!cancelled) {
                    setCurrentTask(idRes.stdout.trim());
                    setTasks(ids.map((id) => ({ label: id, value: id })));
                }
            }
            catch (err) {
                if (!cancelled) {
                    setTasks([]);
                    setOutput(`Error loading tasks: ${err instanceof Error ? err.message : String(err)}`);
                }
            }
            if (!cancelled)
                setLoading(false);
        };
        load().catch((e) => { console.error("[ase-tui] unexpected:", e); });
        return () => { cancelled = true; };
    }, []);
    const handleSelect = async (item) => {
        try {
            await execa("ase", ["config", "--scope", "project", "set", "agent.task", item.value]);
            setCurrentTask(item.value);
            setOutput(`Switched to task: ${item.value}`);
        }
        catch (err) {
            setOutput(`Error: ${err instanceof Error ? err.message : String(err)}`);
        }
    };
    return (_jsxs(Box, { flexDirection: 'column', padding: 1, children: [loading ?
                _jsxs(Text, { children: [_jsx(Spinner, { type: 'dots' }), " Loading..."] }) :
                _jsxs(Text, { children: ["Current: ", _jsx(Text, { color: 'yellow', children: currentTask })] }), _jsx(Text, { children: " " }), !loading
                && _jsx(SelectInput, { items: tasks, onSelect: handleSelect, indicatorComponent: SelectIndicator, itemComponent: SelectItem }), output !== null && _jsx(Text, { color: 'yellow', children: output })] }));
};
export default TaskScreen;
