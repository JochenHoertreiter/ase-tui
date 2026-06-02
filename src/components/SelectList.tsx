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
}

const SelectList = ({ items, selectedIndex, isFocused = false, header }: Props) => (
    <Box flexDirection='column'>
        {header !== undefined ?
            <Text color={isFocused ? "cyan" : "gray"}>{header}</Text> : null}
        {items.map((item, i) => (
            <Text key={item.value} color={i === selectedIndex ? (isFocused ? "cyan" : "gray") : "white"}>
                {i === selectedIndex ? <Text color={isFocused ? "cyan" : "gray"}>❯ </Text> : "  "}{item.label}
            </Text>
        ))}
    </Box>
)

export default SelectList