# file-upload

上传大文件

1. 普通文件上传(前端上传图片/文件, 服务器做持久化存储后返回链接) [考点: 图片文件信息, 文件大小校验, 字符串和十六进制ascii码]
  1.1 优化项: 进度条, 成功后弹窗提示
  1.2 可扩展: 拖拽上传, 粘贴上传
  1.3 安全问题: 上传文件类型限制(光靠文件名限制不安全, 可重命名越过限制, 最好使用文件二进制数据信息判断类型), 上传文件大小限制
2. 大文件分片上传 [考点: Blob.slice 切片, 断点续传, 秒传, 怎么判断文件是否存在]
  2.1 切片上传 -
  2.2 断点续传(询问后端是否部分切片已存在, 已存在的前端不需要再次上传, 全部上传完毕后后端把文件拼在一起还原文件) -
  2.3 秒传(文件已经上传过, 服务器已经有了, 无需再次上传, 通过文件hash值判断) -
    2.3.1 文件太大, 无法一次性读取到内存中, 无法计算hash值, 怎么处理?
    2.3.2 通过 web-worker 计算文件hash值 -
    2.3.3 通过 时间切片计算md5值 -
    2.3.4 通过 抽样哈希(比较偏门) -
  2.4 并发数控制(浏览器并发6, 控制为4, 预留2) + 错误重试(比如网络波动, 重试3次) (本身就是一个面试题)
  2.5 慢启动(先上传一个块, 后续根据上传块的时间去调整块的大小)
3. 思考:
  3.1 碎片清理
  3.2 文件碎片存储在多个机器上
  3.3 文件碎片备份
  3.4 兼容性更好的 requestIdleCallback
  3.5 并发 + 慢启动
  3.6 抽样hash + 全量hash双重判断
  3.7 websocket 推送
  3.8 cdn...
