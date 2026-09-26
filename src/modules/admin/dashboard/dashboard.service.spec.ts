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
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
      },
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
});
