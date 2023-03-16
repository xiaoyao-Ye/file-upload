export const limitQueue = async (requestList: (() => Promise<any>)[], limit: number) => {
  let result: Promise<any>[] = [];
  for (let i = 0; i < requestList.length; i += limit) {
    const list = requestList.slice(i, i + limit);
    const batchResults = await Promise.all(list.map((item) => item()));
    result.push(...batchResults);
  }
  return result;
}

// 下面两种方式都可以实现限制并发数, 但是都是第一批请求完成就直接返回结果了, 而不是等到所有请求都完成才返回结果
// export async function limitQueue(list: (() => Promise<any>)[], limit: number) {
//   let index = 0;
//   let completeCount = 0;
//   const queue: Promise<any>[] = [];
//   const run = () => {
//     while (queue.length - completeCount < limit && index < list.length) {
//     // while (queue.length < limit && index < list.length) {
//       const promise = list[index++]();
//       queue.push(promise);
//       promise.then(() => {
//         completeCount++;
//         // queue.splice(queue.indexOf(promise), 1);
//         run();
//       });
//     }
//   };
//   run();
//   return await Promise.all(queue);
// }

// export function limitQueue(list: Promise<any>[], limit: number, handle: (item: any) => Promise<any>) {
//   let index = 0;
//   const queue: Promise<any>[] = [];
//   const run = () => {
//     while (queue.length < limit && index < list.length) {
//       const promise = handle(list[index++]);
//       queue.push(promise);
//       promise.then(() => {
//         queue.splice(queue.indexOf(promise), 1);
//         run();
//       });
//     }
//   };
//   run();
//   return Promise.all(queue);
// }