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
import { runCommand, type ActionItem } from "./Screen.js"
import OutputBox                       from "../components/OutputBox.js"
import SelectList                      from "../components/SelectList.js"
import type { HintSegment }            from "../components/HintBar.js"

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

const SetupScreen = ({ onHint, screenWidth, screenHeight }: Props) => {
    const [ running,    setRunning    ] = useState(false)
    const [ selected,   setSelected   ] = useState(0)
    const [ lines,      setLines      ] = useState<string[]>([])
    const runningRef = useRef(false)

    /*  delegate hint text to the master hint bar  */
    useEffect(() => {
        onHint([
            { key: "↑ ↓", desc: "navigate actions" },
            { key: "⏎",   desc: "execute action"   }
        ])
    }, [ onHint ])

    const handleSelect = async (item: ActionItem) => {
        if (runningRef.current)
            return
        runningRef.current = true
        setRunning(true)
        setLines([])
        let count = 0
        try {
            await runCommand([ "setup", item.value ], (line) => {
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

    useInput((_input, key) => {
        if (runningRef.current)
            return
        if (key.upArrow)
            setSelected((s) => Math.max(0, s - 1))
        else if (key.downArrow)
            setSelected((s) => Math.min(actions.length - 1, s + 1))
        else if (key.return && actions.length > 0)
            handleSelect(actions[selected]).catch(() => {})
    })

    /* left column: fixed width for action list */
    const actionsW = 20
    const outputW  = Math.max(1, screenWidth  - actionsW)
    const outputH  = Math.max(1, screenHeight)

    return (
        <Box flexDirection='row' padding={1}>
            <Box flexDirection='column' width={actionsW}>
                {running ?
                    <Box flexDirection='column'>
                        <Text color='gray'>Commands</Text>
                        <Text><Spinner type='dots' /> Running...</Text>
                    </Box> :
                    <SelectList items={actions} selectedIndex={selected} isFocused header='Commands' />}
            </Box>
            <OutputBox lines={lines} active={!running} maxVisible={outputH} contentWidth={outputW} />
        </Box>
    )
}

export default SetupScreen
