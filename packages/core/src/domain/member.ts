import type { MemberId } from "./ids";
import { generateId } from "./ids";

/**
 * Lightweight member identity. Members are project-scoped, not account-scoped.
 * The currently selected local member is stored outside the project bundle.
 */

export type Member = {
  id: MemberId;
  displayName: string;
  color?: string | null;
  archived?: boolean;
};

export function createMember(input: {
  displayName: string;
  color?: string | null;
  id?: string;
}): Member {
  return {
    id: input.id ?? generateId("member"),
    displayName: input.displayName,
    color: input.color ?? null,
    archived: false
  };
}

export function isMemberValid(member: Member | null | undefined): member is Member {
  return !!member && !!member.id && !!member.displayName && !member.archived;
}
