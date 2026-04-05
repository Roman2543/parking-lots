import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ParkingZoneModel } from '../common/models/parking-zone.model';
import { ParkingSlotModel } from '../common/models/parking-slot.model';
import { CreateParkingZoneDto } from './dtos/request-create-parking-zone.dto';
import { CreateParkingZoneResponseDto } from './dtos/response-create-parking-zone.dto';
import { ParkingZoneAvailableLotsResponseDto } from './dtos/response-parking-zone-available-lots.dto';
import { ParkingLotStatusResponseDto } from './dtos/response-parking-lot-status.dto';
import { UpdateParkingZoneStatusDto } from './dtos/request-update-parking-zone-status.dto';
import { UpdateParkingLotStatusDto } from './dtos/request-update-parking-lot-status.dto';
import { UpdateParkingZoneStatusResponseDto } from './dtos/response-update-parking-zone-status.dto';
import { UpdateParkingLotStatusResponseDto } from './dtos/response-update-parking-lot-status.dto';
import { ActivationStatus } from '../common/enums/activation-status.enum';
import { AddParkingLotsDto } from './dtos/request-add-parking-lots.dto';
import { AddParkingLotsResponseDto } from './dtos/response-add-parking-lots.dto';

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
        status: ActivationStatus.ACTIVE,
      });

      const savedZone = await manager.save(ParkingZoneModel, zone);

      const slots: ParkingSlotModel[] = Array.from(
        { length: parking_space },
        (_, idx) =>
          this.parkingSlot.create({
            slot_id: uuidv4(),
            zone_id: savedZone.zone_id,
            slot_number: idx + 1,
            status: ActivationStatus.AVAILABLE,
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

  async addParkingLots(
    dto: AddParkingLotsDto,
  ): Promise<AddParkingLotsResponseDto> {
    const { zone_name, adding_space } = dto;

    const zone = await this.parkingZone.findOne({
      where: { zone_name },
    });

    if (!zone) {
      throw new BadRequestException('Zone not found');
    }

    if (zone.status === ActivationStatus.INACTIVE.toString()) {
      throw new BadRequestException('Zone is inactive');
    }

    const existingSlots = await this.parkingSlot.find({
      where: { zone_id: zone.zone_id },
      select: ['slot_number'],
    });
    const maxSlotNumber = existingSlots.length
      ? Math.max(...existingSlots.map((slot) => slot.slot_number))
      : 0;

    const slots = Array.from({ length: adding_space }, (_, idx) =>
      this.parkingSlot.create({
        slot_id: uuidv4(),
        zone_id: zone.zone_id,
        slot_number: maxSlotNumber + idx + 1,
        status: ActivationStatus.AVAILABLE,
      }),
    );

    await this.parkingSlot.save(slots);

    const totalSlot = existingSlots.length + adding_space;

    return {
      zone_name,
      total_slot: totalSlot,
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
        { status: ActivationStatus.AVAILABLE },
      )
      .where(':car_size IS NULL OR zone.car_size = :car_size', {
        car_size: car_size ?? null,
      })
      .andWhere('zone.status = :zoneStatus', {
        zoneStatus: ActivationStatus.ACTIVE,
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

  async getParkingLotStatus(
    zoneName: string,
    parkingLot: number,
  ): Promise<ParkingLotStatusResponseDto> {
    const zone = await this.parkingZone.findOne({
      where: { zone_name: zoneName, status: ActivationStatus.ACTIVE },
    });

    if (!zone) {
      throw new BadRequestException('Zone not found');
    }

    const slot = await this.parkingSlot.findOne({
      where: {
        zone_id: zone.zone_id,
        slot_number: parkingLot,
      },
    });

    if (!slot) {
      throw new BadRequestException('Parking lot not found');
    }

    return {
      zone_name: zoneName,
      parking_lot: parkingLot,
      status: slot.status,
    };
  }

  async updateParkingZoneStatus(
    body: UpdateParkingZoneStatusDto,
  ): Promise<UpdateParkingZoneStatusResponseDto> {
    const { zone_name, status } = body;

    const zone = await this.parkingZone.findOne({
      where: { zone_name },
    });

    if (!zone) {
      throw new BadRequestException('Zone not found');
    }

    if (status === ActivationStatus.INACTIVE) {
      await this.ensureNoOccupiedSlot(zone.zone_id, {
        message: 'Cannot set zone inactive while slots are occupied',
      });
      await this.parkingSlot.update(
        { zone_id: zone.zone_id },
        { status: ActivationStatus.INACTIVE },
      );
    }

    if (status === ActivationStatus.ACTIVE) {
      await this.parkingSlot.update(
        { zone_id: zone.zone_id, status: ActivationStatus.INACTIVE },
        { status: ActivationStatus.AVAILABLE },
      );
    }

    zone.status = status;
    await this.parkingZone.save(zone);

    return {
      zone_name,
      status,
    };
  }

  async updateParkingLotStatus(
    body: UpdateParkingLotStatusDto,
  ): Promise<UpdateParkingLotStatusResponseDto> {
    const { zone_name, parking_lot, status } = body;

    const zone = await this.parkingZone.findOne({
      where: { zone_name },
    });

    if (!zone) {
      throw new BadRequestException('Zone not found');
    }

    const slot = await this.parkingSlot.findOne({
      where: {
        zone_id: zone.zone_id,
        slot_number: parking_lot,
      },
    });

    if (!slot) {
      throw new BadRequestException('Parking lot not found');
    }

    if (status === ActivationStatus.INACTIVE) {
      await this.ensureNoOccupiedSlot(zone.zone_id, {
        parkingLot: parking_lot,
        message: 'Cannot set occupied slot to inactive',
      });
    }

    slot.status =
      status === ActivationStatus.ACTIVE
        ? ActivationStatus.AVAILABLE
        : ActivationStatus.INACTIVE;
    await this.parkingSlot.save(slot);

    return {
      zone_name,
      parking_lot,
      status,
    };
  }

  private async ensureNoOccupiedSlot(
    zoneId: string,
    options: { parkingLot?: number; message: string },
  ): Promise<void> {
    const whereCondition = options.parkingLot
      ? {
          zone_id: zoneId,
          slot_number: options.parkingLot,
          status: ActivationStatus.OCCUPIED,
        }
      : { zone_id: zoneId, status: ActivationStatus.OCCUPIED };

    const occupiedCount = await this.parkingSlot.count({
      where: whereCondition,
    });

    if (occupiedCount > 0) {
      throw new BadRequestException(options.message);
    }
  }
}
