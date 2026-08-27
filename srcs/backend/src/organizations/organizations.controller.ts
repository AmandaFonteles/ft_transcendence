
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
import { OrganizationsService } from './organizations.service'
import { CreateOrganizationDto } from './dto/create-organization.dto'
import { UpdateOrganizationDto } from './dto/update-organization.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'

@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Post()
  create(@Body() dto: CreateOrganizationDto, @CurrentUser() user: { userId: string }) {

	return this.organizations.create(dto, user.userId)
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
  update(@Param('id') id: string, @CurrentUser() user: { userId: string }, @Body() data: UpdateOrganizationDto) {
	return this.organizations.update(id, user.userId, data)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
	return this.organizations.remove(id, user.userId)
  }
}
