import { IsResourceId } from '../../common/validation'

export class TransferTaskOwnerDto {
  @IsResourceId()
  newOwnerUserId: string
}
