<template>
  <div>
    <!-- 单文件 -->
    <el-card class="box-card">
      <input type="file" ref="fileRef" :disabled="status !== Status.wait" @change="handleFileUpload" />
      <el-button @click="handleUpload" :disabled="uploadDisabled">upload</el-button>
      <el-button v-if="status === Status.pause" @click="handleResume">resume</el-button>
      <el-button v-else :disabled="status !== Status.uploading || !hash" @click="handlePause">pause</el-button>
      <el-button @click="handleDelete">delete all</el-button>

      <div style="height: 2em;">
        <span style="font-size: 14px;color:#ccc;">只能上传 XXX/XXX/XXX 格式的文件, 并且大小不能超过5MB</span>
      </div>

      <div>
        <div>calculate chunk Hash</div>
        <el-progress :percentage="calcChunkPercentage" />
        <div>upload percentage</div>
        <el-progress :percentage="uploadPercentage" />
      </div>

    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { deleteAll, mergeChunks, uploadFile, verifyFile } from './api/upload/api';
import { limitQueue } from './hook/upload';

enum Status {
  wait = "wait",
  pause = "pause",
  uploading = "uploading",
};
const status = ref(Status.wait);
const hash = ref<string>('');

const fileRef = ref();
/** 默认文件名 */
const FILE_NAME = 'file';
/** 限制类型(用accept也可以, 但是都没有利用二进制信息判断安全) */
const TYPE = ['image/png', 'image/jpeg', 'image/gif'];
/** 限制文件大小 */
const MAX_SIZE = 5 * 1024 * 1024;
/** 分片大小 */
// const SIZE = 5 * 1024;
const SIZE = 5 * 1024 * 1024;
const selectedFile = ref<File | null>(null);

/** 切片进度 */
const calcChunkPercentage = ref(0);
/** 上传进度 */
const uploadPercentage = ref(0);
/** 分片列表 */
interface Chunk {
  chunk: Blob;
  hash?: string;
  fileName?: string;
  fileHash?: string;
}
const chunks = ref<Chunk[]>([]);
/** 请求列表 */
const requestList = ref<(() => Promise<any>)[]>([]);
const worker = ref<Worker | null>(null);

const uploadDisabled = computed(() => [Status.pause, Status.uploading].includes(status.value))

const handleFileUpload = async (event: Event) => {
  const file = (<HTMLInputElement>event.target).files?.[0];
  if (!file) return selectedFile.value = null;
  // if (!TYPE.includes(file.type)) return ElMessage({ message: '文件类型错误!', type: 'error' });
  // if (file.size > MAX_SIZE) return ElMessage({ message: '文件大小不能超过5MB!', type: 'error' });
  console.log('handleFileUpload', file)
  selectedFile.value = file;
}

const handleResume = async () => {
  status.value = Status.uploading;
  const { chunkList } = await verifyFile({ fileHash: hash.value, fileName: selectedFile.value?.name ?? FILE_NAME })
    .catch(() => { status.value = Status.pause; });
  await uploadChunks(chunkList);
}

const handlePause = () => {
  status.value = Status.pause;
  // TODO: 取消请求, 这里理论上应该使用axios的cancelToken
  // 暂时先这样, 当前这种暂停方式只能取消未发出去的请求, 发送中的请求无法取消
  requestList.value.length = 0;
  console.log('handlePause', requestList.value);
  if (worker.value) worker.value.onmessage = null;

}

const handleDelete = () => {
  ElMessageBox.confirm(
    '确认删除所有上传内容吗?',
    '温馨提示',
    { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' }
  )
    .then(async () => {
      await deleteAll()
      ElMessage({ type: 'success', message: 'Delete completed' })
    })
}

const handleUpload = async () => {
  console.log('handleUpload')
  if (!selectedFile.value) return ElMessage({ message: '请选择文件', type: 'error' });
  status.value = Status.uploading;
  uploadPercentage.value = 0;
  const fileChunkList = createFileChunk(selectedFile.value);
  console.log('chunks', fileChunkList);
  hash.value = await calculateHash(fileChunkList);
  console.log('hash', hash.value);

  const { needUpload, chunkList } = await verifyFile({ fileHash: hash.value, fileName: selectedFile.value?.name ?? FILE_NAME })
    .catch(() => { status.value = Status.wait; });
  if (!needUpload) {
    status.value = Status.wait;
    uploadPercentage.value = 100;
    return ElMessage({ message: '上传成功.', type: 'success' });
  }


  chunks.value = fileChunkList.map(({ chunk }, index: number) => ({
    chunk: chunk,
    hash: `${hash.value}-${index}`,
    fileName: selectedFile.value?.name ?? FILE_NAME,
    fileHash: hash.value,
  }))

  await uploadChunks(chunkList);
}

const createFileChunk = (file: File, size = SIZE) => {
  const chunks = [];
  let cur = 0;
  while (cur < file.size) {
    chunks.push({ chunk: file.slice(cur, cur + size) });
    cur += size;
  }
  return chunks;
}

const calculateHash = async (fileChunkList: Chunk[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    worker.value = new Worker('../public/hash.js');
    worker.value.postMessage({ chunks: fileChunkList });
    worker.value.onmessage = (e) => {
      const { percentage, hash } = e.data;
      calcChunkPercentage.value = Math.round(percentage);
      if (hash) resolve(hash);
    }
  })
}

const uploadChunks = async (chunkList: string[] = []) => {
  let uploadCount = 0;
  requestList.value = chunks.value
    .filter(({ hash }) => !chunkList.includes(hash!))
    .map((file) => {
      const formData = new FormData();
      formData.append('chunk', file.chunk);
      formData.append('hash', file.hash!);
      formData.append('fileName', file.fileName!);
      formData.append('fileHash', file.fileHash!);
      return { formData };
    })
    .map(({ formData }) => {
      return () => uploadFile(formData, (progressEvent) => {
        const chunkPercentage = progressEvent.loaded / progressEvent.total!
        if (chunkPercentage === 1) {
          uploadCount++;
          uploadPercentage.value = Math.round((uploadCount) / chunks.value.length * 100);
        }
        console.log(`uploadPercentage: `, uploadPercentage.value);
      });
    });
  console.log('requestList count: ', requestList.value.length);
  // await Promise.all(requestList.value)

  try {
    const result = await limitQueue(requestList.value, 4);
    console.log('result', result);
    // 如果上传过程中暂停, 则不合并
    if (status.value === Status.pause) return;
    const mergeOptions = { fileHash: hash.value, fileName: selectedFile.value?.name ?? FILE_NAME, size: SIZE }
    await mergeChunks(mergeOptions);
    uploadPercentage.value = 100;
    ElMessage({ message: '上传成功.', type: 'success' })
    status.value = Status.wait;
  } catch (error) {
    status.value = Status.wait;
  }
}

</script>

<style scoped>
.box-card {
  /* width: 50%; */
}
</style>
