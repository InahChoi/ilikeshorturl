// * NestJS 테스트 모듈 기능
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

// * 테스트 대상 Service
import { UrlSafetyService } from './url-safety.service';

describe('UrlSafetyService', () => {
  let service: UrlSafetyService;
  let fetchMock: jest.Mock;

  // * ConfigService mock
  const configValues: Record<string, unknown> = {
    'urlSafety.googleSafeBrowsingApiKey': '',
    'urlSafety.nrdDays': 30,
    'urlSafety.blockedTlds': ['zip', 'mov'],
    'urlSafety.requestTimeoutMs': 3000,
  };

  const configService = {
    get: jest.fn((key: string) => configValues[key]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UrlSafetyService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<UrlSafetyService>(UrlSafetyService);
    jest.clearAllMocks();
    configValues['urlSafety.googleSafeBrowsingApiKey'] = '';
    configValues['urlSafety.nrdDays'] = 30;
    configValues['urlSafety.blockedTlds'] = ['zip', 'mov'];
    configService.get.mockImplementation((key: string) => configValues[key]);

    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('http/https가 아니면 거절한다', async () => {
    await expect(
      service.assertSafeUrl('ftp://example.com/file'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('localhost는 거절한다', async () => {
    await expect(
      service.assertSafeUrl('http://localhost:3000/path'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('사설 IP는 거절한다', async () => {
    await expect(
      service.assertSafeUrl('http://192.168.0.10/admin'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('차단 TLD는 거절한다', async () => {
    await expect(
      service.assertSafeUrl('https://evil.example.zip/phish'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('Safe Browsing에 매칭되면 거절한다', async () => {
    configValues['urlSafety.googleSafeBrowsingApiKey'] = 'test-key';
    configValues['urlSafety.nrdDays'] = 0;

    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          matches: [{ threatType: 'MALWARE' }],
        }),
    });

    await expect(
      service.assertSafeUrl('https://malware.example.com'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('신규 등록 도메인이면 거절한다', async () => {
    configValues['urlSafety.googleSafeBrowsingApiKey'] = '';
    configValues['urlSafety.nrdDays'] = 30;

    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 3);

    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          events: [
            {
              eventAction: 'registration',
              eventDate: recentDate.toISOString(),
            },
          ],
        }),
    });

    await expect(
      service.assertSafeUrl('https://brand-new-domain.com'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('안전한 공개 URL은 통과한다', async () => {
    configValues['urlSafety.googleSafeBrowsingApiKey'] = '';
    configValues['urlSafety.nrdDays'] = 30;

    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          events: [
            {
              eventAction: 'registration',
              eventDate: '2010-01-01T00:00:00Z',
            },
          ],
        }),
    });

    await expect(
      service.assertSafeUrl('https://example.com/path'),
    ).resolves.toBeUndefined();
  });
});
