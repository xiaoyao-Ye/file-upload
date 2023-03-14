import { Injectable } from '@nestjs/common';
import {
  existsSync,
  mkdirs,
  move,
  remove,
  readdir,
  readFileSync,
  createWriteStream,
} from 'fs-extra';
import { resolve } from 'path';
import { Form } from 'multiparty';

@Injectable()
export class AppService {
  /** 文件存储目录 */
  UPLOAD_DIR: string;
  constructor() {
    this.UPLOAD_DIR = resolve(__dirname, '../', 'public', 'upload');
  }

  getStaticFilePath(fileName: string) {
    const path = `/static/upload/${fileName}}`;
    // TODO: http://localhost:1024
    return { path, url: `http://localhost:1024${path}` };
  }

  getHello(): string {
    return 'Hello World!';
  }

  async saveChunk(req) {
    const form = new Form();
    return new Promise((res) => {
      form.parse(req, async (err, fields, files) => {
        if (err) throw new Error('parse error: ' + err);
        // console.log(fields);
        // console.log(files);
        const [hash] = fields.hash;
        const [fileHash] = fields.fileHash;
        const [fileName] = fields.fileName;
        const [chunk] = files.chunk;

        const filePathDir = resolve(this.UPLOAD_DIR, `${fileName}-${fileHash}`);

        if (!existsSync(filePathDir)) {
          await mkdirs(filePathDir, { mode: 0o2775 });
        }

        // TODO: 先判断文件是否存在, 如果存在则不再写入, 并告诉前端当前文件已存在(或者让前端先调用接口判断是否已存在, 存在则秒传)
        await move(chunk.path, `${filePathDir}/${hash}`);
        // chunk.path 位置会存在一个临时文件, 需要清理, 否则占用磁盘c空间 (定时器定时清理? 目前是每次move完毕即清理)
        await remove(chunk.path);
        // return { code: 200, message: 'Upload completed!' };
        res({ code: 200, message: 'Upload chunk completed!' });
      });
    });
  }

  async mergeChunks({ fileName, fileHash, size }) {
    const filePathDir = resolve(this.UPLOAD_DIR, `${fileName}-${fileHash}`);
    // const filePath = resolve(this.UPLOAD_DIR, fileName);
    const filePath = resolve(this.UPLOAD_DIR, `${fileHash}-${fileName}`);
    // 过滤出所有的chunk文件
    let chunkPaths = await readdir(filePathDir);
    chunkPaths = chunkPaths.filter((chunkPath) => chunkPath.includes(fileHash));
    chunkPaths.sort((a, b) => a.split('-')[1] - b.split('-')[1]);
    try {
      await Promise.all(
        chunkPaths.map((chunkPath, index) => {
          const chunk = readFileSync(`${filePathDir}/${chunkPath}`);
          // 合并chunk文件
          const writer = createWriteStream(filePath, { start: size * index });
          writer.write(chunk);
          writer.end();
          // fse.outputFile(filePath, chunk)
        }),
      );
      // 删除chunk文件夹
      await remove(filePathDir);
      // const path = `/static/upload/${fileName}`;
      const data = this.getStaticFilePath(`${fileHash}-${fileName}`);
      return { code: 200, data, message: 'Upload completed!' };
    } catch (error) {
      console.log(error);
    }
  }

  async verifyFile({ fileName, fileHash }) {
    const filePath = resolve(this.UPLOAD_DIR, `${fileHash}-${fileName}`);
    if (existsSync(filePath)) {
      const data = this.getStaticFilePath(`${fileHash}-${fileName}`);
      return {
        code: 200,
        data: { ...data, needUpload: false },
        message: 'Upload completed!',
      };
    } else {
      const filePathDir = resolve(this.UPLOAD_DIR, `${fileName}-${fileHash}`);
      const chunkList = existsSync(filePathDir)
        ? await readdir(filePathDir)
        : [];
      return {
        code: 200,
        data: { chunkList, needUpload: true },
        message: 'Merge completed!',
      };
    }
  }
}
