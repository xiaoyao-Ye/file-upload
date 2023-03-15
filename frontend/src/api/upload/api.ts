import { AxiosProgressEvent } from "axios";
import { request } from "../index";

/** 上传文件 */
export const uploadFile = async (fd: FormData, callback: (progressEvent: AxiosProgressEvent) => void) => {
  return await request({
    url: '/upload',
    method: 'post',
    data: fd,
    onUploadProgress: (progressEvent) => {
      callback(progressEvent);
    }
  })
}

export const mergeChunks = async (data: { fileName: string, fileHash: string, size: number }) => {
  return await request({ url: '/merge', method: 'post', data });
}

export const verifyFile = async (data: { fileName: string, fileHash: string }) => {
  return await request({ url: '/verify', method: 'post', data });
}

export const deleteAll = async () => {
  return await request({ url: '/delete', method: 'delete' });
}