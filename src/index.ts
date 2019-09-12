// @ts-ignore (no typings in axios)
import * as settle from 'axios/lib/core/settle'
import axios, {
  AxiosRequestConfig,
  AxiosResponse,
  AxiosInstance,
  AxiosAdapter,
} from 'axios'

function nextTick() {
  return new Promise(resolve => setTimeout(resolve))
}

export interface ClientResponse<T = any> {
  data: T
  status: number
  statusText?: string
  headers?: any
  config?: AxiosRequestConfig
  request?: any
}

type HTTPMethod = 'get' | 'delete' | 'head' | 'post' | 'put' | 'patch'

export interface Endpoint<T = any> {
  url: string
  filter?: (config: AxiosRequestConfig) => boolean
  response(config: { data: any; headers: any }): ClientResponse<T>
  method?: HTTPMethod
  headers?: any
}

export interface MockClient extends AxiosInstance {
  mock(endpoint: Endpoint): MockClient
  waitForPendingRequests(): Promise<void>
}

function getHttpClientCreationStackTrace(): string | undefined {
  try {
    throw new Error()
  } catch (e) {
    const stack = e && e.stack
    return stack
      .split('\n')
      .slice(1)
      .join('\n')
  }
}

function createErrorMessage(url: string, position: string | undefined) {
  return [
    `Call to ${url} is unmocked. Mock it with client.mock('${url}', ...)`,
    position,
  ]
    .filter(Boolean)
    .join('\n')
}

function parseData (data:any) {
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) { /* Ignore */ }
  }
  return data;
}

function createAxiosClientMock(axiosConfig?: AxiosRequestConfig): MockClient {
  const endpoints: Endpoint[] = []
  const position = getHttpClientCreationStackTrace()

  const adapter: AxiosAdapter = config => {
    if (!config.url) {
      throw new Error('Url is required for request')
    }

    const url = config.url.replace(config.baseURL || '', '')
    
    const requestData = {
      params: config.params,
      data: config.data && parseData(config.data),
    }

    const endpoint = endpoints.find(endp => {
      const urlMatches = endp.url === url
      const methodMatches = !endp.method || endp.method === config.method
      const doesGuardMatch = () => !endp.filter || endp.filter(requestData)
      return urlMatches && methodMatches && doesGuardMatch()
    })

    if (!endpoint) {
      const errorMessage = createErrorMessage(url, position)
      console.warn(errorMessage)
      throw new Error(errorMessage)
    }

    const request = {
      ...requestData,
      headers: { ...config.headers, ...endpoint.headers },
    }

    const response: AxiosResponse = {
      statusText: '',
      headers: {},
      ...endpoint.response(request),
      config,
    }

    return new Promise((resolve, reject) => {
      settle(resolve, reject, response)
    })
  }

  async function waitForPendingRequests() {
    // Все запросы резолвятся в микротасках, поэтому нет смысла считать,
    // сколько в конкретный момент выполняется — после выполнения всех
    // микротасков все запросы будут завершёны.
    await nextTick()
  }

  const client: MockClient = Object.assign(
    axios.create({ ...axiosConfig, adapter }),
    {
      mock(endpoint: Endpoint) {
        endpoints.unshift(endpoint)
        return client
      },
      waitForPendingRequests,
    }
  )

  return client
}

export default { create: createAxiosClientMock }
