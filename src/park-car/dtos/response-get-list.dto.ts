import { ApiProperty } from '@nestjs/swagger';
import { ListByCarSizeType } from '../../common/enums/list-by-car-size-type.enum';
import { ActivationStatus } from '../../common/enums/activation-status.enum';

export class ParkingSlotStatusItemDto {
  @ApiProperty({ example: 'A' })
  zone_name: string;

  @ApiProperty({ example: 1 })
  slot_number: number;

  @ApiProperty({ enum: ActivationStatus })
  status: string;
}

export class ListByCarSizeResponseDto {
  @ApiProperty({ enum: ListByCarSizeType })
  field: ListByCarSizeType;

  @ApiProperty({ enum: ['small', 'medium', 'large'], example: 'small' })
  car_size: string;

  @ApiProperty({ type: [String], required: false })
  registration_plates?: string[];

  @ApiProperty({ type: [ParkingSlotStatusItemDto], required: false })
  parking_slots?: ParkingSlotStatusItemDto[];
}
