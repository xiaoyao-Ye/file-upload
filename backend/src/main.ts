import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  /** 配置静态资源服务器 */
  app.useStaticAssets(join(__dirname, '..', 'public'), { prefix: '/static/' });

  /** 跨域 */
  app.enableCors();

  await app.listen(1024, () => {
    console.log('server running in: http://localhost:1024');
  });
}
bootstrap();
