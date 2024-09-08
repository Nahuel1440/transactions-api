import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Transaction {
  @PrimaryColumn()
  id: number;

  @Column('timestamp')
  date: Date;

  @Column('numeric', { precision: 10, scale: 2 })
  amount: string;

  @Column('varchar', { length: 255 })
  merchant: string;

  @Column('varchar', { length: 255 })
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
