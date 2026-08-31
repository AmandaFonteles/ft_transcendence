
// Importe les decorateurs de routage : @Body (corps de requete), @Controller, @Get, @Post.
import { 
	Body, 
	Controller, 
	Get, 
	Post, 
<<<<<<< HEAD
=======
	ValidationPipe, 
	UsePipes, 
>>>>>>> origin/Quentin
	Param, 
	Patch, 
	Delete, 
	UseGuards 
} from '@nestjs/common'
<<<<<<< HEAD
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { OrganizationsService } from './organizations.service'
import { CreateOrganizationDto } from './dto/create-organization.dto'
import { UpdateOrganizationDto } from './dto/update-organization.dto'
import { AddMemberDto } from './dto/add-member-organization.dto'

=======
import { OrganizationsService } from './organizations.service'
import { CreateOrganizationDto } from './dto/create-organization.dto'
import { UpdateOrganizationDto } from './dto/update-organization.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'

@UsePipes(new ValidationPipe({whitelist: true, forbidNonWhitelisted: true}))
>>>>>>> origin/Quentin
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Post()
<<<<<<< HEAD
  async create(@Body() dto: CreateOrganizationDto, @CurrentUser() user: { userId: string }) {
	const organization = await this.organizations.create(dto, user.userId)
	return { 
		message: `Création réussie !`,
		organizationId: organization.id
	}
  }

  @Post(':id/members')
  async addMember(@Param('id') id: string, @CurrentUser() user: { userId: string }, @Body() dto: AddMemberDto) {
	await this.organizations.addMember(id, dto.userId, user.userId)
	return { message: `Membre ajouté avec succès !` }
  }

  @Get()
  findAll(@CurrentUser() user: { userId: string }) {
	return this.organizations.findAll(user.userId)
  }

  @Get(':id')
  findOneForMember(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
	return this.organizations.findOneForMember(id, user.userId)
  }

  @Patch(':id')
  async update(@Param('id') id: string, @CurrentUser() user: { userId: string }, @Body() data: UpdateOrganizationDto) {
	await this.organizations.update(id, user.userId, data)
	return { message: `Mise à jour réussie !` }
  }

  @Patch(':id/members/:targetUserId/promote')
  async promoteMember(@Param('id') id: string, @Param('targetUserId') targetUserId: string, @CurrentUser() user: { userId: string }) {
	await this.organizations.promoteMember(id, targetUserId, user.userId)
	return { message: `Promotion réussie !` }
  }

  @Patch(':id/members/:targetUserId/demote')
  async demoteMember(@Param('id') id: string, @Param('targetUserId') targetUserId: string, @CurrentUser() user: { userId: string }) {
	await this.organizations.demoteMember(id, targetUserId, user.userId)
	return { message: `Rétrogradation réussie !` }
  }
  
  @Delete(':id/members/me')
  async leaveOrganization(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
	const isOrgaDeleted = await this.organizations.leaveOrganization(id, user.userId)
	if (isOrgaDeleted) {
		return { message: `Vous avez bien quitté le projet, il a donc été supprimé !` }
	}
	return { message: `Vous avez bien quitté le projet !` }
  }


  @Delete(':id/members/:targetUserId')
  async removeMember(@Param('id') id: string, @Param('targetUserId') targetUserId: string, @CurrentUser() user: { userId: string }) {
	await this.organizations.removeMember(id, targetUserId, user.userId)
	return { message: `Membre expulsé avec succès !` }
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
	await this.organizations.remove(id, user.userId)
	return { message: `Projet supprimé avec succès !` }
=======
  create(@Body() dto: CreateOrganizationDto, @CurrentUser() user: { userId: string }) {

	return this.organizations.create(dto, user.userId)
  }

  @Get()
  findAll() {
	return this.organizations.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
	return this.organizations.findOne(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateOrganizationDto) {
	return this.organizations.update(id, data)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
	return this.organizations.remove(id)
>>>>>>> origin/Quentin
  }
}
