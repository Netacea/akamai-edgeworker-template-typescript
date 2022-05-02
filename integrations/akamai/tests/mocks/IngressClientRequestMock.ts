import { NetaceaIngestType, NetaceaMitigationType } from '@netacea/netaceaintegrationbase'
import { TransformRequestArgs } from '@netacea/netaceaintegrationtestrunner'
import { createEgressClientResponseMock, EgressClientResponseMock } from './EgressClientResponseMock'

interface RespondWith {
  status: number
  headers: Record<string, string[]>
  body: string
  deny_reason?: string
}

interface HasClientResponse {
  getResponse: () => EgressClientResponseMock | undefined
}

export type IngressClientRequestMock = EW.IngressClientRequest & EW.ReadAllHeader & HasClientResponse

// eslint-disable-next-line max-lines-per-function
export function createIngressClientRequestMock (
  args: TransformRequestArgs,
  ingestType: NetaceaIngestType = NetaceaIngestType.HTTP,
  mitigationType: NetaceaMitigationType = NetaceaMitigationType.MITIGATE
): IngressClientRequestMock {
  const headers = {}
  let response: RespondWith | undefined

  const mockIngressClientRequest = {
    /**
     * @description Set (overwrite) a header.
     * @param name The name of the headers
     * @param value The value or values of the header
     * NOTE: in the real Akamai environnement,
     * headers set here should only persist if request goes to origin
     * they should not persist if respondWith() is used.
     * This is NOT the case in these mocks!
     */
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
    getHeader (name: string): string[] | null {
      const header = headers[name] ?? null
      return header
    },
    getHeaders (): EW.Headers {
      return headers
    },
    getVariable (name: string): string | undefined {
      const variables = {
        PMUSER_VISITOR_IP: args.ipAddress,
        PMUSER_CLIENT_IP: args.ipAddress,
        PMUSER_NETACEA_API_KEY: 'API_KEY',
        PMUSER_NETACEA_SECRET_KEY: 'SECRET_KEY',
        PMUSER_NETACEA_MITIGATION_TYPE: mitigationType,
        PMUSER_NETACEA_INGEST_TYPE: ingestType
      }

      if (variables[name] === undefined) throw new Error(`getVariable method not implemented for name ${name}.`)

      return variables[name]
    },
    host: '',
    method: args.method,
    path: args.url,
    scheme: '',
    query: '',
    url: args.url,
    userLocation: undefined, // EW.UserLocation
    device: undefined, // EW.Device
    cpCode: 0,
    // eslint-disable-next-line @typescript-eslint/camelcase
    respondWith (status: number, headers: Record<string, string[]>, body: string, deny_reason?: string): void {
      response = {
        status,
        headers,
        body,
        deny_reason
      }
    },
    getResponse (): EgressClientResponseMock | undefined {
      if (response === undefined) {
        return undefined
      }
      return createEgressClientResponseMock({
        headers: response.headers,
        body: response.body,
        status: response.status
        // statusText: response.deny_reason
      })
    },
    route (destination: EW.Destination): void {
      throw new Error('Method not implemented.')
    },
    // EW.CacheKey
    cacheKey: {
      excludeQueryString (): void {
        throw new Error('Method not implemented.')
      },
      includeQueryString (): void {
        throw new Error('Method not implemented.')
      },
      includeQueryArgument (name: string): void {
        throw new Error('Method not implemented.')
      },
      includeCookie (name: string): void {
        throw new Error('Method not implemented.')
      },
      includeHeader (name: string): void {
        throw new Error('Method not implemented.')
      },
      includeVariable (name: string): void {
        throw new Error('Method not implemented.')
      }
    },
    setVariable (name: string, value: string): void {
      throw new Error('Method not implemented.')
    }
  }

  return mockIngressClientRequest
}
