/*
**  Agentic Software Engineering (ASE) - Terminal User Interface (TUI)
**  Copyright (c) 2026 Jochen Hörtreiter <Jochen.Hoertreiter@googlemail.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  built-in dependencies  */
const path          = require("node:path")
const childProcess  = require("node:child_process")

/*  execute a command  */
const run = (cmd, args, opts) => {
    const result = childProcess.spawnSync(cmd, args, {
        stdio: "inherit",
        shell: process.platform === "win32",
        ...opts
    })
    if (result.error)
        throw result.error
    if (result.status !== 0)
        process.exit(result.status ?? 1)
}

/*  ensure that "npm start build" was run  */
const asetuijs = path.join(__dirname, "..", "dst", "ase-tui.js")

/*  pass-through execution to real "ase-tui" entry point  */
run(process.execPath, [ asetuijs, ...process.argv.slice(2) ], {
    env: { ...process.env, ASE_SETUP_DEV: "1" }
})
process.exit(0)
