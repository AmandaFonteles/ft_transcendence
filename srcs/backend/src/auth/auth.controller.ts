// [CONCEPT: controller d'auth] Gere le HTTP : lecture/ecriture des cookies,
// codes de statut, redirections. 

import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { CurrentUser } from './decorators/current-user.decorator'
import { LoginDto } from './dto/login.dto'
import { SignupDto } from './dto/signup.dto'
// AJOUT
import { ConfirmTwoFactorDto } from './dto/deuxFA.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'

const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  async signup(@Body() dto: SignupDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await this.auth.signup(dto)
    this.setRefreshCookie(res, refreshToken)
    return { accessToken }
  }

  // Signature HTTP inchangee : login() accepte deja totpCode via LoginDto
  // (etape 3). Rien a modifier ICI, toute la logique 2FA vit dans AuthService.
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await this.auth.login(dto)
    this.setRefreshCookie(res, refreshToken)
    return { accessToken }
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refreshToken
    if (!token) throw new UnauthorizedException('refresh token manquant')

    const { accessToken, refreshToken } = await this.auth.refresh(token)
    this.setRefreshCookie(res, refreshToken)
    return { accessToken }
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refreshToken')
    return { success: true }
  }

  @UseGuards(JwtAuthGuard)
  @Post('me')
  me(@CurrentUser() user: { userId: string }) {
    return user
  }

  @Get('42')
  redirectTo42(@Res() res: Response) {
    return res.redirect(this.auth.build42AuthorizeUrl())
  }

  @Get('42/callback')
  async callback42(@Query('code') code: string, @Res() res: Response) {
    const { accessToken, refreshToken } = await this.auth.loginWith42(code)
    this.setRefreshCookie(res, refreshToken)
    return res.redirect(`${process.env.FRONTEND_URL}/#oauth=${accessToken}`)
  }

  @Get('github')
  redirectToGitHub(@Res() res: Response) {
    return res.redirect(this.auth.buildGitHubAuthorizeUrl())
  }

  @Get('github/callback')
  async callbackGitHub(@Query('code') code: string, @Res() res: Response) {
    const { accessToken, refreshToken } = await this.auth.loginWithGitHub(code)
    this.setRefreshCookie(res, refreshToken)
    return res.redirect(`${process.env.FRONTEND_URL}/#oauth=${accessToken}`)
  }

  // AJOUT : 2FA etape 1. PROTEGEE : il faut deja etre connecte (avec un mot de
  // passe valide) pour lancer l'activation — on n'active pas la 2FA "a froid".
  @UseGuards(JwtAuthGuard)
  @Post('2fa/setup')
  setupTwoFactor(@CurrentUser() user: { userId: string }) {
    return this.auth.generate2FASecret(user.userId)
  }

  // AJOUT : 2FA etape 2. Confirme le premier code scanne, active reellement.
  @UseGuards(JwtAuthGuard)
  @Post('2fa/confirm')
  confirmTwoFactor(
    @CurrentUser() user: { userId: string },
    @Body() dto: ConfirmTwoFactorDto
  ) {
    return this.auth.confirmTwoFactor(user.userId, dto)
  }

  // AJOUT : desactive la 2FA sur le compte connecte.
  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  disableTwoFactor(@CurrentUser() user: { userId: string }) {
    return this.auth.disableTwoFactor(user.userId)
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_COOKIE_MAX_AGE
    })
  }
}