import multiparty from 'multiparty'
const path = require("path");
const fse = require("fs-extra");

const SUFFIX = '$file'; // 文件后缀
const UPLOAD_DIR = path.resolve(__dirname, './', 'target'); // 文件存储目录

class UploadController {
  constructor() {

  }

  async uploadFile(req: any, res: any) {
    const form = new multiparty.Form();
    form.parse(req, async (err, fields, files) => {
      if (err) throw new Error("parse error: " + err);
      console.log(fields);
      console.log(files);
      const [file] = files.file;
      const fileName = file.originalFilename;
      const chunkDir = path.resolve(UPLOAD_DIR, fileName + SUFFIX);

      if (!fse.existsSync(chunkDir)) await fse.mkdirs(chunkDir);

      await fse.move(file.path, `${chunkDir}/${fileName}`);

      res.end('Upload completed!');
    });
  }
}

const controller = new UploadController();

export default controller