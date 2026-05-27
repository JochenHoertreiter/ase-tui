/*
**  Agentic Software Engineering (ASE)
**  Copyright (c) 2025-2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import { useEffect, useState } from "react"
import { Box, Text }           from "ink"
import Spinner                 from "ink-spinner"
import { execa }               from "execa"
import stripAnsi               from "strip-ansi"

/*  parse "ase config list" table output into a map of key -> { value, scope }  */
const parseConfigList = (stdout: string): Map<string, { value: string, scope: string }> => {
    const map = new Map<string, { value: string, scope: string }>()
    for (const raw of stdout.split("\n")) {
        const line = stripAnsi(raw)
        if (!line.includes("│"))
            continue
        const cols = line.split("│").map((c) => c.trim()).filter((_, i) => i > 0)
        if (cols.length < 3)
            continue
        const [ key, value, scope ] = cols
        if (!key || key === "KEY")
            continue
        map.set(key, { value, scope })
    }
    return map
}

type ScopeMap = Map<string, { value: string, scope: string }>

type ConfigRow = {
    key:     string
    default: string
    user:    string
    project: string
}

const buildRows = (userMap: ScopeMap, projectMap: ScopeMap): ConfigRow[] => {
    const keys = new Set<string>([ ...userMap.keys(), ...projectMap.keys() ])
    const get = (map: ScopeMap, scope: string, key: string): string => {
        const e = map.get(key)
        return e?.scope === scope ? e.value : ""
    }
    return [ ...keys ].sort().map((key) => ({
        key,
        default: get(userMap, "default", key) || get(projectMap, "default", key),
        user:    get(userMap, "user",    key),
        project: get(projectMap, "project", key)
    }))
}

const COL_W = { key: 16, default: 12, user: 12, project: 12 }

const pad = (s: string, w: number): string =>
    s.length >= w ? s.slice(0, w) : s + " ".repeat(w - s.length)

const ConfigScreen = () => {
    const [ loading, setLoading ] = useState(true)
    const [ rows,    setRows    ] = useState<ConfigRow[]>([])
    const [ error,   setError   ] = useState("")

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            try {
                const [ userRes, projectRes ] = await Promise.all([
                    execa("ase", [ "config", "--scope", "user",    "list" ]),
                    execa("ase", [ "config", "--scope", "project", "list" ])
                ])
                if (!cancelled) {
                    const userMap    = parseConfigList(userRes.stdout)
                    const projectMap = parseConfigList(projectRes.stdout)
                    setRows(buildRows(userMap, projectMap))
                    setLoading(false)
                }
            }
            catch (e: unknown) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : String(e))
                    setLoading(false)
                }
            }
        }
        load().catch((e) => { console.error("[ase-tui] unexpected:", e) })
        return () => { cancelled = true }
    }, [])

    const hdr = (
        <Text>
            <Text color='blue'>{pad("KEY",     COL_W.key    )}</Text>
            {"  "}
            <Text color='blue'>{pad("DEFAULT", COL_W.default)}</Text>
            {"  "}
            <Text color='blue'>{pad("USER",    COL_W.user   )}</Text>
            {"  "}
            <Text color='blue'>{pad("PROJECT", COL_W.project)}</Text>
        </Text>
    )

    const sep = (
        <Text color='gray'>{"─".repeat(COL_W.key + COL_W.default + COL_W.user + COL_W.project + 6)}</Text>
    )

    return (
        <Box flexDirection='column' padding={1}>
            {loading ?
                <Text><Spinner type='dots' /> Loading...</Text> :
                error ?
                    <Text color='red'>{error}</Text> :
                    <Box flexDirection='column'>
                        {hdr}
                        {sep}
                        {rows.map((r) =>
                            <Text key={r.key}>
                                <Text color='white'>{pad(r.key,     COL_W.key    )}</Text>
                                {"  "}
                                <Text color='gray'>{pad(r.default, COL_W.default)}</Text>
                                {"  "}
                                <Text color='yellow'>{pad(r.user,    COL_W.user   )}</Text>
                                {"  "}
                                <Text color='cyan'>{pad(r.project, COL_W.project)}</Text>
                            </Text>
                        )}
                    </Box>}
        </Box>
    )
}

export default ConfigScreen
