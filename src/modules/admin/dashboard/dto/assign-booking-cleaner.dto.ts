import { IsNotEmpty, IsString } from 'class-validator';

export class AssignBookingCleanerDto {
  @IsString()
  @IsNotEmpty()
  cleaner_id: string;
}