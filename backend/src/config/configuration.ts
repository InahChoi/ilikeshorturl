// * 애플리케이션 설정 타입
export interface AppConfig {
  port: number;
  app: {
    baseUrl: string;
  };
  database: {
    url: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  urlSafety: {
    googleSafeBrowsingApiKey: string;
    nrdDays: number;
    blockedTlds: string[];
    requestTimeoutMs: number;
  };
}

// * 콤마로 구분된 TLD 목록을 소문자 배열로 변환
function parseBlockedTlds(value?: string): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((tld) => tld.trim().toLowerCase().replace(/^\./, ''))
    .filter((tld) => tld.length > 0);
}

// * .env 값을 애플리케이션 설정 객체로 변환
export default (): AppConfig => {
  const port = parseInt(process.env.PORT ?? '3000', 10);

  return {
    port,
    app: {
      // * 단축 URL 앞에 붙일 공개 주소 (없으면 localhost:PORT)
      baseUrl: process.env.APP_BASE_URL ?? `http://localhost:${port}`,
    },
    database: {
      url: process.env.DATABASE_URL ?? '',
    },
    jwt: {
      secret: process.env.JWT_SECRET ?? '',
      expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    },
    urlSafety: {
      googleSafeBrowsingApiKey: process.env.GOOGLE_SAFE_BROWSING_API_KEY ?? '',
      // * 0이면 신규 도메인(NRD) 검사를 비활성화
      nrdDays: parseInt(process.env.URL_SAFETY_NRD_DAYS ?? '30', 10),
      blockedTlds: parseBlockedTlds(
        process.env.URL_SAFETY_BLOCKED_TLDS ?? 'zip,mov',
      ),
      requestTimeoutMs: parseInt(
        process.env.URL_SAFETY_REQUEST_TIMEOUT_MS ?? '3000',
        10,
      ),
    },
  };
};
