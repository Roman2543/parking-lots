import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateParkingZoneDto {
  @IsString()
  @IsNotEmpty()
  zone_name: string;

  @IsInt()
  @IsNotEmpty()
  parking_space: number;
}
