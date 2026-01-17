import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['debug', 'error'],
  });

  const configService = app.get(ConfigService);

  const port = configService.get<number>('NODE_PORT', 3000);
  await app.listen(port, '0.0.0.0');

  Logger.debug(
    `This application is running on: ${await app.getUrl()}`,
  );
}
bootstrap();
