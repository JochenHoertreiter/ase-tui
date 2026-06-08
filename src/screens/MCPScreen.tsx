/*
**  Agentic Software Engineering (ASE) - Terminal User Interface (TUI)
**  Copyright (c) 2026 Jochen Hörtreiter <Jochen.Hoertreiter@googlemail.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import { useEffect, useState, useRef } from "react"
import type { RefObject }              from "react"
import { Box, Text, useInput }         from "ink"
import Spinner                         from "ink-spinner"
import { DateTime }                    from "luxon"
import stripAnsi                       from "strip-ansi"
import { execa }                       from "execa"
import { runCommand, type ActionItem } from "./Screen.js"
import OutputBox                       from "../components/OutputBox.js"
import SelectList                      from "../components/SelectList.js"
import { logError }                    from "../components/Logger.js"
import type { HintSegment }            from "../components/HintBar.js"

type McpServer = { id: string, name: string }

/*  parse "ase setup mcp list" table output into server list  */
const parseMcpList = (stdout: string): McpServer[] => {
    const servers: McpServer[] = []
    for (const raw of stdout.split("\n")) {
        const line = stripAnsi(raw)
        if (!line.includes("│"))
            continue
        const cols = line.split("│").map((c) => c.trim()).filter((_, i) => i > 0)
        if (cols.length < 2)
            continue
        const [ id, name ] = cols
        if (!id || id === "ID")
            continue
        servers.push({ id, name })
    }
    return servers
}

const APPENDIX_GAP = 2
const SUFFIX_GAP   = 3

const ACTIONS: ActionItem[] = [
    { label: "Activate",   value: "activate"   },
    { label: "Deactivate", value: "deactivate" }
]

type Focus = "servers" | "actions" | "output"

type Props = {
    escBlockedRef: RefObject<boolean>
    onHint:        (hint: HintSegment[] | null) => void
    screenWidth:   number
    screenHeight:  number
}

const MCPScreen = ({ escBlockedRef, onHint, screenWidth, screenHeight }: Props) => {
    const [ loading,        setLoading        ] = useState(true)
    const [ servers,        setServers        ] = useState<McpServer[]>([])
    const [ selected,       setSelected       ] = useState(0)
    const [ selectedAction, setSelectedAction ] = useState(0)
    const [ focus,          setFocus          ] = useState<Focus>("servers")
    const [ running,        setRunning        ] = useState(false)
    const [ lines,          setLines          ] = useState<string[]>([])
    const runningRef = useRef(false)

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            try {
                const res = await execa("ase", [ "setup", "mcp", "list" ])
                if (!cancelled) {
                    setServers(parseMcpList(res.stdout))
                    setLoading(false)
                }
            }
            catch (e: unknown) {
                if (!cancelled) {
                    setServers([])
                    setLoading(false)
                }
            }
        }
        load().catch((e) => { logError("MCPScreen", "unexpected", e) })
        return () => { cancelled = true }
    }, [])

    /*  sync escBlockedRef so App's global ESC handler knows when to block  */
    useEffect(() => {
        escBlockedRef.current = focus !== "servers"
        return () => { escBlockedRef.current = false }
    }, [ focus, escBlockedRef ])

    /*  delegate focus-dependent hint text to the master hint bar  */
    useEffect(() => {
        if (focus === "servers")
            onHint([
                { key: "↑ ↓", desc: "navigate servers" },
                { key: "⏎",   desc: "select server"    }
            ])
        else if (focus === "actions")
            onHint([
                { key: "↑ ↓", desc: "navigate actions" },
                { key: "⏎",   desc: "execute action"   },
                { key: "o",   desc: "output"           },
                { key: "ESC", desc: "back"             }
            ])
        else
            onHint([
                { key: "↑ ↓ / PgUp/PgDn", desc: "scroll output" },
                { key: "ESC",             desc: "back"          }
            ])
    }, [ focus, onHint ])

    const serverItems: ActionItem[] = servers.map((s, i) => ({
        label: `[${s.id}] ${s.name}`,
        value: String(i)
    }))

    const handleActionSelect = async (item: ActionItem) => {
        if (runningRef.current)
            return
        const srv = servers[selected]
        if (!srv)
            return
        runningRef.current = true
        setRunning(true)
        setLines([])
        let count = 0
        try {
            await runCommand([ "setup", "mcp", item.value, srv.id ], (line) => {
                setLines((prev) => [ ...prev, line ])
                count++
            })
            if (count === 0)
                setLines([ `[${DateTime.now().toFormat("yyyy-LL-dd HH:mm:ss.SSS")}] done` ])
        }
        catch (err) {
            setLines((prev) => [ ...prev, `Error: ${err instanceof Error ? err.message : String(err)}` ])
        }
        finally {
            runningRef.current = false
            setRunning(false)
        }
    }

    useInput((input, key) => {
        if (runningRef.current)
            return
        if (focus === "servers") {
            if (key.upArrow)
                setSelected((s) => Math.max(0, s - 1))
            else if (key.downArrow)
                setSelected((s) => Math.min(servers.length - 1, s + 1))
            else if (key.return && servers.length > 0)
                setFocus("actions")
        }
        else if (focus === "actions") {
            if (key.upArrow)
                setSelectedAction((i) => Math.max(0, i - 1))
            else if (key.downArrow)
                setSelectedAction((i) => Math.min(ACTIONS.length - 1, i + 1))
            else if (key.escape)
                setFocus("servers")
            else if (key.return) {
                setFocus("output")
                handleActionSelect(ACTIONS[selectedAction]).catch((e) => {
                    logError("MCPScreen", "unexpected", e)
                })
            }
            else if (input === "o")
                setFocus("output")
        }
        else if (focus === "output") {
            if (key.escape)
                setFocus("actions")
            /*  ↑↓ and pageUp/pageDown are handled by OutputBox internally  */
        }
    })

    /* layout: server list | action list | output */
    const actionsW = 16
    /* grow server column to widest label (incl. cursor padding), capped at 80 and clamped to leave room for output */
    const labels   = [ "MCP Servers", ...serverItems.map((s) => s.label) ]
    const widest   = labels.reduce((m, l) => Math.max(m, l.length), 0)
    const serversW = Math.min(80, Math.max(28, APPENDIX_GAP + widest + SUFFIX_GAP), Math.max(28, screenWidth - actionsW - 10))
    const outputW  = Math.max(1, screenWidth  - serversW - actionsW)
    const outputH  = Math.max(1, screenHeight - 2)

    return (
        <Box flexDirection='column' padding={1}>
            {loading ?
                <Text><Spinner type='dots' /> Loading MCP servers...</Text> :
                <Box flexDirection='row'>
                    <Box flexDirection='column' width={serversW}>
                        <SelectList items={serverItems} selectedIndex={selected} isFocused={focus === "servers"} header='MCP Servers' maxVisible={outputH + 1} />
                    </Box>
                    <Box flexDirection='column' width={actionsW}>
                        <SelectList items={ACTIONS} selectedIndex={selectedAction} isFocused={focus === "actions"} header='Action' maxVisible={outputH + 1} busyIndex={running ? selectedAction : undefined} />
                    </Box>
                    <Box flexDirection='column' width={outputW}>
                        <Text color={focus === "output" ? "cyan" : "gray"}>MCP output</Text>
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

export default MCPScreen
