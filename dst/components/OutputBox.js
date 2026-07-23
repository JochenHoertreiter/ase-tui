import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/*
**  Agentic Software Engineering (ASE) - Terminal User Interface (TUI)
**  Copyright (c) 2026 Jochen Hörtreiter <Jochen.Hoertreiter@googlemail.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/
import { useEffect, useState, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import wrapAnsi from "wrap-ansi";
import chalk from "chalk";
import { logDebug } from "./Logger.js";
/* central color map: keys named by the functionality they colorize (not by the
   color), values are chalk styler functions; single source of truth for all
   OutputBox line coloring */
const COLOR = {
    heading1: chalk.hex("#0050FF"),
    heading2: chalk.hex("#008FFF"),
    heading3: chalk.blueBright,
    metaLabel: chalk.hex("#FFA500"),
    boldText: chalk.white.bold,
    diffHeader: chalk.yellow.bold,
    diffHunk: chalk.cyan,
    diffAdd: chalk.green,
    diffRemove: chalk.red,
    stringSingle: chalk.hex("#fffce2"),
    stringBacktick: chalk.hex("#fffce2")
};
/* colorize the string literals of one line, honoring the cross-line open state;
   only a lone backtick is a delimiter (```-runs are excluded and never colored),
   empty literals are ignored, and an unclosed opening quote sets the returned state */
const colorStringLiterals = (line, open) => {
    const styler = (q) => q === "'" ? COLOR.stringSingle : COLOR.stringBacktick;
    /* a backtick is a delimiter only when standing alone (not part of a ``` run) */
    const isDelim = (q, i) => {
        if (line[i] !== q)
            return false;
        /* an escaped quote (odd number of preceding backslashes) is not a delimiter */
        let bs = 0;
        while (line[i - 1 - bs] === "\\")
            bs++;
        if (bs % 2 === 1)
            return false;
        if (q === "`")
            return line[i - 1] !== "`" && line[i + 1] !== "`";
        return true;
    };
    /* continue an open literal: color up to its closing delimiter, else the whole line */
    if (open !== "") {
        for (let i = 0; i < line.length; i++)
            if (isDelim(open, i)) {
                const rest = colorStringLiterals(line.slice(i + 1), "");
                return { text: styler(open)(line.slice(0, i + 1)) + rest.text, open: rest.open };
            }
        return { text: styler(open)(line), open };
    }
    /* scan for opening delimiters left-to-right */
    let out = "";
    let i = 0;
    while (i < line.length) {
        const q = line[i] === "'" ? "'" : line[i] === "`" ? "`" : "";
        if (q !== "" && isDelim(q, i)) {
            /* find matching closing delimiter with at least one content character */
            let j = i + 1;
            while (j < line.length && !(j > i + 1 && isDelim(q, j)))
                j++;
            if (j < line.length && isDelim(q, j)) {
                out += styler(q)(line.slice(i, j + 1));
                i = j + 1;
                continue;
            }
            /* no closing delimiter but content follows: open literal until a later line */
            if (i + 1 < line.length) {
                out += styler(q)(line.slice(i));
                return { text: out, open: q };
            }
        }
        out += line[i];
        i++;
    }
    return { text: out, open: "" };
};
/* colorize one raw markdown line (outside any ```text fence) with ANSI colors;
   priority: heading > created/modified > bold-text; markdown colors are kept
   disjoint from the git-diff colors (green/red/cyan/yellow) */
const colorMarkdownLine = (line, open) => {
    /* headings: whole line incl. leading # markers, nuance per level */
    const head = /^(#+)\s/.exec(line);
    if (head !== null) {
        if (head[1].length === 1)
            return { text: COLOR.heading1(line), open };
        else if (head[1].length === 2)
            return { text: COLOR.heading2(line), open };
        return { text: COLOR.heading3(line), open };
    }
    /* created/modified: label part magenta, timestamp value dimmed */
    const meta = /^([⎈⚙]\s*\w+:)(.*)$/.exec(line);
    if (meta !== null)
        return { text: COLOR.metaLabel(meta[1]) + meta[2], open };
    /* bold text has precedence over string literals: keep each **…** span as-is
       and colorize string literals only on the plain segments between the spans */
    let out = "";
    let cur = open;
    let last = 0;
    const bold = /\*\*[^*]+\*\*/g;
    let m;
    while ((m = bold.exec(line)) !== null) {
        const seg = colorStringLiterals(line.slice(last, m.index), cur);
        out += seg.text + COLOR.boldText(m[0]);
        cur = seg.open;
        last = m.index + m[0].length;
    }
    const tail = colorStringLiterals(line.slice(last), cur);
    return { text: out + tail.text, open: tail.open };
};
/* colorize one raw line with git-diff ANSI colors and track the surrounding
   ```text fence state; diff coloring is active only inside such a fence,
   markdown coloring only outside it, and the fence marker lines stay uncolored */
const classifyDiffLine = (line, inDiff, open) => {
    /* toggle fence state on ``` markers at column 0 only; an indented ``` is no
       fence switch (it is treated as a normal markdown line further below) */
    if (line.startsWith("```")) {
        const opening = /^```+\s*text\b/.test(line);
        return { text: line, inDiff: inDiff ? false : opening, open };
    }
    if (!inDiff) {
        const md = colorMarkdownLine(line, open);
        return { text: md.text, inDiff, open: md.open };
    }
    /* file headers take precedence over the +/- add/remove rules */
    if (line.startsWith("diff --git") || line.startsWith("+++ ") || line.startsWith("--- "))
        return { text: COLOR.diffHeader(line), inDiff, open };
    else if (line.startsWith("@@"))
        return { text: COLOR.diffHunk(line), inDiff, open };
    else if (line.startsWith("+"))
        return { text: COLOR.diffAdd(line), inDiff, open };
    else if (line.startsWith("-"))
        return { text: COLOR.diffRemove(line), inDiff, open };
    return { text: line, inDiff, open };
};
const OutputBox = ({ lines, active, maxVisible, contentWidth, borderColor = "cyan" }) => {
    const [offset, setOffset] = useState(0);
    /* number column width derived from the highest source line number */
    const numW = Math.max(1, lines.length).toString().length;
    /* inner width: contentWidth minus 2 borders, 1 left padding, 1 right scrollbar, numW+1 for line number column */
    const innerW = Math.max(1, contentWidth - 2 - 1 - 1 - (numW + 1));
    /* wrap each raw line to innerW, preserving ANSI codes; remember source line number,
       and whether a wrapped segment is a continuation (so it gets no own line number) */
    const wrapped = useMemo(() => {
        const result = [];
        let inDiff = false;
        let open = "";
        lines.forEach((line, idx) => {
            const cls = classifyDiffLine(line, inDiff, open);
            inDiff = cls.inDiff;
            open = cls.open;
            const segs = wrapAnsi(cls.text, innerW, { hard: true, trim: false, wordWrap: false }).split("\n");
            segs.forEach((seg, si) => result.push({ text: seg, num: idx + 1, cont: si > 0 }));
        });
        return result;
    }, [lines, innerW]);
    const total = wrapped.length;
    /* inner height: maxVisible is the total component height, minus 2 border rows */
    const innerH = Math.max(1, maxVisible - 2);
    const needBar = total > innerH;
    /* auto-scroll to bottom when new lines arrive and user is at bottom */
    useEffect(() => {
        setOffset((o) => {
            const maxOffset = Math.max(0, total - innerH);
            return o >= maxOffset ? maxOffset : o;
        });
    }, [total, innerH]);
    useInput((_input, key) => {
        if (!active || !needBar)
            return;
        if (key.upArrow)
            setOffset((o) => Math.max(0, o - 1));
        else if (key.downArrow)
            setOffset((o) => Math.min(Math.max(0, total - innerH), o + 1));
        else if (key.pageUp)
            setOffset((o) => Math.max(0, o - innerH));
        else if (key.pageDown)
            setOffset((o) => Math.min(Math.max(0, total - innerH), o + innerH));
    });
    if (total === 0)
        return null;
    const visible = wrapped.slice(offset, offset + innerH);
    const maxOffset = Math.max(0, total - innerH);
    const barHeight = innerH;
    const thumbPos = maxOffset > 0 ?
        Math.min(barHeight - 1, Math.round((offset / maxOffset) * (barHeight - 1))) :
        0;
    logDebug("OutputBox", "render", {
        lines: lines.length,
        contentWidth,
        innerW,
        innerH,
        total,
        maxVisible,
        needBar,
        offset,
        maxOffset,
        thumbPos,
        barHeight
    });
    return (_jsxs(Box, { flexDirection: 'row', borderStyle: 'round', borderColor: borderColor, width: contentWidth, height: maxVisible, children: [_jsx(Box, { flexDirection: 'column', flexGrow: 1, paddingLeft: 1, children: visible.map((line, i) => _jsxs(Box, { flexDirection: 'row', children: [_jsx(Box, { width: numW + 1, flexShrink: 0, children: _jsx(Text, { dimColor: true, children: line.cont ? "" : String(line.num).padStart(numW) }) }), _jsx(Text, { children: line.text })] }, i)) }), needBar ?
                _jsx(Box, { flexDirection: 'column', width: 1, flexShrink: 0, children: [...Array(barHeight).keys()].map((i) => _jsx(Text, { color: active ? "cyan" : "gray", children: i === thumbPos ? "█" : "│" }, i)) }) :
                null] }));
};
export default OutputBox;
