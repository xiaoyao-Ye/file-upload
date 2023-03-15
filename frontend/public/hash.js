// import script for encrypted computing
self.importScripts("/spark-md5.min.js");

self.onmessage = function (e) {
  const { chunks } = e.data;
  const chunkPercentage = (100 / chunks.length);
  const spark = new SparkMD5.ArrayBuffer();
  let percentage = 0;

  function loadNext(index) {
    if (index >= chunks.length) {
      console.log('All chunks have been uploaded');
      self.postMessage({
        percentage: 100,
        hash: spark.end()
      });
      self.close();
    }
    const fileReader = new FileReader();
    fileReader.readAsArrayBuffer(chunks[index]);
    fileReader.onload = (e) => {
      percentage += chunkPercentage;
      self.postMessage({ percentage });
      spark.append(e.target.result);
      loadNext(index + 1);
    };
  }
  loadNext(0);
}