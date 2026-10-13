import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import { TanvirStorage } from '../../lib/Disk/TanvirStorage';
import appConfig from '../../../config/app.config';

const prisma = new PrismaClient();

export type PushNotificationJob = {
  receiverId: string;
  notificationId: string;
  type: string;
  text: string;
  entityId: string;
  token?: string;
};

export type NotificationType =
  | 'new user registration'
  | 'profile update'
  | 'email verification'
  | 'forgot password'
  | 'account_verification'
  | 'verification_approved'
  | 'verification_rejected'
  | 'danger request'
  | 'account_action'
  | 'create booking'
  | 'approve_booking'
  | 'complete_booking'
  | 'started booking'
  | 'submitted_job'
  | 'approve_job_submission'
  | 'reject_job_submission'
  | 'cancel booking'
  | 'cleaner_verification_update'
  | 'review_booking'
  | 'update_commission'
  | 'update_booking'
  | (string & {});

export interface NotificationRoutingInfo {
  title: string;
  action_type: string;
  entity_type: string;
  route: string;
  metadata: {
    entity_id: string | null;
    entity_type: string;
    action_type: string;
    route: string;
  };
}

export interface StandardNotificationSender {
  id: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  avatar_url: string | null;
}

export interface StandardNotification {
  id: string;
  title: string;
  text: string;
  message: string;
  type: string;
  action_type: string;
  entity_id: string | null;
  entity_type: string;
  route: string;
  metadata: {
    entity_id: string | null;
    entity_type: string;
    action_type: string;
    route: string;
  };
  is_read: boolean;
  read_at: Date | null;
  created_at: Date;
  updated_at: Date;
  sender: StandardNotificationSender | null;
  receiver_id: string | null;
}

export class NotificationRepository {
  private static pushQueue: Queue<PushNotificationJob> | undefined;
  private static realtimePublisher?: (
    receiverId: string | null,
    notification: StandardNotification,
  ) => Promise<void> | void;

  static configurePushQueue(queue: Queue<PushNotificationJob>) {
    this.pushQueue = queue;
  }

  static configureRealtimePublisher(
    publisher: (
      receiverId: string | null,
      notification: StandardNotification,
    ) => Promise<void> | void,
  ) {
    this.realtimePublisher = publisher;
  }

  /**
   * Derive standardized routing, entity type, and human title from notification event
   */
  static getRoutingInfo(
    type?: string | null,
    entity_id?: string | null,
  ): NotificationRoutingInfo {
    const rawType = (type || 'general').trim();
    const action_type = rawType.toLowerCase().replace(/[\s-]+/g, '_');
    const safeEntityId = entity_id || null;

    let entity_type = 'general';
    let route = '/notifications';

    if (action_type.includes('booking') || action_type.includes('job')) {
      entity_type = 'booking';
      route = safeEntityId ? `/bookings/${safeEntityId}` : '/bookings';
    } else if (action_type.includes('review')) {
      entity_type = 'review';
      route = safeEntityId ? `/reviews/${safeEntityId}` : '/reviews';
    } else if (action_type.includes('verification')) {
      entity_type = 'verification';
      route = safeEntityId ? `/verification/${safeEntityId}` : '/verification';
    } else if (action_type.includes('chat') || action_type.includes('message')) {
      entity_type = 'chat';
      route = safeEntityId ? `/chat/${safeEntityId}` : '/chat';
    } else if (action_type.includes('commission')) {
      entity_type = 'commission';
      route = '/settings/commission';
    } else if (
      action_type.includes('user') ||
      action_type.includes('profile') ||
      action_type.includes('account') ||
      action_type.includes('email') ||
      action_type.includes('password')
    ) {
      entity_type = 'user';
      route = safeEntityId ? `/users/${safeEntityId}` : '/profile';
    }

    const title = this.getNotificationTitle(rawType);

    return {
      title,
      action_type,
      entity_type,
      route,
      metadata: {
        entity_id: safeEntityId,
        entity_type,
        action_type,
        route,
      },
    };
  }

  /**
   * Formats a raw Prisma Notification model into a standardized, rich client payload
   */
  static formatNotification(notification: any): StandardNotification {
    const eventType =
      notification?.notification_event?.type || notification?.type || 'general';
    const eventText =
      notification?.notification_event?.text || notification?.text || '';
    const entityId = notification?.entity_id || notification?.entityId || null;

    const routeInfo = this.getRoutingInfo(eventType, entityId);
    const isRead = Boolean(notification?.read_at);

    let sender: StandardNotificationSender | null = null;
    if (notification?.sender) {
      const avatar = notification.sender.avatar || null;
      let avatar_url: string | null = null;
      if (avatar) {
        try {
          avatar_url = TanvirStorage.url(
            appConfig().storageUrl.avatar + '/' + avatar,
          );
        } catch {
          avatar_url = null;
        }
      }

      sender = {
        id: notification.sender.id,
        name: notification.sender.name || null,
        email: notification.sender.email || null,
        avatar,
        avatar_url,
      };
    }

    return {
      id: notification.id,
      title: routeInfo.title,
      text: eventText,
      message: eventText,
      type: eventType,
      action_type: routeInfo.action_type,
      entity_id: entityId,
      entity_type: routeInfo.entity_type,
      route: routeInfo.route,
      metadata: routeInfo.metadata,
      is_read: isRead,
      read_at: notification.read_at || null,
      created_at: notification.created_at,
      updated_at: notification.updated_at,
      sender,
      receiver_id: notification.receiver_id || null,
    };
  }

  // create notification
  static async createNotification(payload: {
    sender_id?: string | null;
    receiver_id: string;
    text: string;
    type: NotificationType;
    entity_id: string;
  }): Promise<StandardNotification> {
    let { sender_id, receiver_id, text, type, entity_id } = payload;
    const safeSenderId = sender_id === 'system' ? null : (sender_id ?? null);

    try {
      let notificationEvent = await prisma.notificationEvent.findFirst({
        where: { type, text },
      });

      if (!notificationEvent) {
        notificationEvent = await prisma.notificationEvent.create({
          data: { type, text },
        });
      }

      const newNotification = await prisma.notification.create({
        data: {
          sender_id: safeSenderId,
          receiver_id,
          entity_id,
          notification_event_id: notificationEvent.id,
        },
        include: {
          sender: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          notification_event: {
            select: { id: true, type: true, text: true },
          },
        },
      });

      const formattedNotification = this.formatNotification(newNotification);

      // Realtime WebSocket delivery
      if (this.realtimePublisher) {
        try {
          await this.realtimePublisher(receiver_id, formattedNotification);
        } catch (realtimeErr) {
          console.error(
            `Unable to publish realtime notification ${newNotification.id}:`,
            realtimeErr,
          );
        }
      }

      // Background push delivery (FCM)
      if (!this.pushQueue) {
        console.error(
          'Push queue is not configured; notification is saved to the inbox only.',
        );
      } else {
        try {
          await this.pushQueue.add(
            'deliver',
            {
              receiverId: receiver_id,
              notificationId: newNotification.id,
              type,
              text,
              entityId: entity_id,
            },
            {
              attempts: 8,
              backoff: { type: 'exponential', delay: 2000 },
              jobId: `notification-${newNotification.id}`,
              removeOnComplete: { age: 86400, count: 10000 },
              removeOnFail: false,
            },
          );
        } catch (error) {
          console.error(
            `Unable to queue push notification ${newNotification.id}; it remains available in the inbox.`,
            error,
          );
        }
      }

      return formattedNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // get notification title based on type
  static getNotificationTitle(type: string): string {
    const normalizedType = (type || '').toLowerCase().replace(/[\s-]+/g, '_');
    const titles: Record<string, string> = {
      new_user_registration: 'New User Registration',
      new_user_created: 'New User Created',
      email_verification: 'Email Verification',
      forgot_password: 'Password Reset',
      account_verification: 'Account Verification',
      verification_approved: 'Verification Approved',
      verification_rejected: 'Verification Rejected',
      profile_update: 'Profile Updated',
      danger_request: 'Security Alert',
      account_action: 'Account Action',

      create_booking: 'Booking Created',
      approve_booking: 'Booking Approved',
      complete_booking: 'Booking Completed',
      started_booking: 'Job Started',
      started_job: 'Job Started',
      submitted_job: 'Job Submitted',
      approve_job_submission: 'Job Submission Approved',
      reject_job_submission: 'Job Submission Rejected',
      cancel_booking: 'Booking Cancelled',
      review_booking: 'Booking Reviewed',
      update_booking: 'Booking Updated',
      cleaner_verification_update: 'Cleaner Verification Updated',
      update_commission: 'Commission Updated',
    };

    if (titles[normalizedType]) {
      return titles[normalizedType];
    }

    return (
      normalizedType
        .split('_')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ') || 'New Notification'
    );
  }

  static getPushNotificationTitle(type: string): string {
    return this.getNotificationTitle(type);
  }
}
