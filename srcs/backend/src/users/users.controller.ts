// [CONCEPT: controller de feature] UsersController mappe les routes HTTP vers le
// service. Il ne contient AUCUNE logique : il recoit, delegue, renvoie.

// Importe les decorateurs de routage : @Body (corps de requete), @Controller, @Get, @Post.
import { Body, Controller, Get, Post } from '@nestjs/common'
// Importe le service de feature.
import { UsersService } from './users.service'
// Importe le type d'entree partage.
import { CreateUserDto } from './dto/create-user.dto'

// '/users' + prefixe global 'api' => toutes les routes ici sont sous /api/users.
@Controller('users')
export class UsersController {
  // Injection du service de feature (on renomme la propriete "users" pour la lisibilite).
  constructor(private readonly users: UsersService) {}

  // Associe la methode a POST /api/users (creation).
  @Post()
  // @Body() extrait le corps JSON de la requete et le type via CreateUserDto.
  // ATTENTION : sans ValidationPipe, ce typage est verifie a la COMPILATION seulement,
  // pas a l'execution. La validation reelle des entrees viendra avec le module de Qu.
  create(@Body() dto: CreateUserDto) {
    // Delegue au service ; Nest serialise le user cree en JSON (reponse 201 par defaut sur POST).
    return this.users.create(dto)
  }

  // Associe la methode a GET /api/users (liste).
  @Get()
  findAll() {
    // Delegue au service ; renvoie le tableau JSON des users.
    return this.users.findAll()
  }
}
