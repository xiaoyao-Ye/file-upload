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

  getFileType(fileName: string) {
    const index = fileName.lastIndexOf('.');
    if (index === -1) return '';
    return fileName.slice(index);
  }

  getStorageName(fileHash, fileName) {
    return `${fileHash}${this.getFileType(fileName)}`;
  }

  getHello(): string {
    return 'Hello World!';
  }

  async saveChunk(req) {
    const form = new Form();
    return new Promise((res) => {
      form.parse(req, async (err, fields, files) => {
        if (err) throw new Error('parse error: ' + err);
        const [hash] = fields.hash;
        const [fileHash] = fields.fileHash;
        const [fileName] = fields.fileName;
        const [chunk] = files.chunk;

        const storageName = this.getStorageName(fileHash, fileName);
        const filePath = resolve(this.UPLOAD_DIR, storageName);
        const chunkDir = resolve(this.UPLOAD_DIR, fileHash);
        const chunkPath = resolve(chunkDir, hash);

        /** 文件存在直接返回 */
        if (existsSync(filePath)) return { code: 200, message: 'file exist!' };
        /** 切片存在直接返回 */
        if (existsSync(chunkPath)) return { code: 200, message: 'chunk exist!' };

        if (!existsSync(chunkDir)) {
          await mkdirs(chunkDir, { mode: 0o2775 });
        }

        await move(chunk.path, chunkPath);
        // chunk.path 位置会存在一个临时文件, 需要清理, 否则占用磁盘c空间 (定时器定时清理? 目前是每次move完毕即清理)
        await remove(chunk.path);
        // return { code: 200, message: 'Upload completed!' };
        res({ code: 200, message: 'Upload chunk completed!' });
      });
    });
  }

  async mergeChunks({ fileName, fileHash, size }) {
    const storageName = this.getStorageName(fileHash, fileName);
    const chunkDir = resolve(this.UPLOAD_DIR, fileHash);
    const filePath = resolve(this.UPLOAD_DIR, storageName);
    // 过滤出所有的chunk文件
    let chunkPaths = await readdir(chunkDir);
    chunkPaths = chunkPaths.filter((chunkPath) => chunkPath.includes(fileHash));
    chunkPaths.sort((a, b) => a.split('-')[1] - b.split('-')[1]);
    try {
      await Promise.all(
        chunkPaths.map((chunkPath, index) => {
          const chunk = readFileSync(`${chunkDir}/${chunkPath}`);
          // 合并chunk文件
          const writer = createWriteStream(filePath, { start: size * index });
          writer.write(chunk);
          writer.end();
          // fse.outputFile(filePath, chunk)
        }),
      );
      // 删除chunk文件夹
      await remove(chunkDir);
      // const path = `/static/upload/${fileName}`;
      const data = this.getStaticFilePath(storageName);
      return { code: 200, data, message: 'Upload completed!' };
    } catch (error) {
      console.log(error);
    }
  }

  async verifyFile({ fileName, fileHash }) {
    const storageName = this.getStorageName(fileHash, fileName);
    const filePath = resolve(this.UPLOAD_DIR, storageName);
    if (existsSync(filePath)) {
      const data = this.getStaticFilePath(storageName);
      return {
        code: 200,
        data: { ...data, needUpload: false },
        message: 'Upload completed!',
      };
    } else {
      const chunkDir = resolve(this.UPLOAD_DIR, fileHash);
      const chunkList = existsSync(chunkDir) ? await readdir(chunkDir) : [];
      return {
        code: 200,
        data: { chunkList, needUpload: true },
        message: 'Merge completed!',
      };
    }
  }

  async deleteAll() {
    await remove(resolve(this.UPLOAD_DIR));
    return { code: 200, message: 'Remove completed!' };
  }
}
