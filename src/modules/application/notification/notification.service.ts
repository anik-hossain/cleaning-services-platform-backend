import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { paginateResponse, PaginationDto } from 'src/common/pagination';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  // get all notification
  async findAll(
    userId: string, 
    paginationDto: PaginationDto
  ) {

    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;
    const take = perPage;


    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { receiver_id: userId },
        include: {
          sender: {
            select: { id: true, name: true, avatar: true },
          },
          notification_event: {
            select: { type: true, text: true },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take,
      }),
      this.prisma.notification.count({
        where: { receiver_id: userId },
      }),
    ]);

    const data = notifications.map((n) => ({
      id: n.id,
      created_at: n.created_at,
      type: n.notification_event?.type,
      text: n.notification_event?.text,
      sender: n.sender,
    }));

    const paginationResponse = paginateResponse(
      data,
      total,
      page,
      perPage,
    );

    return {
      success: true,
      message: 'Notifications retrieved successfully',
      ... paginationResponse,
      
    };
  }
}
