import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { TransactionsService } from '../transactions.service';
import { Job } from 'bullmq';
import { FirebaseService } from '../../firebase/firebase.service';
import { TransactionInFile } from '../interfaces/transaction.interfaces';
import { Logger } from '@nestjs/common';
import { Transaction } from '../entities/transaction.entity';
import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer';
import * as csv from 'csvtojson';

@Processor('file-queue')
export class UploadProcessor extends WorkerHost {
  private readonly logger = new Logger(UploadProcessor.name);

  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly firebaseService: FirebaseService,
    private readonly mailerService: MailerService,
  ) {
    super();
  }

  async process(job: Job) {
    try {
      const file = await this.firebaseService.downloadFile(job.data.filePath);

      const transactionsFromFile: TransactionInFile[] = await csv().fromString(
        file.toString(),
      );

      const transactionsToSave: Transaction[] = [];
      for (const transactionFromFile of transactionsFromFile) {
        const { transaction_id, date, amount, merchant, user_id } =
          transactionFromFile;

        const transactionToSave = this.transactionsService.create({
          id: +transaction_id,
          date,
          amount,
          merchant,
          userId: user_id,
        });

        await this.transactionsService.validateTransaction(transactionToSave);

        transactionsToSave.push(transactionToSave);
      }
      await this.transactionsService.insertOrDoNothing(transactionsToSave);
    } catch (error) {
      this.logger.error(error.stack);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  async onFinishFileProcessing(job: Job) {
    try {
      const message = `We are pleased to inform you that the CSV file you submitted has been successfully processed.\nThe data has been stored and is now ready for your for your reference.\nIf you need any further assistance, please do not hesitate to contact us.\nBest regards`;

      await this.sendNotification({
        from: process.env.EMAIL_USERNAME,
        to: job.data.userEmail,
        subject: `Successful CSV Processing`,
        text: message,
      });

      await this.firebaseService.removeFile(job.data.filePath);

      this.logger.debug('Successful CSV Processing');
    } catch (error) {
      this.logger.error(error.stack);
    }
  }

  @OnWorkerEvent('failed')
  @OnWorkerEvent('error')
  async onErrorFileProcessing(job: Job) {
    try {
      const message = `Unfortunately, we encountered a problem processing the CSV file you submitted.\nPlease check the file and try again.\nIf the problem persists, please do not hesitate to contact our technical support.\nThank you for your understanding.\nBest regards`;

      await this.sendNotification({
        from: process.env.EMAIL_USERNAME,
        to: job.data.userEmail,
        subject: `CSV Processing Failed`,
        text: message,
      });

      await this.firebaseService.removeFile(job.data.filePath);

      this.logger.debug('CSV Processing Failed');
    } catch (error) {
      this.logger.error(error.stack);
    }
  }

  private async sendNotification(options: ISendMailOptions) {
    try {
      await this.mailerService.sendMail(options);
    } catch (error) {
      this.logger.error('Error sending the notification', error, options);
    }
  }
}
