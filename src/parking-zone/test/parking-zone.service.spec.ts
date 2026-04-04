import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ParkingZoneService } from '../parking-zone.service';
import { ParkingZoneModel } from '../models/parking-zone.model';
import { ParkingSlotModel } from '../models/parking-slot.model';

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
    const zoneName = 'A';
    const parkingSpace = 2;
    const carSize = 'small';

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
    const result = await service.createZoneWithSlots(
      zoneName,
      parkingSpace,
      carSize,
    );

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
    const action = service.createZoneWithSlots('A', 1, 'small');

    // Assert
    await expect(action).rejects.toThrow('Zone name already exists');
    expect(mockDataSource.transaction).not.toHaveBeenCalled();
  });
});
