import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  await app.listen(1024, () => {
    console.log('server running in: http://localhost:1024');
  });
}
bootstrap();
