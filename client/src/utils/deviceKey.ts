/**
 * Public, non-reversible key for a device id. Must match deviceKey() in server/src/security.ts
 * (FNV-1a 32-bit) so the client can recognise its own queue items and votes.
 */
export function deviceKey(deviceId: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < deviceId.length; i++) {
    hash ^= deviceId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
