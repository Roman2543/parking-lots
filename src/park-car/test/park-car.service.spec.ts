import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { ParkCarService } from '../park-car.service';
import { VehicleModel } from '../../common/models/vehicle.model';
import { VehicleLogModel } from '../../common/models/vehicle-log.model';
import { ParkingSlotModel } from '../../common/models/parking-slot.model';
import { ParkCarDto } from '../dtos/request-park-car.dto';
import { LeaveCarDto } from '../dtos/request-leave-car.dto';

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

import { v4 as uuidv4 } from 'uuid';

describe('ParkCarService', () => {
  let service: ParkCarService;

  const queryBuilder = {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getRawOne: jest.fn() as jest.Mock,
  };

  const mockVehicleRepository = {
    create: jest.fn((value) => value) as jest.Mock,
  };

  const mockManager = {
    findOne: jest.fn() as jest.Mock,
    createQueryBuilder: jest.fn(() => queryBuilder) as jest.Mock,
    update: jest.fn() as jest.Mock,
    save: jest.fn() as jest.Mock,
  };

  const mockDataSource = {
    transaction: jest.fn() as jest.Mock,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new ParkCarService(
      mockDataSource as never,
      mockVehicleRepository as never,
    );
  });

  describe('parkCar', () => {
    it('should park a new vehicle to available slot', async () => {
      // Arrange
      const dto: ParkCarDto = {
        plate_number: 'AA-1234',
        car_size: 'small',
      };

      queryBuilder.getRawOne.mockImplementation(() =>
        Promise.resolve({
          slot_id: 'slot-1',
          slot_number: 3,
          zone_name: 'A',
        }),
      );

      mockManager.findOne.mockImplementation(() => Promise.resolve(null));
      mockManager.update.mockImplementation(() =>
        Promise.resolve({ affected: 1 }),
      );
      mockManager.save.mockImplementation(() => Promise.resolve(undefined));

      (uuidv4 as jest.Mock)
        .mockReturnValueOnce('vehicle-uuid-1')
        .mockReturnValueOnce('vehicle-log-uuid-1');

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
      const result = await service.parkCar(dto);

      // Assert
      expect(result).toEqual({
        plate_number: 'AA-1234',
        car_size: 'small',
        slot_id: 'slot-1',
        zone_name: 'A',
        slot_number: 3,
        status: 'parked',
      });
      expect(mockManager.update).toHaveBeenCalledWith(
        ParkingSlotModel,
        { slot_id: 'slot-1', status: 'available' },
        { status: 'occupied' },
      );
      expect(mockManager.save).toHaveBeenCalledWith(VehicleModel, {
        vehicle_id: 'vehicle-uuid-1',
        plate_number: 'AA-1234',
        car_size: 'small',
        current_slot_id: 'slot-1',
        status: 'parked',
      });
      expect(mockManager.save).toHaveBeenCalledWith(VehicleLogModel, {
        vehicle_log_id: 'vehicle-log-uuid-1',
        vehicle_id: 'vehicle-uuid-1',
        slot_id: 'slot-1',
        event_type: 'parked',
        old_status: null,
        new_status: 'parked',
        note: 'Vehicle parked',
      });
    });

    it('should park existing inactive vehicle and write parking log', async () => {
      // Arrange
      const dto: ParkCarDto = {
        plate_number: 'AA-7777',
        car_size: 'medium',
      };

      queryBuilder.getRawOne.mockImplementation(() =>
        Promise.resolve({ slot_id: 'slot-9', slot_number: 4, zone_name: 'B' }),
      );

      const existingVehicle = {
        vehicle_id: 'vehicle-existing-1',
        plate_number: 'AA-7777',
        car_size: 'small',
        current_slot_id: null,
        status: 'inactive',
      };

      mockManager.findOne.mockImplementation(() =>
        Promise.resolve(existingVehicle),
      );
      mockManager.update.mockImplementation(() =>
        Promise.resolve({ affected: 1 }),
      );
      mockManager.save.mockImplementation(() => Promise.resolve(undefined));

      (uuidv4 as jest.Mock).mockReturnValueOnce('vehicle-log-uuid-9');

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
      const result = await service.parkCar(dto);

      // Assert
      expect(result).toEqual({
        plate_number: 'AA-7777',
        car_size: 'medium',
        slot_id: 'slot-9',
        zone_name: 'B',
        slot_number: 4,
        status: 'parked',
      });
      expect(mockManager.save).toHaveBeenCalledWith(VehicleModel, {
        vehicle_id: 'vehicle-existing-1',
        plate_number: 'AA-7777',
        car_size: 'medium',
        current_slot_id: 'slot-9',
        status: 'parked',
      });
      expect(mockManager.save).toHaveBeenCalledWith(VehicleLogModel, {
        vehicle_log_id: 'vehicle-log-uuid-9',
        vehicle_id: 'vehicle-existing-1',
        slot_id: 'slot-9',
        event_type: 'parked',
        old_status: 'inactive',
        new_status: 'parked',
        note: 'Vehicle parked',
      });
    });

    it('should throw when no available slot for requested car size', async () => {
      // Arrange
      const dto: ParkCarDto = {
        plate_number: 'AA-9999',
        car_size: 'large',
      };
      queryBuilder.getRawOne.mockImplementation(() => Promise.resolve(null));

      mockManager.findOne.mockImplementation(() => Promise.resolve(null));
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
      const action = service.parkCar(dto);

      // Assert
      await expect(action).rejects.toThrow(BadRequestException);
      expect(mockManager.update).not.toHaveBeenCalled();
    });

    it('should throw when vehicle is already parked', async () => {
      // Arrange
      const dto: ParkCarDto = {
        plate_number: 'AA-1234',
        car_size: 'small',
      };

      queryBuilder.getRawOne.mockImplementation(() =>
        Promise.resolve({ slot_id: 'slot-1', slot_number: 1, zone_name: 'A' }),
      );

      mockManager.findOne.mockImplementation(() =>
        Promise.resolve({
          vehicle_id: 'vehicle-1',
          plate_number: 'AA-1234',
          car_size: 'small',
          current_slot_id: 'slot-x',
          status: 'parked',
        }),
      );

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
      const action = service.parkCar(dto);

      // Assert
      await expect(action).rejects.toThrow('This vehicle is already parked.');
      expect(mockManager.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should throw when reserved slot is no longer available during park', async () => {
      // Arrange
      const dto: ParkCarDto = {
        plate_number: 'AA-1234',
        car_size: 'small',
      };

      queryBuilder.getRawOne.mockImplementation(() =>
        Promise.resolve({ slot_id: 'slot-1', slot_number: 1, zone_name: 'A' }),
      );
      mockManager.findOne.mockImplementation(() => Promise.resolve(null));
      mockManager.update.mockImplementation(() =>
        Promise.resolve({ affected: 0 }),
      );

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
      const action = service.parkCar(dto);

      // Assert
      await expect(action).rejects.toThrow(
        'Selected parking slot is no longer available',
      );
      expect(mockManager.save).not.toHaveBeenCalled();
    });
  });

  describe('leaveCar', () => {
    it('should leave parked vehicle, release slot and write left log', async () => {
      // Arrange
      const dto: LeaveCarDto = {
        plate_number: 'AA-1234',
      };

      const parkedVehicle = {
        vehicle_id: 'vehicle-1',
        plate_number: 'AA-1234',
        car_size: 'small',
        current_slot_id: 'slot-1',
        status: 'parked',
      };

      mockManager.findOne.mockImplementation(() =>
        Promise.resolve(parkedVehicle),
      );
      mockManager.update.mockImplementation(() =>
        Promise.resolve({ affected: 1 }),
      );
      mockManager.save.mockImplementation(() => Promise.resolve(undefined));
      (uuidv4 as jest.Mock).mockReturnValueOnce('vehicle-log-left-uuid-1');

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
      const result = await service.leaveCar(dto);

      // Assert
      expect(result).toEqual({
        plate_number: 'AA-1234',
        slot_id: 'slot-1',
        status: 'left',
      });
      expect(mockManager.update).toHaveBeenCalledWith(
        ParkingSlotModel,
        { slot_id: 'slot-1', status: 'occupied' },
        { status: 'available' },
      );
      expect(mockManager.save).toHaveBeenCalledWith(VehicleModel, {
        vehicle_id: 'vehicle-1',
        plate_number: 'AA-1234',
        car_size: 'small',
        current_slot_id: null,
        status: 'left',
      });
      expect(mockManager.save).toHaveBeenCalledWith(VehicleLogModel, {
        vehicle_log_id: 'vehicle-log-left-uuid-1',
        vehicle_id: 'vehicle-1',
        slot_id: 'slot-1',
        event_type: 'left',
        old_status: 'parked',
        new_status: 'left',
        note: 'Vehicle left',
      });
    });

    it('should throw when leaving vehicle is not found', async () => {
      // Arrange
      const dto: LeaveCarDto = {
        plate_number: 'AA-0000',
      };

      mockManager.findOne.mockImplementation(() => Promise.resolve(null));
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
      const action = service.leaveCar(dto);

      // Assert
      await expect(action).rejects.toThrow('Vehicle not found');
      expect(mockManager.update).not.toHaveBeenCalled();
    });

    it('should throw when leaving vehicle is not currently parked', async () => {
      // Arrange
      const dto: LeaveCarDto = {
        plate_number: 'AA-7777',
      };

      mockManager.findOne.mockImplementation(() =>
        Promise.resolve({
          vehicle_id: 'vehicle-7',
          plate_number: 'AA-7777',
          car_size: 'medium',
          current_slot_id: null,
          status: 'left',
        }),
      );

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
      const action = service.leaveCar(dto);

      // Assert
      await expect(action).rejects.toThrow(
        'This vehicle is not currently parked.',
      );
      expect(mockManager.update).not.toHaveBeenCalled();
    });

    it('should throw when occupied slot is no longer occupied during leave', async () => {
      // Arrange
      const dto: LeaveCarDto = {
        plate_number: 'AA-1234',
      };

      mockManager.findOne.mockImplementation(() =>
        Promise.resolve({
          vehicle_id: 'vehicle-1',
          plate_number: 'AA-1234',
          car_size: 'small',
          current_slot_id: 'slot-1',
          status: 'parked',
        }),
      );
      mockManager.update.mockImplementation(() =>
        Promise.resolve({ affected: 0 }),
      );

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
      const action = service.leaveCar(dto);

      // Assert
      await expect(action).rejects.toThrow(
        'Selected parking slot is no longer occupied',
      );
      expect(mockManager.save).not.toHaveBeenCalled();
    });
  });
});
