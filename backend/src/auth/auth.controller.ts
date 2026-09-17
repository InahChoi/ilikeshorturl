// * HTTP 요청을 처리하는 Controller 기능
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

// * JWT에서 추출한 현재 사용자 주입
import { CurrentUser } from './decorators/current-user.decorator';

// * JWT 필수 Guard
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// * JWT 검증 후 request.user 형식
import type { AuthUser } from './interfaces/auth-user.interface';

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
    return await this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: AuthUser) {
    // * GET /auth/me — 현재 로그인 사용자 정보
    return await this.authService.getMe(user.userId);
  }
}
