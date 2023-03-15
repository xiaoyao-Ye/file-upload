import { Req, Controller, Get, Post, Body, Delete } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('/upload')
  async upload(@Req() req) {
    return await this.appService.saveChunk(req);
  }

  @Post('/merge')
  async mergeChunks(@Body() body) {
    return await this.appService.mergeChunks(body);
  }

  @Post('/verify')
  async verifyFile(@Body() body) {
    return await this.appService.verifyFile(body);
  }

  @Delete('/delete')
  async deleteAll() {
    return await this.appService.deleteAll();
  }
}
