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
  ) {
    await this.transactionsService.processFile(file.buffer);
    return { message: 'File received and will be processed' };
  }

  @Get()
  async getTransactions() {
    return this.transactionsService.find();
  }
}
