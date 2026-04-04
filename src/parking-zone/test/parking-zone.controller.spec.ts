import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ParkingZoneController } from '../parking-zone.controller';
import { CreateParkingZoneDto } from '../dtos/request-create-parking-zone.dto';
import { GetParkingZonesDto } from '../dtos/request-get-parking-zones.dto';

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

describe('ParkingZoneController', () => {
  let controller: ParkingZoneController;

  const mockParkingZoneService = {
    createZoneWithSlots: jest.fn() as jest.Mock,
    getParkingZonesAvailableLots: jest.fn() as jest.Mock,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ParkingZoneController(mockParkingZoneService as never);
  });

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

  it('should get available zones without optional car_size', async () => {
    // Arrange
    const query: GetParkingZonesDto = {};

    const serviceResult = [
      { zone_name: 'A', available_lots: 2, car_size: 'small' },
      { zone_name: 'B', available_lots: 1, car_size: 'large' },
    ];

    mockParkingZoneService.getParkingZonesAvailableLots.mockImplementation(() =>
      Promise.resolve(serviceResult),
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

    mockParkingZoneService.getParkingZonesAvailableLots.mockImplementation(() =>
      Promise.resolve(serviceResult),
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
