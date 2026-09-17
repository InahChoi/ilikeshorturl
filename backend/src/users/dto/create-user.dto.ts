// * 요청 body의 형식과 유효성을 검사하기 위한 기능
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  // * 이메일 형식, 최대 255자 (users.email 컬럼)
  @IsEmail()
  @MaxLength(255)
  email!: string;

  // * 비밀번호는 8자 이상 (해시 후 password_hash 컬럼에 저장)
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  // * 이름, 최대 100자 (users.name 컬럼)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}
