/*
**  Agentic Software Engineering (ASE)
**  Copyright (c) 2025-2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import ActionScreen from "./ActionScreen.js"

const actions = [
    { label: "Install",   value: "install"   },
    { label: "Update",    value: "update"    },
    { label: "Uninstall", value: "uninstall" }
]

const SetupScreen = () =>
    <ActionScreen command='setup' actions={actions} />

export default SetupScreen
