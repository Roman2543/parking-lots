## Parking Lots API

Backend service สำหรับจัดการลานจอดรถ พัฒนาด้วย NestJS + TypeORM + MSSQL

## Tech Stack

- NestJS
- TypeORM
- Microsoft SQL Server
- Docker Compose

## Quick Start

### 1) ติดตั้ง dependencies

```bash
yarn install
```

### 2) รันฐานข้อมูลด้วย Docker

```bash
docker compose up -d
```

### 3) รัน API

```bash
yarn start:dev
```

ค่าเริ่มต้นของเซิร์ฟเวอร์:

- API Base URL: `http://localhost:3000`
- DB Host: `localhost`
- DB Port: `1433`
- DB Name: `parking_lots`
- DB User: `app_user`

## API Contract

ระบบใช้ global interceptor/filter เพื่อ normalize response

### Success Response

```json
{
  "code": "201",
  "message": "Parking lot created successfully",
  "data": {}
}
```

### Error Response

```json
{
  "code": "400",
  "message": "Validation error",
  "data": null,
  "error": {
    "validation": {}
  }
}
```

## API Routes

### 1) Create Parking Lot

- Method: `POST`
- Path: `/parking-lot/create`

Request Body:

```json
{
  "zone_name": "A",
  "car_size": "small",
  "parking_space": 5
}
```

เงื่อนไข:

- `zone_name`: required, string
- `car_size`: required, one of `small | medium | large`
- `parking_space`: required, integer

### cURL (success)

```bash
curl -X POST "http://localhost:3000/parking-lot/create" \
	-H "Content-Type: application/json" \
	-d '{
		"zone_name": "A",
		"car_size": "small",
		"parking_space": 5
	}'
```

ตัวอย่าง Success Response:

```json
{
  "code": "201",
  "message": "Parking lot created successfully",
  "data": {
    "zone_name": "A",
    "total_slots": 5,
    "car_size": "small"
  }
}
```

### cURL (zone ซ้ำ)

```bash
curl -X POST "http://localhost:3000/parking-lot/create" \
	-H "Content-Type: application/json" \
	-d '{
		"zone_name": "A",
		"car_size": "small",
		"parking_space": 5
	}'
```

ตัวอย่าง Error Response:

```json
{
  "code": "400",
  "message": "Zone name already exists",
  "data": null
}
```

### cURL (validation error)

```bash
curl -X POST "http://localhost:3000/parking-lot/create" \
	-H "Content-Type: application/json" \
	-d '{
		"zone_name": "B",
		"car_size": "xlarge",
		"parking_space": "abc"
	}'
```

ตัวอย่าง Error Response:

```json
{
  "code": "400",
  "message": "Validation error",
  "data": null,
  "error": {
    "validation": {
      "car_size": "car_size must be one of the following values: small, medium, large",
      "parking_space": "parking_space must be an integer number"
    }
  }
}
```

### 2) Get Available Parking Zones

- Method: `GET`
- Path: `/parking-lot/available-zones`
- Query (optional): `car_size=small|medium|large`

### cURL (ทั้งหมด)

```bash
curl -X GET "http://localhost:3000/parking-lot/available-zones"
```

ตัวอย่าง Success Response:

```json
{
  "code": "200",
  "message": "Parking zones fetched successfully",
  "data": [
    {
      "zone_name": "A",
      "available_lots": 3,
      "car_size": "small"
    },
    {
      "zone_name": "B",
      "available_lots": 1,
      "car_size": "large"
    }
  ]
}
```

### cURL (กรองด้วย optional car_size)

```bash
curl -X GET "http://localhost:3000/parking-lot/available-zones?car_size=small"
```

ตัวอย่าง Success Response:

```json
{
  "code": "200",
  "message": "Parking zones fetched successfully",
  "data": [
    {
      "zone_name": "A",
      "available_lots": 3,
      "car_size": "small"
    }
  ]
}
```

## Database Structure

สคริปต์เริ่มต้นอยู่ที่ `docker/mssql/init.sql`

### 1) parking_zones

- `zone_id` UNIQUEIDENTIFIER PK
- `zone_name` NVARCHAR(100) UNIQUE NOT NULL
- `car_size` VARCHAR(10) NOT NULL (`small | medium | large`)
- `status` VARCHAR(20) NOT NULL (`active | inactive`)
- `created_at` DATETIME2(0)
- `updated_at` DATETIME2(0)

### 2) parking_slots

- `slot_id` UNIQUEIDENTIFIER PK
- `slot_number` INT NOT NULL
- `zone_id` UNIQUEIDENTIFIER NOT NULL (FK -> `parking_zones.zone_id`)
- `status` VARCHAR(20) NOT NULL (`available | occupied | inactive`)
- `created_at` DATETIME2(0)
- `updated_at` DATETIME2(0)
- UNIQUE (`zone_id`, `slot_number`)

### 3) vehicles

- `vehicle_id` UNIQUEIDENTIFIER PK
- `plate_number` VARCHAR(20) UNIQUE NOT NULL
- `car_size` VARCHAR(10) NOT NULL (`small | medium | large`)
- `current_slot_id` UNIQUEIDENTIFIER NULL (FK -> `parking_slots.slot_id`)
- `status` VARCHAR(20) NOT NULL (`parked | inactive | left`)
- `created_at` DATETIME2(0)
- `updated_at` DATETIME2(0)

### 4) vehicle_logs

- `vehicle_log_id` UNIQUEIDENTIFIER PK
- `vehicle_id` UNIQUEIDENTIFIER NOT NULL (FK -> `vehicles.vehicle_id`)
- `slot_id` UNIQUEIDENTIFIER NULL (FK -> `parking_slots.slot_id`)
- `event_type` VARCHAR(20) NOT NULL (`parked | left | moved | status_changed`)
- `old_status` VARCHAR(20) NULL
- `new_status` VARCHAR(20) NULL
- `note` NVARCHAR(255) NULL
- `logged_at` DATETIME2(0)

### Indexes

- `IX_vehicles_status` on `vehicles(status)`
- `IX_vehicle_logs_vehicle_logged_at` on `vehicle_logs(vehicle_id, logged_at DESC)`

## Notes

- โปรเจกต์ตั้งค่า `synchronize: false` ดังนั้นโครงสร้างตารางใช้จาก SQL init script
- หากเปลี่ยน schema เพิ่มเติม ให้แก้ `docker/mssql/init.sql` และ re-init database

## Test

```bash
yarn test
```
