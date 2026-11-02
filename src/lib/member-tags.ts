export type MemberTag = { id: string; name: string };
export type TagAssignment = { member_id: string; tag_id: string };

export function matchesMemberTag(memberId: string, filter: string, assignments: TagAssignment[]) {
  if (filter === "all") return true;
  const tags = assignments.filter((item) => item.member_id === memberId);
  return filter === "untagged" ? tags.length === 0 : tags.some((item) => item.tag_id === filter);
}