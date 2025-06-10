import os from 'os';

export function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
      if (iface.family === 'IPv6' && iface.address === '::1') {
        return '127.0.0.1'; // Fallback to localhost for IPv6
      }
    }
  }
  return '127.0.0.1';
}
