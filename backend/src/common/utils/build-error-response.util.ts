// * API 에러 응답 형식
import { ErrorResponse } from '../interfaces/error-response.interface';

// * statusCode, message, error, path를 받아 통일된 에러 JSON을 생성
export function buildErrorResponse(
  statusCode: number,
  message: string | string[],
  error: string,
  path: string,
): ErrorResponse {
  return {
    statusCode,
    message,
    error,
    timestamp: new Date().toISOString(),
    path,
  };
}
