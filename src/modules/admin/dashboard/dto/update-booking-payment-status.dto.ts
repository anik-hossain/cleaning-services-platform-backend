import { PaymentStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateBookingPaymentStatusDto {
  @IsEnum(PaymentStatus)
  status: PaymentStatus;
}