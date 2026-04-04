import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mssql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  username: process.env.DB_USER || 'app_user',
  password: process.env.DB_PASSWORD || 'AppUser!Passw0rd',
  database: process.env.DB_NAME || 'parking_lots',
  autoLoadEntities: true,
  synchronize: false,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};
