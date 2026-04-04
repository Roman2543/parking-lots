import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkCarController } from './park-car.controller';
import { ParkCarService } from './park-car.service';
import { VehicleModel } from '../common/models/vehicle.model';
import { VehicleLogModel } from '../common/models/vehicle-log.model';
import { ParkingZoneModel } from '../common/models/parking-zone.model';
import { ParkingSlotModel } from '../common/models/parking-slot.model';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ParkingZoneModel,
      ParkingSlotModel,
      VehicleModel,
      VehicleLogModel,
    ]),
  ],
  controllers: [ParkCarController],
  providers: [ParkCarService],
  exports: [ParkCarService],
})
export class ParkCarModule {}
