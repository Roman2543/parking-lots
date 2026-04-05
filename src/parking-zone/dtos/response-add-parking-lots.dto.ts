import { ApiProperty } from '@nestjs/swagger';

export class AddParkingLotsResponseDto {
  @ApiProperty({ example: 'A' })
  zone_name: string;

  @ApiProperty({ example: 7 })
  total_slot: number;
}
