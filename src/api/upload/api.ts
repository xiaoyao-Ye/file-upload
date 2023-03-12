import service from "..";

/** 上传文件 */
export const uploadFile = async (fd: FormData, index: number) => {
  return await service.request({
    url: '/upload',
    method: 'post',
    data: fd,
    onUploadProgress: (progressEvent) => {
      console.log('index: ', index);
      console.log(progressEvent);
      console.log("progress: ", progressEvent.loaded / progressEvent.total!);
    }
  })
  // return await service.post('/upload', fd, {});
  // return await service.post('/upload', { data: fd });
}

export const mergeChunks = async (data: { fileName: string, fileHash: string, size: number }) => {
  return await service.post('/merge', data);
}