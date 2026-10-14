export const BOOTSTRAP_INDICES = new Set([...Array.from({ length: 19 }, (_, i) => i * 16), 299]);

/** A small container of original WebPs, not another image-resolution tier. */
export function readAvatarBootstrap(buffer: ArrayBuffer): { index: number; blob: Blob }[] {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 8 || bytes.length > 2 * 1024 * 1024 || String.fromCharCode(...bytes.subarray(0, 4)) !== 'AVB1') throw new Error('Invalid avatar bootstrap');
  const manifestSize = new DataView(buffer).getUint32(4, true);
  if (manifestSize < 1 || manifestSize > 8192 || 8 + manifestSize > bytes.length) throw new Error('Invalid bootstrap manifest');
  const manifest = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + manifestSize))) as { frames?: { index: number; size: number }[] };
  if (!Array.isArray(manifest.frames) || manifest.frames.length !== BOOTSTRAP_INDICES.size) throw new Error('Incomplete avatar bootstrap');
  let offset = 8 + manifestSize;
  const seen = new Set<number>();
  const frames = manifest.frames.map(({ index, size }) => {
    if (!BOOTSTRAP_INDICES.has(index) || seen.has(index) || !Number.isSafeInteger(size) || size < 12 || offset + size > bytes.length) throw new Error('Invalid bootstrap frame');
    seen.add(index);
    const frame = bytes.subarray(offset, offset + size);
    if (String.fromCharCode(...frame.subarray(0, 4)) !== 'RIFF' || String.fromCharCode(...frame.subarray(8, 12)) !== 'WEBP') throw new Error('Invalid bootstrap WebP');
    offset += size;
    return { index, blob: new Blob([frame], { type: 'image/webp' }) };
  });
  if (offset !== bytes.length) throw new Error('Invalid bootstrap payload length');
  return frames;
}
