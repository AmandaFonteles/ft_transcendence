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
import { ConfirmTwoFactorDto } from './dto/deuxFA.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'

const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000

// Attributs communs aux deux cookies de session. Ils doivent rester identiques :
// si le temoin survivait au jeton (ou l'inverse), le front interrogerait
// /auth/refresh pour rien, ou cesserait de le faire alors qu'une session existe.
const SESSION_COOKIE_OPTIONS = {
  // 'lax' et non 'strict' : le retour d'un fournisseur OAuth arrive par une
  // redirection intersite, a laquelle un cookie 'strict' n'est pas joint.
  // 'lax' accompagne les navigations de premier niveau en GET tout en bloquant
  // les POST intersites, ou se joue la protection CSRF.
  sameSite: 'lax' as const,
  // Toujours vrai : nginx redirige le port 80 vers HTTPS (nginx.conf), il n'y a
  // pas de trafic applicatif en clair, pas meme en developpement.
  secure: true,
}

// Depose a cote du jeton httpOnly, et lisible par le JS : c'est le seul moyen
// pour le front de savoir qu'une session existe avant de la demander. Sans lui,
// chaque chargement de page anonyme envoyait un POST /auth/refresh voue au 401.
const SESSION_MARKER_COOKIE = 'hasSession'

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // --- Session : inscription, connexion, jetons -----------------------------

  @Post('signup')
  async signup(@Body() dto: SignupDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await this.auth.signup(dto)
    this.setRefreshCookie(res, refreshToken)
    return { accessToken }
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await this.auth.login(dto)
    this.setRefreshCookie(res, refreshToken)
    return { accessToken }
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refreshToken
    if (!token) {
      // Efface le temoin : sans cela il survivrait au jeton et le front
      // rappellerait cette route a chaque chargement, pour un 401 certain.
      this.clearSessionCookies(res)
      throw new UnauthorizedException('refresh token manquant')
    }

    try {
      const { accessToken, refreshToken } = await this.auth.refresh(token)
      this.setRefreshCookie(res, refreshToken)
      return { accessToken }
    } catch (error) {
      // Jeton expire ou revoque : meme raisonnement, la session est finie.
      this.clearSessionCookies(res)
      throw error
    }
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    this.clearSessionCookies(res)
    return { success: true }
  }

  @UseGuards(JwtAuthGuard)
  @Post('me')
  me(@CurrentUser() user: { userId: string }) {
    return user
  }

  // --- OAuth ----------------------------------------------------------------

  // Le front pointe un lien <a href="/api/auth/42"> : on veut une vraie
  // navigation de page, pas un fetch().
  @Get('42')
  redirectTo42(@Res() res: Response) {
    return res.redirect(this.auth.build42AuthorizeUrl())
  }

  @Get('42/callback')

  // 42 redirige ici avec ?code=xxx une fois l'application autorisee. On ne peut
  // pas repondre en JSON : l'access token part dans le FRAGMENT d'URL (#...),
  // jamais en ?query, car le fragment n'est pas envoye au serveur ni logge.
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

  @UseGuards(JwtAuthGuard)

  // --- 2FA ------------------------------------------------------------------

  // Protegee : on n'active pas la 2FA "a froid", il faut deja etre connecte.
  @Post('2fa/setup')
  setupTwoFactor(@CurrentUser() user: { userId: string }) {
    return this.auth.generate2FASecret(user.userId)
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/confirm')
  confirmTwoFactor(
    @CurrentUser() user: { userId: string },
    @Body() dto: ConfirmTwoFactorDto
  ) {
    return this.auth.confirmTwoFactor(user.userId, dto)
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  disableTwoFactor(@CurrentUser() user: { userId: string }) {
    return this.auth.disableTwoFactor(user.userId)
  }

  // --- Cookie de rafraichissement -------------------------------------------

  private setRefreshCookie(res: Response, token: string) {
    res.cookie('refreshToken', token, {
      ...SESSION_COOKIE_OPTIONS,
      httpOnly: true,
      maxAge: REFRESH_COOKIE_MAX_AGE
    })
    res.cookie(SESSION_MARKER_COOKIE, '1', {
      ...SESSION_COOKIE_OPTIONS,
      // Volontairement lisible : c'est tout l'interet du temoin. Il ne contient
      // aucun secret, seulement le fait qu'une session a ete ouverte.
      httpOnly: false,
      maxAge: REFRESH_COOKIE_MAX_AGE
    })
  }

  // maxAge est volontairement absent : clearCookie pose une date d'expiration
  // passee, qu'un maxAge ecraserait. Les autres attributs, eux, doivent
  // correspondre a ceux de la pose, sinon le navigateur n'efface rien.
  private clearSessionCookies(res: Response) {
    res.clearCookie('refreshToken', { ...SESSION_COOKIE_OPTIONS, httpOnly: true })
    res.clearCookie(SESSION_MARKER_COOKIE, { ...SESSION_COOKIE_OPTIONS, httpOnly: false })
  }
}
