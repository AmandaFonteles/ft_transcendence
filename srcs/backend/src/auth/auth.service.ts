// [CONCEPT: service d'auth] AuthService porte TOUTE la logique de securite :
// creation de compte, verification au login, emission des JWT, et connexion
// via OAuth (42, GitHub).

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Prisma } from '@prisma/client'
import { createId } from '@paralleldrive/cuid2'
import * as argon2 from 'argon2'
// AJOUT : authenticator genere/verifie les secrets et codes TOTP.
import { authenticator } from 'otplib'
// AJOUT : transforme une URI otpauth:// en image QR code (data URL base64).
import * as QRCode from 'qrcode'
import { PrismaService } from '../prisma/prisma.service'
import { LoginDto } from './dto/login.dto'
import { SignupDto } from './dto/signup.dto'
// AJOUT
import { ConfirmTwoFactorDto } from './dto/deuxFA.dto'

type TokenPair = { accessToken: string; refreshToken: string }

const MAX_USERNAME_ATTEMPTS = 10

type FortyTwoProfile = {
  id: number
  email: string
  login: string
  usual_full_name?: string
  image?: { link?: string }
}

type GitHubProfile = {
  id: number
  login: string
  name: string | null
  email: string | null
  avatar_url: string | null
}

type GitHubEmail = {
  email: string
  primary: boolean
  verified: boolean
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  // --- SIGNUP ---
  async signup(dto: SignupDto): Promise<TokenPair> {
    const passwordHash = await argon2.hash(dto.password)
    let suffix = createId().slice(-5)

    for (let attempt = 0; attempt < MAX_USERNAME_ATTEMPTS; attempt++) {
      const username = this.buildUsername(dto.displayName, suffix)

      try {
        const user = await this.prisma.$transaction(async (tx) => {
          const created = await tx.user.create({
            data: {
              email: dto.email,
              username,
              displayName: dto.displayName,
              avatarUrl: dto.avatarUrl
            }
          })

          await tx.credential.create({
            data: { userId: created.id, passwordHash }
          })

          return created
        })

        return this.issueTokens(user.id)
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const target = (error.meta?.target as string[] | undefined) ?? []

          if (target.includes('email')) {
            throw new ConflictException('email deja utilise')
          }
          if (target.includes('username')) {
            suffix = this.nextSuffix(suffix, attempt)
            continue
          }
        }
        throw error
      }
    }

    throw new ConflictException('impossible de generer un username unique, reessaie')
  }

  // --- LOGIN (MODIFIE : verifie desormais la 2FA si activee) ---
  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { credential: true }
    })

    if (!user || !user.credential) {
      throw new UnauthorizedException('identifiants invalides')
    }

    const isValid = await argon2.verify(user.credential.passwordHash, dto.password)
    if (!isValid) {
      throw new UnauthorizedException('identifiants invalides')
    }

    // AJOUT : si la 2FA est active sur ce compte, le mot de passe correct ne
    // suffit plus. dto.totpCode doit etre fourni ET valide.
    if (user.credential.twoFactorEnabled) {
      if (!dto.totpCode) {
        // Message distinct du "identifiants invalides" generique : le front a
        // besoin de savoir PRECISEMENT qu'il doit afficher un champ code,
        // pas juste "mauvais mot de passe".
        throw new UnauthorizedException('code 2FA requis')
      }

      const isCodeValid = authenticator.verify({
        token: dto.totpCode,
        secret: user.credential.twoFactorSecret!
      })
      if (!isCodeValid) {
        throw new UnauthorizedException('code 2FA invalide')
      }
    }

    return this.issueTokens(user.id)
  }

  // --- REFRESH ---
  async refresh(refreshToken: string): Promise<TokenPair> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET
      })

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } })
      if (!user) throw new UnauthorizedException()

      return this.issueTokens(user.id)
    } catch {
      throw new UnauthorizedException('refresh token invalide ou expire')
    }
  }

  // --- AJOUT : 2FA, etape 1 - genere le secret et le QR code ---
  async generate2FASecret(userId: string): Promise<{ qrCodeDataUrl: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { credential: true }
    })

    // Meme regle que changePassword : pas de Credential => pas de 2FA possible
    // (la 2FA renforce un mot de passe qui, ici, n'existe pas).
    if (!user?.credential) {
      throw new ForbiddenException('ce compte est connecte via OAuth, pas de 2FA disponible')
    }

    // Genere un secret aleatoire (base32, format standard TOTP).
    const secret = authenticator.generateSecret()

    // Construit l'URI otpauth://... que les apps d'authentification savent lire.
    // "issuer" (ft_transcendence) apparait dans l'app comme nom du service ;
    // "email" identifie le compte pour l'utilisateur qui en aurait plusieurs.
    const otpauthUri = authenticator.keyuri(user.email, 'ft_transcendence', secret)

    // Stocke le secret DES MAINTENANT, mais twoFactorEnabled reste false :
    // voir explication dans schema.prisma (etape 2) sur pourquoi ces deux
    // champs sont separes.
    await this.prisma.credential.update({
      where: { userId },
      data: { twoFactorSecret: secret }
    })

    // Convertit l'URI en image PNG encodee base64, directement utilisable
    // dans une balise <img src="..."> cote front.
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri)
    return { qrCodeDataUrl }
  }

  // --- AJOUT : 2FA, etape 2 - confirme le premier code et active reellement ---
  async confirmTwoFactor(userId: string, dto: ConfirmTwoFactorDto): Promise<{ success: boolean }> {
    const credential = await this.prisma.credential.findUnique({ where: { userId } })

    if (!credential?.twoFactorSecret) {
      throw new ForbiddenException('aucune activation 2FA en cours, lance generate2FASecret d\'abord')
    }

    const isValid = authenticator.verify({
      token: dto.totpCode,
      secret: credential.twoFactorSecret
    })
    if (!isValid) {
      throw new UnauthorizedException('code invalide')
    }

    await this.prisma.credential.update({
      where: { userId },
      data: { twoFactorEnabled: true }
    })

    return { success: true }
  }

  // --- AJOUT : 2FA, desactivation ---
  async disableTwoFactor(userId: string): Promise<{ success: boolean }> {
    await this.prisma.credential.update({
      where: { userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null }
    })
    return { success: true }
  }

  // --- OAuth 42 ---

  build42AuthorizeUrl(): string {
    const params = new URLSearchParams({
      client_id: process.env.OAUTH_42_CLIENT_ID!,
      redirect_uri: process.env.OAUTH_42_REDIRECT_URI!,
      response_type: 'code',
      scope: 'public'
    })
    return `https://api.intra.42.fr/oauth/authorize?${params.toString()}`
  }

  async loginWith42(code: string): Promise<TokenPair> {
    const tokenRes = await fetch('https://api.intra.42.fr/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: process.env.OAUTH_42_CLIENT_ID,
        client_secret: process.env.OAUTH_42_CLIENT_SECRET,
        code,
        redirect_uri: process.env.OAUTH_42_REDIRECT_URI
      })
    })
    if (!tokenRes.ok) throw new UnauthorizedException('echange OAuth 42 echoue')
    const { access_token } = (await tokenRes.json()) as { access_token: string }

    const profileRes = await fetch('https://api.intra.42.fr/v2/me', {
      headers: { Authorization: `Bearer ${access_token}` }
    })
    if (!profileRes.ok) throw new UnauthorizedException('profil 42 inaccessible')
    const profile = (await profileRes.json()) as FortyTwoProfile

    return this.findOrCreateFromOAuth({
      provider: '42',
      providerId: String(profile.id),
      email: profile.email,
      displayName: profile.usual_full_name ?? profile.login,
      avatarUrl: profile.image?.link
    })
  }

  buildGitHubAuthorizeUrl(): string {
    const params = new URLSearchParams({
      client_id: process.env.OAUTH_GITHUB_CLIENT_ID!,
      redirect_uri: process.env.OAUTH_GITHUB_REDIRECT_URI!,
      scope: 'read:user user:email'
    })
    return `https://github.com/login/oauth/authorize?${params.toString()}`
  }

  async loginWithGitHub(code: string): Promise<TokenPair> {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.OAUTH_GITHUB_CLIENT_ID,
        client_secret: process.env.OAUTH_GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.OAUTH_GITHUB_REDIRECT_URI
      })
    })
    if (!tokenRes.ok) throw new UnauthorizedException('echange OAuth GitHub echoue')
    const { access_token } = (await tokenRes.json()) as { access_token: string }

    const githubHeaders = {
      Authorization: `Bearer ${access_token}`,
      'User-Agent': 'ft_transcendence-app'
    }

    const profileRes = await fetch('https://api.github.com/user', { headers: githubHeaders })
    if (!profileRes.ok) throw new UnauthorizedException('profil GitHub inaccessible')
    const profile = (await profileRes.json()) as GitHubProfile

    let email = profile.email
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: githubHeaders
      })
      if (!emailsRes.ok) throw new UnauthorizedException('email GitHub inaccessible')
      const emails = (await emailsRes.json()) as GitHubEmail[]
      const primary = emails.find((e) => e.primary && e.verified)
      if (!primary) {
        throw new UnauthorizedException('aucun email verifie sur ce compte GitHub')
      }
      email = primary.email
    }

    return this.findOrCreateFromOAuth({
      provider: 'github',
      providerId: String(profile.id),
      email,
      displayName: profile.name ?? profile.login,
      avatarUrl: profile.avatar_url ?? undefined
    })
  }

  private async findOrCreateFromOAuth(profile: {
    provider: string
    providerId: string
    email: string
    displayName: string
    avatarUrl?: string
  }): Promise<TokenPair> {
    const existingAccount = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerId: { provider: profile.provider, providerId: profile.providerId }
      }
    })
    if (existingAccount) {
      return this.issueTokens(existingAccount.userId)
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: profile.email } })
    if (existingUser) {
      await this.prisma.oAuthAccount.create({
        data: {
          provider: profile.provider,
          providerId: profile.providerId,
          userId: existingUser.id
        }
      })
      return this.issueTokens(existingUser.id)
    }

    let suffix = createId().slice(-5)

    for (let attempt = 0; attempt < MAX_USERNAME_ATTEMPTS; attempt++) {
      const username = this.buildUsername(profile.displayName, suffix)
      try {
        const user = await this.prisma.$transaction(async (tx) => {
          const created = await tx.user.create({
            data: {
              email: profile.email,
              username,
              displayName: profile.displayName,
              avatarUrl: profile.avatarUrl
            }
          })
          await tx.oAuthAccount.create({
            data: {
              provider: profile.provider,
              providerId: profile.providerId,
              userId: created.id
            }
          })
          return created
        })
        return this.issueTokens(user.id)
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const target = (error.meta?.target as string[] | undefined) ?? []
          if (target.includes('username')) {
            suffix = this.nextSuffix(suffix, attempt)
            continue
          }
        }
        throw error
      }
    }

    throw new ConflictException('impossible de generer un username unique, reessaie')
  }

  private async issueTokens(userId: string): Promise<TokenPair> {
    const payload = { sub: userId }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: process.env.JWT_ACCESS_EXPIRES ?? '15m'
      }),
      this.jwt.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRES ?? '7d'
      })
    ])

    return { accessToken, refreshToken }
  }

  private buildUsername(displayName: string, suffix: string): string {
    return `${displayName}#${suffix}`
  }

  private nextSuffix(suffix: string, attempt: number): string {
    const chars = suffix.split('')
    const lastIndex = chars.length - 1
    const code = chars[lastIndex].charCodeAt(0)

    const step = Math.floor(attempt / 2) + 1
    const delta = attempt % 2 === 0 ? step : -step

    chars[lastIndex] = String.fromCharCode(code + delta)
    return chars.join('')
  }
}