import * as sinon from 'sinon'
import * as testAsync from 'tape-async'
import { onClientRequest } from '../src/main'

class FakeIngressClientRequest implements EW.IngressClientRequest {
  setHeader (name: string, value: string | string[]): void {
    throw new Error('Method not implemented.')
  }

  addHeader (name: string, value: string | string[]): void {
    throw new Error('Method not implemented.')
  }

  removeHeader (name: string): void {
    throw new Error('Method not implemented.')
  }

  getHeader (name: string): string[] | null {
    throw new Error('Method not implemented.')
  }

  getVariable (name: string): string | undefined {
    throw new Error('Method not implemented.')
  }

  host: string = ''
  method: string = ''
  path: string = ''
  scheme: string = ''
  query: string = ''
  url: string = ''
  userLocation: EW.UserLocation | undefined
  device: EW.Device | undefined
  cpCode: number = 0
  // eslint-disable-next-line @typescript-eslint/naming-convention
  respondWith (status: number, headers: object, body: string, deny_reason?: string): void {
    throw new Error('Method not implemented.')
  }

  route (destination: EW.Destination): void {
    throw new Error('Method not implemented.')
  }

  cacheKey: EW.CacheKey = {
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
  }

  setVariable (name: string, value: string): void {
    throw new Error('Method not implemented.')
  }
}

testAsync('onClientRequest Test :: Adds Header to Request', async t => {
  // Arrange
  const sandbox = sinon.createSandbox()
  const fakeRequest = new FakeIngressClientRequest()
  const stub = sandbox.stub(fakeRequest, 'addHeader')

  // Act
  await onClientRequest(fakeRequest)

  // Assert
  t.equal('X-Netacea-Edgeworker', stub.getCall(0).args[0])
  t.equal('EdgeworkerHeader', stub.getCall(0).args[1])

  t.end()
})
