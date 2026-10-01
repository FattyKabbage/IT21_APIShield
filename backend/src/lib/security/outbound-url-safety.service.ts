import { BadRequestException, Injectable } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
//validates baseURL
export type OutboundQueryPrimitive = string | number | boolean | null | undefined;
export type OutboundQuery = Record<string, OutboundQueryPrimitive | OutboundQueryPrimitive[]>;

@Injectable()
export class OutboundUrlSafetyService {
  async validateBaseUrl(baseUrl: string): Promise<void> {
    const url = this.parseUrl(baseUrl);

    this.validateUrlShape(url);
    await this.assertPublicDestination(url.hostname);
  }

  async buildSafeRequestUrl(
    baseUrl: string,
    requestPath = '',
    query: OutboundQuery = {},
  ): Promise<URL> {
    const base = this.parseUrl(baseUrl);

    this.validateUrlShape(base);
    this.validateRelativePath(requestPath);

    const basePath = base.pathname.endsWith('/') ? base.pathname : `${base.pathname}/`;
    const relativePath = requestPath.trim().replace(/^\/+/, '');
    const target = new URL(relativePath, `${base.origin}${basePath}`);

    if (target.origin !== base.origin) {
      throw new BadRequestException('Request path cannot change the provider destination');
    }

    for (const [key, value] of Object.entries(query)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item !== null && item !== undefined) target.searchParams.append(key, String(item));
        }
      } else if (value !== null && value !== undefined) {
        target.searchParams.append(key, String(value));
      }
    }

    await this.assertPublicDestination(target.hostname);

    return target;
  }

  private parseUrl(value: string): URL {
    try {
      return new URL(value.trim());
    } catch {
      throw new BadRequestException('Provider URL is invalid');
    }
  }

  private validateUrlShape(url: URL): void {
    if (url.protocol !== 'https:') {
      throw new BadRequestException('Provider URL must use HTTPS');
    }

    if (!url.hostname) {
      throw new BadRequestException('Provider URL must contain a hostname');
    }

    if (url.username || url.password) {
      throw new BadRequestException('Provider URL must not contain embedded credentials');
    }

    if (url.search) {
      throw new BadRequestException('Provider base URL must not contain query parameters');
    }

    if (url.hash) {
      throw new BadRequestException('Provider base URL must not contain a fragment');
    }
  }

  private validateRelativePath(requestPath: string): void {
    const path = requestPath.trim();

    if (!path) return;

    if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(path)) {
      throw new BadRequestException('Gateway request path must be relative');
    }

    if (path.startsWith('//') || path.includes('\\')) {
      throw new BadRequestException('Gateway request path is invalid');
    }

    if (path.includes('?') || path.includes('#')) {
      throw new BadRequestException('Query parameters and fragments must not be included in the request path');
    }

    if (/[\u0000-\u001F\u007F]/.test(path)) {
      throw new BadRequestException('Gateway request path contains invalid characters');
    }

    for (const segment of path.split('/')) {
      let decodedSegment: string;

      try {
        decodedSegment = decodeURIComponent(segment);
      } catch {
        throw new BadRequestException('Gateway request path contains invalid encoding');
      }

      if (
        decodedSegment === '.' ||
        decodedSegment === '..' ||
        decodedSegment.includes('/') ||
        decodedSegment.includes('\\')
      ) {
        throw new BadRequestException('Gateway request path contains unsafe path segments');
      }
    }
  }

  private async assertPublicDestination(hostname: string): Promise<void> {
  const host = this.normalizeHostname(hostname);
  const ipVersion = isIP(host);

  if (ipVersion !== 0) {
    this.assertPublicIp(host, ipVersion);
    return;
  }

  this.assertPublicHostname(host);

  let addresses: { address: string; family: number }[];

  try {
    addresses = await lookup(host, {
      all: true,
      order: 'verbatim',
    });
  } catch {
    throw new BadRequestException('Provider hostname could not be resolved');
  }

  if (addresses.length === 0) {
    throw new BadRequestException(
      'Provider hostname did not resolve to an IP address',
    );
  }

  for (const address of addresses) {
    this.assertPublicIp(address.address, address.family);
  }
}

  private normalizeHostname(hostname: string): string {
    let host = hostname.trim().toLowerCase();

    if (host.startsWith('[') && host.endsWith(']')) {
      host = host.slice(1, -1);
    }

    return host.replace(/\.$/, '');
  }

  private assertPublicHostname(hostname: string): void {
    const blockedNames = [
      'localhost',
      'localhost.localdomain',
      'metadata.google.internal',
    ];

    const blockedSuffixes = [
      '.localhost',
      '.local',
      '.internal',
      '.localdomain',
      '.home.arpa',
      '.lan',
    ];

    if (blockedNames.includes(hostname)) {
      throw new BadRequestException('Provider hostname is not allowed');
    }

    if (blockedSuffixes.some((suffix) => hostname.endsWith(suffix))) {
      throw new BadRequestException('Provider hostname is not allowed');
    }

    if (!hostname.includes('.')) {
      throw new BadRequestException('Single-label provider hostnames are not allowed');
    }
  }

  private assertPublicIp(address: string, family: number): void {
    const blocked = family === 4
      ? this.isBlockedIpv4(address)
      : family === 6
        ? this.isBlockedIpv6(address)
        : true;

    if (blocked) {
      throw new BadRequestException('Provider destination must use a public IP address');
    }
  }

  private isBlockedIpv4(address: string): boolean {
    const parts = address.split('.').map(Number);

    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
      return true;
    }

    const [a, b, c] = parts;

    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 192 && b === 0 && c === 0) return true;
    if (a === 192 && b === 0 && c === 2) return true;
    if (a === 192 && b === 88 && c === 99) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a === 198 && b === 51 && c === 100) return true;
    if (a === 203 && b === 0 && c === 113) return true;
    if (a >= 224) return true;

    return false;
  }

  private isBlockedIpv6(address: string): boolean {
    const groups = this.expandIpv6(address);

    if (!groups) return true;

    const [first, second, third] = groups;

    // Only normal global-unicast IPv6 space is accepted.
    if (first < 0x2000 || first > 0x3fff) return true;

    // Teredo.
    if (first === 0x2001 && second === 0x0000) return true;

    // Benchmarking.
    if (first === 0x2001 && second === 0x0002 && third === 0x0000) return true;

    // ORCHIDv2.
    if (first === 0x2001 && second >= 0x0020 && second <= 0x002f) return true;

    // Documentation range.
    if (first === 0x2001 && second === 0x0db8) return true;

    // 6to4.
    if (first === 0x2002) return true;

    return false;
  }

  private expandIpv6(address: string): number[] | null {
    let input = address.toLowerCase();

    const ipv4Tail = input.match(/(\d+\.\d+\.\d+\.\d+)$/);

    if (ipv4Tail) {
      const parts = ipv4Tail[1].split('.').map(Number);

      if (
        parts.length !== 4 ||
        parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
      ) {
        return null;
      }

      const firstIpv4Group = ((parts[0] << 8) | parts[1]).toString(16);
      const secondIpv4Group = ((parts[2] << 8) | parts[3]).toString(16);

      input = `${input.slice(0, -ipv4Tail[1].length)}${firstIpv4Group}:${secondIpv4Group}`;
    }

    const halves = input.split('::');

    if (halves.length > 2) return null;

    const left = halves[0] ? halves[0].split(':') : [];
    const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
    const missing = 8 - left.length - right.length;

    if (halves.length === 1 && missing !== 0) return null;
    if (halves.length === 2 && missing < 1) return null;

    const expanded = [
      ...left,
      ...Array(missing).fill('0'),
      ...right,
    ];

    if (expanded.length !== 8) return null;

    const groups = expanded.map((group) => Number.parseInt(group, 16));

    if (
      groups.some(
        (group) => !Number.isInteger(group) || group < 0 || group > 0xffff,
      )
    ) {
      return null;
    }

    return groups;
  }
}