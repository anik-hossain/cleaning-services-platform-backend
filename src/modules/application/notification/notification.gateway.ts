import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import * as jwt from 'jsonwebtoken';
import { NotificationService } from './notification.service';
import {
  NotificationRepository,
  StandardNotification,
} from 'src/common/repository/notification/notification.repository';
import appConfig from '../../../config/app.config';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit
{
  @WebSocketServer()
  server: Server;

  private redisPubClient: Redis;
  private redisSubClient: Redis;

  // Track connected userId -> socketId
  private clients = new Map<string, string>();

  constructor(private readonly notificationService: NotificationService) {}

  onModuleInit() {
    this.redisPubClient = new Redis({
      host: appConfig().redis.host,
      port: Number(appConfig().redis.port),
      password: appConfig().redis.password,
    });

    this.redisSubClient = new Redis({
      host: appConfig().redis.host,
      port: Number(appConfig().redis.port),
      password: appConfig().redis.password,
    });

    this.redisSubClient.subscribe('notification', (err) => {
      if (err) {
        console.error('Failed to subscribe to redis notification channel:', err);
      }
    });

    this.redisSubClient.on('message', (channel, message) => {
      try {
        if (channel === 'notification') {
          const payload = JSON.parse(message);
          const notification = payload.notification || payload;
          const receiverId =
            payload.receiver_id ?? payload.userId ?? payload.receiverId ?? null;

          if (receiverId) {
            // Deliver privately to user's room (supports multi-device/multi-tab)
            this.server
              .to(`user_${receiverId}`)
              .emit('receiveNotification', notification);

            // Also deliver directly to socket if mapped
            const targetSocketId = this.clients.get(String(receiverId));
            if (targetSocketId) {
              this.server
                .to(targetSocketId)
                .emit('receiveNotification', notification);
            }
          } else {
            // System or admin broadcast
            this.server.to('admin').emit('receiveNotification', notification);
          }
        }
      } catch (err: any) {
        console.error('Error handling redis notification:', err.message);
      }
    });

    // Wire repository so all backend actions trigger real-time delivery
    NotificationRepository.configureRealtimePublisher(
      async (receiverId: string | null, notification: StandardNotification) => {
        await this.publishNotification(receiverId, notification);
      },
    );
  }

  afterInit(server: Server) {
    console.log('Notification Websocket server started');
  }

  async publishNotification(
    receiverId: string | null,
    notification: StandardNotification | any,
  ) {
    try {
      if (this.redisPubClient) {
        await this.redisPubClient.publish(
          'notification',
          JSON.stringify({
            receiver_id: receiverId,
            notification,
          }),
        );
      }
    } catch (error: any) {
      console.error('Error publishing notification to Redis:', error.message);
    }
  }

  async handleConnection(client: Socket, ...args: any[]) {
    try {
      const authHeader = client.handshake.headers?.authorization?.toString();
      const token =
        (client.handshake.auth?.token as string) ||
        authHeader?.replace(/^Bearer\s+/i, '') ||
        (client.handshake.query?.token as string) ||
        '';

      let userId = client.handshake.query?.userId as string;
      let isAdmin = client.handshake.query?.isAdmin === 'true';

      if (token) {
        try {
          const decoded: any = jwt.verify(token, appConfig().jwt.secret);
          userId = decoded.sub || decoded.userId || decoded.id || userId;
          if (decoded.type === 'ADMIN') {
            isAdmin = true;
          }
        } catch (tokenErr: any) {
          console.warn(
            'Notification socket token verification warning:',
            tokenErr.message,
          );
        }
      }

      if (userId) {
        this.clients.set(String(userId), client.id);
        client.join(`user_${userId}`);
        console.log(
          `User ${userId} connected to notification socket (socketId: ${client.id})`,
        );
      }

      if (isAdmin) {
        client.join('admin');
        console.log(`Socket ${client.id} joined admin notification room`);
      }
    } catch (error: any) {
      console.error('Notification socket connection error:', error.message);
    }
  }

  async handleDisconnect(client: Socket) {
    for (const [userId, socketId] of this.clients.entries()) {
      if (socketId === client.id) {
        this.clients.delete(userId);
        console.log(`User ${userId} disconnected from notification socket`);
        break;
      }
    }
  }

  @SubscribeMessage('sendNotification')
  async handleNotification(@MessageBody() data: any) {
    const receiverId =
      data.receiver_id || data.userId || data.receiverId || null;
    await this.publishNotification(receiverId, data);
  }

  @SubscribeMessage('join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    if (data?.userId) {
      this.clients.set(String(data.userId), client.id);
      client.join(`user_${data.userId}`);
      console.log(`Socket ${client.id} joined user_${data.userId}`);
    }
    if (data?.isAdmin) {
      client.join('admin');
      console.log(`Socket ${client.id} joined admin room`);
    }
  }
}
