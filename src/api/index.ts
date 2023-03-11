import axios from 'axios';

const service = axios.create({
  baseURL: 'http://localhost:3000/',
  // withCredentials: true, // send cookies when cross-domain requests
  timeout: 10000 // request timeout
})

export default service