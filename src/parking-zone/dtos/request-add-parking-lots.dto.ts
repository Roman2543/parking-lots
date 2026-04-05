import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class AddParkingLotsDto {
  @ApiProperty({ example: 'A' })
  @IsString()
  @IsNotEmpty()
  zone_name: string;

  @ApiProperty({
    example: 2,
    description:
      'Number of new parking lots to add. Slot numbers are auto-generated sequentially from current max slot in the zone.',
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  adding_space: number;
}
