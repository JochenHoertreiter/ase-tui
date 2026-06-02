import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/*
**  Agentic Software Engineering (ASE) - Terminal User Interface (TUI)
**  Copyright (c) 2026 Jochen Hörtreiter <Jochen.Hoertreiter@googlemail.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/
import { Box, Text } from "ink";
const SelectList = ({ items, selectedIndex, isFocused = false, header }) => (_jsxs(Box, { flexDirection: 'column', children: [header !== undefined ?
            _jsx(Text, { color: isFocused ? "cyan" : "gray", children: header }) : null, items.map((item, i) => (_jsxs(Text, { color: i === selectedIndex ? (isFocused ? "cyan" : "gray") : "white", children: [i === selectedIndex ? _jsx(Text, { color: isFocused ? "cyan" : "gray", children: "\u276F " }) : "  ", item.label] }, item.value)))] }));
export default SelectList;
