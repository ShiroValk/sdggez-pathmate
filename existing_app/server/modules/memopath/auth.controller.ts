import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type {
  MemoPathAccount,
  MemoPathAccountExistsResponse,
  MemoPathLoginResponse,
  MemoPathMessageResponse,
  MemoPathOtpResponse,
} from '@shared/api.interface';
import { MemoPathAuthService } from './auth.service';
import { MemoPathLoginDto, MemoPathOtpDto, MemoPathRegisterDto } from './dto';
import { MemoAuthedRequest, MemoPathSessionGuard } from './memopath-session.guard';

@Controller('api/memopath/auth')
export class MemoPathAuthController {
  constructor(private readonly authService: MemoPathAuthService) {}

  @Post('otp')
  async issueOtp(@Body() dto: MemoPathOtpDto): Promise<MemoPathOtpResponse> {
    return this.authService.issueOtp();
  }

  @Get('exists')
  async exists(@Query('account') account: string): Promise<MemoPathAccountExistsResponse> {
    return { exists: await this.authService.accountExists(account ?? '') };
  }

  @Post('register')
  async register(@Body() dto: MemoPathRegisterDto): Promise<MemoPathLoginResponse> {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: MemoPathLoginDto): Promise<MemoPathLoginResponse> {
    return this.authService.login(dto.account, dto.password);
  }

  @UseGuards(MemoPathSessionGuard)
  @Get('me')
  async me(@Req() req: MemoAuthedRequest): Promise<MemoPathAccount> {
    return {
      accountId: req.memoAccount.accountId,
      role: req.memoAccount.role as MemoPathAccount['role'],
      displayName: req.memoAccount.displayName,
    };
  }

  @UseGuards(MemoPathSessionGuard)
  @Post('logout')
  async logout(
    @Headers('x-memopath-token') token: string,
  ): Promise<MemoPathMessageResponse> {
    await this.authService.logout(token);
    return { message: '已登出' };
  }
}
