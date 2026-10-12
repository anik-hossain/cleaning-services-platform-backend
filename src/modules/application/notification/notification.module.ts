import { Global, Module } from '@nestjs/common';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  NotificationRepository,
  PushNotificationJob,
} from 'src/common/repository/notification/notification.repository';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationGateway } from './notification.gateway';
import { NotificationPushProcessor } from './notification-push.processor';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: 'push-notifications' })],
  controllers: [NotificationController],
  providers: [
    NotificationGateway,
    NotificationService,
    NotificationPushProcessor,
    {
      provide: 'NOTIFICATION_PUSH_QUEUE_SETUP',
      inject: [getQueueToken('push-notifications')],
      useFactory: (queue: Queue<PushNotificationJob>) => {
        NotificationRepository.configurePushQueue(queue);
      },
    },
  ],
  exports: [NotificationGateway, NotificationService],
})
export class NotificationModule {}
