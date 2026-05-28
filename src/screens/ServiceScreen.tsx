/*
**  Agentic Software Engineering (ASE)
**  Copyright (c) 2025-2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import { useEffect, useState, useRef } from "react"
import { Box, Text }                  from "ink"
import SelectInput                    from "ink-select-input"
import Spinner                        from "ink-spinner"
import { execa }                      from "execa"
import { DateTime }                   from "luxon"
import { SelectIndicator, SelectItem, runCommand, type ActionItem } from "./Screen.js"
import OutputBox                      from "../components/OutputBox.js"

const actions: ActionItem[] = [
    { label: "Start service",  value: "start"  },
    { label: "Stop service",   value: "stop"   }
]

type Props = { screenWidth: number, screenHeight: number }

const ServiceScreen = ({ screenWidth, screenHeight }: Props) => {
    const [ statusLoading, setStatusLoading ] = useState(true)
    const [ status,        setStatus        ] = useState("")
    const [ running,       setRunning       ] = useState(false)
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
        load().catch((e) => { console.error("[ase-tui] unexpected:", e) })
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
                <SelectInput items={actions} onSelect={handleSelect} indicatorComponent={SelectIndicator} itemComponent={SelectItem} />}
            <OutputBox lines={lines} active={!running} maxVisible={outputH} contentWidth={screenWidth} />
        </Box>
    )
}

export default ServiceScreen
