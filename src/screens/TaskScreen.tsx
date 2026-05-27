/*
**  Agentic Software Engineering (ASE)
**  Copyright (c) 2025-2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import { useEffect, useState }                   from "react"
import { Box, Text }                             from "ink"
import SelectInput                               from "ink-select-input"
import Spinner                                   from "ink-spinner"
import { execa }                                 from "execa"
import { SelectIndicator, SelectItem, type ActionItem } from "./Screen.js"

const TaskScreen = () => {
    const [ loading,     setLoading     ] = useState(true)
    const [ currentTask, setCurrentTask ] = useState("")
    const [ tasks,       setTasks       ] = useState<Array<{ label: string, value: string }>>([])
    const [ output,      setOutput      ] = useState<string | null>(null)

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

    const handleSelect = async (item: ActionItem) => {
        try {
            await execa("ase", [ "config", "--scope", "project", "set", "agent.task", item.value ])
            setCurrentTask(item.value)
            setOutput(`Switched to task: ${item.value}`)
        }
        catch (err) {
            setOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
        }
    }

    return (
        <Box flexDirection='column' padding={1}>
            {loading ?
                <Text><Spinner type='dots' /> Loading...</Text> :
                <Text>Current: <Text color='yellow'>{currentTask}</Text></Text>}
            <Text> </Text>
            {!loading
                && <SelectInput items={tasks} onSelect={handleSelect} indicatorComponent={SelectIndicator} itemComponent={SelectItem} />}
            {output !== null && <Text color='yellow'>{output}</Text>}
        </Box>
    )
}

export default TaskScreen
