// * NestJS 테스트 모듈 기능
import { Test, TestingModule } from '@nestjs/testing';

// * JWT Guard mock 교체용
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// * 테스트 대상 Controller
import { AuthController } from './auth.controller';

// * Controller가 호출하는 Service mock
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  // * AuthService mock
  const authService = {
    login: jest.fn(),
    getMe: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    })
      // * Guard는 단위 테스트에서 실제 JWT 검증을 하지 않음
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /auth/login', () => {
    it('AuthService.login에 DTO를 전달', async () => {
      const loginDto = {
        email: 'user@example.com',
        password: 'password123',
      };
      const loginResult = {
        accessToken: 'test-access-token',
        user: {
          id: 'user-1',
          email: loginDto.email,
          name: '홍길동',
        },
      };
      authService.login.mockResolvedValue(loginResult);

      await expect(controller.login(loginDto)).resolves.toEqual(loginResult);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('GET /auth/me', () => {
    it('AuthService.getMe에 userId를 전달한다', async () => {
      const user = { userId: 'user-1', email: 'user@example.com' };
      const me = {
        id: 'user-1',
        email: 'user@example.com',
        name: '홍길동',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      };
      authService.getMe.mockResolvedValue(me);

      await expect(controller.getMe(user)).resolves.toEqual(me);
      expect(authService.getMe).toHaveBeenCalledWith('user-1');
    });
  });
});
