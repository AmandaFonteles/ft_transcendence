import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtStrategy } from './strategies/jwt.strategy'

@Module({
  imports: [
    PassportModule,
    // registerAsync : lit process.env a l'init, pas au chargement du fichier.
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_ACCESS_SECRET,
        signOptions: { expiresIn: process.env.JWT_ACCESS_EXPIRES ?? '15m' }
      })
    })
  ],
  controllers: [AuthController],
  // JwtStrategy doit etre provider ici pour que Passport la decouvre.
  providers: [AuthService, JwtStrategy]
})
export class AuthModule {}