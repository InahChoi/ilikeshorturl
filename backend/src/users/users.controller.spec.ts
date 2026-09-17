// * NestJS 테스트 모듈 기능
import { Test, TestingModule } from '@nestjs/testing';

// * 테스트 대상 Controller
import { UsersController } from './users.controller';

// * Controller가 호출하는 Service mock
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;

  // * UsersService mock
  const usersService = {
    findAll: jest.fn(),
    signup: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /users', () => {
    it('UsersService.findAll을 호출한다', async () => {
      const users = [
        { id: 'user-1', email: 'user@example.com', name: '홍길동' },
      ];
      usersService.findAll.mockResolvedValue(users);

      await expect(controller.findAll()).resolves.toEqual(users);
      expect(usersService.findAll).toHaveBeenCalled();
    });
  });

  describe('POST /users/signup', () => {
    it('UsersService.signup에 DTO를 전달한다', async () => {
      const createUserDto = {
        email: 'user@example.com',
        password: 'password123',
        name: '홍길동',
      };
      const createdUser = {
        id: 'user-1',
        email: createUserDto.email,
        name: createUserDto.name,
      };
      usersService.signup.mockResolvedValue(createdUser);

      await expect(controller.signup(createUserDto)).resolves.toEqual(
        createdUser,
      );
      expect(usersService.signup).toHaveBeenCalledWith(createUserDto);
    });
  });
});
