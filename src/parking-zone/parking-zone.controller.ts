import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ParkingZoneService } from './parking-zone.service';
import { CreateParkingZoneDto } from './dtos/request-create-parking-zone.dto';
import { SuccessMessage } from '../common/decorators/success-message.decorator';

@Controller('parking-lot')
export class ParkingZoneController {
  constructor(private readonly parkingZoneService: ParkingZoneService) {}

  @Post('create')
  @HttpCode(201)
  @SuccessMessage('Parking lot created successfully')
  async createParkingLot(@Body() body: CreateParkingZoneDto) {
    return this.parkingZoneService.createZoneWithSlots(
      body.zone_name,
      body.parking_space,
    );
  }
}
