<template>
  <div>
    <!-- 单文件 -->
    <el-card class="box-card">
      <input type="file" ref="fileRef" :disabled="loading" @change="handleFileUpload" />
      <el-button @click="handleUpload" :loading="loading">upload</el-button>
      <el-button @click="handleDelete">delete all</el-button>

      <div style="height: 2em;">
        <span v-show="!loading" style="font-size: 14px;color:#ccc;">只能上传 XXX/XXX/XXX 格式的文件, 并且大小不能超过5MB</span>
      </div>

      <div v-show="loading || uploadPercentage === 100">
        <div>calculate chunk Hash</div>
        <el-progress :percentage="calcChunkPercentage" />
        <div>upload percentage</div>
        <el-progress :percentage="uploadPercentage" />
      </div>

    </el-card>
  </div>
</template>

<script setup lang="ts">
import { deleteAll, mergeChunks, uploadFile, verifyFile } from './api/upload/api';
import { limitQueue } from './hook/upload';

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
const loading = ref(false);

const handleFileUpload = async (event: Event) => {
  const file = (<HTMLInputElement>event.target).files?.[0];
  if (!file) return selectedFile.value = null;
  // if (!TYPE.includes(file.type)) return ElMessage({ message: '文件类型错误!', type: 'error' });
  // if (file.size > MAX_SIZE) return ElMessage({ message: '文件大小不能超过5MB!', type: 'error' });
  console.log('handleFileUpload', file)
  selectedFile.value = file;
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
  loading.value = true;
  uploadPercentage.value = 0;
  const chunks = createFileChunk(selectedFile.value);
  console.log('chunks', chunks);
  const hash = await calculateHash(chunks);
  console.log('hash', hash);

  try {
    const { needUpload, chunkList } = await verifyFile({ fileHash: hash, fileName: selectedFile.value?.name ?? FILE_NAME });
    if (!needUpload) {
      loading.value = false;
      uploadPercentage.value = 100;
      return ElMessage({ message: '上传成功.', type: 'success' });
    }

    await uploadChunks(chunks, hash, chunkList);
    const mergeOptions = { fileHash: hash, fileName: selectedFile.value?.name ?? FILE_NAME, size: SIZE }
    await mergeChunks(mergeOptions);
    ElMessage({ message: '上传成功.', type: 'success' })
  } finally {
    loading.value = false;
  }
}

const createFileChunk = (file: File, size = SIZE) => {
  const chunks: Blob[] = [];
  let cur = 0;
  while (cur < file.size) {
    chunks.push(file.slice(cur, cur + size));
    cur += size;
  }
  return chunks;
}

const calculateHash = async (chunks: Blob[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    const worker = new Worker('../public/hash.js');
    worker.postMessage({ chunks });
    worker.onmessage = (e) => {
      const { percentage, hash } = e.data;
      calcChunkPercentage.value = Math.round(percentage);
      if (hash) resolve(hash);
    }
  })
}

const uploadChunks = async (chunks: Blob[] = [], hash: string, chunkList: string[]) => {
  let uploadCount = 0;
  const requestList = chunks.map((chunk, index) => {
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('hash', `${hash}-${index}`);
    formData.append('fileName', selectedFile.value?.name ?? FILE_NAME);
    formData.append('fileHash', hash);
    return { formData, hash: `${hash}-${index}`, index };
  })
    .filter(({ hash }) => !chunkList.includes(hash))
    .map(({ formData, index }) => {
      return () => uploadFile(formData, (progressEvent) => {
        // console.log(`----------------${index} ----------------:`);
        // console.log(`loaded :`, progressEvent.loaded);
        // console.log(`total :`, progressEvent.total);
        const chunkPercentage = progressEvent.loaded / progressEvent.total!
        // console.log(`chunkPercentage: `, chunkPercentage);
        // if (chunkPercentage === 1) uploadPercentage.value = Math.round((index + 1) / chunks.length * 100);
        if (chunkPercentage === 1) {
          // OnProgress 可能好几个请求一起调用 index 不一定准确, 所以用 uploadCount 来计算
          uploadCount++;
          uploadPercentage.value = Math.round((uploadCount) / chunks.length * 100);
        }
        console.log(`uploadPercentage: `, uploadPercentage.value);
      });
    });
  console.log('requestList count: ', requestList.length);
  // await Promise.all(requestList)
  const result = await limitQueue(requestList, 4);
  console.log('result', result);
}

</script>

<style scoped>
.box-card {
  /* width: 50%; */
}
</style>
