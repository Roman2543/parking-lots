import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ParkingZoneModel } from './models/parking-zone.model';
import { ParkingSlotModel } from './models/parking-slot.model';

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
    zone_name: string,
    parking_space: number,
    car_size: string,
  ): Promise<{ zone_name: string; total_slots: number; car_size: string }> {
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
}
