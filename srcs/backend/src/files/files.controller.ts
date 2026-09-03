import { Controller, Body, Get, Post, Param, Delete, UseInterceptors, UploadedFile, UseGuards} from '@nestjs/common';
import { FilesService } from './files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreateFileDto } from './dto/create-file.dto'


@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file',  {
    limits: {
      fileSize: 10 * 1024 * 1024,
    }
  }))
  async uploadFile( @Param('organizationId') organizationId: string, @CurrentUser() user: { userId: string }, @Body() createFileDto: CreateFileDto, @UploadedFile() file: Express.Multer.File ) {
	const uploadedFile = await this.filesService.uploadFile(createFileDto, organizationId, user.userId, file);
	return uploadedFile;
  }
}