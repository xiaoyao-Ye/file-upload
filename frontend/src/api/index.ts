import axios, { AxiosRequestConfig } from 'axios';

const service = axios.create({
  baseURL: 'http://localhost:1024/',
  // withCredentials: true, // send cookies when cross-domain requests
  timeout: 10000 // request timeout
})

service.interceptors.response.use(
  response => {
    const res = response.data
    if (res.code !== 200) {
      console.log('err' + res.message || 'Error')
      return Promise.reject(new Error(res.message || 'Error'))
    } else {
      return res.data;
    }
  },
  error => {
    console.log('err' + error) // for debug
    return Promise.reject(error)
  }
)

// 响应拦截直接返回了 data , 这里重新定义一下 request 的响应类型
export const request = <T = any, D = any>(config: AxiosRequestConfig<D>): Promise<T> => {
  return service.request<any, T>(config)
}