export async function getDeviceFingerprint(): Promise<DeviceFingerprint> {
  const raw = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    cpu: navigator.hardwareConcurrency,
    language: navigator.language,
    screen: `${screen.width}x${screen.height}`,
    depth: screen.colorDepth,
  };

  const data = [
    raw.userAgent,
    raw.platform,
    raw.cpu,
    raw.language,
    raw.screen,
    raw.depth,
  ].join("|");

  const encoded = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);

  const device_id = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  return {
    device_id,
    user_agent: raw.userAgent,
    platform: raw.platform,
    screen: raw.screen,
    cpu_cores: raw.cpu,
    language: raw.language,
  };
}