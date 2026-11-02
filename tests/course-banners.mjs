import assert from 'node:assert/strict';
import { normalizeBannerConfig, nextBannerIndex } from '../src/lib/course-banners.ts';
const config = normalizeBannerConfig({ intervalSeconds: 12, banners: [{id:'first',path:'first.jpg',active:true},{id:'second',path:'second.jpg',active:false}] });
assert.equal(config.intervalSeconds * 1000,12000);
assert.deepEqual(config.banners.filter((b)=>b.active).map((b)=>b.id),['first']);
assert.equal(nextBannerIndex(0,2),1);
assert.equal(nextBannerIndex(1,2),0);
assert.equal(nextBannerIndex(0,1),0);
console.log('Course banners: chosen interval, visibility and looping passed.');