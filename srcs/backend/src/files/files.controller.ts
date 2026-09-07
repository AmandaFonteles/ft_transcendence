import { Controller, Body, Get, Post, Patch, Param, Delete, UseInterceptors, UploadedFile, UseGuards, StreamableFile} from '@nestjs/common';
import { FilesService } from './files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreateFileDto } from './dto/create-file.dto'
import { createReadStream } from 'fs'
import { UpdateFileDto } from './dto/update-file.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway'
import { ServerEvents } from '../realtime/realtime.events'
import type { FileEventPayload } from '../realtime/realtime.events'

@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/files')
export class FilesController {

  constructor(
    private readonly filesService: FilesService,
    private readonly realtime: RealtimeGateway,
  ) {}

  private notifyFileChange(organizationId: string, fileId: string, event: string) {
    const payload: FileEventPayload = { organizationId, fileId }
    this.realtime.notifyOrganization(organizationId, event, payload)
  }

  @Post()
  @UseInterceptors(FileInterceptor('file',  {
    limits: { fileSize: 10 * 1000000 + 1 }
  }))
  async uploadFile( @Param('organizationId') organizationId: string, @CurrentUser() user: { userId: string }, @Body() createFileDto: CreateFileDto, @UploadedFile() file: Express.Multer.File ) {
	const uploadedFile = await this.filesService.uploadFile(createFileDto, organizationId, user.userId, file);
	this.notifyFileChange(organizationId, uploadedFile.id, ServerEvents.FILE_CREATED);
	return uploadedFile;
  }

  @Post(':fileId/access/:targetUserId')
  async addFileAccess(@Param('organizationId') organizationId: string, @Param('fileId') fileId: string, @Param('targetUserId') targetUserId: string, @CurrentUser() user: { userId: string }) {
    await this.filesService.addFileAccess(fileId, targetUserId, user.userId, organizationId);

    this.notifyFileChange(organizationId, fileId, ServerEvents.FILE_UPDATED);
    return fileId;
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

  @Get(':fileId/access')
  async findAllFileAccesses(@Param('organizationId') organizationId: string, @Param('fileId') fileId: string, @CurrentUser() user: { userId: string }) {
    const fileAccesses = await this.filesService.findAllFileAccesses(fileId, user.userId, organizationId)

    return fileAccesses
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
    this.notifyFileChange(organizationId, fileId, ServerEvents.FILE_UPDATED);
    return updatedFile;
  }

  @Delete(':fileId/access/:targetUserId')
  async removeFileAccess(@Param('organizationId') organizationId: string, @Param('fileId') fileId: string, @Param('targetUserId') targetUserId: string, @CurrentUser() user: { userId: string }) {
    await this.filesService.removeFileAccess(fileId, targetUserId, user.userId, organizationId);
    this.notifyFileChange(organizationId, fileId, ServerEvents.FILE_UPDATED);
    return fileId;
  }

  @Delete(':fileId')
  async deleteFile(@Param('organizationId') organizationId: string, @Param('fileId') fileId: string, @CurrentUser() user: { userId: string }) {
    await this.filesService.removeFile(fileId, user.userId, organizationId);
    this.notifyFileChange(organizationId, fileId, ServerEvents.FILE_DELETED);
    return fileId;
  }
}
