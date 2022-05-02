import { HttpResponse } from '@netacea/netaceaintegrationtestrunner'

interface ReadBody {
  getBody: () => string | undefined
}

export type EgressClientResponseMock = EW.EgressClientResponse & EW.ReadAllHeader & ReadBody

export const createEgressClientResponseMock = (response: HttpResponse): EgressClientResponseMock => {
  const headers = {}
  const mock = {
    status: response.status ?? 999,
    setHeader (name: string, value: string | string[]): void {
      if (Array.isArray(value)) {
        headers[name] = value
      } else {
        headers[name] = [value]
      }
    },
    addHeader (name: string, value: string | string[]): void {
      if (headers[name] === undefined) {
        headers[name] = []
      }
      if (Array.isArray(value)) {
        headers[name].push(...value)
      } else {
        headers[name].push(value)
      }
    },
    removeHeader (name: string): void {
      delete headers[name] // eslint-disable-line @typescript-eslint/no-dynamic-delete
    },
    getHeader: (name: string): string[] | null => {
      const header = headers[name] ?? null
      return header
    },
    getHeaders (): EW.Headers {
      return headers
    },
    getBody (): string | undefined {
      return response.body
    }
  }

  // Copy headers from input
  for (const [header, value] of Object.entries(response.headers)) {
    mock.setHeader(header, value)
  }

  return mock
}
