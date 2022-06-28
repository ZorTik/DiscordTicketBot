import {PermissionGroup} from "../permissions";

export const PERMISSIONS = {
    COMMANDS: {
        SETUP: "setup_command",
        TICKET_ADMIN: "ticket_admin"
    }
}

export const GROUPS = {
    ADMIN: {
        id: "admin",
        name: "Administrator",
        nodes: [
            PERMISSIONS.COMMANDS.SETUP,
            PERMISSIONS.COMMANDS.TICKET_ADMIN
        ]
    },
    MOD: {
        id: "mod",
        name: "Moderator",
        nodes: [
            PERMISSIONS.COMMANDS.TICKET_ADMIN
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