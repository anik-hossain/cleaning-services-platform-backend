import { Injectable } from '@nestjs/common';
import { StringHelper } from 'src/common/helper/string.helper';
import { TanvirStorage } from 'src/common/lib/Disk/TanvirStorage';
import appConfig from 'src/config/app.config';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateLocationDto } from './dto/create-location.dto';
import { onlySendUserNotification } from 'src/common/utils/notification.util';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  // topic: maid part)---------->

  // maid availability toggle
  async toggleAvailability(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { availability: true },
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    const newAvailability = !user.availability;

    await this.prisma.user.update({
      where: { id: userId },
      data: { availability: newAvailability },
    });

    return {
      success: true,
      message: `Availability toggled to ${newAvailability}`,
    };
  }

  async getAdminDetails() {
    const admin = await this.prisma.user.findFirst({
      where: { type: 'ADMIN' },
      select: {
        id: true,
        name: true,
        email: true,
        phone_number: true,
      },
    });

    if (!admin) {
      return {
        success: false,
        message: 'Admin not found',
      };
    }

    return {
      success: true,
      data: admin,
    };
  }

  // get profile details
  async getProfileDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        type: true,
        avatar: true,
        location: true,
        phone_number: true,
        about_me: true,
        service_type: true,
        latitude: true,
        longitude: true,
        experience_years: true,
        cleanerVerification: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: {
            status: true,
          },
        },
      },
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    const reviewWhere =
      user.type === 'HOMEOWNER'
        ? { homeowner_id: user.id }
        : { cleaner_id: user.id };

    const [
      reviewAggregate,
      totalReviews,
      jobsDone,
      earningsAggregate,
      completedBookingClients,
      recentJobs,
    ] = await this.prisma.$transaction([
      this.prisma.review.aggregate({
        where: reviewWhere,
        _avg: {
          rating: true,
        },
      }),
      this.prisma.review.count({
        where: reviewWhere,
      }),
      this.prisma.booking.count({
        where: {
          maid_id: user.id,
          status: 'COMPLETED',
        },
      }),
      this.prisma.booking.aggregate({
        where: {
          maid_id: user.id,
          status: 'COMPLETED',
        },
        _sum: {
          total_price: true,
        },
      }),
      this.prisma.booking.findMany({
        where: {
          maid_id: user.id,
          status: 'COMPLETED',
        },
        select: {
          user_id: true,
        },
      }),
      this.prisma.booking.findMany({
        where: {
          maid_id: user.id,
          status: 'COMPLETED',
        },
        include: {
          residential_cleaning_package: {
            select: {
              title: true,
              image: true,
            },
          },
        },
        orderBy: {
          booking_date: 'desc',
        },
        take: 2,
      }),
    ]);

    const average_rating = Number(reviewAggregate._avg.rating ?? 0);
    const total_earnings = Number(earningsAggregate._sum.total_price ?? 0);
    const clientBookingCount = new Map<string, number>();

    completedBookingClients.forEach((booking) => {
      clientBookingCount.set(
        booking.user_id,
        (clientBookingCount.get(booking.user_id) ?? 0) + 1,
      );
    });

    const totalClients = clientBookingCount.size;
    const repeatedClients = Array.from(clientBookingCount.values()).filter(
      (count) => count > 1,
    ).length;

    const repeat_client_rate =
      totalClients > 0
        ? Number(((repeatedClients / totalClients) * 100).toFixed(2))
        : 0;

    const recent_jobs = recentJobs.map((job) => {
      const pkg = job.residential_cleaning_package;

      return {
        id: job.id,
        title: pkg?.title || 'Cleaning Service',
        image_url: pkg?.image
          ? TanvirStorage.url(appConfig().storageUrl.package + '/' + pkg.image)
          : null,
        booking_date: job.booking_date,
        status: job.status,
      };
    });

    return {
      success: true,
      message: 'Profile details retrieved successfully',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        verification_status: user.cleanerVerification?.[0]?.status === 'VERIFIED',
        avater_url: user.avatar
          ? TanvirStorage.url(appConfig().storageUrl.avatar + '/' + user.avatar)
          : null,
        location: user.location,
        about_me: user.about_me,
        phone_number: user.phone_number,
        service_type: user.service_type,
        experience_years: user.experience_years,
        jobs_done: jobsDone,
        maid_verification: user.cleanerVerification[0],
        total_earnings,
        repeat_client_rate,
        last_active: '2 hour',
        average_rating,
        total_reviews: totalReviews,
        recent_jobs,
        latitude: user.latitude,
        longitude: user.longitude,
      },
    };
  }

  // get maid profile details
  async getMaidProfileDetails(maidId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: maidId },
      select: {
        id: true,
        name: true,
        email: true,
        phone_number: true,
        type: true,
        avatar: true,
        location: true,
        about_me: true,
        service_type: true,
        experience_years: true,
        cleanerVerification: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: {
            status: true,
            verified_at: true,
            rejected_reason: true,
          },
        },
      },
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    const reviewWhere =
      user.type === 'HOMEOWNER'
        ? { homeowner_id: user.id }
        : { cleaner_id: user.id };

    const [
      reviewAggregate,
      totalReviews,
      jobsDone,
      earningsAggregate,
      completedBookingClients,
      recentJobs,
    ] = await this.prisma.$transaction([
      this.prisma.review.aggregate({
        where: reviewWhere,
        _avg: {
          rating: true,
        },
      }),
      this.prisma.review.count({
        where: reviewWhere,
      }),
      this.prisma.booking.count({
        where: {
          maid_id: user.id,
          status: 'COMPLETED',
        },
      }),
      this.prisma.booking.aggregate({
        where: {
          maid_id: user.id,
          status: 'COMPLETED',
        },
        _sum: {
          total_price: true,
        },
      }),
      this.prisma.booking.findMany({
        where: {
          maid_id: user.id,
          status: 'COMPLETED',
        },
        select: {
          user_id: true,
        },
      }),
      this.prisma.booking.findMany({
        where: {
          maid_id: user.id,
          status: 'COMPLETED',
        },
        include: {
          residential_cleaning_package: {
            select: {
              title: true,
              image: true,
            },
          },
        },
        orderBy: {
          booking_date: 'desc',
        },
        take: 2,
      }),
    ]);

    const average_rating = Number(reviewAggregate._avg.rating ?? 0);
    const total_earnings = Number(earningsAggregate._sum.total_price ?? 0);

    const clientBookingCount = new Map<string, number>();

    completedBookingClients.forEach((booking) => {
      clientBookingCount.set(
        booking.user_id,
        (clientBookingCount.get(booking.user_id) ?? 0) + 1,
      );
    });

    const totalClients = clientBookingCount.size;
    const repeatedClients = Array.from(clientBookingCount.values()).filter(
      (count) => count > 1,
    ).length;

    const repeat_client_rate =
      totalClients > 0
        ? Number(((repeatedClients / totalClients) * 100).toFixed(2))
        : 0;

    const recent_jobs = recentJobs.map((job) => {
      const pkg = job.residential_cleaning_package;

      return {
        id: job.id,
        title: pkg?.title || 'Cleaning Service',
        image_url: pkg?.image
          ? TanvirStorage.url(appConfig().storageUrl.package + '/' + pkg.image)
          : null,
        booking_date: job.booking_date,
        status: job.status,
      };
    });

    return {
      success: true,
      message: 'Profile details retrieved successfully',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        avater_url: user.avatar
          ? TanvirStorage.url(appConfig().storageUrl.avatar + '/' + user.avatar)
          : null,
        location: user.location,
        about_me: user.about_me,
        phone_number: user.phone_number,
        service_type: user.service_type,
        experience_years: user.experience_years,
        verification_status: user.cleanerVerification?.[0]?.status || 'PENDING',
        verified_at: user.cleanerVerification?.[0]?.verified_at || null,
        rejected_reason: user.cleanerVerification?.[0]?.rejected_reason || null,
        jobs_done: jobsDone,
        total_earnings,
        repeat_client_rate,
        last_active: '2 hour',
        average_rating,
        total_reviews: totalReviews,
        recent_jobs,
      },
    };
  }

  // maid profile update
  async updatemaid(
    userId: string,
    dto: UpdateProfileDto,
    image?: Express.Multer.File,
  ) {
    const userData: any = {};

    if (dto.name !== undefined) userData.name = dto.name;
    if (dto.location !== undefined) userData.location = dto.location;
    if (dto.phone_number !== undefined) userData.phone_number = dto.phone_number;
    if (dto.about_me !== undefined) userData.about_me = dto.about_me;
    if (dto.service_type !== undefined)
      userData.service_type = dto.service_type;
    if (dto.experience_years !== undefined)
      userData.experience_years = dto.experience_years;
    if (dto.latitude !== undefined) userData.latitude = dto.latitude;
    if (dto.longitude !== undefined) userData.longitude = dto.longitude;

    // -------- image --------

    if (image) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { avatar: true },
      });

      if (user?.avatar) {
        await TanvirStorage.delete(
          appConfig().storageUrl.avatar + '/' + user.avatar,
        );
      }

      const fileName = `${StringHelper.randomString()}_${image.originalname}`;
      await TanvirStorage.put(
        appConfig().storageUrl.avatar + '/' + fileName,
        image.buffer,
      );

      userData.avatar = fileName;
    }

    // -------- update user --------
    const user =
      Object.keys(userData).length > 0
        ? await this.prisma.user.update({
            where: { id: userId },
            data: userData,
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              location: true,
              about_me: true,
              service_type: true,
              experience_years: true,
            },
          })
        : await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              location: true,
              about_me: true,
              service_type: true,
              experience_years: true,
            },
          });

    await onlySendUserNotification({
      sender_id: userId,
      receiver_id: userId,
      text: `Your profile has been updated successfully.`,
      type: 'profile update',
      entity_id: userId,
    });

    return {
      success: true,
      message: 'Profile updated successfully',
      data: {
        user,
      },
    };
  }

  // review maid
  async reviewMaid(maidId: string) {
    const maid = await this.prisma.user.findUnique({
      where: { id: maidId },
      select: { id: true },
    });

    if (!maid) {
      return {
        success: false,
        message: 'Maid not found',
      };
    }

    const reviews = await this.prisma.review.findMany({
      where: {
        cleaner_id: maidId,
      },
      include: {
        homeowner: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        booking: {
          include: {
            residential_cleaning_package: {
              select: {
                title: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const data = reviews.map((review) => {
      const serviceTitle =
        review.booking.residential_cleaning_package?.title ||
        'Cleaning Service';

      return {
        id: review.id,
        reviewer_name: review.homeowner?.name,
        reviewer_avatar_url: review.homeowner?.avatar
          ? TanvirStorage.url(
              appConfig().storageUrl.avatar + '/' + review.homeowner.avatar,
            )
          : null,
        service_title: serviceTitle,
        review_date: review.created_at,
        rating: review.rating ?? 0,
        comment: review.comment,
      };
    });

    return {
      success: true,
      message: 'Reviews retrieved successfully',
      data,
    };
  }

  // topic: homeowner part)---------->

  // get profile details
  async getHomeownerProfileDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        location: true,
        phone_number: true,
        about_me: true,
        latitude: true,
        longitude: true,
      },
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }
    return {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        avater_url: user.avatar
          ? TanvirStorage.url(appConfig().storageUrl.avatar + '/' + user.avatar)
          : null,
        location: user.location,
        phone_number: user.phone_number,
        about_me: user.about_me,
        latitude: user.latitude,
        longitude: user.longitude,
      },
    };
  }

  // homeowner profile update
  async updateHomeowner(
    userId: string,
    dto: UpdateProfileDto,
    image?: Express.Multer.File,
  ) {
    const userData: any = {};

    if (dto.location !== undefined) userData.location = dto.location;
    if (dto.phone_number !== undefined) userData.phone_number = dto.phone_number;
    if (dto.about_me !== undefined) userData.about_me = dto.about_me;
    if (dto.latitude !== undefined) userData.latitude = dto.latitude;
    if (dto.longitude !== undefined) userData.longitude = dto.longitude;

    // -------- update user --------

    // -------- image --------
    if (image) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { avatar: true },
      });

      if (user?.avatar) {
        await TanvirStorage.delete(
          appConfig().storageUrl.avatar + '/' + user.avatar,
        );
      }

      const fileName = `${StringHelper.randomString()}_${image.originalname}`;
      await TanvirStorage.put(
        appConfig().storageUrl.avatar + '/' + fileName,
        image.buffer,
      );

      userData.avatar = fileName;
    }

    const user =
      Object.keys(userData).length > 0
        ? await this.prisma.user.update({
            where: { id: userId },
            data: userData,
            select: {
              id: true,
              name: true,
              email: true,
              phone_number: true,
              avatar: true,
              location: true,
              about_me: true,
            },
          })
        : await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              location: true,
              about_me: true,
            },
          });

    await onlySendUserNotification({
      sender_id: userId,
      receiver_id: userId,
      text: `Your profile has been updated successfully.`,
      type: 'profile update',
      entity_id: userId,
    });

    return {
      success: true,
      message: 'Profile updated successfully',
      data: {
        user,
      },
    };
  }

  // topic: saved location part)---------->

  // post save location
  async saveLocation(userId: string, locationDto: CreateLocationDto) {
      
    const { 
      location_name, 
      location_type, 
      latitude, 
      longitude 
    }  = locationDto;

    if (!location_name && !location_type && latitude === undefined && longitude === undefined) {
      return {
        success: false,
        message: 'At least one field is required to save location',
      };
    }

    const newLocation = await this.prisma.location.create({
      data: {
        user_id: userId,
        location_name: location_name,
        location_type: location_type,
        latitude: latitude,
        longitude: longitude,
      },
    });

    await onlySendUserNotification({
      sender_id: userId,
      receiver_id: userId,
      text: `Your location has been saved successfully.`,
      type: 'profile update',
      entity_id: userId,
    });

    return {
      success: true,
      message: 'Location saved successfully',
      data: newLocation,
    };
  }

  async getSavedLocations(userId: string) {
    const locations = await this.prisma.location.findMany({
      where: {
        user_id: userId,
      },
    });

    const formattedLocations = locations.map((location) => {
      return {
        id: location.id,
        location_name: location.location_name,
        location_type: location.location_type,
        latitude: location.latitude,
        longitude: location.longitude,
      };
    });

    return {
      success: true,
      message: 'Locations retrieved successfully',
      data: formattedLocations,
    };
  }

  // get a specific saved location by id
  async getSavedLocationById(userId: string, locationId: string) {
    const location = await this.prisma.location.findFirst({
      where: {
        id: locationId,
        user_id: userId,
      },
    });

    if (!location) {
      return {
        success: false,
        message: 'Location not found',
      };
    }

    return {
      success: true,
      message: 'Location retrieved successfully',
      data: location,
    };
  }

  // update saved location
  async updateSavedLocation(
    userId: string,
    locationId: string,
    locationDto: CreateLocationDto,
  ) {
    const { location_name, location_type, latitude, longitude } = locationDto;

    const locationData: any = {};
    if (location_name !== undefined) locationData.location_name = location_name;
    if (location_type !== undefined) locationData.location_type = location_type;
    if (latitude !== undefined) locationData.latitude = latitude;
    if (longitude !== undefined) locationData.longitude = longitude;

    const location = await this.prisma.location.findFirst({
      where: {
        id: locationId,
        user_id: userId,
      },
    });

    if (!location) {
      return {
        success: false,
        message: 'Location not found',
      };
    }

    const updatedLocation = await this.prisma.location.update({
      where: {
        id: locationId,
      },
      data: locationData,
    });

    return {
      success: true,
      message: 'Location updated successfully',
      data: updatedLocation,
    };
  }

  // detele saved location
  async deleteSavedLocation(userId: string, locationId: string) {
    const location = await this.prisma.location.findFirst({
      where: {
        id: locationId,
        user_id: userId,
      },
    });

    if (!location) {
      return {
        success: false,
        message: 'Location not found',
      };
    }

    await this.prisma.location.delete({
      where: {
        id: locationId,
      },
    });

    return {
      success: true,
      message: 'Location deleted successfully',
    };
  }


}





  