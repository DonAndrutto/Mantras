import test from 'node:test';
import assert from 'node:assert/strict';
import { changeCount, countKey, loadCount, saveCount } from '../js/settings.js';
import { createWakeLockController } from '../js/wake-lock.js';

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const tick = () => new Promise(resolve => setImmediate(resolve));
const sentinel = () => {
  const lock = new EventTarget();
  lock.released = false;
  lock.release = async () => { lock.released = true; lock.dispatchEvent(new Event('release')); };
  return lock;
};

test('counter changes serialize, use current storage, and keep variants separate', async () => {
  const data = new Map(), queues = new Map();
  globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  Object.defineProperty(navigator, 'locks', { configurable: true, writable: true, value: { request(key, fn) {
    const next = (queues.get(key) || Promise.resolve()).then(fn);
    queues.set(key, next); return next;
  } } });
  const a = { id: 'kurukulle', variant: 'approach' }, b = { id: 'kurukulle', variant: 'accomplishment' };
  saveCount(a, 108); saveCount(b, 217);
  await Promise.all(Array.from({ length: 40 }, () => changeCount(a, 1)));
  assert.equal(loadCount(a), 148); assert.equal(loadCount(b), 217);
  data.set(countKey(a), JSON.stringify({ total: 200 }));
  assert.deepEqual(await changeCount(a, 1), { before: 200, total: 201 });
  await Promise.all([changeCount(a, 1), changeCount(a, null), changeCount(a, 1)]);
  assert.equal(loadCount(a), 1, 'reset shares the same queue as increments');
  await changeCount(a, -5); assert.equal(loadCount(a), 0);
  saveCount(a, Number.MAX_SAFE_INTEGER);
  await changeCount(a, 1); assert.equal(loadCount(a), Number.MAX_SAFE_INTEGER);
});

test('counter remains usable without locks and when storage is blocked or full', async () => {
  const data = new Map();
  globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  Object.defineProperty(navigator, 'locks', { configurable: true, writable: true, value: undefined });
  const m = { id: 'fallback-test' };
  await changeCount(m, 1); await changeCount(m, 1);
  assert.equal(loadCount(m), 2);
  navigator.locks = { request: async () => { throw new Error('denied'); } };
  localStorage.setItem = () => { throw new Error('quota'); };
  await changeCount(m, 1); await changeCount(m, 1);
  assert.equal(loadCount(m), 4, 'failed saves must not reset the in-memory total');
  localStorage.getItem = () => { throw new Error('blocked'); };
  await changeCount(m, 1); assert.equal(loadCount(m), 5);
  await changeCount(m, null); assert.equal(loadCount(m), 0);
  localStorage.setItem = (key, value) => data.set(key, value);
  localStorage.getItem = key => data.get(key) ?? null;
  await changeCount(m, 1);
  assert.equal(JSON.parse(data.get(countKey(m))).total, 1, 'saving resumes when storage is available');
});

test('a pending wake-lock request is shared and released if no longer wanted', async () => {
  const request = deferred(), lock = sentinel(); let calls = 0;
  const controller = createWakeLockController(() => { calls++; return request.promise; });
  const first = controller.update(true);
  assert.equal(controller.update(true), first);
  controller.update(false);
  request.resolve(lock); await first;
  assert.equal(calls, 1); assert.equal(lock.released, true);
});

test('resuming before a pending grant keeps that lock without another request', async () => {
  const request = deferred(), lock = sentinel(); let calls = 0;
  const controller = createWakeLockController(() => { calls++; return request.promise; });
  const first = controller.update(true);
  controller.update(false); controller.update(true);
  request.resolve(lock); await first;
  assert.equal(calls, 1); assert.equal(lock.released, false);
  await controller.update(false); assert.equal(lock.released, true);
});

test('resuming while a discarded grant releases acquires a replacement', async () => {
  const request = deferred(), releasing = deferred(), old = sentinel(), next = sentinel(); let calls = 0;
  old.release = async () => { await releasing.promise; old.released = true; };
  const controller = createWakeLockController(() => ++calls === 1 ? request.promise : next);
  const first = controller.update(true);
  controller.update(false); request.resolve(old);
  await tick(); controller.update(true); releasing.resolve(); await first;
  assert.equal(calls, 2); assert.equal(old.released, true); assert.equal(next.released, false);
  await controller.update(false); assert.equal(next.released, true);
});

test('an old release event cannot clear a newer held wake lock', async () => {
  const old = sentinel(), next = sentinel(), releasing = deferred(); let calls = 0;
  old.release = async () => { await releasing.promise; old.released = true; old.dispatchEvent(new Event('release')); };
  const controller = createWakeLockController(() => ++calls === 1 ? old : next);
  await controller.update(true);
  const stopped = controller.update(false);
  await controller.update(true);
  releasing.resolve(); await stopped;
  await controller.update(false);
  assert.equal(calls, 2); assert.equal(next.released, true);
});

test('wake-lock denial and synchronous failure allow a later retry', async () => {
  let calls = 0; const lock = sentinel();
  const controller = createWakeLockController(() => {
    calls++;
    if (calls === 1) throw new Error('unavailable');
    if (calls === 2) return Promise.reject(new Error('denied'));
    return lock;
  });
  await controller.update(true); await controller.update(true); await controller.update(true);
  assert.equal(calls, 3); assert.equal(lock.released, false);
  await controller.update(false); assert.equal(lock.released, true);
  await createWakeLockController(null).update(true);
});

test('local server rejects malformed URLs, path traversal, and dotfiles without crashing', async () => {
  const http = await import('node:http');
  const { serve } = await import('./serve.mjs');
  const server = await serve(0, { overrides: new Map([['index.html', { body: 'ok' }]]) });
  const port = server.address().port;
  const rawStatus = path => new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path }, res => { res.resume(); resolve(res.statusCode); }).on('error', reject);
  });
  try {
    assert.equal(await rawStatus('/%ZZ'), 400);
    assert.equal(await rawStatus('/.git/HEAD'), 404);
    assert.equal(await rawStatus('/../etc/passwd'), 404);
    assert.equal(await rawStatus('/..%2f..%2fetc%2fpasswd'), 404);
    assert.equal(await rawStatus('/js/..%2f..%2f..%2fetc/passwd'), 404);
    const ok = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(ok.status, 200);
    assert.equal(await ok.text(), 'ok');
  } finally {
    server.close();
  }
});
