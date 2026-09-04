import { Controller, Body, Get, Post, Patch, Param, Delete, UseInterceptors, UploadedFile, UseGuards, StreamableFile} from '@nestjs/common';
import { FilesService } from './files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreateFileDto } from './dto/create-file.dto'
import { createReadStream } from 'fs'
import { UpdateFileDto } from './dto/update-file.dto';



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

  @Get()
  async findAllFiles(@Param('organizationId') organizationId: string, @CurrentUser() user: { userId: string }) {
  const files = await this.filesService.findAllFiles(organizationId, user.userId);
  return files;
  }

  @Get(':fileId')
  async findFileById(@Param('organizationId') organizationId: string, @Param('fileId') fileId: string, @CurrentUser() user: { userId: string }) {
    const file = await this.filesService.findFileById(fileId, user.userId, organizationId);
    return file;
  }

  @Get(':fileId/download')
  async downloadFile(@Param('organizationId') organizationId: string, @Param('fileId') fileId: string, @CurrentUser() user: { userId: string }) {
    const { filePath, fileName, mimeType } = await this.filesService.downloadFile(fileId, user.userId, organizationId);
    const encodedFileName = this.encodeFileName(fileName);
    const fileStream = createReadStream(filePath);
    return new StreamableFile(fileStream, { type: mimeType, disposition: `attachment; filename*=UTF-8''${encodedFileName}` });
  }


  private encodeFileName(fileName: string) {
  return encodeURIComponent(fileName).replace(/['()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}` )
  }
  @Get(':fileId/preview')
  async previewFile(@Param('organizationId') organizationId: string, @Param('fileId') fileId: string, @CurrentUser() user: { userId: string }) {
    const { filePath, fileName, mimeType } = await this.filesService.previewFile(fileId, user.userId, organizationId);
    const fileStream = createReadStream(filePath);
    const encodedFileName = this.encodeFileName(fileName);
    return new StreamableFile(fileStream, { type: mimeType, disposition: `inline; filename*=UTF-8''${encodedFileName}` });
  }

  @Patch(':fileId')
  async updateFile(@Param('organizationId') organizationId: string, @Param('fileId') fileId: string, @CurrentUser() user: { userId: string }, @Body() updateFileDto: UpdateFileDto) {
    const updatedFile = await this.filesService.updateFile(fileId, user.userId, organizationId, updateFileDto);
    return updatedFile;
  }
}