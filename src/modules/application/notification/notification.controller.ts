import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { QueryNotificationDto } from './dto/query-notification.dto';

@ApiBearerAuth()
@ApiTags('Notification')
@UseGuards(JwtAuthGuard)
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({
    summary:
      'Get all notifications for authenticated user (standard endpoint for Admin, Customer, Cleaner with routing metadata and pagination)',
  })
  @Get()
  async findAll(@Req() req: any, @Query() query: QueryNotificationDto) {
    const userId = req.user.userId;
    const userRole = req.user.type;
    return this.notificationService.findAll(userId, userRole, query);
  }

  @ApiOperation({ summary: 'Get unread notification count for authenticated user' })
  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const userId = req.user.userId;
    const userRole = req.user.type;
    return this.notificationService.getUnreadCount(userId, userRole);
  }

  @ApiOperation({ summary: 'Legacy alias to get notifications' })
  @Get('user-notification')
  async getUserNotifications(
    @Req() req: any,
    @Query() query: QueryNotificationDto,
  ) {
    const userId = req.user.userId;
    const userRole = req.user.type;
    return this.notificationService.findAll(userId, userRole, query);
  }

  // GEt notification by id
  @ApiOperation({ summary: 'Get a specific notification by ID' })
  @Get(':id')
  async getNotificationById(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    const userRole = req.user.type;
    return await this.notificationService.findById(id, userId, userRole);
  }

  @ApiOperation({ summary: 'Mark all notifications as read for authenticated user' })
  @Patch('read-all')
  async markAllAsRead(@Req() req: any) {
    const userId = req.user.userId;
    const userRole = req.user.type;
    return this.notificationService.markAllAsRead(userId, userRole);
  }

  @ApiOperation({ summary: 'Mark a specific notification as read' })
  @Patch(':id/read')
  async markAsRead(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    const userRole = req.user.type;
    return this.notificationService.markAsRead(id, userId, userRole);
  }

  @ApiOperation({ summary: 'Mark a specific notification as read (alternative pattern)' })
  @Patch('read/:id')
  async markAsReadAlt(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    const userRole = req.user.type;
    return this.notificationService.markAsRead(id, userId, userRole);
  }

  @ApiOperation({ summary: 'Legacy alias to delete a notification' })
  @Patch('delete-notification/:id')
  async deleteNotificationPatch(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    const userRole = req.user.type;
    return this.notificationService.remove(id, userId, userRole);
  }

  @ApiOperation({ summary: 'Delete a notification by ID' })
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    const userRole = req.user.type;
    return this.notificationService.remove(id, userId, userRole);
  }

  @ApiOperation({ summary: 'Delete all notifications for authenticated user' })
  @Delete()
  async removeAll(@Req() req: any) {
    const userId = req.user.userId;
    const userRole = req.user.type;
    return this.notificationService.removeAll(userId, userRole);
  }
}
