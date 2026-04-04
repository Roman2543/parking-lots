import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SuccessMessage } from '../common/decorators/success-message.decorator';
import { ParkCarDto } from './dtos/request-park-car.dto';
import { ParkCarResponseDto } from './dtos/response-park-car.dto';
import { LeaveCarDto } from './dtos/request-leave-car.dto';
import { LeaveCarResponseDto } from './dtos/response-leave-car.dto';
import { SearchCarResponseDto } from './dtos/response-search-car.dto';

import { ParkCarService } from './park-car.service';
import { ListByCarSizeResponseDto } from './dtos/response-get-list.dto';
import { GetListByCarSizeDto } from './dtos/request-get-list.dto';
import { ListByCarSizeType } from '../common/enums/list-by-car-size-type.enum';

@Controller('parking-car')
@ApiTags('parking-car')
export class ParkCarController {
  constructor(private readonly parkCarService: ParkCarService) {}

  @Post('park')
  @HttpCode(200)
  @SuccessMessage('Car parked successfully')
  @ApiOperation({
    summary: 'Park a car to the next available slot by car size',
  })
  @ApiOkResponse({ type: ParkCarResponseDto })
  async parkCar(@Body() body: ParkCarDto): Promise<ParkCarResponseDto> {
    return this.parkCarService.parkCar(body);
  }

  @Post('leave')
  @HttpCode(200)
  @SuccessMessage('Car left successfully')
  @ApiOperation({
    summary: 'Mark a parked car as left and release its slot',
  })
  @ApiOkResponse({ type: LeaveCarResponseDto })
  async leaveCar(@Body() body: LeaveCarDto): Promise<LeaveCarResponseDto> {
    return this.parkCarService.leaveCar(body);
  }

  @Get('search-vehicle')
  @HttpCode(200)
  @SuccessMessage('Car found successfully')
  @ApiOperation({ summary: 'Search car by plate number' })
  @ApiQuery({ name: 'plate_number', required: true, type: String })
  @ApiOkResponse({ type: SearchCarResponseDto })
  searchCar(
    @Query('plate_number') plateNumber: string,
  ): Promise<SearchCarResponseDto> {
    return this.parkCarService.searchCar(plateNumber);
  }

  @Get('list')
  @HttpCode(200)
  @SuccessMessage('List by car size fetched successfully')
  @ApiOperation({
    summary:
      'Get registration plate list or parking slot status list by car size',
  })
  @ApiQuery({
    name: 'field',
    required: true,
    enum: ListByCarSizeType,
  })
  @ApiQuery({
    name: 'car_size',
    required: true,
    enum: ['small', 'medium', 'large'],
  })
  @ApiOkResponse({ type: ListByCarSizeResponseDto })
  getListByCarSize(
    @Query() query: GetListByCarSizeDto,
  ): Promise<ListByCarSizeResponseDto> {
    return this.parkCarService.getListByCarSize(query.field, query.car_size);
  }
}
