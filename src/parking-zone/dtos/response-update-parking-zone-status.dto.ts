import { ApiProperty } from '@nestjs/swagger';
import { ActivationStatus } from '../../common/enums/activation-status.enum';

export class UpdateParkingZoneStatusResponseDto {
  @ApiProperty({ example: 'A' })
  zone_name: string;

  @ApiProperty({ enum: ActivationStatus })
  status: ActivationStatus;
}
