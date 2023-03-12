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
      // const [fileHash] = fields.fileHash;
      const [fileName] = fields.fileName;
      const [chunk] = files.chunk;
      const filePath = path.resolve(UPLOAD_DIR, `${fileName}` + SUFFIX);

      if (!fse.existsSync(filePath)) await fse.mkdirs(filePath, { mode: 0o2775 });

      // TODO: file.path 位置会存在一个临时文件, 需要清理, 否则占用磁盘c空间
      // TODO: 查询如何将windows的临时文件改成c盘以外的其他盘存放
      // TODO: 先判断文件是否存在, 如果存在则不再写入, 并告诉前端当前文件已存在(或者让前端先调用接口判断是否已存在, 存在则秒传)
      await fse.move(chunk.path, `${filePath}/${hash}`);

      res.end('Upload completed!');
    });
  }

  async mergeChunks(req: any, res: any) {
    const data: any = await this.getData(req);
    const { fileName, fileHash } = data;
    const filePath = path.resolve(UPLOAD_DIR, fileName + SUFFIX);
    // 过滤出所有的chunk文件
    let chunkPaths = await fse.readdir(filePath)
    chunkPaths = chunkPaths.filter((chunkPath) => chunkPath.includes(fileHash));
    chunkPaths.sort((a, b) => a.split('-')[1] - b.split('-')[1]);
    try {
      await Promise.all(
        chunkPaths.map((chunkPath) => {
          const chunk = fse.readFileSync(`${filePath}/${chunkPath}`)
          // fse.mkdirs(filePath)
          // 合并chunk文件
          fse.outputFile(filePath, chunk)
        })
      )
      res.end('Merge completed!');
      // TODO: 合并后删除chunk文件?
    } catch (error) {
      console.log(error);
    }

  }
}

const controller = new UploadController();

export default controller