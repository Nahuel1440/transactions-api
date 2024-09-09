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

  async countTransactionsByPeriod() {
    const result = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select([
        `COUNT(CASE WHEN transaction.date >= NOW() - INTERVAL '1 day' THEN 1 END) AS "transactionsLastDay"`,
        `COUNT(CASE WHEN transaction.date >= NOW() - INTERVAL '1 week' THEN 1 END) AS "transactionsLastWeek"`,
        `COUNT(CASE WHEN transaction.date >= NOW() - INTERVAL '1 month' THEN 1 END) AS "transactionsLastMonth"`,
      ])
      .getRawOne();

    return result;
  }

  async getTop10MerchantByTransactionVolume() {
    const result = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('transaction.merchant', 'merchant')
      .addSelect('COUNT(merchant)', 'merchant_count')
      .groupBy('merchant')
      .orderBy('merchant_count', 'DESC')
      .take(10)
      .getRawMany();

    return result.map((obj) => obj.merchant);
  }

  async getTransactionsWithHighCountInADay() {
    const MAX_NORMAL_TRANSACTIONS = 10;

    const result = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('transaction."userId"')
      .addSelect('DATE(transaction.date)', 'date')
      .addSelect('COUNT(*)', 'count_transactions')
      .groupBy('transaction."userId"')
      .addGroupBy('DATE(transaction.date)')
      .having('COUNT(*) > :count', { count: MAX_NORMAL_TRANSACTIONS })
      .getRawMany();

    const transactions: Transaction[] = [];

    for (const t of result) {
      const transactionResults = await this.transactionRepository
        .createQueryBuilder('transaction')
        .select('transaction.id')
        .where('transaction."userId" = :user_id', {
          user_id: t.userId,
        })
        .andWhere('DATE(transaction.date) = :date', { date: t.date })
        .getMany();

      transactions.push(...transactionResults);
    }

    return transactions;
  }

  async getTransactionsWithHighAmount() {
    return await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('transaction.id')
      .where('transaction.amount > :maxAmount', { maxAmount: 10000 })
      .getMany();
  }

  async getSimultaneousTransactions() {
    const INTERVAL_SEG = 60;
    const results = await this.transactionRepository
      .createQueryBuilder('t1')
      .select([
        't1.id AS transaction_id_1',
        't2.id AS transaction_id_2',
        't1.userId',
        't1.date AS date_1',
        't2.date AS date_2',
      ])
      .innerJoin(Transaction, 't2', 't1.userId = t2.userId AND t1.id != t2.id')
      .where('ABS(EXTRACT(EPOCH FROM t1.date - t2.date)) <= :interval', {
        interval: INTERVAL_SEG,
      })
      .orderBy('t1.userId')
      .addOrderBy('t1.date')
      .addOrderBy('t2.date')
      .getRawMany();

    return results.map((result) => ({ id: result.transaction_id_1 }));
  }

  async getPossibleFraudalentTransactions() {
    const possibleFraudalentTransactions = [];

    possibleFraudalentTransactions.push({
      reason: 'High transaction amount',
      transactions: await this.getTransactionsWithHighAmount(),
    });

    possibleFraudalentTransactions.push({
      reason: 'High transactions count in a day',
      transactions: await this.getTransactionsWithHighCountInADay(),
    });

    possibleFraudalentTransactions.push({
      reason: 'Simultaneous transactions',
      transactions: await this.getSimultaneousTransactions(),
    });

    return { possibleFraudalentTransactions };
  }
}
