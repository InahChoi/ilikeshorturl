// * 요청 body의 형식과 유효성을 검사하기 위한 기능
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  // * 로그인에 사용할 이메일
  @IsEmail()
  @MaxLength(255)
  email!: string;

  // * 로그인에 사용할 비밀번호
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
