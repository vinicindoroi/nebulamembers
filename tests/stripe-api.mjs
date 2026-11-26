import assert from 'node:assert/strict';
import { createStripeReader, StripeError } from '../src/lib/stripe-api.server.ts';

const originalFetch = globalThis.fetch;
try {
  const requests = [];
  globalThis.fetch = async (_url, options) => {
    assert.ok(options.signal);
    return new Promise(resolve => requests.push(resolve));
  };
  const first = createStripeReader();
  const second = createStripeReader();
  const pending = [first, second].flatMap(reader => Array.from({length: 4}, () => reader.stripeGet('test', '/charges')));
  await new Promise(resolve => setTimeout(resolve, 0));
  // Both invocations independently launch three requests, never waiting on the other queue.
  assert.equal(requests.length, 6);
  requests.splice(0).forEach(resolve => resolve(Response.json({ data: [] })));
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(requests.length, 2);
  requests.splice(0).forEach(resolve => resolve(Response.json({ data: [] })));
  await Promise.all(pending);

  let count = 0;
  globalThis.fetch = async () => {
    count++;
    return count === 1 ? Response.json({error:{code:'invalid_api_key',message:'Rejected'}}, {status:401}) : Response.json({data:[]});
  };
  const reader = createStripeReader();
  const results = await Promise.allSettled(Array.from({length:8}, () => reader.stripeGet('test', '/charges')));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 7);
  assert.ok(results[0].reason instanceof StripeError);
  assert.equal(count, 8);
  console.log('stripe API: request isolation and error queue release OK');
} finally { globalThis.fetch = originalFetch; }
