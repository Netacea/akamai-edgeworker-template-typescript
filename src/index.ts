import NetaceaAkamai from '@netacea/akamai'

const worker = new NetaceaAkamai({})

export async function onClientRequest (request: EW.IngressClientRequest): Promise<void> {
  await worker.requestHandler(request)
}

export async function onClientResponse (
  request: EW.IngressClientRequest,
  response: EW.EgressClientResponse
): Promise<void> {
  await worker.responseHandler(request, response)
}
