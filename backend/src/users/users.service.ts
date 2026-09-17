// * NestJS에서 Service를 만들기 위한 기능
import { ConflictException, Injectable } from '@nestjs/common';

import * as bcrypt from 'bcrypt';

// * PostgreSQL DB에 접근하기 위한 PrismaService
import { PrismaService } from '../prisma/prisma.service';

// * 회원가입 요청 body 형식
import { CreateUserDto } from './dto/create-user.dto';

// * bcrypt 해시에 사용할 salt rounds
const PASSWORD_SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    // * UsersService에서 PrismaService를 사용할 수 있도록 연결
    private readonly prisma: PrismaService,
  ) {}

  // * users 테이블에서 모든 사용자를 조회
  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // * 이메일로 사용자 조회 (로그인 시 passwordHash 비교용)
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  // * id로 사용자 조회 (JWT 검증 후 현재 사용자 확인용)
  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // * 회원가입: email, password, name을 받아 users 테이블에 저장
  async signup(createUserDto: CreateUserDto) {
    // * 이미 등록된 이메일인지 확인 (users.email UNIQUE)
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }

    // * 평문 비밀번호를 bcrypt 해시로 변환 (password_hash 컬럼)
    const passwordHash = await bcrypt.hash(
      createUserDto.password,
      PASSWORD_SALT_ROUNDS,
    );

    // * users 테이블에 새 사용자 생성
    return this.prisma.user.create({
      data: {
        email: createUserDto.email,
        passwordHash,
        name: createUserDto.name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
