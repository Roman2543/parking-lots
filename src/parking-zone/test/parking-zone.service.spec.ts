import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ParkingZoneService } from '../parking-zone.service';
import { ParkingZoneModel } from '../../common/models/parking-zone.model';
import { ParkingSlotModel } from '../../common/models/parking-slot.model';
import { CreateParkingZoneDto } from '../dtos/request-create-parking-zone.dto';

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
  };

  /**
   * Mock repository for parking slot table operations.
   */
  const mockParkingSlotRepository = {
    create: jest.fn() as jest.Mock,
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
      .mockImplementationOnce(() => Promise.resolve({ zone_id: 'zone-uuid-1' }))
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
      status: 'active',
    });
    expect(mockManager.save).toHaveBeenCalledWith(ParkingSlotModel, [
      {
        slot_id: 'slot-uuid-1',
        zone_id: 'zone-uuid-1',
        slot_number: 1,
        status: 'available',
      },
      {
        slot_id: 'slot-uuid-2',
        zone_id: 'zone-uuid-1',
        slot_number: 2,
        status: 'available',
      },
    ]);
  });

  it('should throw when zone name already exists', async () => {
    // Arrange
    mockParkingZoneRepository.findOne.mockImplementation(() =>
      Promise.resolve({
        zone_id: 'existing-zone-id',
        zone_name: 'A',
        status: 'active',
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

  it('should return parking zones with available lots when car_size is not provided', async () => {
    // Arrange
    const mockRows = [
      { zone_name: 'A', available_lots: '3', car_size: 'small' },
      { zone_name: 'B', available_lots: '1', car_size: 'large' },
    ];

    const queryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockImplementation(() => Promise.resolve(mockRows)),
    };

    mockParkingZoneRepository.createQueryBuilder.mockReturnValue(queryBuilder);

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
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockImplementation(() => Promise.resolve(mockRows)),
    };

    mockParkingZoneRepository.createQueryBuilder.mockReturnValue(queryBuilder);

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
    expect(queryBuilder.getRawMany).toHaveBeenCalledTimes(1);
  });
});
