import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class GetParkingLotStatusDto {
  @ApiProperty({ example: 'A' })
  @IsString()
  @IsNotEmpty()
  zone_name: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parking_lot: number;
}
