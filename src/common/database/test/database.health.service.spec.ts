import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DataSource } from 'typeorm';

import { DatabaseHealthService } from '../database.health.service';

import type { TestingModule } from '@nestjs/testing';

describe('DatabaseHealthService', () => {
  let service: DatabaseHealthService;
  const mockDataSource = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    mockDataSource.query.mockClear();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseHealthService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<DatabaseHealthService>(DatabaseHealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkConnection', () => {
    it('should return true when database connection is successful', async () => {
      mockDataSource.query.mockImplementation(() =>
        Promise.resolve([{ ok: 1 }]),
      );
      jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = await service.checkConnection();

      expect(result).toBe(true);
      expect(mockDataSource.query).toHaveBeenCalledTimes(1);
    });

    it('should return false when database connection fails', async () => {
      const error = new Error('Connection failed');
      mockDataSource.query.mockImplementation(() => Promise.reject(error));
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = await service.checkConnection();

      expect(result).toBe(false);
      expect(mockDataSource.query).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Database connection error:',
        error,
      );
      consoleErrorSpy.mockRestore();
    });
  });
});
