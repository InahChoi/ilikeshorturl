// * NestJS에서 Service를 만들기 위한 기능
import { BadRequestException, Injectable, Logger } from '@nestjs/common';

// * ConfigService로 URL 안전 검사 설정에 접근
import { ConfigService } from '@nestjs/config';

// * 등록 도메인(eTLD+1) 추출
import { parse as parseDomain } from 'tldts';

// * 애플리케이션 설정 타입
import { AppConfig } from '../config/configuration';

// * 로컬/사설 호스트 차단 유틸
import { isBlockedHostname } from './utils/is-blocked-hostname.util';

@Injectable()
export class UrlSafetyService {
  // * 외부 API 실패 로그용
  private readonly logger = new Logger(UrlSafetyService.name);

  constructor(
    // * URL 안전 검사 설정을 ConfigService에서 읽음
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  // * 단축 URL 생성 전 안전 검사 수행
  async assertSafeUrl(rawUrl: string): Promise<void> {
    let parsed: URL;

    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new BadRequestException('올바른 URL 형식이 아닙니다.');
    }

    // * http/https만 허용
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException('http 또는 https URL만 허용됩니다.');
    }

    const hostname = parsed.hostname.toLowerCase();

    // * localhost / 사설 IP 차단 (SSRF 방지)
    if (isBlockedHostname(hostname)) {
      throw new BadRequestException(
        '로컬 또는 사설 네트워크 주소는 단축할 수 없습니다.',
      );
    }

    const domainInfo = parseDomain(hostname);
    const registeredDomain = domainInfo.domain;
    const publicSuffix = domainInfo.publicSuffix?.toLowerCase();

    // * 차단 TLD 목록 검사
    const blockedTlds = this.configService.get('urlSafety.blockedTlds', {
      infer: true,
    });

    if (publicSuffix && blockedTlds.includes(publicSuffix)) {
      throw new BadRequestException(
        `허용되지 않는 도메인 확장자(.${publicSuffix})입니다.`,
      );
    }

    // * Google Safe Browsing 검사 (API 키가 있을 때만)
    await this.assertSafeBrowsing(rawUrl);

    // * 신규 등록 도메인(NRD) 검사 (등록 도메인을 알 수 있을 때만)
    if (registeredDomain) {
      await this.assertNotNewlyRegistered(registeredDomain);
    }
  }

  // * Google Safe Browsing API로 악성/피싱 URL 검사
  private async assertSafeBrowsing(rawUrl: string): Promise<void> {
    const apiKey = this.configService.get(
      'urlSafety.googleSafeBrowsingApiKey',
      { infer: true },
    );

    // * API 키가 없으면 Safe Browsing 검사를 건너뜀
    if (!apiKey) {
      return;
    }

    const timeoutMs = this.configService.get('urlSafety.requestTimeoutMs', {
      infer: true,
    });

    try {
      const response = await fetch(
        `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client: {
              clientId: 'ilikeshorturl',
              clientVersion: '1.0.0',
            },
            threatInfo: {
              threatTypes: [
                'MALWARE',
                'SOCIAL_ENGINEERING',
                'UNWANTED_SOFTWARE',
                'POTENTIALLY_HARMFUL_APPLICATION',
              ],
              platformTypes: ['ANY_PLATFORM'],
              threatEntryTypes: ['URL'],
              threatEntries: [{ url: rawUrl }],
            },
          }),
          signal: AbortSignal.timeout(timeoutMs),
        },
      );

      if (!response.ok) {
        this.logger.warn(
          `Safe Browsing API 응답 오류: ${response.status} ${response.statusText}`,
        );
        return;
      }

      const data = (await response.json()) as {
        matches?: unknown[];
      };

      if (data.matches && data.matches.length > 0) {
        throw new BadRequestException(
          '안전하지 않은 URL로 확인되어 단축할 수 없습니다.',
        );
      }
    } catch (error) {
      // * 정책 거절은 그대로 전달
      if (error instanceof BadRequestException) {
        throw error;
      }

      // * 외부 API 장애 시 생성 전체를 막지 않고 로그만 남김
      this.logger.warn(
        `Safe Browsing 검사 실패: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // * RDAP로 도메인 등록일을 조회해 신규 도메인이면 차단
  private async assertNotNewlyRegistered(domain: string): Promise<void> {
    const nrdDays = this.configService.get('urlSafety.nrdDays', {
      infer: true,
    });

    // * 0이면 NRD 검사 비활성
    if (nrdDays <= 0) {
      return;
    }

    const timeoutMs = this.configService.get('urlSafety.requestTimeoutMs', {
      infer: true,
    });

    try {
      const response = await fetch(
        `https://rdap.org/domain/${encodeURIComponent(domain)}`,
        {
          method: 'GET',
          headers: { Accept: 'application/rdap+json, application/json' },
          signal: AbortSignal.timeout(timeoutMs),
          redirect: 'follow',
        },
      );

      // * 도메인 정보를 못 찾으면 오탐을 줄이기 위해 통과
      if (!response.ok) {
        this.logger.warn(
          `RDAP 조회 실패(${domain}): ${response.status} ${response.statusText}`,
        );
        return;
      }

      const data = (await response.json()) as {
        events?: Array<{ eventAction?: string; eventDate?: string }>;
      };

      const registrationEvent = data.events?.find(
        (event) =>
          event.eventAction === 'registration' ||
          event.eventAction === 'registered',
      );

      if (!registrationEvent?.eventDate) {
        return;
      }

      const registeredAt = new Date(registrationEvent.eventDate);

      if (Number.isNaN(registeredAt.getTime())) {
        return;
      }

      const ageMs = Date.now() - registeredAt.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);

      if (ageDays < nrdDays) {
        throw new BadRequestException(
          `최근에 등록된 도메인(${nrdDays}일 이내)은 단축할 수 없습니다.`,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.warn(
        `NRD 검사 실패(${domain}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
