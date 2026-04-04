import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LeaveCarDto {
  @ApiProperty({ example: 'กข1234' })
  @IsString()
  @IsNotEmpty()
  plate_number: string;
}
