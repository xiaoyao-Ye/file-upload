import service from "..";

/** 上传文件 */
export const uploadFile = async (fd: FormData) => {
  return await service.post('/upload', fd);
  // return await service.post('/upload', { data: fd });
}