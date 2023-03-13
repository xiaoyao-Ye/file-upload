import { AxiosProgressEvent } from "axios";
import service from "..";

/** 上传文件 */
export const uploadFile = async (fd: FormData, callback: (progressEvent: AxiosProgressEvent) => void) => {
  return await service.request({
    url: '/upload',
    method: 'post',
    data: fd,
    onUploadProgress: (progressEvent) => {
      callback(progressEvent);
    }
  })
}

export const mergeChunks = async (data: { fileName: string, fileHash: string, size: number }) => {
  return await service.post('/merge', data);
}