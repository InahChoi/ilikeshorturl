// * HTTP 요청을 처리하는 Controller 기능
import { Body, Controller, Post } from '@nestjs/common';

// * 인증 관련 작업을 담당하는 Service
import { AuthService } from './auth.service';

// * 로그인 요청 body 형식
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(
    // * Controller에서 AuthService를 사용할 수 있도록 연결
    private readonly authService: AuthService,
  ) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    // * POST /auth/login 요청이 들어오면 로그인 + JWT 발급
    return this.authService.login(loginDto);
  }
}
