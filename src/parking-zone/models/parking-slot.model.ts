import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('parking_slots')
export class ParkingSlotModel {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  slot_id: string;

  @Column({ type: 'uniqueidentifier' })
  zone_id: string;

  @Column({ type: 'int' })
  slot_number: number;

  @Column({ type: 'nvarchar', length: 20 })
  status: string;

  @CreateDateColumn({ type: 'datetime2' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updated_at: Date;
}
