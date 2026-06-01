/*
**  Agentic Software Engineering (ASE) - Terminal User Interface (TUI)
**  Copyright (c) 2026 Jochen Hörtreiter <Jochen.Hoertreiter@googlemail.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import { useState, useRef }    from "react"
import { Box, Text }           from "ink"
import SelectInput             from "ink-select-input"
import Spinner                 from "ink-spinner"
import { DateTime }            from "luxon"
import { SelectIndicator, SelectItem, runCommand, type ActionItem } from "./Screen.js"
import OutputBox               from "../components/OutputBox.js"

type Props = {
    command:      string
    actions:      ActionItem[]
    listHeader?:  string
    screenWidth:  number
    screenHeight: number
}

const ActionScreen = ({ command, actions, listHeader, screenWidth, screenHeight }: Props) => {
    const [ running,    setRunning    ] = useState(false)
    const [ lines,      setLines      ] = useState<string[]>([])
    const runningRef = useRef(false)

    const handleSelect = async (item: ActionItem) => {
        if (runningRef.current)
            return
        runningRef.current = true
        setRunning(true)
        setLines([])
        let count = 0
        try {
            await runCommand([ command, item.value ], (line) => {
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

    /* left column: fixed width for action list */
    const actionsW = 20
    const outputW  = Math.max(1, screenWidth  - actionsW)
    const outputH  = Math.max(1, screenHeight)

    return (
        <Box flexDirection='row' padding={1}>
            <Box flexDirection='column' width={actionsW}>
                {listHeader !== undefined ?
                    <Text color={running ? "gray" : "cyan"}>{listHeader}</Text> : null}
                {running ?
                    <Text><Spinner type='dots' /> Running...</Text> :
                    <SelectInput items={actions} onSelect={handleSelect} indicatorComponent={SelectIndicator} itemComponent={SelectItem} />}
            </Box>
            <OutputBox lines={lines} active={!running} maxVisible={outputH} contentWidth={outputW} />
        </Box>
    )
}

export default ActionScreen
