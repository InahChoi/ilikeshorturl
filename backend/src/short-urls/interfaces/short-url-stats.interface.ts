// * 일별 클릭 집계
export interface DailyClickCount {
  date: string;
  count: number;
}

// * referer / userAgent 상위 집계
export interface NamedClickCount {
  value: string | null;
  count: number;
}

// * 단축 URL 클릭 통계 응답
export interface ShortUrlStats {
  shortUrlId: string;
  days: number;
  from: Date;
  to: Date;
  totalClicks: number;
  daily: DailyClickCount[];
  topReferers: NamedClickCount[];
  topUserAgents: NamedClickCount[];
}
