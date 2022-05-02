export interface SignedAwsRequest {
  headers: {[key: string]: string}
  hostname: string
  path: string
  method: 'POST'
  body: string
}
