import { IsIn, IsInt, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateParkingZoneDto {
  @ApiProperty({ example: 'A' })
  @IsString()
  @IsNotEmpty()
  zone_name: string;

  @ApiProperty({ enum: ['small', 'medium', 'large'], example: 'small' })
  @IsString()
  @IsIn(['small', 'medium', 'large'])
  car_size: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  @IsNotEmpty()
  parking_space: number;
}
