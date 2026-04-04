import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetParkingZonesDto {
  @ApiPropertyOptional({ enum: ['small', 'medium', 'large'], example: 'small' })
  @IsOptional()
  @IsString()
  @IsIn(['small', 'medium', 'large'])
  car_size?: string;
}
