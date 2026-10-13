import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { paginateResponse } from 'src/common/pagination';
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';
import { QueryNotificationDto } from './dto/query-notification.dto';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to build the receiver condition based on user role.
   * Admins receive their own notifications plus general/system alerts (receiver_id is null).
   * Other roles (CUSTOMER, CLEANER, etc.) receive notifications targeted to them.
   */
  private getReceiverCondition(userId: string, userRole?: string) {
    if (userRole === 'ADMIN') {
      return {
        OR: [{ receiver_id: userId }, { receiver_id: null }],
      };
    }
    return {
      receiver_id: userId,
    };
  }

  // Get notifications for authenticated user
  async findAll(
    userId: string,
    userRole: string | undefined,
    query: QueryNotificationDto = new QueryNotificationDto(),
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const perPage = Math.max(1, Number(query.perPage || query.limit) || 10);
    const skip = (page - 1) * perPage;
    const take = perPage;

    const receiverCondition = this.getReceiverCondition(userId, userRole);
    const where: any = {
      ...receiverCondition,
    };

    if (query.is_read !== undefined) {
      if (query.is_read) {
        where.read_at = { not: null };
      } else {
        where.read_at = null;
      }
    }

    if (query.type) {
      where.notification_event = {
        type: {
          contains: query.type,
          mode: 'insensitive',
        },
      };
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: {
          sender: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          notification_event: {
            select: { id: true, type: true, text: true },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take,
      }),
      this.prisma.notification.count({
        where,
      }),
      this.prisma.notification.count({
        where: {
          ...receiverCondition,
          read_at: null,
        },
      }),
    ]);

    const data = notifications.map((n) =>
      NotificationRepository.formatNotification(n),
    );

    const paginationResponse = paginateResponse(
      data,
      total,
      page,
      perPage,
    );

    return {
      success: true,
      message: 'Notifications retrieved successfully',
      unread_count: unreadCount,
      ...paginationResponse,
    };
  }

  // Get unread count
  async getUnreadCount(userId: string, userRole?: string) {
    const receiverCondition = this.getReceiverCondition(userId, userRole);
    const count = await this.prisma.notification.count({
      where: {
        ...receiverCondition,
        read_at: null,
      },
    });

    return {
      success: true,
      message: 'Unread notification count retrieved successfully',
      data: { count },
    };
  }

  // Mark single notification as read
  async markAsRead(id: string, userId: string, userRole?: string) {
    const receiverCondition = this.getReceiverCondition(userId, userRole);

    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        ...receiverCondition,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { read_at: new Date() },
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        notification_event: {
          select: { id: true, type: true, text: true },
        },
      },
    });

    return {
      success: true,
      message: 'Notification marked as read successfully',
      data: NotificationRepository.formatNotification(updated),
    };
  }

  // Mark all notifications as read
  async markAllAsRead(userId: string, userRole?: string) {
    const receiverCondition = this.getReceiverCondition(userId, userRole);

    const result = await this.prisma.notification.updateMany({
      where: {
        ...receiverCondition,
        read_at: null,
      },
      data: { read_at: new Date() },
    });

    return {
      success: true,
      message: 'All notifications marked as read successfully',
      data: { count: result.count },
    };
  }

  // Delete notification by id
  async remove(id: string, userId: string, userRole?: string) {
    const receiverCondition = this.getReceiverCondition(userId, userRole);

    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        ...receiverCondition,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Notification deleted successfully',
      data: { count: 1 },
    };
  }

  // Delete all notifications for user
  async removeAll(userId: string, userRole?: string) {
    const receiverCondition = this.getReceiverCondition(userId, userRole);

    const result = await this.prisma.notification.deleteMany({
      where: receiverCondition,
    });

    return {
      success: true,
      message: 'All notifications deleted successfully',
      data: { count: result.count },
    };
  }
}
