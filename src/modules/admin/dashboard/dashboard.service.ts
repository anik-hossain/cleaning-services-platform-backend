import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BookingStatus, UserType } from '@prisma/client';
import { PaginationDto, paginateResponse } from 'src/common/pagination';
import appConfig from 'src/config/app.config';
import { TanvirStorage } from 'src/common/lib/Disk/TanvirStorage';
import { CleanerStatusDto } from './dto/cleaner-status.dto';
import { DangerStatusDto } from './dto/danger-status.dto';
import { JobStatusDto } from './dto/job-status.dto';
import { UpdateCommissionDto } from './dto/update-commission.dto';
import { sendAdminNotification } from 'src/common/utils/notification.util';
import { HomeownerActionsDto } from './dto/homeowner-actions.dto';
import { CleanerActionsDto } from './dto/cleaner-actions.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) { }

  // dashboard overview (only revenew)
  async getOverview() {
    try {
      const [
        totalHomeowners,
        totalCleaners,
        activeBookings,
        completedBookings,
        pendingBookings,
        completedRevenue,
      ] = await this.prisma.$transaction([
        this.prisma.user.count({
          where: { type: UserType.HOMEOWNER },
        }),

        this.prisma.user.count({
          where: { type: UserType.MAID },
        }),

        this.prisma.booking.count({
          where: {
            status: {
              in: [
                BookingStatus.CONFIRMED,
                BookingStatus.STARTED,
                BookingStatus.SUBMITTED,
              ],
            },
          },
        }),

        this.prisma.booking.count({
          where: { status: BookingStatus.COMPLETED },
        }),

        this.prisma.booking.count({
          where: { status: BookingStatus.PENDING },
        }),

        this.prisma.booking.aggregate({
          where: { status: BookingStatus.COMPLETED },
          _sum: {
            total_price: true,
          },
        }),
      ]);

      return {
        success: true,
        data: {
          total_homeowners: totalHomeowners,
          total_cleaners: totalCleaners,
          active_bookings: activeBookings,
          completed_bookings: completedBookings,
          pending_bookings: pendingBookings,
          total_revenue: Number(completedRevenue._sum.total_price ?? 0),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // recent activities
  async getActivities(paginationDto: PaginationDto) {
    try {
      const page = paginationDto.page || 1;
      const perPage = paginationDto.perPage || 10;
      const skip = (page - 1) * perPage;

      const [total, notifications] = await this.prisma.$transaction([
        this.prisma.notification.count({
          where: { deleted_at: null },
        }),
        this.prisma.notification.findMany({
          where: { deleted_at: null },
          skip,
          take: perPage,
          orderBy: {
            created_at: 'desc',
          },
          select: {
            id: true,
            created_at: true,
            read_at: true,
            status: true,
            entity_id: true,
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true,
                type: true,
              },
            },
            receiver: {
              select: {
                id: true,
                name: true,
                avatar: true,
                type: true,
              },
            },
            notification_event: {
              select: {
                id: true,
                type: true,
                text: true,
              },
            },
          },
        }),
      ]);

      const data = notifications.map((notification) => {
        const title =
          notification.notification_event?.type ??
          notification.notification_event?.text ??
          'Notification';

        const subtitle =
          notification.notification_event?.text ??
          notification.sender?.name ??
          notification.receiver?.name ??
          null;

        return {
          id: notification.id,
          title,
          subtitle,
          entity_id: notification.entity_id,
          status: notification.status,
          is_read: !!notification.read_at,
          created_at: notification.created_at,
          sender: notification.sender
            ? {
              id: notification.sender.id,
              name: notification.sender.name,
              avatar: notification.sender.avatar
                ? TanvirStorage.url(
                  appConfig().storageUrl.avatar +
                  '/' +
                  notification.sender.avatar,
                )
                : null,
              type: notification.sender.type,
            }
            : null,
          receiver: notification.receiver
            ? {
              id: notification.receiver.id,
              name: notification.receiver.name,
              avatar: notification.receiver.avatar
                ? TanvirStorage.url(
                  appConfig().storageUrl.avatar +
                  '/' +
                  notification.receiver.avatar,
                )
                : null,
              type: notification.receiver.type,
            }
            : null,
        };
      });

      return {
        success: true,
        message: 'Recent activities retrieved successfully',
        data: paginateResponse(data, total, page, perPage),
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /*--------------------------------------------
            Commission with details
  --------------------------------------------*/

  // get all commission with details
  async getCommissions() {
    try {
      const commissions = await this.prisma.commission.findMany({
        orderBy: {
          created_at: 'desc',
        },
      });

      const data = commissions.map((commission) => ({
        id: commission.id,
        percentage: Number(commission.percentage ?? 0),
        fixed_fee: Number(commission.fixed_fee ?? 0),
        created_at: commission.created_at,
        updated_at: commission.updated_at,
      }));

      return {
        success: true,
        message: 'Commissions retrieved successfully',
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // update commission by id
  async updateCommissionById(
    id: string,
    updateCommissionDto: UpdateCommissionDto,
  ) {
    try {
      const commission = await this.prisma.commission.findUnique({
        where: { id },
      });

      if (!commission) {
        return {
          success: false,
          message: 'Commission not found',
        };
      }

      const updatedCommission = await this.prisma.commission.update({
        where: { id },
        data: updateCommissionDto,
      });

      await sendAdminNotification({
        sender_id: 'system',
        text: `Commission updated to ${updatedCommission.percentage}% + $${updatedCommission.fixed_fee} (was ${commission.percentage}% + $${commission.fixed_fee})`,
        type: 'update_commission',
        entity_id: updatedCommission.id,
      });

      return {
        success: true,
        message: 'Commission updated successfully',
        data: updatedCommission,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /*--------------------------------------------
            HOMEOWNER LIST WITH DETAILS
  --------------------------------------------*/

  // get all homeowners with details
  async getAllHomeowners(paginationDto: PaginationDto) {
    try {
      const page = paginationDto.page || 1;
      const perPage = paginationDto.perPage || 10;
      const skip = (page - 1) * perPage;

      const search = paginationDto.search?.trim();
      const orderby = paginationDto.orderby || 'name';

      const whereCondition: any = {
        type: UserType.HOMEOWNER,
        ...(search && {
          OR: [
            {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              email: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ],
        }),
      };

      const [total, homeowners] = await this.prisma.$transaction([
        this.prisma.user.count({
          where: whereCondition,
        }),
        this.prisma.user.findMany({
          where: whereCondition,
          skip,
          take: perPage,
          select: {
            id: true,
            name: true,
            email: true,
            phone_number: true,
            avatar: true,
            location: true,
            status: true,
            created_at: true,
            userBookings: {
              where: { deleted_at: null },
              select: {
                id: true,
                total_price: true,
              },
            },
          },
          orderBy: {
            [orderby]: 'asc',
          },
        }),
      ]);

      const data = homeowners.map((homeowner) => {
        const totalBookings = homeowner.userBookings.length;

        const totalSpent = homeowner.userBookings.reduce(
          (sum, booking) => sum + Number(booking.total_price ?? 0),
          0,
        );

        return {
          id: homeowner.id,
          name: homeowner.name,
          email: homeowner.email,
          phone_number: homeowner.phone_number,
          avatar: homeowner.avatar,
          location: homeowner.location,
          bookings: totalBookings,
          total_spent: totalSpent,
          status: homeowner.status,
          joined_at: homeowner.created_at,
        };
      });

      return {
        success: true,
        message: `Homeowners retrieved successfully`,
        data: paginateResponse(data, total, page, perPage),
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Homeowner actions
  async homeownersActions(query: HomeownerActionsDto) {
    try {
      await this.prisma.user.update({
        where: {
          id: query.userId,
          type: 'HOMEOWNER'
        },
        data: {
          status: query.status
        }
      });

      return {
        success: true,
        message: `User Status update successfully`,
        data: null,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /*--------------------------------------------
            Clearner LIST WITH DETAILS
  --------------------------------------------*/

  // get all cleaners with details
  async getAllCleaners(paginationDto: PaginationDto) {
    try {
      const page = paginationDto.page || 1;
      const perPage = paginationDto.perPage || 10;
      const skip = (page - 1) * perPage;

      const search = paginationDto.search?.trim();
      const orderby = paginationDto.orderby || 'name';

      const whereCondition: any = {
        type: UserType.MAID,
        ...(search && {
          OR: [
            {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              email: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ],
        }),
      };

      const [cleaners, total] = await Promise.all([
        this.prisma.user.findMany({
          where: whereCondition,
          select: {
            id: true,
            name: true,
            email: true,
            phone_number: true,
            avatar: true,
            status: true,
            availability: true,
            created_at: true,

            maidBookings: {
              where: { deleted_at: null },
              select: {
                id: true,
                status: true,
                total_price: true,
              },
            },

            cleanerReviews: {
              where: { deleted_at: null },
              select: {
                rating: true,
              },
            },
          },
          orderBy: {
            [orderby]: 'asc',
          },
          skip,
          take: perPage,
        }),
        this.prisma.user.count({
          where: whereCondition,
        }),
      ]);

      const data = cleaners.map((cleaner) => {
        const totalJobs = cleaner.maidBookings.length;

        const completedJobs = cleaner.maidBookings.filter(
          (b) => b.status === BookingStatus.COMPLETED,
        ).length;

        const completionRate =
          totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

        const totalEarnings = cleaner.maidBookings
          .filter((b) => b.status === BookingStatus.COMPLETED)
          .reduce((sum, b) => sum + Number(b.total_price ?? 0), 0);

        const ratings = cleaner.cleanerReviews
          .map((r) => r.rating)
          .filter((r): r is number => r !== null);

        const avgRating =
          ratings.length > 0
            ? Math.round(
              (ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10,
            ) / 10
            : 0;

        return {
          id: cleaner.id,
          name: cleaner.name,
          email: cleaner.email,
          phone_number: cleaner.phone_number,
          avatar: cleaner.avatar,
          joined_at: cleaner.created_at,
          rating: avgRating,
          total_reviews: ratings.length,
          jobs: {
            completed: completedJobs,
            total: totalJobs,
            completion_rate: completionRate,
          },
          earnings: totalEarnings,
          status: cleaner.status,
        };
      });

      return {
        success: true,
        message: `Cleaners retrieved successfully`,
        data: paginateResponse(data, total, page, perPage),
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }


  // Homeowner actions
  async cleanerActions(query: CleanerActionsDto) {
    try {
      await this.prisma.user.update({
        where: {
          id: query.userId,
          type: 'HOMEOWNER'
        },
        data: {
          status: query.status
        }
      });

      return {
        success: true,
        message: `User Status update successfully`,
        data: null,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /*--------------------------------------------
            Booking  WITH DETAILS
  --------------------------------------------*/

  // get all bookings with details
  async getAllBookings(paginationDto: PaginationDto) {
    try {
      const page = paginationDto.page || 1;
      const perPage = paginationDto.perPage || 10;
      const skip = (page - 1) * perPage;

      const search = paginationDto.search?.trim();
      const bookingorderby = paginationDto.bookingorderby || 'created_at';

      const whereCondition: any = {
        deleted_at: null,
        ...(search?.trim() && {
          OR: [
            { id: { contains: search.trim(), mode: 'insensitive' } },
            { maid_id: { contains: search.trim(), mode: 'insensitive' } },
            { user_id: { contains: search.trim(), mode: 'insensitive' } },
          ],
        }),
      };

      const [bookings, total] = await Promise.all([
        this.prisma.booking.findMany({
          where: whereCondition,
          skip,
          take: perPage,
          orderBy: {
            [bookingorderby]: 'asc',
          },
          select: {
            id: true,
            created_at: true,
            booking_date: true,
            slot: true,
            homeowner_location: true,
            status: true,
            total_price: true,
            user: {
              select: {
                id: true,
                name: true,
                location: true,
              },
            },
            maid: {
              select: {
                id: true,
                name: true,
              },
            },
            residential_cleaning_package: {
              select: {
                title: true,
                duration: true,
              },
            },
          },
        }),
        this.prisma.booking.count({
          where: whereCondition,
        }),
      ]);

      const slotTimeMap = {
        A: '07:30 AM',
        B: '11:00 AM',
        C: '01:30 PM',
        D: '04:00 PM',
      };

      const statusMap = {
        [BookingStatus.PENDING]: 'pending',
        [BookingStatus.CONFIRMED]: 'confirmed',
        [BookingStatus.STARTED]: 'in-progress',
        [BookingStatus.SUBMITTED]: 'in-progress',
        [BookingStatus.COMPLETED]: 'completed',
        [BookingStatus.REJECTED]: 'rejected',
        [BookingStatus.CANCELLED]: 'cancelled',
      };

      const data = bookings.map((booking, index) => {
        const serviceInfo = booking.residential_cleaning_package;
        return {
          id: `BK - ${booking.id} `,
          homeowner_name: booking.user?.name || 'Unknown',
          cleaner_name: booking.maid?.name || 'Unknown',
          booking_date: booking.booking_date,
          booking_time: slotTimeMap[booking.slot] || booking.slot,
          location:
            booking.homeowner_location || booking.user?.location || null,
          service_name: serviceInfo?.title || 'Cleaning Service',
          service_duration: serviceInfo?.duration || null,
          amount: Number(booking.total_price ?? 0),
          status:
            statusMap[booking.status] || String(booking.status).toLowerCase(),
        };
      });

      return {
        success: true,
        message: 'Bookings retrieved successfully',
        data: paginateResponse(data, total, page, perPage),
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /*--------------------------------------------
            Job Approval  WITH DETAILS
  --------------------------------------------*/

  // get all job approval
  async getAllJobApprovals(paginationDto: PaginationDto) {
    const page = paginationDto.page || 1;
    const perPage = paginationDto.perPage || 10;
    const skip = (page - 1) * perPage;

    try {
      const [total, bookings] = await this.prisma.$transaction([
        this.prisma.booking.count({
          where: { status: 'SUBMITTED', deleted_at: null },
        }),

        this.prisma.booking.findMany({
          where: { status: 'SUBMITTED', deleted_at: null },
          skip,
          take: perPage,
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            created_at: true,
            booking_date: true,
            slot: true,
            maid_location: true,
            homeowner_location: true,
            total_price: true,
            status: true,
            before_photos: true,
            after_photos: true,
            user: { select: { id: true, name: true } },
            maid: { select: { id: true, name: true } },
            maid_note: true,
          },
        }),
      ]);

      const data = bookings.map((b) => ({
        id: b.id,
        created_at: b.created_at,
        booking_date: b.booking_date,
        slot: b.slot,
        homeowner_location: b.homeowner_location,
        maid_location: b.maid_location,
        amount: Number(b.total_price ?? 0),
        status: b.status,
        homeowner: b.user ? { id: b.user.id, name: b.user.name } : null,
        maid: b.maid ? { id: b.maid.id, name: b.maid.name } : null,
        before_photos: (b.before_photos || []).map((f) =>
          TanvirStorage.url(`${appConfig().storageUrl.booking}/${f}`),
        ),
        after_photos: (b.after_photos || []).map((f) =>
          TanvirStorage.url(`${appConfig().storageUrl.booking}/${f}`),
        ),
        maid_note: b.maid_note || null,
      }));

      return {
        success: true,
        message: 'Job approvals retrieved successfully',
        data: paginateResponse(data, total, page, perPage),
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // approve or reject job approval by id
  async updateJobApprovalById(
    id: string,
    updateDto: JobStatusDto
  ) {
    try {
      const { status } = updateDto as any;

      if (status !== BookingStatus.COMPLETED && status !== BookingStatus.REJECTED) {
        return {
          success: false,
          message: 'Status must be COMPLETED or REJECTED',
        };
      }

      const existingBooking = await this.prisma.booking.findUnique({
        where: { id },
      });

      if (!existingBooking) {
        return {
          success: false,
          message: 'Booking not found',
        };
      }

      if (existingBooking.status !== BookingStatus.SUBMITTED) {
        return {
          success: false,
          message: `Booking is already ${String(existingBooking.status).toLowerCase()}`,
        };
      }

      // Approve - Transfer amount to maid and record transaction
      if (status === BookingStatus.COMPLETED) {
        const maidId = existingBooking.maid_id;
        const amount = Number(existingBooking.total_price ?? 0);

        const updated = await this.prisma.$transaction(async (tx) => {
          // Update booking status to COMPLETED
          const completedBooking = await tx.booking.update({
            where: { id },
            data: {
              status: BookingStatus.COMPLETED,
            },
          });

          // Transfer amount to maid
          if (amount > 0 && maidId) {
            await tx.user.update({
              where: { id: maidId },
              data: {
                balance: {
                  increment: amount,
                },
              },
            });

            // Record payment transaction
            await tx.paymentTransaction.create({
              data: {
                booking_id: id,
                user_id: maidId,
                type: 'earning',
                status: 'completed',
                amount: amount,
              },
            });
          }

          return completedBooking;
        });

        await sendAdminNotification({
          sender_id: 'system',
          text: `Booking ${updated.id} has been approved and marked as completed. Amount $${amount} transferred to maid.`,
          type: 'approve_job_submission',
          entity_id: updated.id,
        });

        return {
          success: true,
          message: 'Booking approved and marked as completed. Payment transferred to maid.',
          data: updated,
        };
      }

      // mark rejected and refund homeowner balance
      const amount = Number(existingBooking.total_price ?? 0);
      const userId = existingBooking.user_id;

      await this.prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id },
          data: { status: BookingStatus.REJECTED },
        });

        if (amount > 0 && userId) {
          await tx.user.updateMany({
            where: { id: userId },
            data: {
              balance: {
                increment: amount,
              },
            },
          });

          // record refund transaction
          await tx.paymentTransaction.create({
            data: {
              booking_id: id,
              user_id: userId,
              type: 'refund',
              status: 'completed',
              amount: amount,
            },
          });
        }
      });

      await sendAdminNotification({
        sender_id: 'system',
        text: `Booking ${existingBooking.id} has been rejected and the amount has been refunded to your balance.`,
        type: 'reject_job_submission',
        entity_id: existingBooking.id,
      });

      return {
        success: true,
        message: 'Booking rejected and amount refunded to homeowner',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message ?? 'Failed to update booking approval status',
      };
    }
  }

  /*--------------------------------------------
     Cleaner Requests with approve part 
  --------------------------------------------*/

  // get all cleaner requests with details
  async getAllCleanerRequests(
    paginationDto: PaginationDto
  ) {
    try {
      const page = paginationDto.page || 1;
      const perPage = paginationDto.perPage || 10;
      const skip = (page - 1) * perPage;

      const search = paginationDto.search?.trim();
      const orderby = paginationDto.orderby || 'created_at';

      const whereCondition: any = {
        type: UserType.MAID,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };

      const [requests, total] = await Promise.all([
        this.prisma.user.findMany({
          where: whereCondition,
          skip,
          take: perPage,
          orderBy: {
            [orderby]: 'desc',
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone_number: true,
            avatar: true,
            location: true,
            cleanerVerification: {
              orderBy: { created_at: 'desc' },
              take: 1,
              select: {
                created_at: true,
                status: true,
                id_card_front: true,
                id_card_back: true,
                resume: true,
                rejected_reason: true,
              },
            },
          },
        }),
        this.prisma.user.count({ where: whereCondition }),
      ]);

      const data = requests.map((item) => ({
        id: item.id,
        name: item.name,
        email: item.email,
        phone_number: item.phone_number,
        avatar: item.avatar,
        location: item.location || 'N/A',
        applied_date: item.cleanerVerification[0]?.created_at || null,
        status: item.cleanerVerification[0]?.status?.toLowerCase() || 'pending',
        rejected_reason: item.cleanerVerification[0]?.rejected_reason || null,
      }));

      return {
        success: true,
        message: 'Cleaner requests retrieved successfully',
        data: paginateResponse(data, total, page, perPage),
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // get cleaner deatils by id
  async getCleanerRequestById(id: string) {
    try {
      const cleaner = await this.prisma.user.findFirst({
        where: {
          id,
          type: UserType.MAID,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone_number: true,
          created_at: true,
          location: true,
          address: true,
          city: true,
          state: true,
          zip_code: true,
          cleanerVerification: {
            orderBy: { created_at: 'desc' },
            take: 1,
            select: {
              id: true,
              created_at: true,
              verified_at: true,
              status: true,
              id_card_front: true,
              id_card_back: true,
              resume: true,
              rejected_reason: true,
            },
          },
        },
      });

      if (!cleaner) {
        return {
          success: false,
          message: 'Cleaner not found',
        };
      }

      const verification = cleaner.cleanerVerification[0];
      if (!verification) {
        return {
          success: false,
          message: 'No verification submission found for this cleaner',
        };
      }

      const data = {
        id: cleaner.id,
        verification_id: verification.id,
        name: cleaner.name,
        email: cleaner.email,
        phone_number: cleaner.phone_number,
        location: cleaner.location || 'N/A',
        status: verification.status?.toLowerCase() || 'pending',
        rejected_reason: verification.rejected_reason || null,
        id_card_front_url: verification.id_card_front
          ? TanvirStorage.url(
            appConfig().storageUrl.maidverification +
            '/' +
            verification.id_card_front,
          )
          : null,
        id_card_back_url: verification.id_card_back
          ? TanvirStorage.url(
            appConfig().storageUrl.maidverification +
            '/' +
            verification.id_card_back,
          )
          : null,
        resume_url: verification.resume
          ? TanvirStorage.url(
            appConfig().storageUrl.maidResume +
            '/' +
            verification.resume,
          )
          : null,
      };

      return {
        success: true,
        message: 'Cleaner details retrieved successfully',
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // approve or reject cleaner request by id
  async updateCleanerRequestById(
    id: string,
    updateDto: CleanerStatusDto
  ) {
    try {
      const { status, rejected_reason } = updateDto;

      if (status !== 'VERIFIED' && status !== 'REJECTED') {
        return {
          success: false,
          message: 'Status must be VERIFIED or REJECTED',
        };
      }

      const verification = await this.prisma.cleanerVerification.findFirst({
        where: {
          user_id: id,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      if (!verification) {
        return {
          success: false,
          message: 'No verification submission found for this cleaner',
        };
      }

      const updatedVerification = await this.prisma.cleanerVerification.update({
        where: { id: verification.id },
        data: {
          status,
          rejected_reason: status === 'REJECTED' ? (rejected_reason || null) : null,
          verified_at: status === 'VERIFIED' ? new Date() : null,
        },
      });

      await sendAdminNotification({
        sender_id: 'system',
        text: `Your cleaner verification request has been ${status.toLowerCase()}.${status === 'REJECTED' && rejected_reason ? ` Reason: ${rejected_reason}` : ''}`,
        type: 'cleaner_verification_update',
        entity_id: id,
      });

      return {
        success: true,
        message: 'Cleaner request status updated successfully',
        data: updatedVerification,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /*--------------------------------------------
     Cleaner Requests with approve part 
  --------------------------------------------*/
  /*--------------------------------------------
      Danger Requests with approve part
  --------------------------------------------*/

  // get all danger requests with details
  async getAllDangerRequests(
    paginationDto: PaginationDto
  ) {
    try {
      const page = paginationDto.page || 1;
      const perPage = paginationDto.perPage || 10;
      const skip = (page - 1) * perPage;

      const search = paginationDto.search?.trim();
      const orderby = 'created_at';

      const whereCondition: any = {
        ...(search && {
          OR: [
            { user: { name: { contains: search, mode: 'insensitive' } } },
            {
              maid_current_location: { contains: search, mode: 'insensitive' },
            },
          ],
        }),
      };

      const [total, dangerRequests] = await this.prisma.$transaction([
        this.prisma.danger.count({
          where: whereCondition,
        }),
        this.prisma.danger.findMany({
          where: whereCondition,
          skip,
          take: perPage,
          orderBy: {
            [orderby]: 'desc',
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone_number: true,
                avatar: true,
                created_at: true,
              },
            },
          },
        }),
      ]);

      const data = dangerRequests.map((danger) => ({
        id: danger.id,
        name: danger.user?.name,
        joint_at: danger.user?.created_at,

        applied_date: danger.created_at,
        email: danger.user?.email,
        phone_number: danger.user?.phone_number,
        location: danger.maid_current_location,

        latitude: danger.latitude,
        longitude: danger.longitude,
        status: danger.status,
        danger_time: danger.created_at,
      }));

      return {
        success: true,
        message: 'Danger requests retrieved successfully',
        data: paginateResponse(data, total, page, perPage),
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // get danger request by id
  async getDangerRequestById(
    id: string) {
    try {
      const danger = await this.prisma.danger.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone_number: true,
              avatar: true,
              created_at: true,
            },
          },
        },
      });

      if (!danger) {
        return {
          success: false,
          message: 'Danger request not found',
        };
      }

      const data = {
        id: danger.id,
        name: danger.user?.name,
        joint_at: danger.user?.created_at,
        email: danger.user?.email,
        phone_number: danger.user?.phone_number,
        location: danger.maid_current_location,
        applied_date: danger.created_at,
        status: danger.status,

        latitude: danger.latitude,
        longitude: danger.longitude,
      };
      return {
        success: true,
        message: 'Danger request retrieved successfully',
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // approve or reject danger request by id
  async updateDangerRequestById(
    id: string,
    updateDto: DangerStatusDto
  ) {
    try {
      const { status } = updateDto;

      if (status !== 'COMPLETED' && status !== 'REJECTED') {
        return {
          success: false,
          message: 'Status must be COMPLETED or REJECTED',
        };
      }

      const existingDanger = await this.prisma.danger.findUnique({
        where: { id },
      });

      if (!existingDanger) {
        return {
          success: false,
          message: 'Danger request not found',
        };
      }

      if (
        existingDanger.status === 'COMPLETED' ||
        existingDanger.status === 'REJECTED'
      ) {
        return {
          success: false,
          message: `Danger request is already ${existingDanger.status.toLowerCase()}`,
        };
      }

      const danger = await this.prisma.danger.update({
        where: { id },
        data: {
          status,
        },
      });

      await sendAdminNotification({
        sender_id: 'system',
        text: `Danger request ${danger.id} has been ${status.toLowerCase()}.`,
        type: 'update_booking',
        entity_id: danger.id,
      });

      return {
        success: true,
        message: 'Danger request status updated successfully',
        data: danger,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /*--------------------------------------------
     Danger Requests with approve part 
   --------------------------------------------*/
}
