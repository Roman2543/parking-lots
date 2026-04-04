import { ApiProperty } from '@nestjs/swagger';

export class LeaveCarResponseDto {
  @ApiProperty({ example: 'กข1234' })
  plate_number: string;

  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  slot_id: string;

  @ApiProperty({ example: 'left' })
  status: string;
}
