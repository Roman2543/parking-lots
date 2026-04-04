import { Module } from '@nestjs/common';
import { DatabaseModule } from './common/database/database.module';
import { ParkingZoneModule } from './parking-zone/parking-zone.module';
import { ParkCarModule } from './park-car/park-car.module';

@Module({
  imports: [DatabaseModule, ParkingZoneModule, ParkCarModule],
})
export class AppModule {}
