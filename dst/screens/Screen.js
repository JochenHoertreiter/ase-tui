import { jsx as _jsx } from "react/jsx-runtime";
/*
**  Agentic Software Engineering (ASE) - Terminal User Interface (TUI)
**  Copyright (c) 2026 Jochen Hörtreiter <Jochen.Hoertreiter@googlemail.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/
import { Text } from "ink";
import { Indicator } from "ink-select-input";
import { Item } from "ink-select-input";
import { execa } from "execa";
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
