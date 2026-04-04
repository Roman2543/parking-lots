import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SuccessMessage } from '../common/decorators/success-message.decorator';
import { ParkCarDto } from './dtos/request-park-car.dto';
import { ParkCarResponseDto } from './dtos/response-park-car.dto';
import { LeaveCarDto } from './dtos/request-leave-car.dto';
import { LeaveCarResponseDto } from './dtos/response-leave-car.dto';
import { ParkCarService } from './park-car.service';

@Controller('parking-lot')
@ApiTags('parking-lot')
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
}
