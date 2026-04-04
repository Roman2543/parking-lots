import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { ActivationStatus } from '../../common/enums/activation-status.enum';

export class UpdateParkingLotStatusDto {
  @ApiProperty({ example: 'A' })
  @IsString()
  @IsNotEmpty()
  zone_name: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parking_lot: number;

  @ApiProperty({ enum: ActivationStatus })
  @IsEnum(ActivationStatus)
  status: ActivationStatus;
}
