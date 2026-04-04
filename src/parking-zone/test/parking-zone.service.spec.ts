import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ParkingZoneService } from '../parking-zone.service';
import { ParkingZoneModel } from '../../common/models/parking-zone.model';
import { ParkingSlotModel } from '../../common/models/parking-slot.model';
import { CreateParkingZoneDto } from '../dtos/request-create-parking-zone.dto';
import { ActivationStatus } from '../../common/enums/activation-status.enum';

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

import { v4 as uuidv4 } from 'uuid';

describe('ParkingZoneService', () => {
  let service: ParkingZoneService;

  /**
   * Mock repository for parking zone table operations.
   */
  const mockParkingZoneRepository = {
    findOne: jest.fn() as jest.Mock,
    create: jest.fn() as jest.Mock,
    createQueryBuilder: jest.fn() as jest.Mock,
    save: jest.fn() as jest.Mock,
  };

  /**
   * Mock repository for parking slot table operations.
   */
  const mockParkingSlotRepository = {
    create: jest.fn() as jest.Mock,
    findOne: jest.fn() as jest.Mock,
    count: jest.fn() as jest.Mock,
    update: jest.fn() as jest.Mock,
    save: jest.fn() as jest.Mock,
  };

  /**
   * Transaction manager mock used inside DataSource.transaction callback.
   */
  const mockManager = {
    save: jest.fn() as jest.Mock,
  };

  /**
   * DataSource mock to avoid calling a real database in unit tests.
   */
  const mockDataSource = {
    transaction: jest.fn() as jest.Mock,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new ParkingZoneService(
      mockDataSource as never,
      mockParkingZoneRepository as never,
      mockParkingSlotRepository as never,
    );
  });

  describe('createZoneWithSlots', () => {
    it('should create parking zone and slots with AAA pattern', async () => {
      // Arrange
      const dto: CreateParkingZoneDto = {
        zone_name: 'A',
        parking_space: 2,
        car_size: 'small',
      };

      mockParkingZoneRepository.findOne.mockImplementation(() =>
        Promise.resolve(null),
      );
      mockParkingZoneRepository.create.mockImplementation((value) => value);
      mockParkingSlotRepository.create.mockImplementation((value) => value);

      mockManager.save
        .mockImplementationOnce(() =>
          Promise.resolve({ zone_id: 'zone-uuid-1' }),
        )
        .mockImplementationOnce(() => Promise.resolve(undefined));

      // Fixed UUID sequence makes assertions deterministic.
      (uuidv4 as jest.Mock)
        .mockReturnValueOnce('zone-uuid-1')
        .mockReturnValueOnce('slot-uuid-1')
        .mockReturnValueOnce('slot-uuid-2');

      // Execute transaction callback immediately with a mocked manager.
      mockDataSource.transaction.mockImplementation((callback: unknown) => {
        if (typeof callback !== 'function') {
          return Promise.resolve(undefined);
        }

        const runInTransaction = callback as (
          manager: typeof mockManager,
        ) => unknown;
        return Promise.resolve(runInTransaction(mockManager));
      });

      // Act
      const result = await service.createZoneWithSlots(dto);

      // Assert
      expect(result.zone_name).toEqual('A');
      expect(result.total_slots).toEqual(2);
      expect(result.car_size).toEqual('small');
      expect(mockParkingZoneRepository.findOne).toHaveBeenCalledWith({
        where: { zone_name: 'A' },
      });
      expect(mockManager.save).toHaveBeenCalledWith(ParkingZoneModel, {
        zone_id: 'zone-uuid-1',
        zone_name: 'A',
        car_size: 'small',
        status: ActivationStatus.ACTIVE,
      });
      expect(mockManager.save).toHaveBeenCalledWith(ParkingSlotModel, [
        {
          slot_id: 'slot-uuid-1',
          zone_id: 'zone-uuid-1',
          slot_number: 1,
          status: ActivationStatus.AVAILABLE,
        },
        {
          slot_id: 'slot-uuid-2',
          zone_id: 'zone-uuid-1',
          slot_number: 2,
          status: ActivationStatus.AVAILABLE,
        },
      ]);
    });

    it('should throw when zone name already exists', async () => {
      // Arrange
      mockParkingZoneRepository.findOne.mockImplementation(() =>
        Promise.resolve({
          zone_id: 'existing-zone-id',
          zone_name: 'A',
          status: ActivationStatus.ACTIVE,
        }),
      );

      // Act
      const action = service.createZoneWithSlots({
        zone_name: 'A',
        parking_space: 1,
        car_size: 'small',
      });

      // Assert
      await expect(action).rejects.toThrow('Zone name already exists');
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('getParkingZonesAvailableLots', () => {
    it('should return parking zones with available lots when car_size is not provided', async () => {
      // Arrange
      const mockRows = [
        { zone_name: 'A', available_lots: '3', car_size: 'small' },
        { zone_name: 'B', available_lots: '1', car_size: 'large' },
      ];

      const queryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockImplementation(() => Promise.resolve(mockRows)),
      };

      mockParkingZoneRepository.createQueryBuilder.mockReturnValue(
        queryBuilder,
      );

      // Act
      const result = await service.getParkingZonesAvailableLots();

      // Assert
      expect(result).toEqual([
        { zone_name: 'A', available_lots: 3, car_size: 'small' },
        { zone_name: 'B', available_lots: 1, car_size: 'large' },
      ]);
      expect(mockParkingZoneRepository.createQueryBuilder).toHaveBeenCalledWith(
        'zone',
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(
        ':car_size IS NULL OR zone.car_size = :car_size',
        { car_size: null },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'zone.status = :zoneStatus',
        { zoneStatus: ActivationStatus.ACTIVE },
      );
      expect(queryBuilder.getRawMany).toHaveBeenCalledTimes(1);
    });

    it('should return filtered parking zones when optional car_size is provided', async () => {
      // Arrange
      const mockRows = [
        { zone_name: 'A', available_lots: '2', car_size: 'small' },
      ];

      const queryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockImplementation(() => Promise.resolve(mockRows)),
      };

      mockParkingZoneRepository.createQueryBuilder.mockReturnValue(
        queryBuilder,
      );

      // Act
      const result = await service.getParkingZonesAvailableLots('small');

      // Assert
      expect(result).toEqual([
        { zone_name: 'A', available_lots: 2, car_size: 'small' },
      ]);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        ':car_size IS NULL OR zone.car_size = :car_size',
        { car_size: 'small' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'zone.status = :zoneStatus',
        { zoneStatus: ActivationStatus.ACTIVE },
      );
      expect(queryBuilder.getRawMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('getParkingLotStatus', () => {
    it('should return parking lot status when zone and lot exist', async () => {
      // Arrange
      mockParkingZoneRepository.findOne.mockImplementation(() =>
        Promise.resolve({
          zone_id: 'zone-1',
          zone_name: 'A',
          status: ActivationStatus.ACTIVE,
        }),
      );
      mockParkingSlotRepository.findOne.mockImplementation(() =>
        Promise.resolve({
          slot_id: 'slot-3',
          zone_id: 'zone-1',
          slot_number: 3,
          status: ActivationStatus.OCCUPIED,
        }),
      );

      // Act
      const result = await service.getParkingLotStatus('A', 3);

      // Assert
      expect(result).toEqual({
        zone_name: 'A',
        parking_lot: 3,
        status: ActivationStatus.OCCUPIED,
      });
      expect(mockParkingZoneRepository.findOne).toHaveBeenCalledWith({
        where: { zone_name: 'A', status: ActivationStatus.ACTIVE },
      });
      expect(mockParkingSlotRepository.findOne).toHaveBeenCalledWith({
        where: { zone_id: 'zone-1', slot_number: 3 },
      });
    });

    it('should throw when zone is not found', async () => {
      // Arrange
      mockParkingZoneRepository.findOne.mockImplementation(() =>
        Promise.resolve(null),
      );

      // Act
      const action = service.getParkingLotStatus('Z', 1);

      // Assert
      await expect(action).rejects.toThrow('Zone not found');
      expect(mockParkingSlotRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw when parking lot is not found in the zone', async () => {
      // Arrange
      mockParkingZoneRepository.findOne.mockImplementation(() =>
        Promise.resolve({
          zone_id: 'zone-1',
          zone_name: 'A',
          status: ActivationStatus.ACTIVE,
        }),
      );
      mockParkingSlotRepository.findOne.mockImplementation(() =>
        Promise.resolve(null),
      );

      // Act
      const action = service.getParkingLotStatus('A', 99);

      // Assert
      await expect(action).rejects.toThrow('Parking lot not found');
    });
  });

  describe('updateParkingZoneStatus', () => {
    it('should throw when zone is not found', async () => {
      // Arrange
      mockParkingZoneRepository.findOne.mockImplementation(() =>
        Promise.resolve(null),
      );

      // Act & Assert
      await expect(
        service.updateParkingZoneStatus({
          zone_name: 'X',
          status: ActivationStatus.INACTIVE,
        }),
      ).rejects.toThrow('Zone not found');
    });

    it('should update parking zone to active and restore inactive slots to available', async () => {
      // Arrange
      mockParkingZoneRepository.findOne.mockImplementation(() =>
        Promise.resolve({
          zone_id: 'zone-1',
          zone_name: 'A',
          status: ActivationStatus.INACTIVE,
        }),
      );
      mockParkingSlotRepository.update.mockImplementation(() =>
        Promise.resolve(undefined),
      );
      mockParkingZoneRepository.save.mockImplementation((value) =>
        Promise.resolve(value),
      );

      // Act
      const result = await service.updateParkingZoneStatus({
        zone_name: 'A',
        status: ActivationStatus.ACTIVE,
      });

      // Assert
      expect(result).toEqual({
        zone_name: 'A',
        status: ActivationStatus.ACTIVE,
      });
      expect(mockParkingSlotRepository.update).toHaveBeenCalledWith(
        { zone_id: 'zone-1', status: ActivationStatus.INACTIVE },
        { status: ActivationStatus.AVAILABLE },
      );
    });

    it('should update parking zone to inactive and mark all slots inactive', async () => {
      // Arrange
      mockParkingZoneRepository.findOne.mockImplementation(() =>
        Promise.resolve({
          zone_id: 'zone-1',
          zone_name: 'A',
          status: ActivationStatus.ACTIVE,
        }),
      );
      mockParkingSlotRepository.count.mockImplementation(() =>
        Promise.resolve(0),
      );
      mockParkingSlotRepository.update.mockImplementation(() =>
        Promise.resolve(undefined),
      );
      mockParkingZoneRepository.save.mockImplementation((value) =>
        Promise.resolve(value),
      );

      // Act
      const result = await service.updateParkingZoneStatus({
        zone_name: 'A',
        status: ActivationStatus.INACTIVE,
      });

      // Assert
      expect(result).toEqual({
        zone_name: 'A',
        status: ActivationStatus.INACTIVE,
      });
      expect(mockParkingSlotRepository.count).toHaveBeenCalledWith({
        where: { zone_id: 'zone-1', status: ActivationStatus.OCCUPIED },
      });
      expect(mockParkingSlotRepository.update).toHaveBeenCalledWith(
        { zone_id: 'zone-1' },
        { status: ActivationStatus.INACTIVE },
      );
    });

    it('should throw when setting zone inactive while some slot is occupied', async () => {
      // Arrange
      mockParkingZoneRepository.findOne.mockImplementation(() =>
        Promise.resolve({
          zone_id: 'zone-1',
          zone_name: 'A',
          status: ActivationStatus.ACTIVE,
        }),
      );
      mockParkingSlotRepository.count.mockImplementation(() =>
        Promise.resolve(1),
      );

      // Act
      const action = service.updateParkingZoneStatus({
        zone_name: 'A',
        status: ActivationStatus.INACTIVE,
      });

      // Assert
      await expect(action).rejects.toThrow(
        'Cannot set zone inactive while slots are occupied',
      );
    });
  });

  describe('updateParkingLotStatus', () => {
    it('should throw when zone is not found', async () => {
      // Arrange
      mockParkingZoneRepository.findOne.mockImplementation(() =>
        Promise.resolve(null),
      );

      // Act & Assert
      await expect(
        service.updateParkingLotStatus({
          zone_name: 'X',
          parking_lot: 1,
          status: ActivationStatus.INACTIVE,
        }),
      ).rejects.toThrow('Zone not found');
    });

    it('should throw when parking lot is not found', async () => {
      // Arrange
      mockParkingZoneRepository.findOne.mockImplementation(() =>
        Promise.resolve({
          zone_id: 'zone-1',
          zone_name: 'A',
          status: ActivationStatus.ACTIVE,
        }),
      );
      mockParkingSlotRepository.findOne.mockImplementation(() =>
        Promise.resolve(null),
      );

      // Act & Assert
      await expect(
        service.updateParkingLotStatus({
          zone_name: 'A',
          parking_lot: 99,
          status: ActivationStatus.INACTIVE,
        }),
      ).rejects.toThrow('Parking lot not found');
    });

    it('should update parking slot status to available when setting active', async () => {
      // Arrange
      mockParkingZoneRepository.findOne.mockImplementation(() =>
        Promise.resolve({
          zone_id: 'zone-1',
          zone_name: 'A',
          status: ActivationStatus.ACTIVE,
        }),
      );
      mockParkingSlotRepository.findOne.mockImplementation(() =>
        Promise.resolve({
          slot_id: 'slot-1',
          zone_id: 'zone-1',
          slot_number: 1,
          status: ActivationStatus.INACTIVE,
        }),
      );
      mockParkingSlotRepository.save.mockImplementation((value) =>
        Promise.resolve(value),
      );

      // Act
      const result = await service.updateParkingLotStatus({
        zone_name: 'A',
        parking_lot: 1,
        status: ActivationStatus.ACTIVE,
      });

      // Assert
      expect(result).toEqual({
        zone_name: 'A',
        parking_lot: 1,
        status: ActivationStatus.ACTIVE,
      });
    });

    it('should throw when setting occupied slot to inactive', async () => {
      // Arrange
      mockParkingZoneRepository.findOne.mockImplementation(() =>
        Promise.resolve({
          zone_id: 'zone-1',
          zone_name: 'A',
          status: ActivationStatus.ACTIVE,
        }),
      );
      mockParkingSlotRepository.findOne.mockImplementation(() =>
        Promise.resolve({
          slot_id: 'slot-1',
          zone_id: 'zone-1',
          slot_number: 1,
          status: ActivationStatus.OCCUPIED,
        }),
      );
      mockParkingSlotRepository.count.mockImplementation(() =>
        Promise.resolve(1),
      );

      // Act
      const action = service.updateParkingLotStatus({
        zone_name: 'A',
        parking_lot: 1,
        status: ActivationStatus.INACTIVE,
      });

      // Assert
      await expect(action).rejects.toThrow(
        'Cannot set occupied slot to inactive',
      );
    });
  });
});
