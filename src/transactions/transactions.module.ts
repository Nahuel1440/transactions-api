import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { BullModule } from '@nestjs/bullmq';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { UploadProcessor } from './processors/process.processor';

@Module({
  controllers: [TransactionsController],
  providers: [TransactionsService, UploadProcessor],
  imports: [
    TypeOrmModule.forFeature([Transaction]),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST,
        port: +process.env.REDIS_PORT,
      },
    }),
    BullModule.registerQueue({
      name: 'file-queue',
    }),
    TransactionsModule,
    FirebaseModule,
  ],
})
export class TransactionsModule {}
