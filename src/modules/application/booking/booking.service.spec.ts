import { Test, TestingModule } from '@nestjs/testing';
import { BookingService } from './booking.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateBookingAcceptOrRejectDto } from './dto/update-booking-acceptorreject.dto';
import { sendUserNotification } from 'src/common/utils/notification.util';

jest.mock('src/common/utils/notification.util', () => ({
  sendAdminNotification: jest.fn(),
  sendUserNotification: jest.fn(),
}));

describe('BookingService', () => {
  let service: BookingService;
  let prisma: {
    booking: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = {
      booking: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BookingService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<BookingService>(BookingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('notifies the homeowner when the cleaner confirms a booking', async () => {
    const booking = {
      id: 'booking-1',
      maid_id: 'cleaner-1',
      user_id: 'homeowner-1',
      booking_date: new Date('2026-10-01T00:00:00Z'),
      status: 'PENDING',
    };
    prisma.booking.findUnique.mockResolvedValue(booking);
    prisma.booking.update.mockResolvedValue({
      ...booking,
      status: 'CONFIRMED',
    });

    const dto = Object.assign(new UpdateBookingAcceptOrRejectDto(), {
      status: 'CONFIRMED',
    });
    await service.updateBookingStatusAcceptOrRejectByMaid(
      'cleaner-1',
      'booking-1',
      dto,
    );

    expect(sendUserNotification).toHaveBeenCalledWith({
      sender_id: 'cleaner-1',
      receiver_id: 'homeowner-1',
      text: expect.stringContaining('booking-1'),
      type: 'approve_booking',
      entity_id: 'booking-1',
    });
  });

  it('returns the booking rating and message when a review exists', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      booking_date: new Date('2026-10-01T00:00:00Z'),
      slot: 'A',
      maid_latitude: null,
      maid_longitude: null,
      homeowner_latitude: null,
      homeowner_longitude: null,
      total_price: 125,
      status: 'COMPLETED',
      cancle_reason: null,
      before_photos: [],
      after_photos: [],
      maid: {
        id: 'cleaner-1',
        name: 'Cleaner',
        location: null,
        avatar: null,
      },
      user: {
        id: 'homeowner-1',
        name: 'Homeowner',
        email: 'homeowner@example.com',
      },
      residential_cleaning_package: null,
      booking_reviews: [{ rating: 5, comment: 'Excellent service' }],
    });

    const result = await service.getBookingDetails('booking-1');

    expect(result.data).toMatchObject({
      is_reviewed: true,
      review: {
        rating: 5,
        comment: 'Excellent service',
      },
    });
  });

  it('returns null review details when no rating exists', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      booking_date: new Date('2026-10-01T00:00:00Z'),
      slot: 'A',
      maid_latitude: null,
      maid_longitude: null,
      homeowner_latitude: null,
      homeowner_longitude: null,
      total_price: 125,
      status: 'COMPLETED',
      cancle_reason: null,
      before_photos: [],
      after_photos: [],
      maid: {
        id: 'cleaner-1',
        name: 'Cleaner',
        location: null,
        avatar: null,
      },
      user: {
        id: 'homeowner-1',
        name: 'Homeowner',
        email: 'homeowner@example.com',
      },
      residential_cleaning_package: null,
      booking_reviews: [],
    });

    const result = await service.getBookingDetails('booking-1');

    expect(result.data).toMatchObject({
      is_reviewed: false,
      review: null,
    });
  });
});
