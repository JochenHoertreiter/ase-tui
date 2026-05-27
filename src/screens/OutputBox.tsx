/*
**  Agentic Software Engineering (ASE)
**  Copyright (c) 2025-2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import { useEffect, useState, useMemo } from "react"
import { Box, Text, useInput } from "ink"
import wrapAnsi                from "wrap-ansi"

type Props = {
    lines:        string[]
    active:       boolean
    maxVisible:   number
    contentWidth: number
}

const OutputBox = ({ lines, active, maxVisible, contentWidth }: Props) => {
    const [ offset, setOffset ] = useState(0)

    /* inner width: contentWidth minus 1 left border, 1 left padding, 1 right scrollbar/border */
    const innerW = Math.max(1, contentWidth - 3)

    /* wrap each raw line to innerW, preserving ANSI codes */
    const wrapped = useMemo(() => {
        const result: string[] = []
        for (const line of lines)
            for (const wl of wrapAnsi(line, innerW, { hard: true, trim: false, wordWrap: false }).split("\n"))
                result.push(wl)
        return result
    }, [ lines, innerW ])

    const total   = wrapped.length
    const needBar = total > maxVisible

    /* auto-scroll to bottom when new lines arrive and user is at bottom */
    useEffect(() => {
        setOffset((o) => {
            const maxOffset = Math.max(0, total - maxVisible)
            return o >= maxOffset ? maxOffset : o
        })
    }, [ total, maxVisible ])

    useInput((_input, key) => {
        if (!active || !needBar)
            return
        if (key.upArrow)
            setOffset((o) => Math.max(0, o - 1))
        else if (key.downArrow)
            setOffset((o) => Math.min(Math.max(0, total - maxVisible), o + 1))
        else if (key.pageUp)
            setOffset((o) => Math.max(0, o - maxVisible))
        else if (key.pageDown)
            setOffset((o) => Math.min(Math.max(0, total - maxVisible), o + maxVisible))
    })

    if (total === 0)
        return null

    const visible = wrapped.slice(offset, offset + maxVisible)

    const maxOffset  = Math.max(0, total - maxVisible)
    const barHeight  = maxVisible
    const thumbPos   = maxOffset > 0 ?
        Math.round((offset / maxOffset) * (barHeight - 1)) :
        0

    return (
        <Box flexDirection='row' borderStyle='round' borderColor='cyan' width={contentWidth}>
            <Box flexDirection='column' flexGrow={1} paddingLeft={1}>
                {visible.map((line, i) =>
                    <Text key={offset + i}>{line}</Text>
                )}
            </Box>
            {needBar ?
                <Box flexDirection='column' width={1}>
                    {[ ...Array(barHeight).keys() ].map((i) =>
                        <Text key={i} color='cyan'>{i === thumbPos ? "█" : "│"}</Text>
                    )}
                </Box> :
                null}
        </Box>
    )
}

export default OutputBox
