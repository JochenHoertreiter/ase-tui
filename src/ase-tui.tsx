/*
**  Agentic Software Engineering (ASE) - Terminal User Interface (TUI)
**  Copyright (c) 2026 Jochen Hörtreiter <Jochen.Hoertreiter@googlemail.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import { useState, useEffect, useRef, useCallback }       from "react"
import { render, Box, Text, useInput, useApp, useStdout } from "ink"
import type { ComponentProps }                            from "react"
import cliTruncate                                        from "cli-truncate"

import ConfigScreen  from "./screens/ConfigScreen.js"
import ServiceScreen from "./screens/ServiceScreen.js"
import TaskScreen    from "./screens/TaskScreen.js"
import SetupScreen   from "./screens/SetupScreen.js"
import MCPScreen     from "./screens/MCPScreen.js"
import HintBar, { type HintSegment } from "./components/HintBar.js"

/* fixed line counts for layout budgeting */
const HEADER_LINES = 5  /* 1 title + 3 tab-bar (border+content+border) + 1 padding */
const HINT_LINES   = 1  /* 1 hint bar at bottom */
const SCREEN_PAD_H = 2  /* padding={1} inside each screen = 1 left + 1 right */

type Screen = "config" | "service" | "task" | "setup" | "mcp"

/* tab border styles */
const BORDER_ACTIVE:   ComponentProps<typeof Box>["borderStyle"] = {
    topLeft: "╭", top: "─", topRight: "╮",
    bottomLeft: "╯", bottom: " ", bottomRight: "╰",
    left: "│", right: "│"
}
const BORDER_INACTIVE: ComponentProps<typeof Box>["borderStyle"] = {
    topLeft: "╭", top: "─", topRight: "╮",
    bottomLeft: "┴", bottom: "─", bottomRight: "┴",
    left: "│", right: "│"
}

const tabs: Array<{ label: string, value: Screen }> = [
    { label: "Config",  value: "config"  },
    { label: "Service", value: "service" },
    { label: "Task",    value: "task"    },
    { label: "Setup",   value: "setup"   },
    { label: "MCP",     value: "mcp"     }
]


const TITLE = "⧉ ASE — Agentic Software Engineering - Terminal User Interface (tui)"
const BASE_HINT: HintSegment[] = [
    { key: "← →", desc: "navigate tabs" },
    { key: "q",   desc: "quit"          }
]

const App = () => {
    const { exit }      = useApp()
    const { stdout }    = useStdout()
    const escBlockedRef = useRef(false)
    const [ tab,  setTab  ] = useState(0)
    const [ hint, setHint ] = useState(BASE_HINT)

    const termSize = () => ({ termW: stdout.columns ?? 80, termH: stdout.rows ?? 24 })
    const [ { termW, termH }, setTermSize ] = useState(termSize)

    useEffect(() => {
        const onResize = () => setTermSize(termSize())
        stdout.on("resize", onResize)
        return () => { stdout.off("resize", onResize) }
    }, [ stdout ])

    const screenW  = Math.max(1, termW - SCREEN_PAD_H)
    const screenH  = Math.max(1, termH - HEADER_LINES - HINT_LINES)
    const contentH = screenH + HINT_LINES

    useInput((input, key) => {
        if ((input === "q" || input === "Q" || key.escape) && !escBlockedRef.current)
            exit()
        else if (key.leftArrow) {
            setTab((t) => (t - 1 + tabs.length) % tabs.length)
            setHint(BASE_HINT)
        }
        else if (key.rightArrow) {
            setTab((t) => (t + 1) % tabs.length)
            setHint(BASE_HINT)
        }
    })

    /* available width inside paddingLeft={1} container */
    const innerW = Math.max(1, termW - 1)

    const screen = tabs[tab].value

    /* each tab occupies: 1 (left border) + 1 (paddingLeft) + label + 1 (paddingRight) + 1 (right border) */
    const tabsWidth = 1 + tabs.reduce((sum, t) => sum + t.label.length + 4, 0)
    const restW     = Math.max(0, termW - tabsWidth - 1)

    const onHintCb = useCallback(
        (s: HintSegment[] | null) => setHint(s ? [ ...s, ...BASE_HINT ] : BASE_HINT),
        [ setHint ]
    )

    return (
        <Box flexDirection='column' width={termW} height={termH}>
            <Box paddingLeft={1}>
                <Text bold color='cyan'>{cliTruncate(TITLE, innerW)}</Text>
            </Box>
            <Box flexDirection='row' paddingLeft={1}>
                {tabs.map((t, i) =>
                    i === tab ?
                        <Box key={t.value} borderStyle={BORDER_ACTIVE} borderColor='gray' paddingLeft={1} paddingRight={1}>
                            <Text color='cyan'>{t.label}</Text>
                        </Box> :
                        <Box key={t.value} borderStyle={BORDER_INACTIVE} borderColor='gray' paddingLeft={1} paddingRight={1}>
                            <Text color='gray'>{t.label}</Text>
                        </Box>
                )}
                <Box alignSelf='flex-end'>
                    <Text color='gray'>{"─".repeat(restW)}</Text>
                </Box>
            </Box>
            <Box height={contentH}>
                {screen === "config"  && <ConfigScreen screenWidth={screenW} screenHeight={screenH} />}
                {screen === "service" && <ServiceScreen screenWidth={screenW} screenHeight={screenH} />}
                {screen === "task"    && <TaskScreen escBlockedRef={escBlockedRef} onHint={onHintCb} screenWidth={screenW} screenHeight={screenH} />}
                {screen === "setup"   && <SetupScreen screenWidth={screenW} screenHeight={screenH} />}
                {screen === "mcp"     && <MCPScreen screenWidth={screenW} screenHeight={screenH} />}
            </Box>
            <HintBar hint={hint} width={termW} />
        </Box>
    )
}

render(<App />, { alternateScreen: true })
