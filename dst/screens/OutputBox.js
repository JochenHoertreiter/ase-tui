import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/*
**  Agentic Software Engineering (ASE)
**  Copyright (c) 2025-2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/
import { useEffect, useState, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import wrapAnsi from "wrap-ansi";
const OutputBox = ({ lines, active, maxVisible, contentWidth, borderColor = "cyan" }) => {
    const [offset, setOffset] = useState(0);
    /* inner width: contentWidth minus 1 left border, 1 left padding, 1 right scrollbar/border */
    const innerW = Math.max(1, contentWidth - 3);
    /* wrap each raw line to innerW, preserving ANSI codes */
    const wrapped = useMemo(() => {
        const result = [];
        for (const line of lines)
            for (const wl of wrapAnsi(line, innerW, { hard: true, trim: false, wordWrap: false }).split("\n"))
                result.push(wl);
        return result;
    }, [lines, innerW]);
    const total = wrapped.length;
    const needBar = total > maxVisible;
    /* auto-scroll to bottom when new lines arrive and user is at bottom */
    useEffect(() => {
        setOffset((o) => {
            const maxOffset = Math.max(0, total - maxVisible);
            return o >= maxOffset ? maxOffset : o;
        });
    }, [total, maxVisible]);
    useInput((_input, key) => {
        if (!active || !needBar)
            return;
        if (key.upArrow)
            setOffset((o) => Math.max(0, o - 1));
        else if (key.downArrow)
            setOffset((o) => Math.min(Math.max(0, total - maxVisible), o + 1));
        else if (key.pageUp)
            setOffset((o) => Math.max(0, o - maxVisible));
        else if (key.pageDown)
            setOffset((o) => Math.min(Math.max(0, total - maxVisible), o + maxVisible));
    });
    if (total === 0)
        return null;
    const visible = wrapped.slice(offset, offset + maxVisible);
    const maxOffset = Math.max(0, total - maxVisible);
    const barHeight = maxVisible;
    const thumbPos = maxOffset > 0 ?
        Math.round((offset / maxOffset) * (barHeight - 1)) :
        0;
    return (_jsxs(Box, { flexDirection: 'row', borderStyle: 'round', borderColor: borderColor, width: contentWidth, children: [_jsx(Box, { flexDirection: 'column', flexGrow: 1, paddingLeft: 1, children: visible.map((line, i) => _jsx(Text, { children: line }, offset + i)) }), needBar ?
                _jsx(Box, { flexDirection: 'column', width: 1, children: [...Array(barHeight).keys()].map((i) => _jsx(Text, { color: 'cyan', children: i === thumbPos ? "█" : "│" }, i)) }) :
                null] }));
};
export default OutputBox;
