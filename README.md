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

### 3) รัน API แบบ local

```bash
yarn start:dev
```

### 4) รันทั้ง App + DB บน Docker

```bash
docker compose up -d --build
```

หมายเหตุ:

- API จะพร้อมใช้งานที่ `http://localhost:3000`
- Swagger Docs: `http://localhost:3000/docs`
- DB จะพร้อมใช้งานที่ `localhost:1433`
- หากต้องการหยุดทุก container ใช้ `docker compose down`

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

### 3) Park Vehicle

- Method: `POST`
- Path: `/parking-car/park`

Request Body:

```json
{
  "plate_number": "1กข1234",
  "car_size": "small"
}
```

### cURL (success)

```bash
curl -X POST "http://localhost:3000/parking-car/park" \
  -H "Content-Type: application/json" \
  -d '{
    "plate_number": "1กข1234",
    "car_size": "small"
  }'
```

ตัวอย่าง Success Response:

```json
{
  "code": "200",
  "message": "Car parked successfully",
  "data": {
    "plate_number": "1กข1234",
    "car_size": "small",
    "slot_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "zone_name": "A",
    "slot_number": 1,
    "status": "parked"
  }
}
```

ตัวอย่างกรณีรถคันเดิมยังจอดอยู่:

```json
{
  "code": "400",
  "message": "This vehicle is already parked.",
  "data": null
}
```

### 4) Leave Parking

- Method: `POST`
- Path: `/parking-car/leave`

Request Body:

```json
{
  "plate_number": "1กข1234"
}
```

### cURL (success)

```bash
curl -X POST "http://localhost:3000/parking-car/leave" \
  -H "Content-Type: application/json" \
  -d '{
    "plate_number": "1กข1234"
  }'
```

ตัวอย่าง Success Response:

```json
{
  "code": "200",
  "message": "Car left successfully",
  "data": {
    "plate_number": "1กข1234",
    "slot_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "status": "left"
  }
}
```

ตัวอย่าง Error Response:

```json
{
  "code": "400",
  "message": "This vehicle is not currently parked.",
  "data": null
}
```

### 5) Search Vehicle

- Method: `GET`
- Path: `/parking-car/search-vehicle`
- Query (required): `plate_number`

### cURL (success)

```bash
curl -X GET "http://localhost:3000/parking-car/search-vehicle?plate_number=1กข1234"
```

ตัวอย่าง Success Response:

```json
{
  "code": "200",
  "message": "Car found successfully",
  "data": {
    "plate_number": "1กข1234",
    "zone_name": "A",
    "slot_number": 1
  }
}
```

### cURL (รถไม่ได้อยู่ในลาน)

```bash
curl -X GET "http://localhost:3000/parking-car/search-vehicle?plate_number=1กข1234"
```

ตัวอย่าง Error Response:

```json
{
  "code": "400",
  "message": "Vehicle is not currently in the parking lot",
  "data": null
}
```

### cURL (ไม่พบรถ)

```bash
curl -X GET "http://localhost:3000/parking-car/search-vehicle?plate_number=XX-9999"
```

ตัวอย่าง Error Response:

```json
{
  "code": "400",
  "message": "Vehicle not found",
  "data": null
}
```

### 6) Get Parking Lot Status

- Method: `GET`
- Path: `/parking-lot/status`
- Query (required):
  - `zone_name` เช่น `A`
  - `parking_lot` เช่น `1`

### cURL (success)

```bash
curl -X GET "http://localhost:3000/parking-lot/status?zone_name=A&parking_lot=1"
```

ตัวอย่าง Success Response:

```json
{
  "code": "200",
  "message": "Parking lot status fetched successfully",
  "data": {
    "zone_name": "A",
    "parking_lot": 1,
    "status": "available"
  }
}
```

ตัวอย่าง Error Response (zone ไม่พบ):

```json
{
  "code": "400",
  "message": "Zone not found",
  "data": null
}
```

ตัวอย่าง Error Response (lot ไม่พบในโซน):

```json
{
  "code": "400",
  "message": "Parking lot not found",
  "data": null
}
```

หมายเหตุ:

- API ดึงข้อมูลโซน/ช่องจอดจะดึงจาก `parking zone` ที่มีสถานะ `active` เท่านั้น

### 7) Update Parking Zone Status

- Method: `PATCH`
- Path: `/parking-lot/zone-status`
- Request body:
  - `zone_name`: string (required)
  - `status`: `active | inactive`

### cURL (update parking zone status)

```bash
curl -X PATCH "http://localhost:3000/parking-lot/zone-status" \
  -H "Content-Type: application/json" \
  -d '{
    "zone_name": "A",
    "status": "inactive"
  }'
```

ตัวอย่าง Success Response:

```json
{
  "code": "200",
  "message": "Parking zone status updated successfully",
  "data": {
    "zone_name": "A",
    "status": "inactive"
  }
}
```

ตัวอย่าง Error Response (มีรถจอดอยู่):

```json
{
  "code": "400",
  "message": "Cannot set zone inactive while slots are occupied",
  "data": null
}
```

หมายเหตุ:

- ตั้งเป็น `inactive` → ช่องจอดทุกช่องในโซนจะเปลี่ยนเป็น `inactive` ด้วย (ไม่สามารถทำได้หากมีรถจอดอยู่)
- ตั้งเป็น `active` → ช่องจอดที่เป็น `inactive` จะกลับมาเป็น `available`

### 8) Update Parking Lot Status

- Method: `PATCH`
- Path: `/parking-lot/lot-status`
- Request body:
  - `zone_name`: string (required)
  - `parking_lot`: number (required)
  - `status`: `active | inactive`

### cURL (update parking lot status)

```bash
curl -X PATCH "http://localhost:3000/parking-lot/lot-status" \
  -H "Content-Type: application/json" \
  -d '{
    "zone_name": "A",
    "parking_lot": 1,
    "status": "active"
  }'
```

ตัวอย่าง Success Response:

```json
{
  "code": "200",
  "message": "Parking lot status updated successfully",
  "data": {
    "zone_name": "A",
    "parking_lot": 1,
    "status": "active"
  }
}
```

ตัวอย่าง Error Response:

```json
{
  "code": "400",
  "message": "Cannot set occupied slot to inactive",
  "data": null
}
```

หมายเหตุ:

- ตั้งเป็น `active` → สถานะช่องจอดจริงใน DB จะเปลี่ยนเป็น `available`
- ตั้งเป็น `inactive` → ไม่สามารถทำได้หากช่องนั้นมีรถจอดอยู่ (`occupied`)

### 9) Add Parking Lots By Zone

- Method: `POST`
- Path: `/parking-lot/add-lots`
- Request body:
  - `zone_name`: string (required)
  - `adding_space`: number (required, must be >= 1)

คำอธิบาย:

- ระบบจะสร้างเลขช่องจอดต่อจากเลขสูงสุดที่มีอยู่ในโซนนั้นอัตโนมัติ

### cURL (success)

```bash
curl -X POST "http://localhost:3000/parking-lot/add-lots" \
  -H "Content-Type: application/json" \
  -d '{
    "zone_name": "A",
    "adding_space": 2
  }'
```

ตัวอย่าง Success Response:

```json
{
  "code": "201",
  "message": "Parking lots added successfully",
  "data": {
    "zone_name": "A",
    "total_slot": 7
  }
}
```

ตัวอย่าง Error Response (zone ไม่พบ):

```json
{
  "code": "400",
  "message": "Zone not found",
  "data": null
}
```

ตัวอย่าง Error Response (zone ไม่ active):

```json
{
  "code": "400",
  "message": "Zone is inactive",
  "data": null
}
```

### 10) Get List By Car Size

- Method: `GET`
- Path: `/parking-car/list`
- Query (required):
  - `field`: `registration-plate | parking-slot`
  - `car_size`: `small | medium | large`

### cURL (registration plate list)

```bash
curl -X GET "http://localhost:3000/parking-car/list?field=registration-plate&car_size=small"
```

ตัวอย่าง Success Response:

```json
{
  "code": "200",
  "message": "List by car size fetched successfully",
  "data": {
    "field": "registration-plate",
    "car_size": "small",
    "registration_plates": ["1กข1234", "AA-1234"]
  }
}
```

### cURL (parking slot status list)

```bash
curl -X GET "http://localhost:3000/parking-car/list?field=parking-slot&car_size=small"
```

ตัวอย่าง Success Response:

```json
{
  "code": "200",
  "message": "List by car size fetched successfully",
  "data": {
    "field": "parking-slot",
    "car_size": "small",
    "parking_slots": [
      {
        "zone_name": "A",
        "slot_number": 1,
        "status": "available"
      },
      {
        "zone_name": "A",
        "slot_number": 2,
        "status": "occupied"
      }
    ]
  }
}
```

หมายเหตุ:

- `parking-slot` จะแสดงเฉพาะโซนที่มีสถานะ `active`

## Database Structure

สคริปต์เริ่มต้นอยู่ที่ `docker/mssql/init.sql`

### 1) parking_zones

- `zone_id` UNIQUEIDENTIFIER PK
- `zone_name` NVARCHAR(100) UNIQUE NOT NULL
- `car_size` NVARCHAR(10) NOT NULL (`small | medium | large`)
- `status` NVARCHAR(20) NOT NULL (`active | inactive`)
- `created_at` DATETIME2(0)
- `updated_at` DATETIME2(0)

### 2) parking_slots

- `slot_id` UNIQUEIDENTIFIER PK
- `slot_number` INT NOT NULL
- `zone_id` UNIQUEIDENTIFIER NOT NULL (FK -> `parking_zones.zone_id`)
- `status` NVARCHAR(20) NOT NULL (`available | occupied | inactive`)
- `created_at` DATETIME2(0)
- `updated_at` DATETIME2(0)
- UNIQUE (`zone_id`, `slot_number`)

### 3) vehicles

- `vehicle_id` UNIQUEIDENTIFIER PK
- `plate_number` NVARCHAR(20) UNIQUE NOT NULL
- `car_size` NVARCHAR(10) NOT NULL (`small | medium | large`)
- `current_slot_id` UNIQUEIDENTIFIER NULL (FK -> `parking_slots.slot_id`)
- `status` NVARCHAR(20) NOT NULL (`parked | inactive | left`)
- `created_at` DATETIME2(0)
- `updated_at` DATETIME2(0)

### 4) vehicle_logs

- `vehicle_log_id` UNIQUEIDENTIFIER PK
- `vehicle_id` UNIQUEIDENTIFIER NOT NULL (FK -> `vehicles.vehicle_id`)
- `slot_id` UNIQUEIDENTIFIER NULL (FK -> `parking_slots.slot_id`)
- `event_type` NVARCHAR(20) NOT NULL (`parked | left | moved | status_changed`)
- `old_status` NVARCHAR(20) NULL
- `new_status` NVARCHAR(20) NULL
- `note` NVARCHAR(255) NULL
- `logged_at` DATETIME2(0)

### Indexes

- `IX_vehicles_status` on `vehicles(status)`
- `IX_vehicle_logs_vehicle_logged_at` on `vehicle_logs(vehicle_id, logged_at DESC)`

## Notes

- โปรเจกต์ตั้งค่า `synchronize: false` ดังนั้นโครงสร้างตารางใช้จาก SQL init script
- หากเปลี่ยน schema เพิ่มเติม ให้แก้ `docker/mssql/init.sql` และ re-init database
- คอลัมน์ข้อความหลักใช้ `NVARCHAR` เพื่อรองรับ Unicode/ภาษาไทย

## Test

```bash
yarn test
```
