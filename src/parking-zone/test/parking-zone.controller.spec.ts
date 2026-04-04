import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ParkingZoneController } from '../parking-zone.controller';
import { CreateParkingZoneDto } from '../dtos/request-create-parking-zone.dto';
import { GetParkingZonesDto } from '../dtos/request-get-parking-zones.dto';
import { BadRequestException } from '@nestjs/common';
import { GetParkingLotStatusDto } from '../dtos/request-get-parking-lot-status.dto';
import { UpdateParkingZoneStatusDto } from '../dtos/request-update-parking-zone-status.dto';
import { UpdateParkingLotStatusDto } from '../dtos/request-update-parking-lot-status.dto';
import { ActivationStatus } from '../../common/enums/activation-status.enum';

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

describe('ParkingZoneController', () => {
  let controller: ParkingZoneController;

  const mockParkingZoneService = {
    createZoneWithSlots: jest.fn() as jest.Mock,
    getParkingZonesAvailableLots: jest.fn() as jest.Mock,
    getParkingLotStatus: jest.fn() as jest.Mock,
    updateParkingZoneStatus: jest.fn() as jest.Mock,
    updateParkingLotStatus: jest.fn() as jest.Mock,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ParkingZoneController(mockParkingZoneService as never);
  });

  describe('createParkingLot', () => {
    it('should create parking lot from dto', async () => {
      // Arrange
      const body: CreateParkingZoneDto = {
        zone_name: 'A',
        car_size: 'small',
        parking_space: 5,
      };

      const serviceResult = {
        zone_name: 'A',
        total_slots: 5,
        car_size: 'small',
      };

      mockParkingZoneService.createZoneWithSlots.mockImplementation(() =>
        Promise.resolve(serviceResult),
      );

      // Act
      const result = await controller.createParkingLot(body);

      // Assert
      expect(result).toEqual({
        zone_name: 'A',
        total_slots: 5,
        car_size: 'small',
      });
      expect(mockParkingZoneService.createZoneWithSlots).toHaveBeenCalledWith(
        body,
      );
    });
  });

  describe('getParkingZones', () => {
    it('should get available zones without optional car_size', async () => {
      // Arrange
      const query: GetParkingZonesDto = {};

      const serviceResult = [
        { zone_name: 'A', available_lots: 2, car_size: 'small' },
        { zone_name: 'B', available_lots: 1, car_size: 'large' },
      ];

      mockParkingZoneService.getParkingZonesAvailableLots.mockImplementation(
        () => Promise.resolve(serviceResult),
      );

      // Act
      const result = await controller.getParkingZones(query);

      // Assert
      expect(result).toEqual([
        { zone_name: 'A', available_lots: 2, car_size: 'small' },
        { zone_name: 'B', available_lots: 1, car_size: 'large' },
      ]);
      expect(
        mockParkingZoneService.getParkingZonesAvailableLots,
      ).toHaveBeenCalledWith(undefined);
    });

    it('should get available zones with optional car_size', async () => {
      // Arrange
      const query: GetParkingZonesDto = { car_size: 'small' };

      const serviceResult = [
        { zone_name: 'A', available_lots: 2, car_size: 'small' },
      ];

      mockParkingZoneService.getParkingZonesAvailableLots.mockImplementation(
        () => Promise.resolve(serviceResult),
      );

      // Act
      const result = await controller.getParkingZones(query);

      // Assert
      expect(result).toEqual([
        { zone_name: 'A', available_lots: 2, car_size: 'small' },
      ]);
      expect(
        mockParkingZoneService.getParkingZonesAvailableLots,
      ).toHaveBeenCalledWith('small');
    });
  });

  describe('getParkingLotStatus', () => {
    it('should return parking lot status by zone name and lot number', async () => {
      // Arrange
      const query: GetParkingLotStatusDto = { zone_name: 'A', parking_lot: 3 };
      const serviceResult = {
        zone_name: 'A',
        parking_lot: 3,
        status: ActivationStatus.OCCUPIED,
      };

      mockParkingZoneService.getParkingLotStatus.mockImplementation(() =>
        Promise.resolve(serviceResult),
      );

      // Act
      const result = await controller.getParkingLotStatus(query);

      // Assert
      expect(result).toEqual(serviceResult);
      expect(mockParkingZoneService.getParkingLotStatus).toHaveBeenCalledWith(
        'A',
        3,
      );
    });

    it('should propagate error when parking lot status lookup fails', async () => {
      // Arrange
      const query: GetParkingLotStatusDto = { zone_name: 'Z', parking_lot: 1 };
      mockParkingZoneService.getParkingLotStatus.mockImplementation(() =>
        Promise.reject(new BadRequestException('Zone not found')),
      );

      // Act
      const action = controller.getParkingLotStatus(query);

      // Assert
      await expect(action).rejects.toThrow('Zone not found');
    });
  });

  describe('updateParkingZoneStatus', () => {
    it('should update parking zone status', async () => {
      // Arrange
      const body: UpdateParkingZoneStatusDto = {
        zone_name: 'A',
        status: ActivationStatus.INACTIVE,
      };
      const serviceResult = {
        zone_name: 'A',
        status: ActivationStatus.INACTIVE,
      };

      mockParkingZoneService.updateParkingZoneStatus.mockImplementation(() =>
        Promise.resolve(serviceResult),
      );

      // Act
      const result = await controller.updateParkingZoneStatus(body);

      // Assert
      expect(result).toEqual(serviceResult);
      expect(
        mockParkingZoneService.updateParkingZoneStatus,
      ).toHaveBeenCalledWith(body);
    });
  });

  describe('updateParkingLotStatus', () => {
    it('should update parking slot status', async () => {
      // Arrange
      const body: UpdateParkingLotStatusDto = {
        zone_name: 'A',
        parking_lot: 1,
        status: ActivationStatus.ACTIVE,
      };
      const serviceResult = {
        zone_name: 'A',
        parking_lot: 1,
        status: ActivationStatus.ACTIVE,
      };

      mockParkingZoneService.updateParkingLotStatus.mockImplementation(() =>
        Promise.resolve(serviceResult),
      );

      // Act
      const result = await controller.updateParkingLotStatus(body);

      // Assert
      expect(result).toEqual(serviceResult);
      expect(
        mockParkingZoneService.updateParkingLotStatus,
      ).toHaveBeenCalledWith(body);
    });
  });
});
