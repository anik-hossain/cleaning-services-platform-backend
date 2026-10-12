import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';

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
  | 'update_booking';

export class NotificationRepository {
  private static pushQueue: Queue<PushNotificationJob> | undefined;

  static configurePushQueue(queue: Queue<PushNotificationJob>) {
    this.pushQueue = queue;
  }

  // create notification
  static async createNotification(payload: {
    sender_id?: string | null;
    receiver_id: string;
    text: string;
    type: NotificationType;
    entity_id: string;
  }) {
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
      });

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

      return newNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // get notification title based on type
  private static getNotificationTitle(type: string): string {
    const normalizedType = type.toLowerCase().replace(/[\s-]+/g, '_');
    const titles: Record<string, string> = {
      new_user_registration: 'New User Registration',
      new_user_created: 'New User Created',
      email_verification: 'Email Verification',
      account_verification: 'Account Verification',
      verification_approved: 'Verification Approved',
      verification_rejected: 'Verification Rejected',
      profile_update: 'Profile Updated',
      danger_request: 'Danger Request',
      account_action: 'Account Action',

      create_booking: 'Booking Created',
      approve_booking: 'Booking Approved',
      complete_booking: 'Booking Completed',
      started_job: 'Job Started',
      submitted_job: 'Job Submitted',
      approve_job_submission: 'Job Submission Approved',
      reject_job_submission: 'Job Submission Rejected',
      cancel_booking: 'Booking Cancelled',
      review_booking: 'Booking Reviewed',
      update_booking: 'Booking Updated',
    };

    return titles[normalizedType] || 'New Notification';
  }

  static getPushNotificationTitle(type: string): string {
    return this.getNotificationTitle(type);
  }
}
