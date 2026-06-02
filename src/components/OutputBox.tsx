/*
**  Agentic Software Engineering (ASE) - Terminal User Interface (TUI)
**  Copyright (c) 2026 Jochen Hörtreiter <Jochen.Hoertreiter@googlemail.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import { useEffect, useState, useMemo } from "react"
import { Box, Text, useInput } from "ink"
import wrapAnsi                from "wrap-ansi"
import { logDebug }            from "./Logger.js"

type Props = {
    lines:        string[]
    active:       boolean
    maxVisible:   number
    contentWidth: number
    borderColor?: string
}

const OutputBox = ({ lines, active, maxVisible, contentWidth, borderColor = "cyan" }: Props) => {
    const [ offset, setOffset ] = useState(0)

    /* number column width derived from the highest source line number */
    const numW = Math.max(1, lines.length).toString().length

    /* inner width: contentWidth minus 2 borders, 1 left padding, 1 right scrollbar, numW+1 for line number column */
    const innerW = Math.max(1, contentWidth - 2 - 1 - 1 - (numW + 1))

    /* wrap each raw line to innerW, preserving ANSI codes; remember source line number,
       and whether a wrapped segment is a continuation (so it gets no own line number) */
    const wrapped = useMemo(() => {
        const result: { text: string, num: number, cont: boolean }[] = []
        lines.forEach((line, idx) => {
            const segs = wrapAnsi(line, innerW, { hard: true, trim: false, wordWrap: false }).split("\n")
            segs.forEach((seg, si) =>
                result.push({ text: seg, num: idx + 1, cont: si > 0 }))
        })
        return result
    }, [ lines, innerW ])

    const total   = wrapped.length

    /* inner height: maxVisible is the total component height, minus 2 border rows */
    const innerH  = Math.max(1, maxVisible - 2)
    const needBar = total > innerH

    /* auto-scroll to bottom when new lines arrive and user is at bottom */
    useEffect(() => {
        setOffset((o) => {
            const maxOffset = Math.max(0, total - innerH)
            return o >= maxOffset ? maxOffset : o
        })
    }, [ total, innerH ])

    useInput((_input, key) => {
        if (!active || !needBar)
            return
        if (key.upArrow)
            setOffset((o) => Math.max(0, o - 1))
        else if (key.downArrow)
            setOffset((o) => Math.min(Math.max(0, total - innerH), o + 1))
        else if (key.pageUp)
            setOffset((o) => Math.max(0, o - innerH))
        else if (key.pageDown)
            setOffset((o) => Math.min(Math.max(0, total - innerH), o + innerH))
    })

    if (total === 0)
        return null

    const visible = wrapped.slice(offset, offset + innerH)

    const maxOffset  = Math.max(0, total - innerH)
    const barHeight  = innerH
    const thumbPos   = maxOffset > 0 ?
        Math.min(barHeight - 1, Math.round((offset / maxOffset) * (barHeight - 1))) :
        0

    logDebug("OutputBox", "render", { lines: lines.length, contentWidth, innerW, innerH, total, maxVisible, needBar, offset, maxOffset, thumbPos, barHeight })

    return (
        <Box flexDirection='row' borderStyle='round' borderColor={borderColor} width={contentWidth} height={maxVisible}>
            <Box flexDirection='column' flexGrow={1} paddingLeft={1}>
                {visible.map((line, i) =>
                    <Box key={i} flexDirection='row'>
                        <Box width={numW + 1} flexShrink={0}>
                            <Text dimColor>{line.cont ? "" : String(line.num).padStart(numW)}</Text>
                        </Box>
                        <Text>{line.text}</Text>
                    </Box>
                )}
            </Box>
            {needBar ?
                <Box flexDirection='column' width={1} flexShrink={0}>
                    {[ ...Array(barHeight).keys() ].map((i) =>
                        <Text key={i} color='cyan'>{i === thumbPos ? "█" : "│"}</Text>
                    )}
                </Box> :
                null}
        </Box>
    )
}

export default OutputBox
