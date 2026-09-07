import { IsResourceId } from '../../common/validation'

export class AssignTaskMemberDto {
  @IsResourceId()
  memberUserId: string
}
