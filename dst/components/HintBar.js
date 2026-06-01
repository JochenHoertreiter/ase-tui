import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/*
**  Agentic Software Engineering (ASE) - Terminal User Interface (TUI)
**  Copyright (c) 2026 Jochen Hörtreiter <Jochen.Hoertreiter@googlemail.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/
import { Box, Text } from "ink";
const HintBar = ({ hint, width }) => (_jsxs(Box, { position: 'absolute', bottom: 0, right: 1, width: width, children: [_jsx(Box, { flexGrow: 1 }), hint.map((s, i) => _jsxs(Text, { children: [_jsx(Text, { bold: true, color: 'cyan', children: s.key }), _jsxs(Text, { color: 'white', children: [" ", s.desc] }), i < hint.length - 1 ? _jsx(Text, { color: 'gray', children: "   " }) : null] }, i))] }));
export default HintBar;
