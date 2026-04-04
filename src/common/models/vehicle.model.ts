import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('vehicles')
export class VehicleModel {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  vehicle_id: string;

  @Column({ type: 'varchar', length: 20 })
  plate_number: string;

  @Column({ type: 'varchar', length: 10 })
  car_size: string;

  @Column({ type: 'uniqueidentifier', nullable: true })
  current_slot_id: string | null;

  @Column({ type: 'varchar', length: 20 })
  status: string;

  @CreateDateColumn({ type: 'datetime2' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updated_at: Date;
}
