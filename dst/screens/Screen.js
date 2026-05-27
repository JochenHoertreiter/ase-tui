import { jsx as _jsx } from "react/jsx-runtime";
/*
**  Agentic Software Engineering (ASE)
**  Copyright (c) 2025-2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/
import { useState, useEffect } from "react";
import { Text, useStdout } from "ink";
import { Indicator } from "ink-select-input";
import { Item } from "ink-select-input";
import { execa } from "execa";
/* fixed line count: 1 title + 3 tab-bar (border+content+border) + 1 padding */
export const HEADER_LINES = 5;
/* screen padding applied by every screen container: padding={1} = 1 left + 1 right */
const SCREEN_PAD_H = 2;
export const useScreen = () => {
    const { stdout } = useStdout();
    const calc = () => ({
        contentWidth: Math.max(1, (stdout.columns ?? 80) - SCREEN_PAD_H),
        contentHeight: Math.max(1, (stdout.rows ?? 24) - HEADER_LINES)
    });
    const [dims, setDims] = useState(calc);
    useEffect(() => {
        const onResize = () => setDims(calc());
        stdout.on("resize", onResize);
        return () => { stdout.off("resize", onResize); };
    }, [stdout]);
    return dims;
};
export const runCommand = async (args, onLine) => {
    const subprocess = execa("ase", args, {
        env: { ...process.env, FORCE_COLOR: "1" }
    });
    const onData = (chunk) => {
        const newLines = chunk.toString("utf8").split("\n").filter((l) => l.trim() !== "");
        for (const line of newLines)
            onLine(line);
    };
    subprocess.stdout?.on("data", onData);
    subprocess.stderr?.on("data", onData);
    try {
        await subprocess;
    }
    finally {
        subprocess.stdout?.off("data", onData);
        subprocess.stderr?.off("data", onData);
    }
};
export const SelectIndicator = ({ isSelected }) => _jsx(Indicator, { isSelected: isSelected });
export const SelectItem = ({ isSelected, label }) => isSelected ?
    _jsx(Text, { color: 'cyan', children: label }) :
    _jsx(Item, { isSelected: isSelected, label: label });
