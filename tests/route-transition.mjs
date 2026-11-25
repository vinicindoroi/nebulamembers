import assert from "node:assert/strict";
import {
  ADMIN_NAV_ORDER,
  MEMBER_NAV_ORDER,
  matchSection,
  routeMotion,
  viewTransitionTypes,
} from "../src/lib/route-transition.ts";

assert.equal(matchSection("/funnel-tracker", MEMBER_NAV_ORDER), "/funnel-tracker");
assert.equal(matchSection("/funnels/abc", MEMBER_NAV_ORDER), "/funnels");
assert.equal(matchSection("/courses/course-1", MEMBER_NAV_ORDER), "/courses");
assert.equal(matchSection("/login", MEMBER_NAV_ORDER), null);

// Barra mobile (subsequência do menu) e sidebar concordam na direção.
assert.equal(routeMotion("/dashboard", "/courses", MEMBER_NAV_ORDER), "forward");
assert.equal(routeMotion("/courses", "/community", MEMBER_NAV_ORDER), "forward");
assert.equal(routeMotion("/community", "/notes", MEMBER_NAV_ORDER), "forward");
assert.equal(routeMotion("/notes", "/profile", MEMBER_NAV_ORDER), "forward");
assert.equal(routeMotion("/profile", "/dashboard", MEMBER_NAV_ORDER), "back");
assert.equal(routeMotion("/notes", "/courses", MEMBER_NAV_ORDER), "back");
assert.equal(routeMotion("/settings", "/organizer", MEMBER_NAV_ORDER), "back");

// Mesma seção (abrir um curso) sobe em vez de deslizar para o lado.
assert.equal(routeMotion("/courses", "/courses/course-1", MEMBER_NAV_ORDER), "rise");
assert.equal(routeMotion("/dashboard", "/dashboard", MEMBER_NAV_ORDER), "none");
assert.equal(routeMotion(undefined, "/dashboard", MEMBER_NAV_ORDER), "rise");

assert.equal(routeMotion("/admin/courses", "/admin/members", ADMIN_NAV_ORDER), "forward");
assert.equal(routeMotion("/admin/logs", "/admin/dashboard", ADMIN_NAV_ORDER), "back");
assert.equal(routeMotion("/admin/offers", "/admin/offers", ADMIN_NAV_ORDER), "none");

assert.deepEqual(viewTransitionTypes("/dashboard", "/profile"), ["nav-forward"]);
assert.deepEqual(viewTransitionTypes("/profile", "/courses"), ["nav-back"]);
assert.deepEqual(viewTransitionTypes("/courses", "/courses/course-1"), ["nav-rise"]);
assert.deepEqual(viewTransitionTypes("/dashboard", "/admin/members"), ["nav-rise"]);
assert.equal(viewTransitionTypes("/dashboard", "/dashboard"), false);
assert.equal(viewTransitionTypes(undefined, "/dashboard"), false);

console.log("route-transition: direção das abas ok");
