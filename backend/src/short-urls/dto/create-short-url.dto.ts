// * 요청 body의 형식과 유효성을 검사하기 위한 기능
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateShortUrlDto {
  // * 줄일 원본 URL (http/https)
  @IsUrl({ require_protocol: true }, { message: '올바른 URL 형식이 아닙니다.' })
  @IsNotEmpty()
  @MaxLength(2048)
  originalUrl!: string;

  // * 선택적 제목 (대시보드 표시용, 비로그인도 전달 가능)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;
}
