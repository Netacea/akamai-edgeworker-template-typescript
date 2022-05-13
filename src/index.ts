import NetaceaAkamai, { AkamaiConstructorArgs } from '@netacea/akamai'
import * as config from './configexample.json'

const worker = new NetaceaAkamai(config as AkamaiConstructorArgs)

export async function onClientRequest (request: EW.IngressClientRequest): Promise<void> {
  await worker.requestHandler(request)
}

export async function onClientResponse (
  request: EW.IngressClientRequest,
  response: EW.EgressClientResponse
): Promise<void> {
  await worker.responseHandler(request, response)
}
