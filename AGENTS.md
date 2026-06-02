# Agents

## Building and Testing

**The agent does NOT build or test the project.**

Building and testing the project is always done by the user.

- Do NOT run any build commands (e.g., `npm run build`, `tsc`, `npm run compile`).
- Do NOT run any test commands (e.g., `npm test`, `npm run test`, `vitest`, `jest`).
- Do NOT start the project (e.g., `npm start`, `npm run dev`).

If a build or test is required, point this out to the user and ask them
to perform the corresponding step themselves. Then wait for their feedback
before continuing.

The agent may still read, analyze, and modify code –
only building, running, and testing are exclusively the user's responsibility.

## Generated Files

**The `dst/` folder is generated and must NEVER be changed by the agent.**

The files in `dst/` are build artifacts produced during the project build
from the sources in `src/`. They are overwritten on every build.

- Do NOT edit, create, or delete any file inside `dst/`.
- Always make changes in the corresponding source files under `src/` instead.