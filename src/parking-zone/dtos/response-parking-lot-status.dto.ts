import { ApiProperty } from '@nestjs/swagger';

export class ParkingLotStatusResponseDto {
  @ApiProperty({ example: 'A' })
  zone_name: string;

  @ApiProperty({ example: 1 })
  parking_lot: number;

  @ApiProperty({ enum: ['available', 'occupied'], example: 'available' })
  status: string;
}
