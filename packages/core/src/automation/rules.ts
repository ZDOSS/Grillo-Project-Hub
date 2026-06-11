import type { AutomationRuleId, TriggerId, ActionId } from "../domain/ids";
import { generateId } from "../domain/ids";
import { nowTimestamp } from "../domain/dates";

/**
 * Automation: trigger + optional conditions + actions.
 *
 * MVP exposes a simple rule builder over a structured engine. Scripting-style automation is
 * a later advanced layer.
 */

export type AutomationTrigger =
  | { type: "item.created" }
  | { type: "item.updated" }
  | { type: "item.statusChanged"; from?: string; to?: string }
  | { type: "item.moved"; toColumnId?: string }
  | { type: "milestone.assigned" }
  | { type: "dueDate.changed" };

export type AutomationCondition =
  | { type: "field.equals"; field: string; value: string | number | boolean | null }
  | { type: "field.notEquals"; field: string; value: string | number | boolean | null }
  | { type: "type.isOneOf"; typeIds: string[] }
  | { type: "has.label"; labelId: string }
  | { type: "milestone.is"; milestoneId: string };

export type AutomationAction =
  | { type: "setField"; field: string; value: string | number | boolean | null }
  | { type: "addLabel"; labelId: string }
  | { type: "removeLabel"; labelId: string }
  | { type: "moveToStatus"; statusId: string }
  | { type: "assignMilestone"; milestoneId: string }
  | { type: "createSubtask"; title: string }
  | { type: "generateDoc"; title: string };

export type AutomationRule = {
  id: AutomationRuleId;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  createdAt: string;
  updatedAt: string;
};

export function createAutomationRule(input: {
  name: string;
  trigger: AutomationTrigger;
  conditions?: AutomationCondition[];
  actions: AutomationAction[];
  description?: string;
  id?: string;
}): AutomationRule {
  const now = nowTimestamp();
  return {
    id: input.id ?? generateId("rule"),
    name: input.name,
    description: input.description ?? "",
    enabled: true,
    trigger: input.trigger,
    conditions: input.conditions ?? [],
    actions: input.actions,
    createdAt: now,
    updatedAt: now
  };
}
