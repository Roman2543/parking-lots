import { ApiProperty } from '@nestjs/swagger';

export class ParkCarResponseDto {
  @ApiProperty({ example: 'กข1234' })
  plate_number: string;

  @ApiProperty({ example: 'small' })
  car_size: string;

  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  slot_id: string;

  @ApiProperty({ example: 'A' })
  zone_name: string;

  @ApiProperty({ example: 1 })
  slot_number: number;

  @ApiProperty({ example: 'parked' })
  status: string;
}
