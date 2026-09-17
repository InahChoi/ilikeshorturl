// * NestJS 테스트 모듈 기능
import { Test, TestingModule } from '@nestjs/testing';

// * 테스트 대상 Controller
import { AuthController } from './auth.controller';

// * Controller가 호출하는 Service mock
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  // * AuthService mock
  const authService = {
    login: jest.fn(),
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
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /auth/login', () => {
    it('AuthService.login에 DTO를 전달한다', async () => {
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
});
