import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseHealthService {
  constructor(private readonly dataSource: DataSource) {}

  async checkConnection(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      console.log('Database is authenticated');
      return true;
    } catch (error) {
      console.error('Database connection error:', error);
      return false;
    }
  }
}
