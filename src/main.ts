// external imports
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import helmet from 'helmet';
import { join, resolve } from 'path';
// internal imports
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import { CustomExceptionFilter } from './common/exception/custom-exception.filter';
import { TanvirStorage } from './common/lib/Disk/TanvirStorage';
import appConfig from './config/app.config';
import { PrismaExceptionFilter } from './common/exception/prisma-exception.filter';
import initializeFirebase from './config/firebase.config';

async function bootstrap() {
  // initialize Firebase Admin SDK early so `admin` is ready for services
  initializeFirebase();
 
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

 
  app.useWebSocketAdapter(new IoAdapter(app));
  app.setGlobalPrefix('api');
  app.enableCors();
  app.use(helmet());

  // Global body size limit – 50 MB (same as multer fileSize limit)
  app.use(
    express.json({
      limit: '50mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
 

  app.useStaticAssets(join(__dirname, "..", "..", "public"), {
    index: false,
    prefix: "/public",
  });
 // global
 app.useGlobalPipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false,
    transformOptions: {
      enableImplicitConversion: true,
    },
    exceptionFactory: (errors) => {
      const messages = errors
        .map((error) => Object.values(error.constraints || {}))
        .flat()
        .join(', ');

      return new BadRequestException({
        success: false,
        message: messages,
      });
    },
  }),
);
  
  app.useGlobalFilters(
    new CustomExceptionFilter(),
    new PrismaExceptionFilter(),  
  );

  const expressApp = app.getHttpAdapter().getInstance();

  expressApp.get('/success', (req, res) => {
    const sessionId = String(req.query.session_id || '');
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Payment Successful</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f4faf7; color: #163126; }
    .card { background: #fff; border: 1px solid #d8efe1; border-radius: 16px; padding: 32px; max-width: 520px; width: calc(100% - 32px); box-shadow: 0 12px 30px rgba(0,0,0,.08); text-align: center; }
    h1 { margin: 0 0 12px; color: #11824d; }
    p { margin: 8px 0; line-height: 1.5; }
    .session { word-break: break-all; font-size: 12px; background: #eef7f1; padding: 10px 12px; border-radius: 10px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Payment successful</h1>
    <p>Your deposit has been completed successfully.</p>
    <p class="session">Session ID: ${sessionId || 'N/A'}</p>
  </div>
</body>
</html>`;

    res.status(200).send(html);
  });

  expressApp.get('/failed', (req, res) => {
    res.status(200).send('<!doctype html><html><body style="font-family: Arial, sans-serif; padding: 40px;"><h1>Payment failed</h1><p>Your payment was not completed.</p></body></html>');
  });

  // storage setup
  TanvirStorage.config({
    driver: 'local',
    connection: {
      rootUrl: appConfig().storageUrl.rootUrl,
      publicUrl: appConfig().storageUrl.rootUrlPublic,
      awsBucket: appConfig().fileSystems.s3.bucket,
      awsAccessKeyId: appConfig().fileSystems.s3.key,
      awsSecretAccessKey: appConfig().fileSystems.s3.secret,
      awsDefaultRegion: appConfig().fileSystems.s3.region,
      awsEndpoint: appConfig().fileSystems.s3.endpoint,
      minio: true,
    },
  });

  // swagger
  const options = new DocumentBuilder()
    .setTitle(`${process.env.APP_NAME} api`)
    .setDescription(`${process.env.APP_NAME} api docs`)
    .setVersion('1.0')
    .addTag(`${process.env.APP_NAME}`)
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api/docs', app, document);
 

  const host = process.env.HOST?.trim() || appConfig().app.host || '0.0.0.0';
  const port = Number.parseInt(process.env.PORT ?? String(appConfig().app.port), 10) || 4000;

  await app.listen(port, host);
}
bootstrap();
