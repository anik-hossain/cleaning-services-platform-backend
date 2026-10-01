import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: {
    user: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
    };
    booking: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
      },
      booking: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('marks incomplete cleaner applications as drafts', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'complete-cleaner',
        name: 'Complete Cleaner',
        email: 'complete@example.com',
        phone_number: '123456789',
        avatar: null,
        location: 'City',
        address: '123 Main St',
        cleanerVerification: [
          {
            created_at: new Date('2026-09-26T00:00:00Z'),
            status: 'PENDING',
            id_card_front: 'front.jpg',
            id_card_back: 'back.jpg',
            resume: 'resume.pdf',
            rejected_reason: null,
          },
        ],
      },
      {
        id: 'draft-cleaner',
        name: null,
        email: null,
        phone_number: null,
        avatar: null,
        location: null,
        address: null,
        cleanerVerification: [],
      },
    ]);
    prisma.user.count.mockResolvedValue(2);

    const result = await service.getAllCleanerRequests({} as any);

    expect(result.data.data.map((item) => item.status)).toEqual([
      'pending',
      'draft',
    ]);
    expect(result.data.data[1]).toMatchObject({
      id: 'draft-cleaner',
      location: 'N/A',
      address: null,
      applied_date: null,
    });
  });

  it('returns profile details for a draft without a verification record', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'draft-cleaner',
      name: null,
      email: null,
      phone_number: null,
      location: null,
      address: null,
      cleanerVerification: [],
    });

    const result = await service.getCleanerRequestById('draft-cleaner');

    expect(result).toMatchObject({
      success: true,
      data: {
        id: 'draft-cleaner',
        verification_id: null,
        status: 'draft',
        address: null,
        id_card_front_url: null,
        id_card_back_url: null,
        resume_url: null,
      },
    });
  });

  it('returns booking details with payment transactions and status history', async () => {
    prisma.booking.findFirst.mockResolvedValue({
      id: 'booking-1',
      total_price: 125,
      revenue: null,
      payment_status: 'COMPLETED',
      residential_cleaning_package: null,
      payment_transaction: [
        { id: 'transaction-1', amount: 125, paid_amount: 125 },
      ],
      payment_status_history: [
        { id: 'history-1', previous_status: 'PENDING', status: 'COMPLETED' },
      ],
    });

    const result = await service.getBookingDetails('booking-1');

    expect(result.data).toMatchObject({
      id: 'booking-1',
      payment: {
        status: 'COMPLETED',
        transactions: [{ id: 'transaction-1', amount: 125, paid_amount: 125 }],
        status_history: [
          { id: 'history-1', previous_status: 'PENDING', status: 'COMPLETED' },
        ],
      },
    });
  });

  it('returns the raw booking id alongside its display id', async () => {
    prisma.booking.findMany.mockResolvedValue([
      {
        id: 'booking-1',
        created_at: new Date('2026-09-30T00:00:00Z'),
        booking_date: new Date('2026-10-01T00:00:00Z'),
        slot: 'A',
        homeowner_location: 'Home address',
        status: 'CONFIRMED',
        total_price: 125,
        user: { id: 'homeowner-1', name: 'Homeowner', location: null },
        maid: { id: 'cleaner-1', name: 'Cleaner' },
        residential_cleaning_package: { title: 'Standard', duration: '2 hours' },
      },
    ]);
    prisma.booking.count.mockResolvedValue(1);

    const result = await service.getAllBookings({} as any);

    expect(result.data.data[0]).toMatchObject({
      id: 'BK - booking-1 ',
      booking_id: 'booking-1',
    });
  });

  it('records the previous payment status and admin when status changes', async () => {
    const tx = {
      booking: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'booking-1',
          payment_status: 'PENDING',
        }),
        update: jest.fn().mockResolvedValue({
          id: 'booking-1',
          payment_status: 'COMPLETED',
        }),
      },
      bookingPaymentStatusHistory: {
        create: jest.fn().mockResolvedValue({}),
      },
    };
    prisma.$transaction.mockImplementation((callback) => callback(tx));

    await service.updateBookingPaymentStatus(
      'booking-1',
      { status: 'COMPLETED' } as any,
      'admin-1',
    );

    expect(tx.bookingPaymentStatusHistory.create).toHaveBeenCalledWith({
      data: {
        booking_id: 'booking-1',
        previous_status: 'PENDING',
        status: 'COMPLETED',
        changed_by: 'admin-1',
      },
    });
  });
});
