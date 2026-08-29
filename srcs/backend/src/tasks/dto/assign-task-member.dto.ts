import { IsString, IsNotEmpty } from 'class-validator'

export class AssignTaskMemberDto {
  @IsString()
  @IsNotEmpty()
  userId: string
}