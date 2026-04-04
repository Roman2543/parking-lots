import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { ListByCarSizeType } from '../../common/enums/list-by-car-size-type.enum';

export class GetListByCarSizeDto {
  @ApiProperty({ enum: ListByCarSizeType })
  @IsString()
  @IsIn(Object.values(ListByCarSizeType))
  field: ListByCarSizeType;

  @ApiProperty({ enum: ['small', 'medium', 'large'], example: 'small' })
  @IsString()
  @IsIn(['small', 'medium', 'large'])
  car_size: string;
}
