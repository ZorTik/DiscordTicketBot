import {HasIdentity, HasName} from "./types";
import {replyError, ReplyInteraction} from "./util";
import {GuildMember} from "discord.js";
import {bot} from "./app";
import { groups } from "./api/permission";

export class PermissionHolder {

    readonly permissions: PermissionContext;
    groups: string[];

    constructor(permissions: PermissionNode[] = [], groups: string[] = []) {
        this.permissions = {
            nodes: permissions
        }
        this.groups = groups;
    }

    /**
     * Checks if this permission holder contains
     * node with given id. The id can be either:
     * - Node ID
     * - Permission string
     * @param id The id to check.
     */
    hasPermissionNode(id: string): boolean {
        return this.hasPermissionNodeInContext(id, this.permissions)
            || this.getPermissionGroups().some(g => this.hasPermissionNodeInContext(id, g));
    }

    getPermissionGroups(): PermissionGroup[] {
        return groups().filter(g => this.groups.includes(g.id));
    }

    private hasPermissionNodeInContext(id: string, context: PermissionContext): boolean {
        return context.nodes
            .some(n => {
                let c = <HasIdentity & PermissionContext>n;
                let contextId = c.id;
                return (contextId != null && (contextId === id || this.hasPermissionNodeInContext(id, c)))
                    || (contextId == null && id === n);
            });
    }

}

export async function doIfHasPermission(interaction: ReplyInteraction, nodeId: string, task: (member: GuildMember) => Promise<void> | void) {
    let member = interaction.member;
    if(member == null || !(member instanceof GuildMember) || !bot.hasPermission(member, nodeId)) {
        await replyError(interaction, "You don't have permission to do this.");
        return;
    }
    let res = task(member);
    if(res instanceof Promise) {
        await res;
    }
}

export type PermissionContext = {
    nodes: PermissionNode[];
}
export type PermissionGroup = (HasIdentity & HasName & PermissionContext);
export type PermissionNode = PermissionGroup | string;