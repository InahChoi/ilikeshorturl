// * HTTP 요청을 처리하는 Controller 기능
import { Body, Controller, Get, Post } from '@nestjs/common';

// * 회원가입 요청 body 형식
import { CreateUserDto } from './dto/create-user.dto';

// * 사용자 관련 DB 작업을 담당하는 Service
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    // * Controller에서 UsersService를 사용할 수 있도록 연결
    private readonly usersService: UsersService,
  ) {}

  @Get()
  async findAll() {
    // * GET /users 요청이 들어오면 모든 사용자를 조회
    return await this.usersService.findAll();
  }

  @Post('signup')
  async signup(@Body() createUserDto: CreateUserDto) {
    // * POST /users/signup 요청이 들어오면 회원가입 처리
    return await this.usersService.signup(createUserDto);
  }
}
