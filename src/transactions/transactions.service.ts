import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { randomUUID } from 'crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { validateOrReject } from 'class-validator';
import { plainToClass } from 'class-transformer';

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

  create(transactionToCreate: CreateTransactionDto) {
    return this.transactionRepository.create(transactionToCreate);
  }

  async validateTransaction(transaction: Partial<Transaction>) {
    const createTransactionDto = plainToClass(
      CreateTransactionDto,
      transaction,
    );

    await validateOrReject(createTransactionDto);
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
      .orIgnore('ON CONFLICT (id) DO NOTHING')
      .execute();
  }

  async save(transactions: Transaction[]) {
    return await this.transactionRepository.save(transactions);
  }

  async find(options?: FindManyOptions<Transaction>) {
    return await this.transactionRepository.find(options);
  }
}
