// * NestJS에서 Service를 만들기 위한 기능
import { Injectable } from '@nestjs/common';

// * PostgreSQL DB에 접근하기 위한 PrismaService
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(
    // * UsersService에서 PrismaService를 사용할 수 있도록 연결
    private readonly prisma: PrismaService,
  ) {}

  // * users 테이블에서 모든 사용자를 조회
  async findAll() {
    return this.prisma.user.findMany();
  }
}
