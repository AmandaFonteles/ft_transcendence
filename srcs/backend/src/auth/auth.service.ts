// [CONCEPT: service d'auth] AuthService porte TOUTE la logique de securite :
// creation de compte (hash du mdp + generation du username), verification au login,
// emission des JWT, et desormais connexion via OAuth 42.

import {
  ConflictException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Prisma } from '@prisma/client'
import { createId } from '@paralleldrive/cuid2'
import * as argon2 from 'argon2'
import { PrismaService } from '../prisma/prisma.service'
import { LoginDto } from './dto/login.dto'
import { SignupDto } from './dto/signup.dto'

type TokenPair = { accessToken: string; refreshToken: string }

const MAX_USERNAME_ATTEMPTS = 10

// AJOUT : forme de la reponse JSON renvoyee par 42 sur /v2/me
// (uniquement les champs qu'on utilise reellement).
type FortyTwoProfile = {
  id: number
  email: string
  login: string
  usual_full_name?: string
  image?: { link?: string }
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

  // --- LOGIN ---
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

  // --- AJOUT : OAuth 42, etape 1 ---
  // Construit l'URL vers laquelle rediriger le navigateur de l'utilisateur.
  build42AuthorizeUrl(): string {
    const params = new URLSearchParams({
      client_id: process.env.OAUTH_42_CLIENT_ID!,
      redirect_uri: process.env.OAUTH_42_REDIRECT_URI!,
      response_type: 'code',
      scope: 'public'
    })
    return `https://api.intra.42.fr/oauth/authorize?${params.toString()}`
  }

  // --- AJOUT : OAuth 42, etape 2 ---
  // Recoit le "code" temporaire renvoye par 42, l'echange contre un access token 42,
  // recupere le profil, puis cree ou retrouve le User correspondant chez nous.
  async loginWith42(code: string): Promise<TokenPair> {
    // Echange SERVEUR-A-SERVEUR : le client_secret ne transite jamais par le navigateur.
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
    const providerId = String(profile.id)

    // Cas 1 : ce compte 42 est deja lie a un de nos users => connexion directe.
    const existingAccount = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerId: { provider: '42', providerId } }
    })
    if (existingAccount) {
      return this.issueTokens(existingAccount.userId)
    }

    // Cas 2 : l'email existe deja (compte cree via signup classique) => on LIE
    // ce compte 42 dessus. L'email 42 est verifie par 42, on peut lui faire confiance.
    const existingUser = await this.prisma.user.findUnique({ where: { email: profile.email } })
    if (existingUser) {
      await this.prisma.oAuthAccount.create({
        data: { provider: '42', providerId, userId: existingUser.id }
      })
      return this.issueTokens(existingUser.id)
    }

    // Cas 3 : premiere connexion, aucun compte existant => on cree tout,
    // meme logique de generation de username que signup().
    const displayName = profile.usual_full_name ?? profile.login
    let suffix = createId().slice(-5)

    for (let attempt = 0; attempt < MAX_USERNAME_ATTEMPTS; attempt++) {
      const username = this.buildUsername(displayName, suffix)
      try {
        const user = await this.prisma.$transaction(async (tx) => {
          const created = await tx.user.create({
            data: {
              email: profile.email,
              username,
              displayName,
              avatarUrl: profile.image?.link
            }
          })
          await tx.oAuthAccount.create({
            data: { provider: '42', providerId, userId: created.id }
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

  // --- Emission des deux tokens ---
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

  // --- Generation du username (voir la regle dans schema.prisma) ---

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