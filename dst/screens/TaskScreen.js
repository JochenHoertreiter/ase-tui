import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
/*
**  Agentic Software Engineering (ASE)
**  Copyright (c) 2025-2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/
import { useEffect, useState, useRef } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import { execa } from "execa";
import { useScreen, runCommand } from "./Screen.js";
import OutputBox from "./OutputBox.js";
const TASK_ACTIONS = [
    { label: "Switch", value: "switch" },
    { label: "Delete", value: "delete" },
    { label: "Rename", value: "rename" },
    { label: "Purge", value: "purge" }
];
const TaskScreen = ({ escBlockedRef }) => {
    const { contentWidth, contentHeight } = useScreen();
    const [loading, setLoading] = useState(true);
    const [currentTask, setCurrentTask] = useState("");
    const [tasks, setTasks] = useState([]);
    const [selected, setSelected] = useState(0);
    const [actionIdx, setActionIdx] = useState(0);
    const [focus, setFocus] = useState("tasks");
    const [mode, setMode] = useState("list");
    const [renameVal, setRenameVal] = useState("");
    const [preview, setPreview] = useState([]);
    const [previewId, setPreviewId] = useState("");
    const [running, setRunning] = useState(false);
    const [output, setOutput] = useState(null);
    const runningRef = useRef(false);
    const previewFocused = useRef(false);
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
    /*  load preview when selected task changes; reset previewFocused  */
    useEffect(() => {
        previewFocused.current = false;
        const id = tasks[selected]?.value;
        if (!id || id === previewId)
            return;
        let cancelled = false;
        const load = async () => {
            try {
                const res = await execa("ase", ["task", "load", id]);
                if (!cancelled) {
                    setPreview(res.stdout.split("\n"));
                    setPreviewId(id);
                }
            }
            catch (_) {
                if (!cancelled)
                    setPreview([]);
            }
        };
        load().catch((e) => { console.error("[ase-tui] unexpected:", e); });
        return () => { cancelled = true; };
    }, [selected, tasks]);
    /*  sync escBlockedRef so App's global ESC handler knows when to block  */
    useEffect(() => {
        escBlockedRef.current = focus !== "tasks";
        return () => { escBlockedRef.current = false; };
    }, [focus, escBlockedRef]);
    /*  execute the currently highlighted action  */
    const executeAction = async (item) => {
        if (runningRef.current)
            return;
        const id = tasks[selected]?.value;
        if (!id)
            return;
        if (item.value === "rename") {
            setRenameVal(id);
            setMode("rename");
            return;
        }
        if (item.value === "switch") {
            try {
                await execa("ase", ["config", "--scope", "project", "set", "agent.task", id]);
                setCurrentTask(id);
                setOutput(`Switched to task: ${id}`);
            }
            catch (err) {
                setOutput(`Error: ${err instanceof Error ? err.message : String(err)}`);
            }
            return;
        }
        if (item.value === "delete") {
            try {
                await execa("ase", ["task", "delete", id]);
                setTasks((prev) => {
                    const next = prev.filter((t) => t.value !== id);
                    setSelected((s) => Math.min(s, Math.max(0, next.length - 1)));
                    return next;
                });
                setPreview([]);
                setPreviewId("");
                setOutput(`Deleted task: ${id}`);
                setFocus("tasks");
            }
            catch (err) {
                setOutput(`Error: ${err instanceof Error ? err.message : String(err)}`);
            }
            return;
        }
        if (item.value === "purge") {
            runningRef.current = true;
            setRunning(true);
            try {
                await runCommand(["task", "purge"], (line) => {
                    setOutput(line);
                });
                const listRes = await execa("ase", ["task", "list"]);
                const ids = listRes.stdout.trim().split("\n").filter(Boolean);
                setTasks(ids.map((id2) => ({ label: id2, value: id2 })));
                setSelected(0);
                setFocus("tasks");
            }
            catch (err) {
                setOutput(`Error: ${err instanceof Error ? err.message : String(err)}`);
            }
            finally {
                runningRef.current = false;
                setRunning(false);
            }
        }
    };
    /*  central hierarchical keyboard navigation  */
    useInput((input, key) => {
        /*  rename mode captures all keys itself  */
        if (mode === "rename") {
            if (key.escape) {
                setMode("list");
                setRenameVal("");
                setFocus("tasks");
            }
            else if (key.return) {
                const oldId = tasks[selected]?.value;
                if (!oldId || !renameVal.trim())
                    return;
                setMode("list");
                const newId = renameVal.trim();
                setRenameVal("");
                setFocus("tasks");
                runningRef.current = true;
                setRunning(true);
                execa("ase", ["task", "rename", oldId, newId])
                    .then(() => {
                    setTasks((prev) => prev.map((t) => t.value === oldId ? { label: newId, value: newId } : t));
                    if (currentTask === oldId)
                        setCurrentTask(newId);
                    setOutput(`Renamed: ${oldId} → ${newId}`);
                })
                    .catch((err) => {
                    setOutput(`Error: ${err instanceof Error ? err.message : String(err)}`);
                })
                    .finally(() => {
                    runningRef.current = false;
                    setRunning(false);
                });
            }
            else if (key.backspace || key.delete)
                setRenameVal((v) => v.slice(0, -1));
            else if (input && !key.ctrl && !key.meta)
                setRenameVal((v) => v + input);
            return;
        }
        if (running)
            return;
        /*  focus: tasks  */
        if (focus === "tasks") {
            if (key.upArrow)
                setSelected((s) => Math.max(0, s - 1));
            else if (key.downArrow)
                setSelected((s) => Math.min(tasks.length - 1, s + 1));
            else if (key.return && tasks.length > 0)
                setFocus("actions");
        }
        /*  focus: actions  */
        else if (focus === "actions") {
            if (key.upArrow)
                setActionIdx((i) => Math.max(0, i - 1));
            else if (key.downArrow)
                setActionIdx((i) => Math.min(TASK_ACTIONS.length - 1, i + 1));
            else if (key.escape)
                setFocus("tasks");
            else if (key.return) {
                if (preview.length > 0 && !previewFocused.current) {
                    previewFocused.current = true;
                    setFocus("preview");
                }
                else
                    executeAction(TASK_ACTIONS[actionIdx]).catch((e) => {
                        console.error("[ase-tui] unexpected:", e);
                    });
            }
        }
        /*  focus: preview  */
        else if (focus === "preview") {
            if (key.escape) {
                previewFocused.current = false;
                setFocus("actions");
            }
            /*  ↑↓ and pageUp/pageDown are handled by OutputBox internally  */
        }
    });
    /* layout: task list | action list | preview */
    const listW = 24;
    const actionsW = 14;
    const previewW = Math.max(1, contentWidth - listW - actionsW);
    const previewH = Math.max(1, contentHeight - 4);
    const taskList = (_jsx(Box, { flexDirection: 'column', children: tasks.map((t, i) => (_jsxs(Text, { color: i === selected ? "cyan" : "white", children: [i === selected ? "❯ " : "  ", t.label] }, t.value))) }));
    const actionList = (_jsx(Box, { flexDirection: 'column', children: TASK_ACTIONS.map((a, i) => (_jsxs(Text, { color: i === actionIdx ? "cyan" : "white", children: [i === actionIdx ? "❯ " : "  ", a.label] }, a.value))) }));
    const taskPanel = (_jsxs(Box, { flexDirection: 'row', children: [_jsxs(Box, { flexDirection: 'column', width: listW, children: [_jsx(Text, { color: focus === "tasks" ? "cyan" : "blue", children: "Tasks" }), taskList] }), _jsxs(Box, { flexDirection: 'column', width: actionsW, children: [_jsx(Text, { color: focus === "actions" ? "cyan" : "blue", children: "Actions" }), mode === "rename" ?
                        _jsxs(Box, { flexDirection: 'column', children: [_jsx(Text, { color: 'cyan', children: "New name:" }), _jsxs(Text, { color: 'white', children: [renameVal, _jsx(Text, { color: 'cyan', children: "\u2588" })] }), _jsx(Text, { color: 'gray', children: "(Enter=OK ESC=cancel)" })] }) :
                        running ?
                            _jsx(Spinner, { type: 'dots' }) :
                            actionList] }), _jsx(OutputBox, { lines: preview, active: focus === "preview", maxVisible: previewH, contentWidth: previewW })] }));
    /*  show hint below the panels when in actions focus so user knows about preview  */
    const focusHint = focus === "tasks" ? _jsx(Text, { color: 'gray', children: "\u2191\u2193 navigate tasks  RETURN select" }) :
        focus === "actions" ? _jsx(Text, { color: 'gray', children: "\u2191\u2193 navigate actions  RETURN preview/execute  ESC back" }) :
            focus === "preview" ? _jsx(Text, { color: 'gray', children: "\u2191\u2193 / PgUp/PgDn scroll preview  ESC back" }) :
                null;
    return (_jsxs(Box, { flexDirection: 'column', padding: 1, children: [loading ?
                _jsxs(Text, { children: [_jsx(Spinner, { type: 'dots' }), " Loading..."] }) :
                _jsxs(Text, { children: ["Current task: ", _jsx(Text, { color: 'yellow', children: currentTask })] }), _jsx(Text, { children: " " }), !loading && taskPanel, !loading && focusHint, output !== null && _jsx(Text, { color: 'yellow', children: output })] }));
};
export default TaskScreen;
