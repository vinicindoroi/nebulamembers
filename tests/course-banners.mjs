import assert from 'node:assert/strict';
import { normalizeBannerConfig, nextBannerIndex, usableBanners } from '../src/lib/course-banners.ts';
const config = normalizeBannerConfig({ intervalSeconds: 12, banners: [{id:'first',path:'first.jpg',active:true},{id:'second',path:'second.jpg',active:false}] });
assert.equal(config.intervalSeconds * 1000,12000);
assert.deepEqual(config.banners.filter((b)=>b.active).map((b)=>b.id),['first']);
assert.equal(nextBannerIndex(0,2),1);
assert.equal(nextBannerIndex(1,2),0);
assert.equal(nextBannerIndex(0,1),0);

// Only banners that are active and whose image can actually be shown make it to the carousel.
const rows = [
  { id:'a', path:'a.png', label:'A', courseId:'', active:true },
  { id:'b', path:'b.png', label:'B', courseId:'', active:true },
  { id:'c', path:'c.png', label:'C', courseId:'', active:false },
];
assert.deepEqual(usableBanners(rows, { 'a.png':'https://cdn/a.png', 'b.png':'https://cdn/b.png' }, ['b.png']).map((b)=>b.id), ['a']);
assert.deepEqual(usableBanners(rows, { 'a.png':'https://cdn/a.png' }, []).map((b)=>b.id), ['a']);
assert.deepEqual(usableBanners(rows, { 'a.png':'https://cdn/a.png', 'b.png':'https://cdn/b.png' }, ['a.png','b.png']), []);
assert.deepEqual(usableBanners([], {}, []), []);

console.log('Course banners: chosen interval, visibility, looping and broken-image fallback passed.');
