import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/*
**  Agentic Software Engineering (ASE)
**  Copyright (c) 2025-2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/
import { useState, useRef } from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import { DateTime } from "luxon";
import { useScreen, SelectIndicator, SelectItem, runCommand } from "./Screen.js";
import OutputBox from "./OutputBox.js";
const ActionScreen = ({ command, actions }) => {
    const { contentWidth, contentHeight } = useScreen();
    const [running, setRunning] = useState(false);
    const [lines, setLines] = useState([]);
    const runningRef = useRef(false);
    const handleSelect = async (item) => {
        if (runningRef.current)
            return;
        runningRef.current = true;
        setRunning(true);
        setLines([]);
        let count = 0;
        try {
            await runCommand([command, item.value], (line) => {
                setLines((prev) => [...prev, line]);
                count++;
            });
            if (count === 0)
                setLines([`[${DateTime.now().toFormat("yyyy-LL-dd HH:mm:ss.SSS")}] done`]);
        }
        catch (err) {
            setLines((prev) => [...prev, `Error: ${err instanceof Error ? err.message : String(err)}`]);
        }
        finally {
            runningRef.current = false;
            setRunning(false);
        }
    };
    /* left column: fixed width for action list */
    const actionsW = 20;
    const outputW = Math.max(1, contentWidth - actionsW);
    const outputH = Math.max(1, contentHeight);
    return (_jsxs(Box, { flexDirection: 'row', padding: 1, children: [_jsx(Box, { flexDirection: 'column', width: actionsW, children: running ?
                    _jsxs(Text, { children: [_jsx(Spinner, { type: 'dots' }), " Running..."] }) :
                    _jsx(SelectInput, { items: actions, onSelect: handleSelect, indicatorComponent: SelectIndicator, itemComponent: SelectItem }) }), _jsx(OutputBox, { lines: lines, active: !running, maxVisible: outputH, contentWidth: outputW })] }));
};
export default ActionScreen;
