// * NestJS 테스트 모듈 기능
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

// * bcrypt를 mock하여 실제 비교를 수행하지 않음
import * as bcrypt from 'bcrypt';

// * 사용자 조회 Service mock
import { UsersService } from '../users/users.service';

// * 테스트 대상 Service
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  // * UsersService / JwtService mock
  const usersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
  };
  const jwtService = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    const loginDto = {
      email: 'user@example.com',
      password: 'password123',
    };

    const storedUser = {
      id: 'user-1',
      email: loginDto.email,
      name: '홍길동',
      passwordHash: 'hashed-password',
    };

    it('로그인에 성공하면 accessToken과 user를 반환', async () => {
      usersService.findByEmail.mockResolvedValue(storedUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('test-access-token');

      const result = await service.login(loginDto);

      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        storedUser.passwordHash,
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: storedUser.id,
        email: storedUser.email,
      });
      expect(result).toEqual({
        accessToken: 'test-access-token',
        user: {
          id: storedUser.id,
          email: storedUser.email,
          name: storedUser.name,
        },
      });
    });

    it('사용자가 없으면 UnauthorizedException을 던짐', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('비밀번호가 틀리면 UnauthorizedException을 던짐', async () => {
      usersService.findByEmail.mockResolvedValue(storedUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('getMe', () => {
    const meUser = {
      id: 'user-1',
      email: 'user@example.com',
      name: '홍길동',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    it('현재 사용자 정보를 반환', async () => {
      usersService.findById.mockResolvedValue(meUser);

      await expect(service.getMe('user-1')).resolves.toEqual(meUser);
      expect(usersService.findById).toHaveBeenCalledWith('user-1');
    });

    it('사용자가 없으면 UnauthorizedException을 던짐', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(service.getMe('user-1')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
