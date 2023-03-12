import multiparty from 'multiparty'
const path = require("path");
const fse = require("fs-extra");

// const SUFFIX = '$file'; // 文件后缀
const SUFFIX = ''; // 文件后缀
const UPLOAD_DIR = path.resolve(__dirname, './', 'target'); // 文件存储目录

class UploadController {
  constructor() {

  }

  getData(req: any) {
    return new Promise(resolve => {
      let res = "";
      req.on("data", data => {
        res += data;
      });
      req.on("end", () => {
        resolve(JSON.parse(res));
      });
    });
  }

  async saveChunk(req: any, res: any) {
    const form = new multiparty.Form();
    form.parse(req, async (err, fields, files) => {
      if (err) throw new Error("parse error: " + err);
      console.log(fields);
      console.log(files);
      const [hash] = fields.hash;
      const [fileHash] = fields.fileHash;
      const [fileName] = fields.fileName;
      const [chunk] = files.chunk;
      const filePathDir = path.resolve(UPLOAD_DIR, `${fileName}-${fileHash}` + SUFFIX);

      if (!fse.existsSync(filePathDir)) await fse.mkdirs(filePathDir, { mode: 0o2775 });

      // TODO: 先判断文件是否存在, 如果存在则不再写入, 并告诉前端当前文件已存在(或者让前端先调用接口判断是否已存在, 存在则秒传)
      await fse.move(chunk.path, `${filePathDir}/${hash}`);
      // chunk.path 位置会存在一个临时文件, 需要清理, 否则占用磁盘c空间 (定时器定时清理? 目前是每次move完毕即清理)
      await fse.remove(chunk.path);

      res.end('Upload completed!');
    });
  }

  async mergeChunks(req: any, res: any) {
    const data: any = await this.getData(req);
    const { fileName, fileHash, size } = data;
    const filePathDir = path.resolve(UPLOAD_DIR, `${fileName}-${fileHash}` + SUFFIX);
    const filePath = path.resolve(UPLOAD_DIR, fileName + SUFFIX);
    // 过滤出所有的chunk文件
    let chunkPaths = await fse.readdir(filePathDir)
    chunkPaths = chunkPaths.filter((chunkPath) => chunkPath.includes(fileHash));
    chunkPaths.sort((a, b) => a.split('-')[1] - b.split('-')[1]);
    try {
      await Promise.all(
        chunkPaths.map((chunkPath, index) => {
          const chunk = fse.readFileSync(`${filePathDir}/${chunkPath}`)
          // 合并chunk文件
          const writer = fse.createWriteStream(filePath, { start: size * index })
          writer.write(chunk)
          writer.end()
          // fse.outputFile(filePath, chunk)
        })
      )
      // 删除chunk文件夹
      await fse.remove(filePathDir);
      res.end('Merge completed!');
      // TODO: 合并后删除chunk文件?
    } catch (error) {
      console.log(error);
    }

  }
}

const controller = new UploadController();

export default controller