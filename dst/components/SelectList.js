import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/*
**  Agentic Software Engineering (ASE) - Terminal User Interface (TUI)
**  Copyright (c) 2026 Jochen Hörtreiter <Jochen.Hoertreiter@googlemail.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
const SelectList = ({ items, selectedIndex, isFocused = false, header, maxVisible, busyIndex }) => {
    /* number of item rows that fit: maxVisible (total) minus the optional header row */
    const rows = maxVisible !== undefined ?
        Math.max(1, maxVisible - (header !== undefined ? 1 : 0)) :
        items.length;
    const needBar = items.length > rows;
    /* window the items around the selection so the selected item stays visible */
    const maxOffset = Math.max(0, items.length - rows);
    const offset = Math.min(maxOffset, Math.max(0, selectedIndex - Math.floor(rows / 2)));
    const visible = items.slice(offset, offset + rows);
    const thumbPos = maxOffset > 0 ?
        Math.min(rows - 1, Math.round((offset / maxOffset) * (rows - 1))) :
        0;
    const list = (_jsx(Box, { flexDirection: 'column', children: visible.map((item, i) => {
            const idx = offset + i;
            return (_jsxs(Text, { color: idx === selectedIndex ? (isFocused ? "cyan" : "gray") : "white", children: [idx === busyIndex ?
                        _jsxs(Text, { color: isFocused ? "cyan" : "gray", children: [_jsx(Spinner, { type: 'dots' }), " "] }) :
                        idx === selectedIndex ? _jsx(Text, { color: isFocused ? "cyan" : "gray", children: "\u276F " }) : "  ", item.label] }, item.value));
        }) }));
    return (_jsxs(Box, { flexDirection: 'column', children: [header !== undefined ?
                _jsx(Text, { color: isFocused ? "cyan" : "gray", children: header }) : null, needBar ?
                _jsxs(Box, { flexDirection: 'row', children: [_jsx(Box, { flexDirection: 'column', flexGrow: 1, children: list }), _jsx(Box, { flexDirection: 'column', width: 1, flexShrink: 0, children: [...Array(rows).keys()].map((i) => _jsx(Text, { color: isFocused ? "cyan" : "gray", children: i === thumbPos ? "█" : "│" }, i)) }), _jsx(Box, { width: 1, flexShrink: 0 })] }) :
                list] }));
};
export default SelectList;
