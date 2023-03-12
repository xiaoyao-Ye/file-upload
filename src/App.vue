<template>
  <div>
    <input type="file" :accept="accept" :multiple="multiple" @change="handleFileUpload">
    <button @click="onSubmit">upload</button>
  </div>
</template>

<script setup lang="ts">
import SparkMD5 from 'spark-md5';
import { ref } from 'vue';
import { mergeChunks, uploadFile } from './api/upload/api';

/** 分片大小 */
const SIZE = 5 * 1024 * 1024;
// const accept = '.jpg, .jpeg, .png';
const accept = '';
const multiple = false;
const selectedFile = ref<File | null>(null);

const handleFileUpload = async (event: Event) => {
  selectedFile.value = (<HTMLInputElement>event.target).files?.[0] ?? null;
  console.log('handleFileUpload', selectedFile.value)
}

const onSubmit = async () => {
  console.log('onSubmit')
  if (!selectedFile.value) return;
  const chunks = createFileChunk(selectedFile.value);
  console.log('chunks', chunks);
  const hash = await calculateHash(chunks);
  console.log('hash', hash);
  await uploadChunks(chunks, hash);
  await mergeChunks({ fileHash: hash, fileName: selectedFile.value?.name ?? '' })
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

const uploadChunks = async (chunks: Blob[] = [], hash: string) => {
  const requestList = chunks.map((chunk, index) => {
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('hash', `${hash}-${index}`);
    formData.append('fileName', selectedFile.value?.name ?? '');
    // formData.append('fileHash', hash);
    return { formData, index };
  }).map(({ formData, index }) => {
    return uploadFile(formData, index);
  });
  console.log('requestList', requestList);
  await Promise.all(requestList);
}

</script>

<style scoped></style>
