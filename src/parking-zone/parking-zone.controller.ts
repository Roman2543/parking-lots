import { Controller, Post, Body, HttpCode, Get, Query } from '@nestjs/common';
import { ParkingZoneService } from './parking-zone.service';
import { CreateParkingZoneDto } from './dtos/request-create-parking-zone.dto';
import { SuccessMessage } from '../common/decorators/success-message.decorator';
import { CreateParkingZoneResponseDto } from './dtos/response-create-parking-zone.dto';
import { ParkingZoneAvailableLotsResponseDto } from './dtos/response-parking-zone-available-lots.dto';
import { GetParkingZonesDto } from './dtos/request-get-parking-zones.dto';

@Controller('parking-lot')
export class ParkingZoneController {
  constructor(private readonly parkingZoneService: ParkingZoneService) {}

  @Post('create')
  @HttpCode(201)
  @SuccessMessage('Parking lot created successfully')
  async createParkingLot(
    @Body() body: CreateParkingZoneDto,
  ): Promise<CreateParkingZoneResponseDto> {
    return this.parkingZoneService.createZoneWithSlots(body);
  }

  @Get('available-zones')
  @HttpCode(200)
  @SuccessMessage('Parking zones fetched successfully')
  async getParkingZones(
    @Query() query: GetParkingZonesDto,
  ): Promise<ParkingZoneAvailableLotsResponseDto[]> {
    return this.parkingZoneService.getParkingZonesAvailableLots(query.car_size);
  }
}
