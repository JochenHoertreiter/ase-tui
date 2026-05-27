/*
**  Agentic Software Engineering (ASE)
**  Copyright (c) 2025-2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import { useEffect, useState, useRef }                from "react"
import type { RefObject }                             from "react"
import { Box, Text, useInput }                        from "ink"
import Spinner                                        from "ink-spinner"
import { execa }                                      from "execa"
import { useScreen, runCommand, type ActionItem }     from "./Screen.js"
import OutputBox                                      from "./OutputBox.js"
import type { HintSegment }                           from "../ase-tui.js"

type Mode  = "list" | "rename"
type Focus = "tasks" | "actions" | "preview"

type Props = { escBlockedRef: RefObject<boolean>, onHint: (hint: HintSegment[] | null) => void }

const TASK_ACTIONS: ActionItem[] = [
    { label: "Switch",  value: "switch"  },
    { label: "Delete",  value: "delete"  },
    { label: "Rename",  value: "rename"  },
    { label: "Purge",   value: "purge"   }
]

const TaskScreen = ({ escBlockedRef, onHint }: Props) => {
    const { contentWidth, contentHeight } = useScreen()
    const [ loading,     setLoading     ] = useState(true)
    const [ currentTask, setCurrentTask ] = useState("")
    const [ tasks,       setTasks       ] = useState<Array<{ label: string, value: string }>>([])
    const [ selected,    setSelected    ] = useState(0)
    const [ actionIdx,   setActionIdx   ] = useState(0)
    const [ focus,       setFocus       ] = useState<Focus>("tasks")
    const [ mode,        setMode        ] = useState<Mode>("list")
    const [ renameVal,   setRenameVal   ] = useState("")
    const [ preview,     setPreview     ] = useState<string[]>([])
    const [ previewId,   setPreviewId   ] = useState("")
    const [ running,     setRunning     ] = useState(false)
    const [ output,      setOutput      ] = useState<string | null>(null)
    const runningRef  = useRef(false)
    const prevFocus   = useRef<Focus>("tasks")

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            try {
                const [ idRes, listRes ] = await Promise.all([
                    execa("ase", [ "config", "get", "agent.task" ]),
                    execa("ase", [ "task", "list" ])
                ])
                const ids = listRes.stdout.trim().split("\n").filter(Boolean)
                if (!cancelled) {
                    setCurrentTask(idRes.stdout.trim())
                    setTasks(ids.map((id) => ({ label: id, value: id })))
                }
            }
            catch (err) {
                if (!cancelled) {
                    setTasks([])
                    setOutput(`Error loading tasks: ${err instanceof Error ? err.message : String(err)}`)
                }
            }
            if (!cancelled)
                setLoading(false)
        }
        load().catch((e) => { console.error("[ase-tui] unexpected:", e) })
        return () => { cancelled = true }
    }, [])

    /*  load preview when selected task changes  */
    useEffect(() => {
        const id = tasks[selected]?.value
        if (!id || id === previewId)
            return
        let cancelled = false
        const load = async () => {
            try {
                const res = await execa("ase", [ "task", "load", id ])
                if (!cancelled) {
                    setPreview(res.stdout.split("\n"))
                    setPreviewId(id)
                }
            }
            catch (_) {
                if (!cancelled)
                    setPreview([])
            }
        }
        load().catch((e) => { console.error("[ase-tui] unexpected:", e) })
        return () => { cancelled = true }
    }, [ selected, tasks ])

    /*  sync escBlockedRef so App's global ESC handler knows when to block  */
    useEffect(() => {
        escBlockedRef.current = focus !== "tasks"
        return () => { escBlockedRef.current = false }
    }, [ focus, escBlockedRef ])

    /*  delegate focus/mode-dependent hint text to the master hint bar  */
    useEffect(() => {
        if (mode === "rename")
            onHint([
                { key: "⏎",   desc: "OK"     },
                { key: "ESC", desc: "cancel" }
            ])
        else if (focus === "tasks")
            onHint([
                { key: "↑ ↓", desc: "navigate tasks" },
                { key: "⏎",   desc: "select task"    },
                { key: "P",   desc: "preview"        }
            ])
        else if (focus === "actions")
            onHint([
                { key: "↑ ↓", desc: "navigate actions" },
                { key: "⏎",   desc: "execute action"   },
                { key: "P",   desc: "preview"          },
                { key: "ESC", desc: "back"             }
            ])
        else if (focus === "preview")
            onHint([
                { key: "↑ ↓ / PgUp/PgDn", desc: "scroll preview" },
                { key: "ESC",             desc: "back"           }
            ])
    }, [ focus, mode, onHint ])

    /*  execute the currently highlighted action  */
    const executeAction = async (item: ActionItem) => {
        if (runningRef.current)
            return
        const id = tasks[selected]?.value
        if (!id)
            return
        if (item.value === "rename") {
            setRenameVal(id)
            setMode("rename")
            return
        }
        if (item.value === "switch") {
            try {
                await execa("ase", [ "config", "--scope", "project", "set", "agent.task", id ])
                setCurrentTask(id)
                setOutput(`Switched to task: ${id}`)
            }
            catch (err) {
                setOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
            }
            return
        }
        if (item.value === "delete") {
            try {
                await execa("ase", [ "task", "delete", id ])
                setTasks((prev) => {
                    const next = prev.filter((t) => t.value !== id)
                    setSelected((s) => Math.min(s, Math.max(0, next.length - 1)))
                    return next
                })
                setPreview([])
                setPreviewId("")
                setOutput(`Deleted task: ${id}`)
                setFocus("tasks")
            }
            catch (err) {
                setOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
            }
            return
        }
        if (item.value === "purge") {
            runningRef.current = true
            setRunning(true)
            try {
                await runCommand([ "task", "purge" ], (line) => {
                    setOutput(line)
                })
                const listRes = await execa("ase", [ "task", "list" ])
                const ids = listRes.stdout.trim().split("\n").filter(Boolean)
                setTasks(ids.map((id2) => ({ label: id2, value: id2 })))
                setSelected(0)
                setFocus("tasks")
            }
            catch (err) {
                setOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
            }
            finally {
                runningRef.current = false
                setRunning(false)
            }
        }
    }

    /*  central hierarchical keyboard navigation  */
    useInput((input, key) => {
        /*  rename mode captures all keys itself  */
        if (mode === "rename") {
            if (key.escape) {
                setMode("list")
                setRenameVal("")
                setFocus("tasks")
            }
            else if (key.return) {
                const oldId = tasks[selected]?.value
                if (!oldId || !renameVal.trim())
                    return
                setMode("list")
                const newId = renameVal.trim()
                setRenameVal("")
                setFocus("tasks")
                runningRef.current = true
                setRunning(true)
                execa("ase", [ "task", "rename", oldId, newId ])
                    .then(() => {
                        setTasks((prev) => prev.map((t) =>
                            t.value === oldId ? { label: newId, value: newId } : t
                        ))
                        if (currentTask === oldId)
                            setCurrentTask(newId)
                        setOutput(`Renamed: ${oldId} → ${newId}`)
                    })
                    .catch((err) => {
                        setOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
                    })
                    .finally(() => {
                        runningRef.current = false
                        setRunning(false)
                    })
            }
            else if (key.backspace || key.delete)
                setRenameVal((v) => v.slice(0, -1))
            else if (input && !key.ctrl && !key.meta)
                setRenameVal((v) => v + input)
            return
        }

        if (running)
            return

        /*  focus: tasks  */
        if (focus === "tasks") {
            if (key.upArrow)
                setSelected((s) => Math.max(0, s - 1))
            else if (key.downArrow)
                setSelected((s) => Math.min(tasks.length - 1, s + 1))
            else if (key.return && tasks.length > 0)
                setFocus("actions")
            else if (input === "p" && preview.length > 0) {
                prevFocus.current = focus
                setFocus("preview")
            }
        }
        /*  focus: actions  */
        else if (focus === "actions") {
            if (key.upArrow)
                setActionIdx((i) => Math.max(0, i - 1))
            else if (key.downArrow)
                setActionIdx((i) => Math.min(TASK_ACTIONS.length - 1, i + 1))
            else if (key.escape)
                setFocus("tasks")
            else if (key.return)
                executeAction(TASK_ACTIONS[actionIdx]).catch((e) => {
                    console.error("[ase-tui] unexpected:", e)
                })
            else if (input === "p" && preview.length > 0) {
                prevFocus.current = focus
                setFocus("preview")
            }
        }
        /*  focus: preview  */
        else if (focus === "preview") {
            if (key.escape)
                setFocus(prevFocus.current)
            /*  ↑↓ and pageUp/pageDown are handled by OutputBox internally  */
        }
    })

    /* layout: task list | action list | preview */
    const listW    = 24
    const actionsW = 14
    const previewW = Math.max(1, contentWidth - listW - actionsW)
    const previewH = Math.max(1, contentHeight - 4)

    const taskList = (
        <Box flexDirection='column'>
            {tasks.map((t, i) => (
                <Text key={t.value} color={i === selected ? (focus === "tasks" ? "cyan" : "gray") : "white"}>
                    {i === selected ? <Text color={focus === "tasks" ? "cyan" : "gray"}>❯ </Text> : "  "}{t.label}
                </Text>
            ))}
        </Box>
    )

    const actionList = (
        <Box flexDirection='column'>
            {TASK_ACTIONS.map((a, i) => (
                <Text key={a.value} color={i === actionIdx ? (focus === "actions" ? "cyan" : "gray") : "white"}>
                    {i === actionIdx ? <Text color={focus === "actions" ? "cyan" : "gray"}>❯ </Text> : "  "}{a.label}
                </Text>
            ))}
        </Box>
    )

    const taskPanel = (
        <Box flexDirection='row'>
            <Box flexDirection='column' width={listW}>
                <Text color={focus === "tasks" ? "cyan" : "gray"}>Tasks</Text>
                {taskList}
            </Box>
            <Box flexDirection='column' width={actionsW}>
                <Text color={focus === "actions" ? "cyan" : "gray"}>Actions</Text>
                {mode === "rename" ?
                    <Box flexDirection='column'>
                        <Text color='cyan'>New name:</Text>
                        <Text color='white'>{renameVal}<Text color='cyan'>█</Text></Text>
                        <Text color='gray'>(Enter=OK ESC=cancel)</Text>
                    </Box> :
                    running ?
                        <Spinner type='dots' /> :
                        actionList}
            </Box>
            <Box flexDirection='column' width={previewW}>
                <Text color={focus === "preview" ? "cyan" : "gray"}>Task Preview</Text>
                <OutputBox
                    lines={preview}
                    active={focus === "preview"}
                    maxVisible={previewH}
                    contentWidth={previewW}
                    borderColor={focus === "preview" ? "cyan" : "gray"}
                />
            </Box>
        </Box>
    )

    return (
        <Box flexDirection='column' padding={1}>
            {loading ?
                <Text><Spinner type='dots' /> Loading...</Text> :
                <Text>Current task: <Text color='yellow'>{currentTask}</Text></Text>}
            <Text> </Text>
            {!loading && taskPanel}
            {output !== null && <Text color='yellow'>{output}</Text>}
        </Box>
    )
}

export default TaskScreen
