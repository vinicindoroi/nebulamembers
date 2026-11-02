import assert from "node:assert/strict";
import { groupMembers, matchesMemberGroup } from "../src/lib/member-groups.ts";
const groups = [{ id: "partners", name: "Sócios" }];
const assignments = { a: "partners", b: "partners" };
const members = [{ id: "a" }, { id: "b" }, { id: "c" }];
assert.equal(matchesMemberGroup("a", "partners", assignments), true);
assert.equal(matchesMemberGroup("c", "partners", assignments), false);
assert.equal(matchesMemberGroup("c", "none", assignments), true);
assert.deepEqual(groupMembers(members, groups, assignments, true).map((s) => [s.name, s.members.length]), [["Sócios", 2], ["Sem grupo", 1]]);
// A scheduling subset uses exactly the same universal assignments as Members.
assert.deepEqual(groupMembers([members[1]], groups, assignments, true)[0].members, [members[1]]);
assert.deepEqual(groupMembers(members, groups, assignments, false)[0].members, members);
console.log("Universal member groups: filtering and shared grouping passed.");