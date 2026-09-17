// * NestJS 테스트 모듈 기능
import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

// * bcrypt를 mock하여 실제 해시를 수행하지 않음
import * as bcrypt from 'bcrypt';

// * PrismaService mock을 주입하기 위한 토큰
import { PrismaService } from '../prisma/prisma.service';

// * 테스트 대상 Service
import { UsersService } from './users.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;

  // * Prisma user 모델 mock
  const prisma = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('users 목록을 반환한다', async () => {
      // * 조회 결과 mock
      const users = [
        {
          id: 'user-1',
          email: 'user@example.com',
          name: '홍길동',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      prisma.user.findMany.mockResolvedValue(users);

      await expect(service.findAll()).resolves.toEqual(users);
      expect(prisma.user.findMany).toHaveBeenCalled();
    });
  });

  describe('signup', () => {
    const createUserDto = {
      email: 'user@example.com',
      password: 'password123',
      name: '홍길동',
    };

    it('회원가입에 성공하면 passwordHash 외 모든 필드를 반환한다', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: createUserDto.email,
        name: createUserDto.name,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.signup(createUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: createUserDto.email,
          passwordHash: 'hashed-password',
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
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('이미 사용 중인 이메일이면 ConflictException을 사용한다.', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: createUserDto.email,
      });

      await expect(service.signup(createUserDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });
});
