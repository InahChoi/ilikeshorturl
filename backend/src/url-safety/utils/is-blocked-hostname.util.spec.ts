// * 사설/로컬 호스트 판별 유틸 테스트
import { isBlockedHostname, isPrivateIpv4 } from './is-blocked-hostname.util';

describe('is-blocked-hostname.util', () => {
  it('사설 IPv4를 감지한다', () => {
    expect(isPrivateIpv4('10.0.0.1')).toBe(true);
    expect(isPrivateIpv4('192.168.1.1')).toBe(true);
    expect(isPrivateIpv4('8.8.8.8')).toBe(false);
  });

  it('localhost와 사설 호스트를 차단한다', () => {
    expect(isBlockedHostname('localhost')).toBe(true);
    expect(isBlockedHostname('127.0.0.1')).toBe(true);
    expect(isBlockedHostname('example.com')).toBe(false);
  });
});
