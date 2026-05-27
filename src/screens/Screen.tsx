/*
**  Agentic Software Engineering (ASE)
**  Copyright (c) 2025-2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import { useState, useEffect }                  from "react"
import { Text, useStdout }                      from "ink"
import { Indicator, type IndicatorProps } from "ink-select-input"
import { Item,      type ItemProps      } from "ink-select-input"
import { execa }                               from "execa"

/* fixed line count: 1 title + 3 tab-bar (border+content+border) + 1 padding */
export const HEADER_LINES = 5

/* screen padding applied by every screen container: padding={1} = 1 left + 1 right */
const SCREEN_PAD_H = 2

export type ActionItem = { label: string, value: string }

export type ScreenDimensions = {
    contentWidth:  number
    contentHeight: number
}

export const useScreen = (): ScreenDimensions => {
    const { stdout } = useStdout()

    const calc = (): ScreenDimensions => ({
        contentWidth:  Math.max(1, (stdout.columns ?? 80) - SCREEN_PAD_H),
        contentHeight: Math.max(1, (stdout.rows    ?? 24) - HEADER_LINES)
    })

    const [ dims, setDims ] = useState<ScreenDimensions>(calc)

    useEffect(() => {
        const onResize = () => setDims(calc())
        stdout.on("resize", onResize)
        return () => { stdout.off("resize", onResize) }
    }, [ stdout ])

    return dims
}

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

export const SelectIndicator = ({ isSelected }: IndicatorProps) =>
    <Indicator isSelected={isSelected} />

export const SelectItem = ({ isSelected, label }: ItemProps) =>
    isSelected ?
        <Text color='cyan'>{label}</Text> :
        <Item isSelected={isSelected} label={label} />
