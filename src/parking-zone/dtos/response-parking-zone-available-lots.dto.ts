import { ApiProperty } from '@nestjs/swagger';

export class ParkingZoneAvailableLotsResponseDto {
  @ApiProperty({ example: 'A' })
  zone_name: string;

  @ApiProperty({ example: 5 })
  available_lots: number;

  @ApiProperty({ enum: ['small', 'medium', 'large'], example: 'small' })
  car_size: string;
}
