// * NestJS에서 Service를 만들기 위한 기능
import { Injectable } from '@nestjs/common';

// * PostgreSQL DB에 접근하기 위한 PrismaService
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FaqsService {
  constructor(
    // * FaqsService에서 PrismaService를 사용할 수 있도록 연결
    private readonly prisma: PrismaService,
  ) {}

  // * 활성화된 FAQ 목록 조회 (sortOrder 오름차순)
  async findAll(category?: string) {
    return this.prisma.faq.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        question: true,
        answer: true,
        category: true,
        sortOrder: true,
        updatedAt: true,
      },
    });
  }
}
