import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkingZoneController } from './parking-zone.controller';
import { ParkingZoneService } from './parking-zone.service';
import { ParkingZoneModel } from '../common/models/parking-zone.model';
import { ParkingSlotModel } from '../common/models/parking-slot.model';

@Module({
  imports: [TypeOrmModule.forFeature([ParkingZoneModel, ParkingSlotModel])],
  controllers: [ParkingZoneController],
  providers: [ParkingZoneService],
  exports: [ParkingZoneService],
})
export class ParkingZoneModule {}
