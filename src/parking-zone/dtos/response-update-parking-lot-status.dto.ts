import { ApiProperty } from '@nestjs/swagger';
import { ActivationStatus } from '../../common/enums/activation-status.enum';

export class UpdateParkingLotStatusResponseDto {
  @ApiProperty({ example: 'A' })
  zone_name: string;

  @ApiProperty({ example: 1 })
  parking_lot: number;

  @ApiProperty({ enum: ActivationStatus })
  status: ActivationStatus;
}
