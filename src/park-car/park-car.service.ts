import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ParkingZoneModel } from '../common/models/parking-zone.model';
import { ParkingSlotModel } from '../common/models/parking-slot.model';
import { VehicleModel } from '../common/models/vehicle.model';
import { VehicleLogModel } from '../common/models/vehicle-log.model';
import { ParkCarDto } from './dtos/request-park-car.dto';
import { ParkCarResponseDto } from './dtos/response-park-car.dto';
import { AvailableSlotDto } from './dtos/available-slot.dto';
import { VehicleLogContextDto } from './dtos/vehicle-log-context.dto';

@Injectable()
export class ParkCarService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(VehicleModel)
    private readonly vehicle: Repository<VehicleModel>,
  ) {}

  async parkCar(body: ParkCarDto): Promise<ParkCarResponseDto> {
    const { plate_number, car_size } = body;

    let parkedSlot: AvailableSlotDto;

    await this.dataSource.transaction(async (manager) => {
      // 1. Check vehicle
      const existingVehicle = await this.getVehicleByPlate(
        manager,
        plate_number,
      );
      this.ensureVehicleIsNotParked(existingVehicle);

      // 2. Find nearest available slot and reserve it
      const availableSlot = await this.findNearestAvailableSlot(
        manager,
        car_size,
      );
      await this.reserveAvailableSlot(manager, availableSlot.slot_id);

      // 3. Upsert vehicle record and save parking log
      const logContext = await this.upsertVehicleForParking(
        manager,
        existingVehicle,
        plate_number,
        car_size,
        availableSlot.slot_id,
      );

      await this.saveParkedLog(
        manager,
        logContext.vehicleId,
        availableSlot.slot_id,
        logContext.oldStatus,
      );

      parkedSlot = availableSlot;
    });

    return {
      plate_number,
      car_size,
      slot_id: parkedSlot.slot_id,
      zone_name: parkedSlot.zone_name,
      slot_number: Number(parkedSlot.slot_number),
      status: 'parked',
    };
  }

  private async getVehicleByPlate(
    manager: EntityManager,
    plateNumber: string,
  ): Promise<VehicleModel | null> {
    return manager.findOne(VehicleModel, {
      where: { plate_number: plateNumber },
    });
  }

  private ensureVehicleIsNotParked(vehicle: VehicleModel | null): void {
    if (vehicle?.status === 'parked') {
      throw new BadRequestException('This vehicle is already parked.');
    }
  }

  // Find the nearest available parking slot.
  private async findNearestAvailableSlot(
    manager: EntityManager,
    carSize: string,
  ): Promise<AvailableSlotDto> {
    const availableSlot = await manager
      .createQueryBuilder(ParkingSlotModel, 'slot')
      .innerJoin(ParkingZoneModel, 'zone', 'zone.zone_id = slot.zone_id')
      .where('slot.status = :slotStatus', { slotStatus: 'available' })
      .andWhere('zone.status = :zoneStatus', { zoneStatus: 'active' })
      .andWhere('zone.car_size = :car_size', { car_size: carSize })
      .select('slot.slot_id', 'slot_id')
      .addSelect('slot.slot_number', 'slot_number')
      .addSelect('zone.zone_name', 'zone_name')
      .orderBy('zone.created_at', 'ASC')
      .addOrderBy('slot.created_at', 'ASC')
      .getRawOne<AvailableSlotDto>();

    if (!availableSlot) {
      throw new BadRequestException(
        'No available parking slot for this car size',
      );
    }

    return availableSlot;
  }

  private async reserveAvailableSlot(
    manager: EntityManager,
    slotId: string,
  ): Promise<void> {
    const updateSlotResult = await manager.update(
      ParkingSlotModel,
      { slot_id: slotId, status: 'available' },
      { status: 'occupied' },
    );

    if (!updateSlotResult.affected) {
      throw new BadRequestException(
        'Selected parking slot is no longer available',
      );
    }
  }

  private async upsertVehicleForParking(
    manager: EntityManager,
    existingVehicle: VehicleModel | null,
    plateNumber: string,
    carSize: string,
    slotId: string,
  ): Promise<VehicleLogContextDto> {
    if (existingVehicle) {
      const oldStatus = existingVehicle.status;
      existingVehicle.car_size = carSize;
      existingVehicle.current_slot_id = slotId;
      existingVehicle.status = 'parked';
      await manager.save(VehicleModel, existingVehicle);

      return {
        vehicleId: existingVehicle.vehicle_id,
        oldStatus,
      };
    }

    const newVehicle = this.vehicle.create({
      vehicle_id: uuidv4(),
      plate_number: plateNumber,
      car_size: carSize,
      current_slot_id: slotId,
      status: 'parked',
    });

    await manager.save(VehicleModel, newVehicle);

    return {
      vehicleId: newVehicle.vehicle_id,
      oldStatus: null,
    } as VehicleLogContextDto;
  }

  private async saveParkedLog(
    manager: EntityManager,
    vehicleId: string,
    slotId: string,
    oldStatus: string | null,
  ): Promise<void> {
    const vehicleLog = {
      vehicle_log_id: uuidv4(),
      vehicle_id: vehicleId,
      slot_id: slotId,
      event_type: 'parked',
      old_status: oldStatus,
      new_status: 'parked',
      note: 'Vehicle parked',
    };

    await manager.save(VehicleLogModel, vehicleLog);
  }
}
