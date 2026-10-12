import { createHash } from 'crypto';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import * as admin from 'firebase-admin';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  NotificationRepository,
  PushNotificationJob,
} from 'src/common/repository/notification/notification.repository';

@Processor('push-notifications')
export class NotificationPushProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationPushProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('push-notifications')
    private readonly queue: Queue<PushNotificationJob>,
  ) {
    super();
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<PushNotificationJob>, error: Error) {
    this.logger.error(
      `Push job ${job.id} failed on attempt ${job.attemptsMade}: ${error.message}`,
    );
  }

  async process(job: Job<PushNotificationJob>) {
    const user = await this.prisma.user.findUnique({
      where: { id: job.data.receiverId },
      select: {
        fcm_token: true,
        push_tokens: { select: { token: true } },
      },
    });

    const tokens = [
      ...new Set(
        [
          user?.fcm_token,
          ...(user?.push_tokens.map(({ token }) => token) ?? []),
        ].filter((token): token is string => Boolean(token)),
      ),
    ];

    if (tokens.length === 0) {
      this.logger.debug(
        `No registered push tokens for user ${job.data.receiverId}`,
      );
      return;
    }

    if (job.data.token && !tokens.includes(job.data.token)) {
      this.logger.debug(
        `Push token is no longer registered to user ${job.data.receiverId}`,
      );
      return;
    }

    if (!job.data.token) {
      await Promise.all(
        tokens.map((token) =>
          this.queue.add(
            'deliver',
            { ...job.data, token },
            {
              attempts: 8,
              backoff: { type: 'exponential', delay: 2000 },
              jobId: `token-${job.data.notificationId}-${createHash('sha256')
                .update(token)
                .digest('hex')}`,
              removeOnComplete: { age: 86400, count: 10000 },
              removeOnFail: false,
            },
          ),
        ),
      );
      this.logger.log(
        `Queued push notification ${job.data.notificationId} for ${tokens.length} device(s)`,
      );
      return;
    }

    if (!admin.apps.length) {
      throw new Error(
        'Firebase Admin is not initialized. Configure the Firebase service-account environment variables.',
      );
    }

    const message = {
      notification: {
        title: NotificationRepository.getPushNotificationTitle(job.data.type),
        body: job.data.text,
      },
      data: {
        entity_id: String(job.data.entityId),
        notification_id: job.data.notificationId,
        type: job.data.type,
      },
      android: {
        priority: 'high' as const,
        notification: { sound: 'default' },
      },
      apns: {
        headers: { 'apns-priority': '10' },
        payload: { aps: { sound: 'default' } },
      },
      webpush: {
        fcmOptions: {
          link: `${(process.env.CLIENT_APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/notifications`,
        },
      },
    };
    const messaging = admin.messaging();
    try {
      await messaging.send({ ...message, token: job.data.token });
    } catch (error) {
      const firebaseError = error as admin.FirebaseError;
      if (
        firebaseError.code === 'messaging/invalid-registration-token' ||
        firebaseError.code === 'messaging/registration-token-not-registered'
      ) {
        await this.prisma.$transaction([
          this.prisma.pushToken.deleteMany({
            where: { token: job.data.token },
          }),
          this.prisma.user.updateMany({
            where: {
              id: job.data.receiverId,
              fcm_token: job.data.token,
            },
            data: { fcm_token: null, device_type: null },
          }),
        ]);
        this.logger.warn(
          `Removed invalid FCM token for user ${job.data.receiverId}`,
        );
        return;
      }

      throw error;
    }

    this.logger.log(
      `Push notification ${job.data.notificationId} sent to one device`,
    );
  }
}
