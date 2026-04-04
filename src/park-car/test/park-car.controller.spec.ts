import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

import { ParkCarController } from '../park-car.controller';
import { ParkCarService } from '../park-car.service';
import { ParkCarDto } from '../dtos/request-park-car.dto';
import { LeaveCarDto } from '../dtos/request-leave-car.dto';
import { ParkCarResponseDto } from '../dtos/response-park-car.dto';
import { GetListByCarSizeDto } from '../dtos/request-get-list.dto';
import { SearchCarResponseDto } from '../dtos/response-search-car.dto';
import { ListByCarSizeType } from '../../common/enums/list-by-car-size-type.enum';
import { ActivationStatus } from '../../common/enums/activation-status.enum';

describe('ParkCarController', () => {
  let controller: ParkCarController;

  const mockParkCarService = {
    parkCar: jest.fn() as jest.Mock,
    leaveCar: jest.fn() as jest.Mock,
    searchCar: jest.fn() as jest.Mock,
    getListByCarSize: jest.fn() as jest.Mock,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ParkCarController(
      mockParkCarService as unknown as ParkCarService,
    );
  });

  describe('parkCar', () => {
    it('should return the result from service.parkCar', async () => {
      // Arrange
      const dto: ParkCarDto = { plate_number: 'AA-1234', car_size: 'small' };
      const expected: ParkCarResponseDto = {
        plate_number: 'AA-1234',
        car_size: 'small',
        slot_id: 'slot-1',
        zone_name: 'A',
        slot_number: 1,
        status: 'parked',
      };
      mockParkCarService.parkCar.mockImplementation(() =>
        Promise.resolve(expected),
      );

      // Act
      const result = await controller.parkCar(dto);

      // Assert
      expect(result).toEqual(expected);
      expect(mockParkCarService.parkCar).toHaveBeenCalledWith(dto);
    });

    it('should propagate BadRequestException from service.parkCar when no slot available', async () => {
      // Arrange
      const dto: ParkCarDto = { plate_number: 'AA-1234', car_size: 'large' };
      mockParkCarService.parkCar.mockImplementation(() =>
        Promise.reject(
          new BadRequestException(
            'No available parking slot for this car size',
          ),
        ),
      );

      // Act & Assert
      await expect(controller.parkCar(dto)).rejects.toThrow(
        'No available parking slot for this car size',
      );
    });

    it('should propagate BadRequestException from service.parkCar when vehicle already parked', async () => {
      // Arrange
      const dto: ParkCarDto = { plate_number: 'AA-1234', car_size: 'small' };
      mockParkCarService.parkCar.mockImplementation(() =>
        Promise.reject(
          new BadRequestException('This vehicle is already parked.'),
        ),
      );

      // Act & Assert
      await expect(controller.parkCar(dto)).rejects.toThrow(
        'This vehicle is already parked.',
      );
    });
  });

  describe('leaveCar', () => {
    it('should return the result from service.leaveCar', async () => {
      // Arrange
      const dto: LeaveCarDto = { plate_number: 'AA-1234' };
      const expected = {
        plate_number: 'AA-1234',
        slot_id: 'slot-1',
        status: 'left',
      };
      mockParkCarService.leaveCar.mockImplementation(() =>
        Promise.resolve(expected),
      );

      // Act
      const result = await controller.leaveCar(dto);

      // Assert
      expect(result).toEqual(expected);
      expect(mockParkCarService.leaveCar).toHaveBeenCalledWith(dto);
    });

    it('should propagate BadRequestException from service.leaveCar when vehicle not found', async () => {
      // Arrange
      const dto: LeaveCarDto = { plate_number: 'AA-0000' };
      mockParkCarService.leaveCar.mockImplementation(() =>
        Promise.reject(new BadRequestException('Vehicle not found')),
      );

      // Act & Assert
      await expect(controller.leaveCar(dto)).rejects.toThrow(
        'Vehicle not found',
      );
    });

    it('should propagate BadRequestException from service.leaveCar when vehicle not parked', async () => {
      // Arrange
      const dto: LeaveCarDto = { plate_number: 'AA-7777' };
      mockParkCarService.leaveCar.mockImplementation(() =>
        Promise.reject(
          new BadRequestException('This vehicle is not currently parked.'),
        ),
      );

      // Act & Assert
      await expect(controller.leaveCar(dto)).rejects.toThrow(
        'This vehicle is not currently parked.',
      );
    });
  });

  describe('getListByCarSize', () => {
    it('should return registration plate list when field is registration-plate', async () => {
      // Arrange
      const query: GetListByCarSizeDto = {
        field: ListByCarSizeType.REGISTRATION_PLATE,
        car_size: 'small',
      };
      const expected = {
        field: ListByCarSizeType.REGISTRATION_PLATE,
        car_size: 'small',
        registration_plates: ['1กข1234', 'AA-1234'],
      };
      mockParkCarService.getListByCarSize.mockImplementation(() =>
        Promise.resolve(expected),
      );

      // Act
      const result = await controller.getListByCarSize(query);

      // Assert
      expect(result).toEqual(expected);
      expect(mockParkCarService.getListByCarSize).toHaveBeenCalledWith(
        ListByCarSizeType.REGISTRATION_PLATE,
        'small',
      );
    });

    it('should return parking slot list when field is parking-slot', async () => {
      // Arrange
      const query: GetListByCarSizeDto = {
        field: ListByCarSizeType.PARKING_SLOT,
        car_size: 'small',
      };
      const expected = {
        field: ListByCarSizeType.PARKING_SLOT,
        car_size: 'small',
        parking_slots: [
          {
            zone_name: 'A',
            slot_number: 1,
            status: ActivationStatus.AVAILABLE,
          },
          {
            zone_name: 'A',
            slot_number: 2,
            status: ActivationStatus.OCCUPIED,
          },
        ],
      };
      mockParkCarService.getListByCarSize.mockImplementation(() =>
        Promise.resolve(expected),
      );

      // Act
      const result = await controller.getListByCarSize(query);

      // Assert
      expect(result).toEqual(expected);
      expect(mockParkCarService.getListByCarSize).toHaveBeenCalledWith(
        ListByCarSizeType.PARKING_SLOT,
        'small',
      );
    });
  });

  describe('searchCar', () => {
    it('should return plate, zone, slot_number when vehicle is parked', async () => {
      // Arrange
      const expected: SearchCarResponseDto = {
        plate_number: 'AA-1234',
        zone_name: 'A',
        slot_number: 1,
      };
      mockParkCarService.searchCar.mockImplementation(() =>
        Promise.resolve(expected),
      );

      // Act
      const result = await controller.searchCar('AA-1234');

      // Assert
      expect(result).toEqual(expected);
      expect(mockParkCarService.searchCar).toHaveBeenCalledWith('AA-1234');
    });

    it('should propagate BadRequestException when vehicle is not parked', async () => {
      // Arrange
      mockParkCarService.searchCar.mockImplementation(() =>
        Promise.reject(
          new BadRequestException(
            'Vehicle is not currently in the parking lot',
          ),
        ),
      );

      // Act & Assert
      await expect(controller.searchCar('AA-1234')).rejects.toThrow(
        'Vehicle is not currently in the parking lot',
      );
    });

    it('should propagate BadRequestException when vehicle not found', async () => {
      // Arrange
      mockParkCarService.searchCar.mockImplementation(() =>
        Promise.reject(new BadRequestException('Vehicle not found')),
      );

      // Act & Assert
      await expect(controller.searchCar('XX-9999')).rejects.toThrow(
        'Vehicle not found',
      );
    });
  });
});
