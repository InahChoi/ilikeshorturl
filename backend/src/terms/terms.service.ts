// * NestJS에서 Service를 만들기 위한 기능
import { Injectable, NotFoundException } from '@nestjs/common';

// * 약관 타입 enum
import { TermType } from '../generated/prisma/enums';

// * PostgreSQL DB에 접근하기 위한 PrismaService
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TermsService {
  constructor(
    // * TermsService에서 PrismaService를 사용할 수 있도록 연결
    private readonly prisma: PrismaService,
  ) {}

  // * 활성화된 약관 목록 조회 (타입별 최신 publishedAt 우선)
  async findAll() {
    return await this.prisma.term.findMany({
      where: { isActive: true },
      orderBy: [{ type: 'asc' }, { publishedAt: 'desc' }],
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        version: true,
        publishedAt: true,
        updatedAt: true,
      },
    });
  }

  // * 특정 타입의 활성 약관 중 가장 게시본 1건 조회
  async findLatestByType(type: TermType) {
    const term = await this.prisma.term.findFirst({
      where: {
        type,
        isActive: true,
      },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        version: true,
        publishedAt: true,
        updatedAt: true,
      },
    });

    if (!term) {
      throw new NotFoundException('약관을 찾을 수 없습니다.');
    }

    return term;
  }
}
