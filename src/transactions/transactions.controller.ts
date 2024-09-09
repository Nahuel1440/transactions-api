import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Get,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('upload')
  @HttpCode(202)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2000000 }),
          new FileTypeValidator({ fileType: 'csv' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Query('userEmail') userEmail: string,
  ) {
    if (!userEmail)
      throw new BadRequestException('The userEmail query param is required');
    await this.transactionsService.processFile(file.buffer, userEmail);
    return { message: 'File received and will be processed' };
  }

  @Get()
  async getTransactions() {
    return this.transactionsService.find();
  }

  @Get('analysis/volume-by-period')
  async getTransactionVolumeByPeriod() {
    return this.transactionsService.countTransactionsByPeriod();
  }

  @Get('analysis/merchants/top-10-by-transaction-volume')
  async getTop10ByTransactionVolume() {
    return this.transactionsService.getTop10MerchantByTransactionVolume();
  }

  @Get('analysis/posible-fraudalents')
  async getPossibleFraudalentTransactions() {
    return this.transactionsService.getPossibleFraudalentTransactions();
  }
}
