// * NestJS에서 Service를 만들기 위한 기능
import { Injectable, UnauthorizedException } from '@nestjs/common';

// * JWT 토큰 발급 기능
import { JwtService } from '@nestjs/jwt';

// * bcrypt로 비밀번호를 비교
import * as bcrypt from 'bcrypt';

// * 사용자 조회를 담당하는 Service
import { UsersService } from '../users/users.service';

// * 로그인 요청 body 형식
import { LoginDto } from './dto/login.dto';

// * JWT에 담을 payload 형식
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    // * AuthService에서 UsersService를 사용할 수 있도록 연결
    private readonly usersService: UsersService,

    // * AuthService에서 JwtService를 사용할 수 있도록 연결
    private readonly jwtService: JwtService,
  ) {}

  // * 로그인: email/password 검증 후 JWT accessToken 발급
  async login(loginDto: LoginDto) {
    // * 이메일로 사용자 조회 (passwordHash 포함)
    const user = await this.usersService.findByEmail(loginDto.email);

    // * 사용자가 없거나 비밀번호가 틀리면 동일한 401 응답 (이메일 존재 여부 노출 방지)
    if (!user) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    // * 평문 비밀번호와 DB의 password_hash 비교
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    // * JWT에 담을 사용자 정보 (sub = user id)
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    // * accessToken 발급
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  // * 현재 로그인 사용자 조회 (JWT userId 기준)
  async getMe(userId: string) {
    const user = await this.usersService.findById(userId);

    // * 토큰은 유효하지만 사용자가 삭제된 경우
    if (!user) {
      throw new UnauthorizedException('인증이 필요합니다.');
    }

    return user;
  }
}
