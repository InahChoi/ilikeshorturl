// * JWT 토큰에 담을 사용자 정보
export interface JwtPayload {
  sub: string;
  email: string;
}
