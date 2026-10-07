// * 쿼리 파라미터 변환/검증
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ShortUrlStatsQueryDto {
  // * 최근 N일 통계 (기본 30, 최대 90)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  days?: number;
}
