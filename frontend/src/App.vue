<template>
  <div>
    <!-- 单文件 -->
    <el-card class="box-card">
      <input type="file" ref="fileRef" :disabled="loading" @change="handleFileUpload" />
      <el-button @click="onSubmit" :loading="loading">upload</el-button>
      <div v-show="!loading">只能上传 XXX/XXX/XXX 格式的文件, 并且大小不能超过5MB</div>
      <div v-show="loading"><el-progress :percentage="percentage" /></div>

      <!-- <div v-show="selectedFile"> 文件名: {{ selectedFile.name }} <el-button type="danger" @click="handleDelete">remove</el-button> </div> -->
      <br />
      <br />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import SparkMD5 from 'spark-md5';
import { mergeChunks, uploadFile, verifyFile } from './api/upload/api';
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
/** 上传进度 */
const percentage = ref(0);
const loading = ref(false);

const handleFileUpload = async (event: Event) => {
  const file = (<HTMLInputElement>event.target).files?.[0];
  if (!file) return selectedFile.value = null;
  if (!TYPE.includes(file.type)) return ElMessage({ message: '文件类型错误!', type: 'error' });
  if (file.size > MAX_SIZE) return ElMessage({ message: '文件大小不能超过2MB!', type: 'error' });
  console.log('handleFileUpload', file)
  selectedFile.value = file;
}

// const handleDelete = () => {
//   selectedFile.value = null;
//   fileRef.value.value = '';
//   // percentage.value = 0;
// }

const onSubmit = async () => {
  console.log('onSubmit')
  if (!selectedFile.value) return ElMessage({ message: '请选择文件', type: 'error' });
  loading.value = true;
  percentage.value = 0;
  const chunks = createFileChunk(selectedFile.value);
  console.log('chunks', chunks);
  const hash = await calculateHash(chunks);
  console.log('hash', hash);

  try {
    const { needUpload, chunkList } = await verifyFile({ fileHash: hash, fileName: selectedFile.value?.name ?? FILE_NAME });
    if (!needUpload) {
      loading.value = false;
      percentage.value = 100;
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
    const spark = new SparkMD5.ArrayBuffer();
    chunks.forEach((chunk, index) => {
      const fileReader = new FileReader();
      fileReader.readAsArrayBuffer(chunk);
      fileReader.onload = (e) => {
        spark.append(e.target?.result as ArrayBuffer);
      }
    });
    resolve(spark.end());
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
        console.log(`----------------${index} ----------------:`);
        console.log(`loaded :`, progressEvent.loaded);
        console.log(`total :`, progressEvent.total);
        const chunkPercentage = progressEvent.loaded / progressEvent.total!
        console.log(`chunkPercentage: `, chunkPercentage);
        // if (chunkPercentage === 1) percentage.value = Math.round((index + 1) / chunks.length * 100);
        if (chunkPercentage === 1) {
          // OnProgress 可能好几个请求一起调用 index 不一定准确, 所以用 uploadCount 来计算
          uploadCount++;
          percentage.value = Math.round((uploadCount) / chunks.length * 100);
        }
        console.log(`percentage: `, percentage.value);
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
  width: 50%;
}
</style>
