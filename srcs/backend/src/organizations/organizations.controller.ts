
// Importe les decorateurs de routage : @Body (corps de requete), @Controller, @Get, @Post.
import {
	Body,
	Controller,
	Get,
	Post,
	Param,
	Patch,
	Delete,
	UseGuards
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { OrganizationsService } from './organizations.service'
// AJOUT NY : diffusion temps reel des changements de membres.
import { RealtimeGateway } from '../realtime/realtime.gateway'
import { ServerEvents } from '../realtime/realtime.events'
import type { MemberEventPayload } from '../realtime/realtime.events'
import { CreateOrganizationDto } from './dto/create-organization.dto'
import { UpdateOrganizationDto } from './dto/update-organization.dto'
import { AddMemberDto } from './dto/add-member-organization.dto'

@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  // Le gateway est injecte ICI, dans le controller, et non dans le service :
  // organizations.service.ts fait autorite sur les regles metier et ne doit pas
  // dependre de la couche transport. Le controller, lui, est un point terminal —
  // rien ne l'importe, donc aucun risque de dependance circulaire.
  constructor(
    private readonly organizations: OrganizationsService,
    private readonly realtime: RealtimeGateway,
  ) {}

  @Post()
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
	// Diffuse APRES le succes du service : si celui-ci leve (droit refuse, membre
	// deja present), l'exception remonte et l'evenement n'est jamais emis.
	const added: MemberEventPayload = { organizationId: id, userId: dto.userId }
	this.realtime.notifyOrganization(id, ServerEvents.MEMBER_ADDED, added)
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

  @Get(':id/members')
  findAllMembers(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
	return this.organizations.findAllMembers(id, user.userId)
  }

  @Patch(':id')
  async update(@Param('id') id: string, @CurrentUser() user: { userId: string }, @Body() data: UpdateOrganizationDto) {
	await this.organizations.update(id, user.userId, data)
	return { message: `Mise à jour réussie !` }
  }

  @Patch(':id/members/:targetUserId/promote')
  async promoteMember(@Param('id') id: string, @Param('targetUserId') targetUserId: string, @CurrentUser() user: { userId: string }) {
	await this.organizations.promoteMember(id, targetUserId, user.userId)
	const promoted: MemberEventPayload = { organizationId: id, userId: targetUserId, role: 'ADMIN' }
	this.realtime.notifyOrganization(id, ServerEvents.MEMBER_ROLE_CHANGED, promoted)
	return { message: `Promotion réussie !` }
  }

  @Patch(':id/members/:targetUserId/demote')
  async demoteMember(@Param('id') id: string, @Param('targetUserId') targetUserId: string, @CurrentUser() user: { userId: string }) {
	await this.organizations.demoteMember(id, targetUserId, user.userId)
	const demoted: MemberEventPayload = { organizationId: id, userId: targetUserId, role: 'MEMBER' }
	this.realtime.notifyOrganization(id, ServerEvents.MEMBER_ROLE_CHANGED, demoted)
	return { message: `Rétrogradation réussie !` }
  }

  @Delete(':id/members/me')
  async leaveOrganization(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
	const isOrgaDeleted = await this.organizations.leaveOrganization(id, user.userId)
	// Si le depart a entraine la suppression du projet, il n'y a plus de salon ni
	// de membres a prevenir : on n'emet que dans le cas contraire.
	if (!isOrgaDeleted) {
	  const left: MemberEventPayload = { organizationId: id, userId: user.userId }
	  this.realtime.notifyOrganization(id, ServerEvents.MEMBER_REMOVED, left)
	}
	if (isOrgaDeleted) {
		return { message: `Vous avez bien quitté le projet, il a donc été supprimé !` }
	}
	return { message: `Vous avez bien quitté le projet !` }
  }


  @Delete(':id/members/:targetUserId')
  async removeMember(@Param('id') id: string, @Param('targetUserId') targetUserId: string, @CurrentUser() user: { userId: string }) {
	await this.organizations.removeMember(id, targetUserId, user.userId)
	const kicked: MemberEventPayload = { organizationId: id, userId: targetUserId }
	this.realtime.notifyOrganization(id, ServerEvents.MEMBER_REMOVED, kicked)
	return { message: `Membre expulsé avec succès !` }
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
	await this.organizations.remove(id, user.userId)
	return { message: `Projet supprimé avec succès !` }
  }
}
