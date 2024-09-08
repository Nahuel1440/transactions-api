import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsString,
} from 'class-validator';

export class CreateTransactionDto {
  @IsNumber()
  id: number;

  @IsDateString()
  date: Date;

  @IsNumberString()
  amount: string;

  @IsString()
  @IsNotEmpty()
  merchant: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}
