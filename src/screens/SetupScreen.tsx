/*
**  Agentic Software Engineering (ASE) - Terminal User Interface (TUI)
**  Copyright (c) 2026 Jochen Hörtreiter <Jochen.Hoertreiter@googlemail.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import { useState, useRef, useEffect } from "react"
import type { RefObject }              from "react"
import { Box, Text, useInput }         from "ink"
import Spinner                         from "ink-spinner"
import { DateTime }                    from "luxon"
import { execa }                       from "execa"
import { runCommand, type ActionItem } from "./Screen.js"
import OutputBox                       from "../components/OutputBox.js"
import SelectList                      from "../components/SelectList.js"
import { logError }                    from "../components/Logger.js"
import type { HintSegment }            from "../components/HintBar.js"

/*  parse the tool values out of the "-t, --tool" option of "ase setup install --help"  */
const parseToolList = (stdout: string): ActionItem[] => {
    const block = stdout.split(/^ {2}-/m).find((s) => s.startsWith("t, --tool"))
    if (block === undefined)
        return []
    const head = block.split("(default:")[0]
    return [ ...head.matchAll(/"([^"]+)"/g) ].map((m) => ({ label: m[1], value: m[1] }))
}

type Focus = "commands" | "tools" | "output"

const actions: ActionItem[] = [
    { label: "Install",   value: "install"   },
    { label: "Update",    value: "update"    },
    { label: "Uninstall", value: "uninstall" },
    { label: "Enable",    value: "enable"    },
    { label: "Disable",   value: "disable"   }
]

type Props = {
    escBlockedRef: RefObject<boolean>
    onHint:        (hint: HintSegment[] | null) => void
    screenWidth:   number
    screenHeight:  number
}

const SetupScreen = ({ escBlockedRef, onHint, screenWidth, screenHeight }: Props) => {
    const [ loading,      setLoading      ] = useState(true)
    const [ tools,        setTools        ] = useState<ActionItem[]>([])
    const [ running,      setRunning      ] = useState(false)
    const [ selected,     setSelected     ] = useState(0)
    const [ selectedTool, setSelectedTool ] = useState(0)
    const [ focus,        setFocus        ] = useState<Focus>("commands")
    const [ outputs,      setOutputs      ] = useState<Record<string, string[]>>({})
    const runningRef = useRef(false)

    /*  the tool list is derived from the CLI, so it never drifts from "ase setup install"  */
    useEffect(() => {
        let cancelled = false
        const load = async () => {
            try {
                const res = await execa("ase", [ "setup", "install", "--help" ])
                if (!cancelled) {
                    setTools(parseToolList(res.stdout))
                    setLoading(false)
                }
            }
            catch (e: unknown) {
                if (!cancelled) {
                    setTools([])
                    setLoading(false)
                }
            }
        }
        load().catch((e) => { logError("SetupScreen", "unexpected", e) })
        return () => { cancelled = true }
    }, [])

    /*  output remembered per command and tool; switching either shows its last output  */
    const outputKey = tools.length > 0 ? `${actions[selected].value}:${tools[selectedTool].value}` : ""
    const lines     = outputs[outputKey] ?? []

    /*  sync escBlockedRef so App's global ESC handler knows when to block  */
    useEffect(() => {
        escBlockedRef.current = focus !== "commands"
        return () => { escBlockedRef.current = false }
    }, [ focus, escBlockedRef ])

    /*  delegate focus-dependent hint text to the master hint bar  */
    useEffect(() => {
        if (focus === "commands")
            onHint([
                { key: "↑ ↓", desc: "navigate actions" },
                { key: "⏎",   desc: "select action"    }
            ])
        else if (focus === "tools")
            onHint([
                { key: "↑ ↓", desc: "navigate tools" },
                { key: "⏎",   desc: "execute action" },
                { key: "o",   desc: "output"         },
                { key: "ESC", desc: "back"           }
            ])
        else
            onHint([
                { key: "↑ ↓ / PgUp/PgDn", desc: "scroll output" },
                { key: "ESC",             desc: "back"          }
            ])
    }, [ focus, onHint ])

    const handleSelect = async (cmd: ActionItem, tool: ActionItem) => {
        if (runningRef.current)
            return
        const key = `${cmd.value}:${tool.value}`
        runningRef.current = true
        setRunning(true)
        setOutputs((prev) => ({ ...prev, [key]: [] }))
        let count = 0
        try {
            await runCommand([ "setup", cmd.value, "--tool", tool.value ], (line) => {
                setOutputs((prev) => ({ ...prev, [key]: [ ...(prev[key] ?? []), line ] }))
                count++
            })
            if (count === 0)
                setOutputs((prev) => ({ ...prev, [key]: [ `[${DateTime.now().toFormat("yyyy-LL-dd HH:mm:ss.SSS")}] done` ] }))
        }
        catch (err) {
            setOutputs((prev) => ({ ...prev, [key]: [ ...(prev[key] ?? []), `Error: ${err instanceof Error ? err.message : String(err)}` ] }))
        }
        finally {
            runningRef.current = false
            setRunning(false)
        }
    }

    useInput((input, key) => {
        if (runningRef.current)
            return
        /*  focus: commands  */
        if (focus === "commands") {
            if (key.upArrow)
                setSelected( (s) => Math.max(0, s - 1))
            else if (key.downArrow)
                setSelected((s) => Math.min(actions.length - 1, s + 1))
            else if (key.return && tools.length > 0)
                setFocus("tools")
        }
        /*  focus: tools  */
        else if (focus === "tools") {
            if (key.upArrow)
                setSelectedTool((t) => Math.max(0, t - 1))
            else if (key.downArrow)
                setSelectedTool((t) => Math.min(tools.length - 1, t + 1))
            else if (key.escape)
                setFocus("commands")
            else if (key.return) {
                setFocus("output")
                handleSelect(actions[selected], tools[selectedTool]).catch((e) => {
                    logError("SetupScreen", "unexpected", e)
                })
            }
            else if (input === "o")
                setFocus("output")
        }
        /*  focus: output  */
        else if (focus === "output") {
            if (key.escape)
                setFocus("tools")
            /*  ↑↓ and pageUp/pageDown are handled by OutputBox internally  */
        }
    })

    /* left column: fixed width for action list */
    const actionsW = 20
    const toolsW   = 16
    const outputW  = Math.max(1, screenWidth  - actionsW - toolsW)
    const outputH  = Math.max(1, screenHeight - 1)

    return (
        <Box flexDirection='column' padding={1}>
            {loading ?
                <Text><Spinner type='dots' /> Loading tools...</Text> :
                <Box flexDirection='row'>
                    <Box flexDirection='column' width={actionsW}>
                        <SelectList items={actions} selectedIndex={selected} isFocused={focus === "commands"} header='Commands' maxVisible={outputH + 1} />
                    </Box>
                    <Box flexDirection='column' width={toolsW}>
                        <SelectList items={tools} selectedIndex={selectedTool} isFocused={focus === "tools"} header='Tool' maxVisible={outputH + 1} busyIndex={running ? selectedTool : undefined} />
                    </Box>
                    <Box flexDirection='column' width={outputW}>
                        <Text color={focus === "output" ? "cyan" : "gray"}>Command output</Text>
                        <OutputBox
                            lines={lines}
                            active={focus === "output"}
                            maxVisible={outputH}
                            contentWidth={outputW}
                            borderColor={focus === "output" ? "cyan" : "gray"}
                        />
                    </Box>
                </Box>}
        </Box>
    )
}

export default SetupScreen
