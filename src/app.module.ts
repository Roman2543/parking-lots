import { Module } from '@nestjs/common';
import { DatabaseModule } from './common/database/database.module';
import { ParkingZoneModule } from './parking-zone/parking-zone.module';

@Module({
  imports: [DatabaseModule, ParkingZoneModule],
})
export class AppModule {}
