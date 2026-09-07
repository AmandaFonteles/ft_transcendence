import { IsResourceId } from '../../common/validation'

export class AddMemberDto {
  @IsResourceId()
  userId: string
}
