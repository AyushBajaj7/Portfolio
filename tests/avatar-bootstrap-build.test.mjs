import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { BOOTSTRAP_INDICES, buildAvatarBootstrap, encodeBootstrap } from '../scripts/build-avatar-bootstrap.mjs';

test('bootstrap preserves 20 original WebPs with exact indexed lengths and wide early coverage', async () => {
  const pack = await buildAvatarBootstrap();
  assert.equal(pack.toString('ascii', 0, 4), 'AVB1');
  const manifestSize = pack.readUInt32LE(4);
  const { frames } = JSON.parse(pack.toString('utf8', 8, 8 + manifestSize));
  assert.deepEqual(frames.map(({ index }) => index), BOOTSTRAP_INDICES);
  assert.deepEqual(BOOTSTRAP_INDICES.slice(0, 5), [0, 299, 144, 64, 224]);
  assert.equal(frames.length, 20);
  assert.equal(new Set(BOOTSTRAP_INDICES).size, 20);
  assert.deepEqual([...BOOTSTRAP_INDICES].sort((a, b) => a - b), [...Array.from({ length: 19 }, (_, index) => index * 16), 299]);
  let offset = 8 + manifestSize;
  for (const { index, size } of frames) {
    const original = await readFile(new URL(`../public/frames-anchors/male${String(index + 1).padStart(4, '0')}.webp`, import.meta.url));
    assert.equal(size, original.length);
    assert.deepEqual(pack.subarray(offset, offset + size), original);
    offset += size;
  }
  assert.equal(offset, pack.length, 'No trailing or missing bytes');
});

test('bootstrap build rejects duplicate, incomplete and invalid source data', async () => {
  const bytes = await readFile(new URL('../public/frames-anchors/male0001.webp', import.meta.url));
  const frames = BOOTSTRAP_INDICES.map(index => ({ index, bytes }));
  assert.throws(() => encodeBootstrap([...frames, frames[0]]), /duplicate/);
  assert.throws(() => encodeBootstrap(frames.slice(1)), /exactly once/);
  assert.throws(() => encodeBootstrap([{ index: 300, bytes }]), /Invalid/);
  assert.throws(() => encodeBootstrap([{ index: 0, bytes: Buffer.from('not an image') }]), /Invalid WebP/);
  const invalidLength = Buffer.from(bytes);
  invalidLength.writeUInt32LE(1, 4);
  assert.throws(() => encodeBootstrap([{ index: 0, bytes: invalidLength }]), /Invalid WebP/);
});
