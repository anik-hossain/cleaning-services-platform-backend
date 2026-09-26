import { IsIn, IsNotEmpty } from 'class-validator';
import { UserStatus } from '@prisma/client';

export class CleanerActionsDto {

    @IsNotEmpty()
    userId: string;

    @IsNotEmpty()
    @IsIn([UserStatus.ACTIVE, UserStatus.INACTIVE, UserStatus.SUSPENDED])
    status: UserStatus;
}