import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ParkingZoneModel } from '../common/models/parking-zone.model';
import { ParkingSlotModel } from '../common/models/parking-slot.model';
import { CreateParkingZoneDto } from './dtos/request-create-parking-zone.dto';
import { CreateParkingZoneResponseDto } from './dtos/response-create-parking-zone.dto';
import { ParkingZoneAvailableLotsResponseDto } from './dtos/response-parking-zone-available-lots.dto';

@Injectable()
export class ParkingZoneService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ParkingZoneModel)
    private readonly parkingZone: Repository<ParkingZoneModel>,
    @InjectRepository(ParkingSlotModel)
    private readonly parkingSlot: Repository<ParkingSlotModel>,
  ) {}

  async createZoneWithSlots(
    dto: CreateParkingZoneDto,
  ): Promise<CreateParkingZoneResponseDto> {
    const { zone_name, parking_space, car_size } = dto;

    const existingZone = await this.parkingZone.findOne({
      where: { zone_name },
    });

    if (existingZone) {
      throw new BadRequestException('Zone name already exists');
    }

    await this.dataSource.transaction(async (manager) => {
      const zone = this.parkingZone.create({
        zone_id: uuidv4(),
        zone_name,
        car_size,
        status: 'active',
      });

      const savedZone = await manager.save(ParkingZoneModel, zone);

      const slots: ParkingSlotModel[] = Array.from(
        { length: parking_space },
        (_, idx) =>
          this.parkingSlot.create({
            slot_id: uuidv4(),
            zone_id: savedZone.zone_id,
            slot_number: idx + 1,
            status: 'available',
          }),
      );

      await manager.save(ParkingSlotModel, slots);
    });

    return {
      zone_name,
      total_slots: parking_space,
      car_size,
    };
  }

  async getParkingZonesAvailableLots(
    car_size?: string,
  ): Promise<ParkingZoneAvailableLotsResponseDto[]> {
    const rows = await this.parkingZone
      .createQueryBuilder('zone')
      .leftJoin(
        ParkingSlotModel,
        'slot',
        'slot.zone_id = zone.zone_id AND slot.status = :status',
        { status: 'available' },
      )
      .where(':car_size IS NULL OR zone.car_size = :car_size', {
        car_size: car_size ?? null,
      })
      .select('zone.zone_name', 'zone_name')
      .addSelect('zone.car_size', 'car_size')
      .addSelect('COUNT(slot.slot_id)', 'available_lots')
      .groupBy('zone.zone_id')
      .addGroupBy('zone.zone_name')
      .addGroupBy('zone.car_size')
      .orderBy('zone.zone_name', 'ASC')
      .getRawMany<{
        zone_name: string;
        available_lots: string;
        car_size: string;
      }>();

    return rows.map((row) => ({
      zone_name: row.zone_name,
      available_lots: Number(row.available_lots),
      car_size: row.car_size,
    }));
  }
}
