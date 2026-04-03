IF DB_ID('$(APP_DB_NAME)') IS NULL
BEGIN
  EXEC('CREATE DATABASE [$(APP_DB_NAME)]');
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.sql_logins WHERE name = '$(APP_DB_USER)')
BEGIN
  EXEC('CREATE LOGIN [$(APP_DB_USER)] WITH PASSWORD = ''$(APP_DB_PASSWORD)'', CHECK_POLICY = OFF');
END;
GO

USE [$(APP_DB_NAME)];
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = '$(APP_DB_USER)')
BEGIN
  EXEC('CREATE USER [$(APP_DB_USER)] FOR LOGIN [$(APP_DB_USER)]');
  EXEC('ALTER ROLE db_owner ADD MEMBER [$(APP_DB_USER)]');
END;
GO

IF OBJECT_ID('dbo.parking_zones', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.parking_zones (
    id UNIQUEIDENTIFIER NOT NULL
      CONSTRAINT PK_parking_zones PRIMARY KEY
      DEFAULT NEWID(),
    zone_name NVARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL
      CONSTRAINT DF_parking_zones_status DEFAULT 'active',
    created_at DATETIME2(0) NOT NULL
      CONSTRAINT DF_parking_zones_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(0) NOT NULL
      CONSTRAINT DF_parking_zones_updated_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_parking_zones_zone_name UNIQUE (zone_name),
    CONSTRAINT CK_parking_zones_status CHECK (status IN ('active', 'inactive'))
  );
END;
GO

IF OBJECT_ID('dbo.parking_slots', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.parking_slots (
    id UNIQUEIDENTIFIER NOT NULL
      CONSTRAINT PK_parking_slots PRIMARY KEY
      DEFAULT NEWID(),
    slot_number INT NOT NULL,
    zone_id UNIQUEIDENTIFIER NOT NULL,
    status VARCHAR(20) NOT NULL
      CONSTRAINT DF_parking_slots_status DEFAULT 'available',
    created_at DATETIME2(0) NOT NULL
      CONSTRAINT DF_parking_slots_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(0) NOT NULL
      CONSTRAINT DF_parking_slots_updated_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_parking_slots_zone_slot UNIQUE (zone_id, slot_number),
    CONSTRAINT FK_parking_slots_zone_id FOREIGN KEY (zone_id)
      REFERENCES dbo.parking_zones (id),
    CONSTRAINT CK_parking_slots_status CHECK (
      status IN ('available', 'occupied', 'inactive')
    )
  );
END;
GO

IF OBJECT_ID('dbo.vehicles', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.vehicles (
    id UNIQUEIDENTIFIER NOT NULL
      CONSTRAINT PK_vehicles PRIMARY KEY
      DEFAULT NEWID(),
    plate_number VARCHAR(20) NOT NULL,
    car_size VARCHAR(10) NOT NULL,
    current_slot_id UNIQUEIDENTIFIER NULL,
    status VARCHAR(20) NOT NULL
      CONSTRAINT DF_vehicles_status DEFAULT 'left',
    created_at DATETIME2(0) NOT NULL
      CONSTRAINT DF_vehicles_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(0) NOT NULL
      CONSTRAINT DF_vehicles_updated_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_vehicles_plate_number UNIQUE (plate_number),
    CONSTRAINT FK_vehicles_current_slot_id FOREIGN KEY (current_slot_id)
      REFERENCES dbo.parking_slots (id),
    CONSTRAINT CK_vehicles_car_size CHECK (car_size IN ('small', 'medium', 'large')),
    CONSTRAINT CK_vehicles_status CHECK (status IN ('parked', 'inactive', 'left')),
    CONSTRAINT CK_vehicles_status_slot_consistency CHECK (
      (status = 'parked' AND current_slot_id IS NOT NULL)
      OR (status IN ('inactive', 'left') AND current_slot_id IS NULL)
    )
  );
END;
GO

IF OBJECT_ID('dbo.vehicle_logs', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.vehicle_logs (
    id UNIQUEIDENTIFIER NOT NULL
      CONSTRAINT PK_vehicle_logs PRIMARY KEY
      DEFAULT NEWID(),
    vehicle_id UNIQUEIDENTIFIER NOT NULL,
    slot_id UNIQUEIDENTIFIER NULL,
    event_type VARCHAR(20) NOT NULL,
    old_status VARCHAR(20) NULL,
    new_status VARCHAR(20) NULL,
    note NVARCHAR(255) NULL,
    logged_at DATETIME2(0) NOT NULL
      CONSTRAINT DF_vehicle_logs_logged_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_vehicle_logs_vehicle_id FOREIGN KEY (vehicle_id)
      REFERENCES dbo.vehicles (id),
    CONSTRAINT FK_vehicle_logs_slot_id FOREIGN KEY (slot_id)
      REFERENCES dbo.parking_slots (id),
    CONSTRAINT CK_vehicle_logs_event_type CHECK (
      event_type IN ('parked', 'left', 'moved', 'status_changed')
    ),
    CONSTRAINT CK_vehicle_logs_old_status CHECK (
      old_status IS NULL OR old_status IN ('parked', 'inactive', 'left')
    ),
    CONSTRAINT CK_vehicle_logs_new_status CHECK (
      new_status IS NULL OR new_status IN ('parked', 'inactive', 'left')
    )
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_vehicles_status' AND object_id = OBJECT_ID('dbo.vehicles'))
BEGIN
  CREATE INDEX IX_vehicles_status ON dbo.vehicles (status);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_vehicle_logs_vehicle_logged_at' AND object_id = OBJECT_ID('dbo.vehicle_logs'))
BEGIN
  CREATE INDEX IX_vehicle_logs_vehicle_logged_at ON dbo.vehicle_logs (vehicle_id, logged_at DESC);
END;
GO
