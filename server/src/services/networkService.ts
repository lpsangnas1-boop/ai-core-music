import os from 'os';
import { config } from '../config.js';
import type { NetworkInfo } from '../types/shared.js';

export function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  let preferredIp: string | null = null;
  const physicalCandidates: string[] = [];
  const virtualCandidates: string[] = [];

  for (const name of Object.keys(interfaces)) {
    const lowerName = name.toLowerCase();

    // Identify virtual, container, or VPN adapters
    const isVirtual =
      lowerName.includes('vethernet') ||
      lowerName.includes('wsl') ||
      lowerName.includes('virtual') ||
      lowerName.includes('vmware') ||
      lowerName.includes('vbox') ||
      lowerName.includes('docker') ||
      lowerName.includes('hyper-v') ||
      lowerName.includes('tailscale') ||
      lowerName.includes('zerotier') ||
      lowerName.includes('bluetooth') ||
      lowerName.includes('loopback');

    // Prefer physical Wi-Fi and Ethernet adapters
    const isPhysicalPreferred =
      lowerName.includes('wi-fi') ||
      lowerName.includes('wifi') ||
      lowerName.includes('wireless') ||
      lowerName.includes('wlan') ||
      lowerName.includes('ethernet') ||
      lowerName.includes('eth') ||
      lowerName.includes('en0') ||
      lowerName.includes('en1');

    const netList = interfaces[name];
    if (!netList) continue;

    for (const net of netList) {
      if (net.family === 'IPv4' && !net.internal) {
        if (!isVirtual && isPhysicalPreferred) {
          preferredIp = net.address;
          break;
        } else if (!isVirtual) {
          physicalCandidates.push(net.address);
        } else {
          virtualCandidates.push(net.address);
        }
      }
    }

    if (preferredIp) break;
  }

  return preferredIp || physicalCandidates[0] || virtualCandidates[0] || '127.0.0.1';
}

export function getNetworkInfo(): NetworkInfo {
  const ip = getLocalIpAddress();
  const port = config.port;
  const url = `http://${ip}:${port}`;
  const hostname = os.hostname();

  return {
    ip,
    port,
    url,
    hostname,
  };
}
