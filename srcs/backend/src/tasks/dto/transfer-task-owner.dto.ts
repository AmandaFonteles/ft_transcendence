import { IsString, IsNotEmpty } from 'class-validator'

export class TransferTaskOwnerDto {
  @IsString()
  @IsNotEmpty()
  newOwnerUserId: string
}