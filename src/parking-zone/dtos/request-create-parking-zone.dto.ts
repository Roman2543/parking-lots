import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateParkingZoneDto {
  @IsString()
  @IsNotEmpty()
  zone_name: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  parking_space: number;
}
