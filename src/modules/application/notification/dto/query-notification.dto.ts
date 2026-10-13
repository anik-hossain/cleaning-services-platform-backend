import { IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from 'src/common/pagination';

export class QueryNotificationDto extends PaginationDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true || value === 1 || value === '1') return true;
    if (value === 'false' || value === false || value === 0 || value === '0') return false;
    return undefined;
  })
  is_read?: boolean;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  limit?: number;
}
