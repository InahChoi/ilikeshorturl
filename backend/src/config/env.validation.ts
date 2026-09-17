// * class-transformer로 env 문자열을 타입으로 변환
import { plainToInstance, Type } from 'class-transformer';

// * class-validator로 env 값 유효성 검사
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

// * .env 파일에서 읽어올 환경변수 정의
class EnvironmentVariables {
  // * 서버 포트
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT?: number;

  // * PostgreSQL 연결 URL
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  // * JWT 서명 비밀키
  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  // * JWT 만료 시간
  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN?: string;

  // * 단축 URL에 사용할 공개 base URL (예: https://ilikeshort.url)
  @IsOptional()
  @IsString()
  APP_BASE_URL?: string;

  // * Google Safe Browsing API 키 (없으면 해당 검사 생략)
  @IsOptional()
  @IsString()
  GOOGLE_SAFE_BROWSING_API_KEY?: string;

  // * 신규 등록 도메인으로 간주할 일수 (0이면 비활성)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  URL_SAFETY_NRD_DAYS?: number;

  // * 차단할 TLD 목록 (콤마 구분, 예: zip,mov)
  @IsOptional()
  @IsString()
  URL_SAFETY_BLOCKED_TLDS?: string;

  // * 외부 안전 검사 요청 타임아웃(ms)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(500)
  @Max(15000)
  URL_SAFETY_REQUEST_TIMEOUT_MS?: number;
}

// * NestJS ConfigModule 시작 시 env 유효성 검사
export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`환경변수 설정 오류: ${errors.toString()}`);
  }

  return validatedConfig;
}
