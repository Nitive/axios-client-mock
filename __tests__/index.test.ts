import axiosMock from '../src'

describe('Мок HTTP клиента', () => {
  it('должен мокать все запросы по дефолту', async () => {
    const data = { example: true }
    const client = axiosMock.create().mock({
      url: '/api/data',
      response() {
        return {
          status: 200,
          data,
        }
      },
    })

    await Promise.all([
      expect(client.get('/api/data').then(res => res.data)).resolves.toEqual(
        data
      ),
      expect(client.head('/api/data').then(res => res.data)).resolves.toEqual(
        data
      ),
      expect(client.post('/api/data').then(res => res.data)).resolves.toEqual(
        data
      ),
      expect(client.patch('/api/data').then(res => res.data)).resolves.toEqual(
        data
      ),
      expect(client.put('/api/data').then(res => res.data)).resolves.toEqual(
        data
      ),
      expect(client.delete('/api/data').then(res => res.data)).resolves.toEqual(
        data
      ),
    ])
  })

  it('должен реджектить промис при статус коде 500', async () => {
    const data = { example: true }
    const client = axiosMock.create().mock({
      url: '/api/data',
      response() {
        return {
          status: 500,
          data,
        }
      },
    })

    expect(client.get('/api/data')).rejects.toThrow(
      'Request failed with status code 500'
    )
  })

  it('должен реджектить промис и выдавать ошибку в консоль, если попытаться обратиться к незамоканному адресу', async () => {
    const client = axiosMock.create()
    const errorMessage =
      "Call to /api/not-found is unmocked. Mock it with client.mock('/api/not-found', ...)"
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      await client.get('/api/not-found')
    } catch (err) {
      expect(err.toString()).toContain(errorMessage)
    }

    expect(consoleWarn).toHaveBeenCalledTimes(1)
    expect(consoleWarn.mock.calls[0][0]).toContain(errorMessage)
    consoleWarn.mockRestore()
  })

  it('должен добавлять к ошибке стектрейс, в котором указывается строка, где создан axios mock', async () => {
    const client = axiosMock.create()
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      await client.get('/api/not-found')
    } catch (err) {
      expect(err.toString()).toContain(__filename)
    }

    expect(consoleWarn).toHaveBeenCalledTimes(1)
    expect(consoleWarn.mock.calls[0][0]).toContain(__filename)
    consoleWarn.mockRestore()
  })

  it('должен мокать только указаный метод, если указать его в опциях', async () => {
    const data = { example: true }
    const client = axiosMock.create().mock({
      url: '/api/data',
      method: 'get',
      response() {
        return {
          status: 200,
          data,
        }
      },
    })
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    await Promise.all([
      expect(client.get('/api/data').then(res => res.data)).resolves.toEqual(
        data
      ),
      expect(client.head('/api/data')).rejects.toThrow(),
      expect(client.post('/api/data')).rejects.toThrow(),
      expect(client.patch('/api/data')).rejects.toThrow(),
      expect(client.put('/api/data')).rejects.toThrow(),
      expect(client.delete('/api/data')).rejects.toThrow(),
    ])

    consoleWarn.mockRestore()
  })

  it('должен позволять мокать несколько ручек', async () => {
    const client = axiosMock
      .create()
      .mock({
        url: '/api/v1/data',
        response() {
          return {
            status: 200,
            data: 1,
          }
        },
      })
      .mock({
        url: '/api/v2/data',
        response() {
          return {
            status: 200,
            data: 2,
          }
        },
      })

    await Promise.all([
      expect(client.get('/api/v1/data').then(res => res.data)).resolves.toEqual(
        1
      ),
      expect(client.get('/api/v2/data').then(res => res.data)).resolves.toEqual(
        2
      ),
    ])
  })

  it('должен позволять мокать заголовки ответа', async () => {
    const client = axiosMock.create().mock({
      url: '/api/v1/data',
      response() {
        return {
          status: 200,
          data: 1,
          headers: {
            'response-header': '123',
          },
        }
      },
    })

    const result = await client.get('/api/v1/data')
    expect(result.headers['response-header']).toBe('123')
  })

  it('должен передавать заголовки запроса', async () => {
    const client = axiosMock.create().mock({
      url: '/api/v1/data',
      headers: {
        'request-header': '123',
      },
      response({ headers }) {
        expect(headers['request-header']).toBe('123')

        return {
          status: 200,
          data: 1,
        }
      },
    })

    const result = await client.get('/api/v1/data')
    expect(result.data).toBe(1)
  })

  it('должен передавать данные запроса как json', async () => {
    const client = axiosMock.create().mock({
      method: 'post',
      url: '/api/v1/data',
      response({ data }) {
        expect(data).toEqual({ example: 1 })
        return {
          status: 200,
          data: 1,
        }
      },
    })

    const result = await client.post('/api/v1/data', { example: 1 })
    expect(result.data).toBe(1)
  })

  it('не должен требовать проставлять base url в моках', async () => {
    const data = { example: true }
    const client = axiosMock.create({ baseURL: '/base-url' }).mock({
      url: '/api/data',
      response() {
        return {
          status: 200,
          data,
        }
      },
    })

    await expect(
      client.get('/api/data').then(res => res.data)
    ).resolves.toEqual(data)
  })

  it('не должен добавлять base url в ошибку', async () => {
    const client = axiosMock.create({ baseURL: '/base-url' })
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      await client.get('/unmocked')
    } catch (err) {
      expect(err.toString).not.toContain('/base-url')
    }

    expect(consoleWarn).toHaveBeenCalledTimes(1)
    expect(consoleWarn.mock.calls[0][0]).not.toContain('/base-url')
    consoleWarn.mockRestore()
  })

  it('должен кидать ошибку, если не указать url при запросе', async () => {
    const client = axiosMock.create()

    await expect(client({}).then(res => res.data)).rejects.toThrow(
      'Url is required for request'
    )
  })

  it('должен предоставлять функцию, чтобы подождать все запросы', async () => {
    const client = axiosMock.create().mock({
      url: '/api/data',
      response() {
        return {
          status: 200,
          data: 'data',
        }
      },
    })

    const test = jest.fn()

    client.get('/api/data').then(test)
    expect(test).not.toHaveBeenCalled()
    await client.waitForPendingRequests()
    expect(test).toHaveBeenCalledTimes(1)
  })

  it('должен ждать запросы, созданные в микротасках', async () => {
    const client = axiosMock.create().mock({
      url: '/api/data',
      response() {
        return {
          status: 200,
          data: 'data',
        }
      },
    })

    const test = jest.fn()

    client
      .get('/api/data')
      .then(() => client.get('/api/data'))
      .then(() => client.get('/api/data'))
      .then(test)

    expect(test).not.toHaveBeenCalled()
    await client.waitForPendingRequests()
    expect(test).toHaveBeenCalledTimes(1)
  })
  
  it('должен позволять добавить функцию для фильтрации запросов', async () => {
    const client = axiosMock
      .create()
      .mock({
        url: '/api/data',
        filter: ({ params }) => params.type === 'one',
        response() {
          return {
            status: 200,
            data: 'one',
          };
        },
      })
      .mock({
        url: '/api/data',
        filter: ({ params }) => params.type === 'two',
        response() {
          return {
            status: 200,
            data: 'two',
          }
        },
      })

    const one = await client.get('/api/data', { params: { type: 'one' } })
    expect(one.data).toBe('one')

    const two = await client.get('/api/data', { params: { type: 'two' } })
    expect(two.data).toBe('two')

    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const nothingP = client.get('/api/data', { params: { type: 'three' } })
    await expect(nothingP).rejects.toThrow()
    consoleWarn.mockRestore()
  })

  it('должен поддерживать фильтрацию по data', async () => {
    const client = axiosMock
      .create()
      .mock({
        url: '/api/data',
        filter: ({ data }) => data.type === 'one',
        response() {
          return {
            status: 200,
            data: 'one',
          };
        },
      })
      .mock({
        url: '/api/data',
        filter: ({ data }) => data.type === 'two',
        response() {
          return {
            status: 200,
            data: 'two',
          };
        },
      });

    const one = await client.post('/api/data', { type: 'one' })
    expect(one.data).toBe('one')

    const two = await client.post('/api/data', { type: 'two' })
    expect(two.data).toBe('two')

    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const nothingP = client.post('/api/data', { type: 'three' })
    await expect(nothingP).rejects.toThrow()
    consoleWarn.mockRestore()
  })
  
  it('должен позволять передавать любые данные', async () => {
    const file = new File(['id номер адрес время'], 'object.csv', { type: 'text/csv' });
    const dataWithFile = new FormData();
    dataWithFile.append('file', file);

    const client = axiosMock.create().mock({
      url: '/api/v1/data',
      method: 'post',
      response() {
        return {
          status: 200,
          data : 'good',
          headers: {
            'Content-Type': 'mulipart/form-data',
          },
        }
      },
    })

    const result = await client.post('/api/v1/data', dataWithFile, {
      headers: {
        'Content-Type': 'mulipart/form-data',
      },})
    expect(result.data).toBe('good')
  })
})
