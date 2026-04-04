import { Controller, Post, Body, HttpCode, Get, Query } from '@nestjs/common';
import { ParkingZoneService } from './parking-zone.service';
import { CreateParkingZoneDto } from './dtos/request-create-parking-zone.dto';
import { SuccessMessage } from '../common/decorators/success-message.decorator';
import { CreateParkingZoneResponseDto } from './dtos/response-create-parking-zone.dto';
import { ParkingZoneAvailableLotsResponseDto } from './dtos/response-parking-zone-available-lots.dto';
import { GetParkingZonesDto } from './dtos/request-get-parking-zones.dto';
import { GetParkingLotStatusDto } from './dtos/request-get-parking-lot-status.dto';
import { ParkingLotStatusResponseDto } from './dtos/response-parking-lot-status.dto';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@Controller('parking-lot')
@ApiTags('parking-lot')
export class ParkingZoneController {
  constructor(private readonly parkingZoneService: ParkingZoneService) {}

  @Post('create')
  @HttpCode(201)
  @SuccessMessage('Parking lot created successfully')
  @ApiOperation({ summary: 'Create parking zone with parking slots' })
  @ApiOkResponse({ type: CreateParkingZoneResponseDto })
  async createParkingLot(
    @Body() body: CreateParkingZoneDto,
  ): Promise<CreateParkingZoneResponseDto> {
    return this.parkingZoneService.createZoneWithSlots(body);
  }

  @Get('available-zones')
  @HttpCode(200)
  @SuccessMessage('Parking zones fetched successfully')
  @ApiOperation({ summary: 'Get available parking lots by zone' })
  @ApiQuery({
    name: 'car_size',
    required: false,
    enum: ['small', 'medium', 'large'],
  })
  @ApiOkResponse({ type: ParkingZoneAvailableLotsResponseDto, isArray: true })
  async getParkingZones(
    @Query() query: GetParkingZonesDto,
  ): Promise<ParkingZoneAvailableLotsResponseDto[]> {
    return this.parkingZoneService.getParkingZonesAvailableLots(query.car_size);
  }

  @Get('status')
  @HttpCode(200)
  @SuccessMessage('Parking lot status fetched successfully')
  @ApiOperation({ summary: 'Get parking lot status by zone and lot number' })
  @ApiQuery({ name: 'zone_name', required: true, example: 'A' })
  @ApiQuery({ name: 'parking_lot', required: true, example: 1 })
  @ApiOkResponse({ type: ParkingLotStatusResponseDto })
  async getParkingLotStatus(
    @Query() query: GetParkingLotStatusDto,
  ): Promise<ParkingLotStatusResponseDto> {
    return this.parkingZoneService.getParkingLotStatus(
      query.zone_name,
      query.parking_lot,
    );
  }
}
