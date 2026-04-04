import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ActivationStatus } from '../../common/enums/activation-status.enum';

export class UpdateParkingZoneStatusDto {
  @ApiProperty({ example: 'A' })
  @IsString()
  @IsNotEmpty()
  zone_name: string;

  @ApiProperty({ enum: ActivationStatus })
  @IsEnum(ActivationStatus)
  status: ActivationStatus;
}
