/*
**  Agentic Software Engineering (ASE) - Terminal User Interface (TUI)
**  Copyright (c) 2026 Jochen Hörtreiter <Jochen.Hoertreiter@googlemail.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import { Box, Text }         from "ink"
import type { ActionItem }   from "../screens/Screen.js"

type Props = {
    items:         ActionItem[]
    selectedIndex: number
    isFocused?:    boolean
    header?:       string
    maxVisible?:   number
}

const SelectList = ({ items, selectedIndex, isFocused = false, header, maxVisible }: Props) => {
    /* number of item rows that fit: maxVisible (total) minus the optional header row */
    const rows = maxVisible !== undefined ?
        Math.max(1, maxVisible - (header !== undefined ? 1 : 0)) :
        items.length
    const needBar = items.length > rows

    /* window the items around the selection so the selected item stays visible */
    const maxOffset = Math.max(0, items.length - rows)
    const offset    = Math.min(maxOffset, Math.max(0, selectedIndex - Math.floor(rows / 2)))
    const visible   = items.slice(offset, offset + rows)

    const thumbPos = maxOffset > 0 ?
        Math.min(rows - 1, Math.round((offset / maxOffset) * (rows - 1))) :
        0

    const list = (
        <Box flexDirection='column'>
            {visible.map((item, i) => {
                const idx = offset + i
                return (
                    <Text key={item.value} color={idx === selectedIndex ? (isFocused ? "cyan" : "gray") : "white"}>
                        {idx === selectedIndex ? <Text color={isFocused ? "cyan" : "gray"}>❯ </Text> : "  "}{item.label}
                    </Text>
                )
            })}
        </Box>
    )

    return (
        <Box flexDirection='column'>
            {header !== undefined ?
                <Text color={isFocused ? "cyan" : "gray"}>{header}</Text> : null}
            {needBar ?
                <Box flexDirection='row'>
                    <Box flexDirection='column' flexGrow={1}>{list}</Box>
                    <Box flexDirection='column' width={1} flexShrink={0}>
                        {[ ...Array(rows).keys() ].map((i) =>
                            <Text key={i} color={isFocused ? "cyan" : "gray"}>{i === thumbPos ? "█" : "│"}</Text>
                        )}
                    </Box>
                    <Box width={1} flexShrink={0} />
                </Box> :
                list}
        </Box>
    )
}

export default SelectList