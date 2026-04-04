import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseHealthService } from './database.health.service';
import { databaseConfig } from './database.config';

@Module({
  imports: [TypeOrmModule.forRoot(databaseConfig)],
  providers: [DatabaseHealthService],
  exports: [TypeOrmModule, DatabaseHealthService],
})
export class DatabaseModule {}
