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

## Versioning ("bump")

When the user's input is `bump` (optionally followed by `major` or `minor`),
the agent bumps the project version. This always involves three actions:

1. Run the `/ase-meta-changes` skill to update the `CHANGELOG.md` entries.
2. Increase the `version` field in `package.json` according to the bump level.
3. Add a new section to `CHANGELOG.md` headed with the new version created by
   the bump, aligned with the existing `CHANGELOG.md` style and conventions.

The version follows `major.minor.macro` (e.g. `0.3.5`). The bump level
determines how the version is increased:

- **`bump`** (no qualifier): increase the *macro* number by `0.0.1`.
  E.g. `0.3.5` → `0.3.6`.
- **`bump minor`**: increase the *minor* number by `0.1.0` and reset the
  *macro* number to `0`. E.g. `0.3.5` → `0.4.0`.
- **`bump major`**: increase the *major* number by `1.0.0` and reset both the
  *minor* and *macro* numbers to `0`. E.g. `0.5.7` → `1.0.0`.