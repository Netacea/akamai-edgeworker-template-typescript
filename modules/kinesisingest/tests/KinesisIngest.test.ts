import * as tape from 'tape'
import KinesisIngest, { KinesisIngestWebLog } from '../src'
import { KinesisMakeRequest } from '../src/KinesisIngest'
interface FakeIngestWebLog extends KinesisIngestWebLog {
  [key: string]: string
}
const fakeIngestBody: FakeIngestWebLog = {
  BytesSent: '0',
  NetaceaMitigationApplied: 'ip_blocked',
  NetaceaUserIdCookie: 'ccc',
  RealIp: '1.2.3.4',
  Referer: 'Referer',
  Request: 'GET /test HTTP/1.1',
  RequestTime: '100',
  Status: '200',
  TimeLocal: 'TimeLocal',
  UserAgent: 'UserAgent',
  apiKey: 'apiKey',
  IntegrationType: 'UNIT',
  IntegrationVersion: 'test'
}

tape('Calls kinesis with expected args', async (t: tape.Test) => {
  t.plan(5)
  const streamName = 'MY-TEST-STREAM'
  const kinesis = new KinesisIngest({
    kinesisStreamName: streamName,
    kinesisAccessKey: 'ACCESS-KEY',
    kinesisSecretKey: 'SECRET-KEY',
    maxLogAgeSeconds: 0.01,
    apiKey: 'apikey'
  })
  await kinesis.ingest(fakeIngestBody, async ({
    headers,
    host,
    method,
    body
  }) => {
    t.equals(method, 'POST', 'Expects POST')
    t.equals(host, 'https://kinesis.eu-west-1.amazonaws.com', 'Expects kinesis to be host')
    t.equals(headers['X-Amz-Target'], 'Kinesis_20131202.PutRecords', 'Expects PutRecords target')
    const parsedBody = JSON.parse(body)
    t.equals(parsedBody.Records.length, 1, 'Expects 1 lot of records')
    t.equal(parsedBody.StreamName, streamName, 'Expects correct StreamName in request body')
    return await Promise.resolve({
      headers: {},
      status: 200,
      body: 'body'
    })
  })
  t.end()
})

tape('Bulk Calls kinesis with expected args multiple times when batch size is exceeded', async (t: tape.Test) => {
  t.plan(19)
  const streamName = 'MY-TEST-STREAM'
  const kinesis = new KinesisIngest({
    kinesisStreamName: streamName,
    kinesisAccessKey: 'ACCESS-KEY',
    kinesisSecretKey: 'SECRET-KEY',
    maxLogAgeSeconds: 2,
    apiKey: 'apikey'
  })
  let ingestFnCallCount = 0
  const logCount = 60
  const ingestFn: KinesisMakeRequest = async ({
    headers,
    host,
    method,
    body
  }) => {
    ingestFnCallCount++
    t.equals(method, 'POST', 'Expects POST')
    t.equals(host, 'https://kinesis.eu-west-1.amazonaws.com', 'Expects kinesis to be host')
    t.equals(headers['X-Amz-Target'], 'Kinesis_20131202.PutRecords', 'Expects PutRecords target')
    const parsedBody = JSON.parse(body)
    t.equals(parsedBody.Records.length, 1, 'Expects 1 lot of records')
    t.equals(
      JSON.parse(Buffer.from(parsedBody.Records[0].Data, 'base64').toString('utf-8')).length,
      20,
      'Expects 20 in first batch'
    )
    t.equal(parsedBody.StreamName, streamName, 'Expects correct StreamName in request body')
    return await Promise.resolve({
      headers: {},
      status: 200,
      body: 'body'
    })
  }
  const ingests: Array<Promise<any>> = []
  for (let index = 0; index < logCount; index++) {
    ingests.push(kinesis.ingest(fakeIngestBody, ingestFn))
  }
  await Promise.all(ingests)
  t.equals(ingestFnCallCount, 3, 'Expects ingestFn to be called 3 times')
  t.end()
})
