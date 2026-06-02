/*
**  Agentic Software Engineering (ASE) - Terminal User Interface (TUI)
**  Copyright (c) 2026 Jochen Hörtreiter <Jochen.Hoertreiter@googlemail.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import { execa }                               from "execa"

export type ActionItem = { label: string, value: string }

export const runCommand = async (args: string[], onLine: (line: string) => void): Promise<void> => {
    const subprocess = execa("ase", args, {
        env: { ...process.env, FORCE_COLOR: "1" }
    })
    const onData = (chunk: Buffer) => {
        const newLines = chunk.toString("utf8").split("\n").filter((l) => l.trim() !== "")
        for (const line of newLines)
            onLine(line)
    }
    subprocess.stdout?.on("data", onData)
    subprocess.stderr?.on("data", onData)
    try {
        await subprocess
    }
    finally {
        subprocess.stdout?.off("data", onData)
        subprocess.stderr?.off("data", onData)
    }
}
