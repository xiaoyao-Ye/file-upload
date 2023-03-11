<template>
  <div>
    <input type="file" :accept="accept" :multiple="multiple" @change="handleFileUpload">
    <button @click="onSubmit">upload</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { uploadFile } from './api/upload/api';

const accept = '.jpg, .jpeg, .png';
const multiple = false;
const selectedFile = ref<File | null>(null);

const handleFileUpload = async (event: Event) => {
  selectedFile.value = (<HTMLInputElement>event.target).files?.[0] ?? null;
  console.log('handleFileUpload', selectedFile.value)
}

const onSubmit = async () => {
  console.log('onSubmit')
  if (!selectedFile.value) return;
  const fd = new FormData();
  fd.append('file', selectedFile.value);
  const res = await uploadFile(fd);
  console.log('uploadFile', res);
}

</script>

<style scoped></style>
