import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ParkingZoneModel } from '../common/models/parking-zone.model';
import { ParkingSlotModel } from '../common/models/parking-slot.model';
import { VehicleModel } from '../common/models/vehicle.model';
import { VehicleLogModel } from '../common/models/vehicle-log.model';
import { VehicleStatus } from '../common/enums/vehicle-status.enum';
import { VehicleLogEventType } from '../common/enums/vehicle-log-event-type.enum';
import { ActivationStatus } from '../common/enums/activation-status.enum';
import { ListByCarSizeType } from '../common/enums/list-by-car-size-type.enum';
import { ParkCarDto } from './dtos/request-park-car.dto';
import { ParkCarResponseDto } from './dtos/response-park-car.dto';
import { LeaveCarDto } from './dtos/request-leave-car.dto';
import { LeaveCarResponseDto } from './dtos/response-leave-car.dto';
import { AvailableSlotDto } from './dtos/available-slot.dto';
import { VehicleLogContextDto } from './dtos/vehicle-log-context.dto';
import { ListByCarSizeResponseDto } from './dtos/response-get-list.dto';
import { SearchCarResponseDto } from './dtos/response-search-car.dto';

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
      status: VehicleStatus.PARKED,
    };
  }

  async leaveCar(body: LeaveCarDto): Promise<LeaveCarResponseDto> {
    const { plate_number } = body;
    let leftSlotId = '';

    await this.dataSource.transaction(async (manager) => {
      // 1. Check vehicle and ensure it is currently parked
      const existingVehicle = await this.getVehicleByPlate(
        manager,
        plate_number,
      );

      if (!existingVehicle) {
        throw new BadRequestException('Vehicle not found');
      }

      this.ensureVehicleIsParkedForLeaving(existingVehicle);

      // 2. Release the currently occupied slot
      const slotId = existingVehicle.current_slot_id;
      await this.releaseOccupiedSlot(manager, slotId);

      // 3. Update vehicle status and write leave log
      const oldStatus = existingVehicle.status;
      existingVehicle.current_slot_id = null;
      existingVehicle.status = VehicleStatus.LEFT;
      await manager.save(VehicleModel, existingVehicle);

      await this.saveLeftLog(
        manager,
        existingVehicle.vehicle_id,
        slotId,
        oldStatus,
      );

      leftSlotId = slotId;
    });

    return {
      plate_number,
      slot_id: leftSlotId,
      status: VehicleStatus.LEFT,
    };
  }

  async searchCar(plateNumber: string): Promise<SearchCarResponseDto> {
    const vehicle = await this.vehicle.findOne({
      where: { plate_number: plateNumber },
    });

    if (!vehicle) {
      throw new BadRequestException('Vehicle not found');
    }

    if (vehicle.status !== VehicleStatus.PARKED.toString()) {
      throw new BadRequestException(
        'Vehicle is not currently in the parking lot',
      );
    }

    const slotInfo = await this.dataSource
      .createQueryBuilder()
      .from(ParkingSlotModel, 'slot')
      .innerJoin(ParkingZoneModel, 'zone', 'zone.zone_id = slot.zone_id')
      .where('slot.slot_id = :slot_id', { slot_id: vehicle.current_slot_id })
      .addSelect('slot.slot_number', 'slot_number')
      .addSelect('zone.zone_name', 'zone_name')
      .getRawOne<{ slot_number: string; zone_name: string }>();

    return {
      plate_number: vehicle.plate_number,
      zone_name: slotInfo.zone_name,
      slot_number: Number(slotInfo.slot_number),
    };
  }

  async getListByCarSize(
    field: ListByCarSizeType,
    carSize: string,
  ): Promise<ListByCarSizeResponseDto> {
    if (field === ListByCarSizeType.REGISTRATION_PLATE) {
      const vehicles = await this.vehicle.find({
        where: { car_size: carSize },
        order: { plate_number: 'ASC' },
      });

      return {
        field,
        car_size: carSize,
        registration_plates: vehicles.map((vehicle) => vehicle.plate_number),
      };
    }

    const rows = await this.dataSource
      .createQueryBuilder()
      .from(ParkingSlotModel, 'slot')
      .innerJoin(ParkingZoneModel, 'zone', 'zone.zone_id = slot.zone_id')
      .where('zone.car_size = :car_size', { car_size: carSize })
      .andWhere('zone.status = :zoneStatus', {
        zoneStatus: ActivationStatus.ACTIVE,
      })
      .select('zone.zone_name', 'zone_name')
      .addSelect('slot.slot_number', 'slot_number')
      .addSelect('slot.status', 'status')
      .orderBy('zone.zone_name', 'ASC')
      .addOrderBy('slot.slot_number', 'ASC')
      .getRawMany<{
        zone_name: string;
        slot_number: string | number;
        status: string;
      }>();

    return {
      field,
      car_size: carSize,
      parking_slots: rows.map((row) => ({
        zone_name: row.zone_name,
        slot_number: Number(row.slot_number),
        status: row.status,
      })),
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
    if (vehicle?.status === VehicleStatus.PARKED.toString()) {
      throw new BadRequestException('This vehicle is already parked.');
    }
  }

  private ensureVehicleIsParkedForLeaving(vehicle: VehicleModel): void {
    if (
      vehicle.status !== VehicleStatus.PARKED.toString() ||
      !vehicle.current_slot_id
    ) {
      throw new BadRequestException('This vehicle is not currently parked.');
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
      .where('slot.status = :slotStatus', {
        slotStatus: ActivationStatus.AVAILABLE,
      })
      .andWhere('zone.status = :zoneStatus', {
        zoneStatus: ActivationStatus.ACTIVE,
      })
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
      { slot_id: slotId, status: ActivationStatus.AVAILABLE },
      { status: ActivationStatus.OCCUPIED },
    );

    if (!updateSlotResult.affected) {
      throw new BadRequestException(
        'Selected parking slot is no longer available',
      );
    }
  }

  private async releaseOccupiedSlot(
    manager: EntityManager,
    slotId: string,
  ): Promise<void> {
    const updateSlotResult = await manager.update(
      ParkingSlotModel,
      { slot_id: slotId, status: ActivationStatus.OCCUPIED },
      { status: ActivationStatus.AVAILABLE },
    );

    if (!updateSlotResult.affected) {
      throw new BadRequestException(
        'Selected parking slot is no longer occupied',
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
      existingVehicle.status = VehicleStatus.PARKED;
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
      status: VehicleStatus.PARKED,
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
    await this.addVehicleLog(
      manager,
      vehicleId,
      slotId,
      VehicleLogEventType.PARKED,
      oldStatus,
      VehicleStatus.PARKED,
      'Vehicle parked',
    );
  }

  private async saveLeftLog(
    manager: EntityManager,
    vehicleId: string,
    slotId: string,
    oldStatus: string,
  ): Promise<void> {
    await this.addVehicleLog(
      manager,
      vehicleId,
      slotId,
      VehicleLogEventType.LEFT,
      oldStatus,
      VehicleStatus.LEFT,
      'Vehicle left',
    );
  }

  private async addVehicleLog(
    manager: EntityManager,
    vehicleId: string,
    slotId: string,
    eventType: VehicleLogEventType,
    oldStatus: string | null,
    newStatus: VehicleStatus,
    log_note: string,
  ): Promise<void> {
    const vehicleLog = {
      vehicle_log_id: uuidv4(),
      vehicle_id: vehicleId,
      slot_id: slotId,
      event_type: eventType,
      old_status: oldStatus,
      new_status: newStatus,
      note: log_note,
    };

    await manager.save(VehicleLogModel, vehicleLog);
  }
}
