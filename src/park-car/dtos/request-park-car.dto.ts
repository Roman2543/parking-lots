import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class ParkCarDto {
  @ApiProperty({ example: 'กข1234' })
  @IsString()
  @IsNotEmpty()
  plate_number: string;

  @ApiProperty({ enum: ['small', 'medium', 'large'], example: 'small' })
  @IsString()
  @IsIn(['small', 'medium', 'large'])
  car_size: string;
}
