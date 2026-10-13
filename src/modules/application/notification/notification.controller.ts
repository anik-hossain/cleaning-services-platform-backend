import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PaginationDto } from 'src/common/pagination';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // get all notification
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @Req() req:any,
    @Query() paginationDto: PaginationDto,
    ) {
    const userId = req.user.userId;
    return this.notificationService.findAll(userId, paginationDto);
  }
}
