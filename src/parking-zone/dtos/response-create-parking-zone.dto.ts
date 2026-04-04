import { ApiProperty } from '@nestjs/swagger';

export class CreateParkingZoneResponseDto {
  @ApiProperty({ example: 'A' })
  zone_name: string;

  @ApiProperty({ example: 10 })
  total_slots: number;

  @ApiProperty({ enum: ['small', 'medium', 'large'], example: 'small' })
  car_size: string;
}
