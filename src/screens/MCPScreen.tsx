/*
**  Agentic Software Engineering (ASE) - Terminal User Interface (TUI)
**  Copyright (c) 2026 Jochen Hörtreiter <Jochen.Hoertreiter@googlemail.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import { useEffect, useState, useRef } from "react"
import { Box, Text }                  from "ink"
import SelectInput                    from "ink-select-input"
import Spinner                        from "ink-spinner"
import { DateTime }                   from "luxon"
import stripAnsi                      from "strip-ansi"
import { execa }                      from "execa"
import { SelectIndicator, SelectItem, runCommand, type ActionItem } from "./Screen.js"
import OutputBox                      from "../components/OutputBox.js"
import { logError }                  from "../components/Logger.js"

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

const ACTIONS: ActionItem[] = [
    { label: "Activate",   value: "activate"   },
    { label: "Deactivate", value: "deactivate" }
]

type Props = { screenWidth: number, screenHeight: number }

const MCPScreen = ({ screenWidth, screenHeight }: Props) => {
    const [ loading,    setLoading    ] = useState(true)
    const [ servers,    setServers    ] = useState<McpServer[]>([])
    const [ selected,   setSelected   ] = useState(0)
    const [ running,    setRunning    ] = useState(false)
    const [ lines,      setLines      ] = useState<string[]>([])
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

    const serverItems: ActionItem[] = servers.map((s, i) => ({
        label: `[${s.id}] ${s.name}`,
        value: String(i)
    }))

    const handleServerSelect = (item: ActionItem) => {
        setSelected(Number(item.value))
    }

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

    /* layout: server list | action list | output */
    const serversW = 28
    const actionsW = 16
    const outputW  = Math.max(1, screenWidth  - serversW - actionsW)
    const outputH  = Math.max(1, screenHeight - 2)

    return (
        <Box flexDirection='column' padding={1}>
            {loading ?
                <Text><Spinner type='dots' /> Loading MCP servers...</Text> :
                <Box flexDirection='row'>
                    <Box flexDirection='column' width={serversW}>
                        <Text color='blue'>MCP Servers</Text>
                        <SelectInput
                            items={serverItems}
                            onSelect={handleServerSelect}
                            indicatorComponent={SelectIndicator}
                            itemComponent={SelectItem}
                        />
                    </Box>
                    <Box flexDirection='column' width={actionsW}>
                        <Text color='blue'>Action</Text>
                        {running ?
                            <Text><Spinner type='dots' /> Running...</Text> :
                            <SelectInput
                                items={ACTIONS}
                                onSelect={handleActionSelect}
                                indicatorComponent={SelectIndicator}
                                itemComponent={SelectItem}
                            />}
                    </Box>
                    <OutputBox lines={lines} active={!running} maxVisible={outputH} contentWidth={outputW} />
                </Box>}
        </Box>
    )
}

export default MCPScreen
