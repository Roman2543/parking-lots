import { ApiProperty } from '@nestjs/swagger';

export class SearchCarResponseDto {
  @ApiProperty({ example: 'กข1234' })
  plate_number: string;

  @ApiProperty({ example: 'A' })
  zone_name: string;

  @ApiProperty({ example: 1 })
  slot_number: number;
}
