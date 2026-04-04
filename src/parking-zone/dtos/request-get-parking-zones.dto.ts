import { IsIn, IsOptional, IsString } from 'class-validator';

export class GetParkingZonesDto {
  @IsOptional()
  @IsString()
  @IsIn(['small', 'medium', 'large'])
  car_size?: string;
}
