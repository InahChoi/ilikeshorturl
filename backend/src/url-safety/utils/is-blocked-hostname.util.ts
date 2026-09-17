// * IPv4 사설/루프백/링크로컬 대역인지 확인
export function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map((part) => Number(part));

  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [a, b] = parts;

  // * 127.0.0.0/8 루프백
  if (a === 127) {
    return true;
  }

  // * 10.0.0.0/8
  if (a === 10) {
    return true;
  }

  // * 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }

  // * 192.168.0.0/16
  if (a === 192 && b === 168) {
    return true;
  }

  // * 169.254.0.0/16 링크로컬
  if (a === 169 && b === 254) {
    return true;
  }

  // * 0.0.0.0/8
  if (a === 0) {
    return true;
  }

  return false;
}

// * IPv6 루프백/유니크로컬/링크로컬인지 확인
export function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  if (normalized === '::1' || normalized === '::') {
    return true;
  }

  // * fc00::/7 unique local, fe80::/10 link-local
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }

  if (normalized.startsWith('fe8') || normalized.startsWith('fe9')) {
    return true;
  }

  if (normalized.startsWith('fea') || normalized.startsWith('feb')) {
    return true;
  }

  return false;
}

// * hostname이 로컬/사설 대상인지 확인
export function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local')
  ) {
    return true;
  }

  if (host.includes(':')) {
    return isPrivateIpv6(host);
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return isPrivateIpv4(host);
  }

  return false;
}
