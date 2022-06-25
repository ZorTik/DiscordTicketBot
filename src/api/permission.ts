import {PermissionGroup} from "../bot";

export const PERMISSIONS = {
    COMMANDS: {
        SETUP: "setup_command"
    }
}

export const GROUPS = {
    ADMIN: {
        id: "admin",
        name: "Administrator",
        nodes: [
            PERMISSIONS.COMMANDS.SETUP
        ]
    }
}

export function groups(): PermissionGroup[] {
    return resolveGroups(GROUPS);
}
function resolveGroups(obj: any): PermissionGroup[] {
    return Object.keys(obj)
        .flatMap(k => {
            let groupObj = obj[k];
            let group = <PermissionGroup>groupObj;
            if(group.id !== undefined) {
                return [group];
            }
            return !Array.isArray(groupObj)
            ? resolveGroups(groupObj) : [];
        })
        .filter(obj => obj != null);
}