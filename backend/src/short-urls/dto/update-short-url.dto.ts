// * 요청 body의 형식과 유효성을 검사하기 위한 기능
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateShortUrlDto {
  // * 대시보드 표시용 제목 (null이면 제목 제거)
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(255)
  title?: string | null;

  // * 만료 시각 (ISO 문자열, null이면 만료 해제)
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  expiresAt?: string | null;

  // * 활성 여부 (false면 리다이렉트 불가)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
