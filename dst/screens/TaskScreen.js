import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/*
**  Agentic Software Engineering (ASE) - Terminal User Interface (TUI)
**  Copyright (c) 2026 Jochen Hörtreiter <Jochen.Hoertreiter@googlemail.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/
import { useEffect, useState, useRef } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import { execa } from "execa";
import { runCommand } from "./Screen.js";
import OutputBox from "../components/OutputBox.js";
import SelectList from "../components/SelectList.js";
import { logError } from "../components/Logger.js";
const TASK_ACTIONS = [
    { label: "Switch", value: "switch" },
    { label: "Delete", value: "delete" },
    { label: "Rename", value: "rename" },
    { label: "Purge", value: "purge" }
];
const errMsg = (err) => err instanceof Error ? err.message : String(err);
const TaskScreen = ({ escBlockedRef, onHint, screenWidth, screenHeight }) => {
    const [loading, setLoading] = useState(true);
    const [currentTask, setCurrentTask] = useState("");
    const [tasks, setTasks] = useState([]);
    const [selected, setSelected] = useState(0);
    const [actionIdx, setActionIdx] = useState(0);
    const [focus, setFocus] = useState("tasks");
    const [renameVal, setRenameVal] = useState("");
    const [preview, setPreview] = useState([]);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [running, setRunning] = useState(false);
    const [output, setOutput] = useState([]);
    const [showOutput, setShowOutput] = useState(false);
    const runningRef = useRef(false);
    const prevFocus = useRef("tasks");
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
                    setActionOutput(`Error loading tasks: ${errMsg(err)}`);
                }
            }
            if (!cancelled)
                setLoading(false);
        };
        load().catch((e) => { if (!cancelled)
            logError("TaskScreen", "unexpected", e); });
        return () => { cancelled = true; };
    }, []);
    /*  sync escBlockedRef so App's global ESC handler knows when to block  */
    useEffect(() => {
        escBlockedRef.current = focus !== "tasks";
        return () => { escBlockedRef.current = false; };
    }, [focus, escBlockedRef]);
    /*  delegate focus-dependent hint text to the master hint bar  */
    useEffect(() => {
        if (focus === "rename")
            onHint([
                { key: "⏎", desc: "OK" },
                { key: "ESC", desc: "cancel" }
            ]);
        else if (focus === "tasks")
            onHint([
                { key: "↑ ↓", desc: "navigate tasks" },
                { key: "⏎", desc: "select task" },
                { key: "p", desc: "preview" }
            ]);
        else if (focus === "actions")
            onHint([
                { key: "↑ ↓", desc: "navigate actions" },
                { key: "⏎", desc: "execute action" },
                { key: "p", desc: "preview" },
                { key: "ESC", desc: "back" }
            ]);
        else if (focus === "preview")
            onHint([
                { key: "↑ ↓ / PgUp/PgDn", desc: "scroll preview" },
                { key: "ESC", desc: "back" }
            ]);
    }, [focus, onHint]);
    /*  show action result text in the shared right-hand output pane  */
    const setActionOutput = (text) => {
        setOutput(text.split("\n"));
        setShowOutput(true);
    };
    /*  load preview on demand and switch focus to preview pane  */
    const loadPreview = async () => {
        const id = tasks[selected]?.value;
        if (!id)
            return;
        setPreview([]);
        setShowOutput(false);
        setPreviewLoading(true);
        prevFocus.current = focus;
        setFocus("preview");
        try {
            const res = await execa("ase", ["task", "load", id]);
            setPreview(res.stdout.split("\n"));
        }
        catch (_) {
            setPreview([]);
        }
        finally {
            setPreviewLoading(false);
        }
    };
    /*  execute the currently highlighted action  */
    const executeAction = async (item) => {
        if (runningRef.current)
            return;
        const id = tasks[selected]?.value;
        if (!id)
            return;
        if (item.value === "rename") {
            setRenameVal(id);
            setFocus("rename");
            return;
        }
        if (item.value === "switch") {
            runningRef.current = true;
            setRunning(true);
            try {
                await execa("ase", ["config", "--scope", "project", "set", "agent.task", id]);
                setCurrentTask(id);
                setActionOutput(`Switched to task: ${id}`);
            }
            catch (err) {
                setActionOutput(`Error: ${errMsg(err)}`);
            }
            finally {
                runningRef.current = false;
                setRunning(false);
            }
            return;
        }
        if (item.value === "delete") {
            runningRef.current = true;
            setRunning(true);
            try {
                await execa("ase", ["task", "delete", id]);
                setTasks((prev) => {
                    const next = prev.filter((t) => t.value !== id);
                    setSelected((s) => Math.min(s, Math.max(0, next.length - 1)));
                    return next;
                });
                setPreview([]);
                setActionOutput(`Deleted task: ${id}`);
                setFocus("tasks");
            }
            catch (err) {
                setActionOutput(`Error: ${errMsg(err)}`);
            }
            finally {
                runningRef.current = false;
                setRunning(false);
            }
            return;
        }
        if (item.value === "purge") {
            runningRef.current = true;
            setRunning(true);
            setOutput([]);
            setShowOutput(true);
            try {
                await runCommand(["task", "purge"], (line) => {
                    setOutput((prev) => [...prev, line]);
                });
                const listRes = await execa("ase", ["task", "list"]);
                const ids = listRes.stdout.trim().split("\n").filter(Boolean);
                setTasks(ids.map((id2) => ({ label: id2, value: id2 })));
                setSelected((s) => Math.min(s, Math.max(0, ids.length - 1)));
                setPreview([]);
                if (ids.length === 0)
                    setActionOutput("No tasks remaining after purge.");
                setFocus("tasks");
            }
            catch (err) {
                setActionOutput(`Error: ${errMsg(err)}`);
            }
            finally {
                runningRef.current = false;
                setRunning(false);
            }
        }
    };
    /*  central hierarchical keyboard navigation  */
    useInput((input, key) => {
        /*  rename focus captures all keys itself  */
        if (focus === "rename") {
            if (key.escape) {
                setRenameVal("");
                setFocus("tasks");
            }
            else if (key.return) {
                const oldId = tasks[selected]?.value;
                if (!oldId || !renameVal.trim())
                    return;
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
                    setActionOutput(`Renamed: ${oldId} → ${newId}`);
                })
                    .catch((err) => {
                    setActionOutput(`Error: ${errMsg(err)}`);
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
        if (runningRef.current)
            return;
        /*  focus: tasks  */
        if (focus === "tasks") {
            if (key.upArrow)
                setSelected((s) => Math.max(0, s - 1));
            else if (key.downArrow)
                setSelected((s) => Math.min(tasks.length - 1, s + 1));
            else if (key.return && tasks.length > 0)
                setFocus("actions");
            else if (input === "p" && tasks.length > 0)
                loadPreview().catch((e) => { logError("TaskScreen", "unexpected", e); });
        }
        /*  focus: actions  */
        if (focus === "actions") {
            if (key.upArrow)
                setActionIdx((i) => Math.max(0, i - 1));
            else if (key.downArrow)
                setActionIdx((i) => Math.min(TASK_ACTIONS.length - 1, i + 1));
            else if (key.escape)
                setFocus("tasks");
            else if (key.return)
                executeAction(TASK_ACTIONS[actionIdx]).catch((e) => {
                    logError("TaskScreen", "unexpected", e);
                });
            else if (input === "p" && tasks.length > 0)
                loadPreview().catch((e) => { logError("TaskScreen", "unexpected", e); });
        }
        /*  focus: preview  */
        if (focus === "preview") {
            if (key.escape) {
                setPreview([]);
                setFocus(prevFocus.current);
            }
            /*  ↑↓ and pageUp/pageDown are handled by OutputBox internally  */
        }
    });
    /* layout: task list | action list | preview */
    const listW = 24;
    const actionsW = 14;
    const previewW = Math.max(1, screenWidth - listW - actionsW);
    const previewH = Math.max(1, screenHeight - 4);
    const taskPanel = (_jsxs(Box, { flexDirection: 'row', children: [_jsx(Box, { flexDirection: 'column', width: listW, children: _jsx(SelectList, { items: tasks, selectedIndex: selected, isFocused: focus === "tasks", header: 'Tasks', maxVisible: previewH }) }), _jsx(Box, { flexDirection: 'column', width: actionsW, children: _jsx(SelectList, { items: TASK_ACTIONS, selectedIndex: actionIdx, isFocused: focus === "actions" || focus === "rename", header: 'Actions', maxVisible: previewH, busyIndex: running ? actionIdx : undefined }) }), _jsx(Box, { flexDirection: 'column', width: previewW, children: focus === "rename" ?
                    _jsxs(_Fragment, { children: [_jsx(Text, { color: 'cyan', children: "New name:" }), _jsx(Box, { borderStyle: 'round', borderColor: 'cyan', width: previewW, height: previewH, children: _jsx(Box, { paddingLeft: 1, children: _jsxs(Text, { color: 'white', children: [renameVal, _jsx(Text, { color: 'cyan', children: "\u2588" })] }) }) })] }) :
                    _jsxs(_Fragment, { children: [_jsx(Text, { color: focus === "preview" ? "cyan" : "gray", children: previewLoading ? _jsxs(_Fragment, { children: [_jsx(Spinner, { type: 'dots' }), " loading"] }) :
                                    showOutput ? "Action Output" : "Task Preview" }), _jsx(OutputBox, { lines: showOutput ? output : preview, active: focus === "preview", maxVisible: previewH, contentWidth: previewW, borderColor: focus === "preview" ? "cyan" : "gray" })] }) })] }));
    return (_jsxs(Box, { flexDirection: 'column', padding: 1, children: [loading ?
                _jsxs(Text, { children: [_jsx(Spinner, { type: 'dots' }), " Loading..."] }) :
                _jsxs(Text, { children: ["Current task: ", _jsx(Text, { color: 'yellow', children: currentTask })] }), _jsx(Text, { children: " " }), !loading && taskPanel] }));
};
export default TaskScreen;
