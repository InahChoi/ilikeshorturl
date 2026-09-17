// * JWT 검증 후 request.user에 들어가는 사용자 정보
export interface AuthUser {
  userId: string;
  email: string;
}
