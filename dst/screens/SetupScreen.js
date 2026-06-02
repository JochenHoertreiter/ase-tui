import { jsx as _jsx } from "react/jsx-runtime";
import ActionScreen from "./ActionScreen.js";
const actions = [
    { label: "Install", value: "install" },
    { label: "Update", value: "update" },
    { label: "Uninstall", value: "uninstall" },
    { label: "Enable", value: "enable" },
    { label: "Disable", value: "disable" }
];
const SetupScreen = ({ escBlockedRef, onHint, screenWidth, screenHeight }) => _jsx(ActionScreen, { command: 'setup', actions: actions, listHeader: 'Commands', escBlockedRef: escBlockedRef, onHint: onHint, screenWidth: screenWidth, screenHeight: screenHeight });
export default SetupScreen;
