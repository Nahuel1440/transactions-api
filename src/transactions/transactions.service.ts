import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { randomUUID } from 'crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly firebaseService: FirebaseService,
    @InjectQueue('file-queue') private fileQueue: Queue,
  ) {}

  async processFile(file: Buffer) {
    const uuid = randomUUID();

    const filePath = `files/${uuid}.csv`;

    await this.firebaseService.uploadFile(filePath, file);

    this.fileQueue.add(
      'file',
      { filePath, userEmail: 'nahuelkukianto@gmail.com' },
      {
        attempts: 1,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );
  }

  create(transactionToCreate: Partial<Transaction>) {
    return this.transactionRepository.create(transactionToCreate);
  }

  /**
   *
   * Insert the transaction and avoid the duplicates
   */
  async insertOrDoNothing(transactions: Transaction[]) {
    await this.transactionRepository
      .createQueryBuilder()
      .insert()
      .values(transactions)
      .orIgnore()
      .execute();
  }

  async save(transactions: Transaction[]) {
    return await this.transactionRepository.save(transactions);
  }

  findAll() {
    return `This action returns all transactions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} transaction`;
  }

  remove(id: number) {
    return `This action removes a #${id} transaction`;
  }
}
