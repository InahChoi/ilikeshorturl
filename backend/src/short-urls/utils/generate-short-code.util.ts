// * 암호학적으로 안전한 난수 생성
import { randomBytes } from 'crypto';

// * shortCode에 사용할 URL-safe 문자셋 (혼동 문자 제외: 0/O, 1/l/I)
const SHORT_CODE_ALPHABET =
  '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// * 기본 shortCode 길이 (62^7 ≈ 3.5조 조합)
const SHORT_CODE_LENGTH = 7;

// * 랜덤 shortCode를 생성한다
export function generateShortCode(length = SHORT_CODE_LENGTH): string {
  const bytes = randomBytes(length);
  let code = '';

  for (let i = 0; i < length; i += 1) {
    code += SHORT_CODE_ALPHABET[bytes[i] % SHORT_CODE_ALPHABET.length];
  }

  return code;
}
