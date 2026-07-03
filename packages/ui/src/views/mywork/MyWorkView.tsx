import { Button, EmptyState, SelectField, ViewToolbar, WorkItemRow } from "../../components";
import { openCreateItem } from "../../commands/palette-bus";
import { useProjectStore } from "../../store/project-store";
import { useWorkspaceStore } from "../../store/workspace-store";

/**
 * My Work view. A saved view filtered to the currently selected local member.
 */
export function MyWorkView() {
  const bundle = useProjectStore((s) => s.bundle);
  const localMemberId = useWorkspaceStore((s) => s.localMemberId);
  const setLocalMember = useWorkspaceStore((s) => s.setLocalMember);

  if (!bundle) return null;
  const me = bundle.core.members.find((member) => member.id === localMemberId);

  const items = me
    ? bundle.core.items.filter(
        (item) => !item.trashedAt && !item.archived && item.assigneeId === me.id
      )
    : [];

  return (
    <div className="my-work">
      <ViewToolbar>
        <SelectField
          label="Local member"
          value={localMemberId ?? ""}
          onChange={(event) => setLocalMember(event.target.value || null)}
        >
          <option value="">Select member</option>
          {bundle.core.members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.displayName}
            </option>
          ))}
        </SelectField>
        {me ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => openCreateItem({ assigneeId: me.id })}
          >
            New assigned item
          </Button>
        ) : null}
      </ViewToolbar>
      {!me ? (
        <EmptyState
          title="Pick a local member"
          description="Choose the team member you are working as to see assigned items."
        />
      ) : null}
      {me && items.length === 0 ? (
        <EmptyState
          title="All clear"
          description={`No items assigned to ${me.displayName}.`}
        />
      ) : null}
      {items.map((item) => (
        <WorkItemRow
          key={item.id}
          item={item}
          status={bundle.core.statuses.find((status) => status.id === item.statusId)}
          priority={bundle.core.priorities.find(
            (priority) => priority.id === item.priorityId
          )}
        />
      ))}
    </div>
  );
}
