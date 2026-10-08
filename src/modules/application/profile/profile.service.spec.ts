import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from './profile.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('ProfileService', () => {
  let service: ProfileService;
  let prisma: { user: { findFirst: jest.Mock } };

  beforeEach(async () => {
    prisma = { user: { findFirst: jest.fn() } };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns the admin contact fields', async () => {
    const admin = {
      id: 'admin-id',
      name: 'Admin',
      email: 'admin@example.com',
      phone_number: '1234567890',
    };
    prisma.user.findFirst.mockResolvedValue(admin);

    await expect(service.getAdminDetails()).resolves.toEqual({
      success: true,
      data: admin,
    });
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { type: 'ADMIN' },
      select: {
        id: true,
        name: true,
        email: true,
        phone_number: true,
      },
    });
  });

  it('returns not found when no admin exists', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(service.getAdminDetails()).resolves.toEqual({
      success: false,
      message: 'Admin not found',
    });
  });
});
