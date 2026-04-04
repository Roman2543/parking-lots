import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('parking_zones')
export class ParkingZoneModel {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  zone_id: string;

  @Column({ type: 'nvarchar', length: 100 })
  zone_name: string;

  @Column({ type: 'nvarchar', length: 20 })
  status: string;

  @CreateDateColumn({ type: 'datetime2' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updated_at: Date;
}
