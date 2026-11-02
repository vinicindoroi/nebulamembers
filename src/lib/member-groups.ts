export type MemberGroup = { id: string; name: string };
export type GroupAssignments = Record<string, string>;

export function matchesMemberGroup(memberId: string, filter: string, assignments: GroupAssignments) {
  if (!filter || filter === "all") return true;
  if (filter === "none") return !assignments[memberId];
  return assignments[memberId] === filter;
}

export function groupMembers<T extends { id: string }>(members: T[], groups: MemberGroup[], assignments: GroupAssignments, grouped: boolean) {
  if (!grouped) return [{ id: "all", name: "", members }];
  return [
    ...groups.map((group) => ({ ...group, members: members.filter((member) => assignments[member.id] === group.id) })),
    { id: "none", name: "Sem grupo", members: members.filter((member) => !groups.some((group) => group.id === assignments[member.id])) },
  ].filter((section) => section.members.length > 0);
}