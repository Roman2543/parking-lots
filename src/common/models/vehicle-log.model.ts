import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('vehicle_logs')
export class VehicleLogModel {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  vehicle_log_id: string;

  @Column({ type: 'uniqueidentifier' })
  vehicle_id: string;

  @Column({ type: 'uniqueidentifier', nullable: true })
  slot_id: string | null;

  @Column({ type: 'varchar', length: 20 })
  event_type: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  old_status: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  new_status: string | null;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  note: string | null;

  @CreateDateColumn({ type: 'datetime2' })
  logged_at: Date;
}
