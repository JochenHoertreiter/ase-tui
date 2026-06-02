/*
**  Agentic Software Engineering (ASE) - Terminal User Interface (TUI)
**  Copyright (c) 2026 Jochen Hörtreiter <Jochen.Hoertreiter@googlemail.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import { useEffect, useState, useRef } from "react"
import { Box, Text, useInput }         from "ink"
import Spinner                         from "ink-spinner"
import { execa }                       from "execa"
import { DateTime }                    from "luxon"
import { runCommand, type ActionItem } from "./Screen.js"
import OutputBox                       from "../components/OutputBox.js"
import SelectList                      from "../components/SelectList.js"
import { logError }                    from "../components/Logger.js"

const actions: ActionItem[] = [
    { label: "Start service",  value: "start"  },
    { label: "Stop service",   value: "stop"   }
]

type Props = { screenWidth: number, screenHeight: number }

const ServiceScreen = ({ screenWidth, screenHeight }: Props) => {
    const [ statusLoading, setStatusLoading ] = useState(true)
    const [ status,        setStatus        ] = useState("")
    const [ running,       setRunning       ] = useState(false)
    const [ selected,      setSelected      ] = useState(0)
    const [ lines,         setLines         ] = useState<string[]>([])
    const runningRef = useRef(false)

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            try {
                const res = await execa("ase", [ "service", "status" ])
                if (!cancelled)
                    setStatus(res.stdout.trim())
            }
            catch (_) {
                if (!cancelled)
                    setStatus("unavailable")
            }
            if (!cancelled)
                setStatusLoading(false)
        }
        load().catch((e) => { logError("ServiceScreen", "unexpected", e) })
        return () => { cancelled = true }
    }, [])

    const handleSelect = async (item: ActionItem) => {
        if (runningRef.current)
            return
        runningRef.current = true
        setRunning(true)
        setLines([])
        let count = 0
        try {
            await runCommand([ "service", item.value ], (line) => {
                setLines((prev) => [ ...prev, line ])
                count++
            })
            let newStatus: string
            try {
                const r = await execa("ase", [ "service", "status" ])
                newStatus = r.stdout.trim()
            }
            catch (_) {
                newStatus = "unavailable"
            }
            setStatus(newStatus)
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

    useInput((_input, key) => {
        if (runningRef.current)
            return
        if (key.upArrow)
            setSelected((s) => Math.max(0, s - 1))
        else if (key.downArrow)
            setSelected((s) => Math.min(actions.length - 1, s + 1))
        else if (key.return)
            handleSelect(actions[selected]).catch(() => {})
    })

    /* own elements: 1 status + 1 blank + 1 spinner/select + 1 padding = 4 */
    const outputH = Math.max(1, screenHeight - 4)

    return (
        <Box flexDirection='column' padding={1}>
            {statusLoading ?
                <Text><Spinner type='dots' /> Loading status...</Text> :
                <Text>Status: <Text color='green'>{status}</Text></Text>}
            <Text> </Text>
            {running ?
                <Text><Spinner type='dots' /> Running...</Text> :
                <SelectList items={actions} selectedIndex={selected} isFocused />}
            <OutputBox lines={lines} active={!running} maxVisible={outputH} contentWidth={screenWidth} />
        </Box>
    )
}

export default ServiceScreen
