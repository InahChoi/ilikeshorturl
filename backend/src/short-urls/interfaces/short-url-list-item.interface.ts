// * 대시보드 단축 URL 목록 항목 응답 형식
export interface ShortUrlListItem {
  id: string;
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  title: string | null;
  isActive: boolean;
  expiresAt: Date | null;
  // * BigInt clickCount를 JSON 직렬화 가능한 string으로 변환한 값
  clickCount: string;
  createdAt: Date;
  updatedAt: Date;
}
