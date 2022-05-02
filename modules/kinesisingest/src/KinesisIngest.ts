import Kinesis from './Kinesis'
export type KinesisMakeRequest = (args: {
  headers: {[key: string]: string}
  method: 'POST' | 'GET'
  host: string
  path: string
  body?: any
}) => Promise<any>
export interface KinesisIngestWebLog {
  apiKey: string
}
export interface KinesisIngestConfigArgs {
  kinesisStreamName: string
  kinesisAccessKey?: string
  kinesisSecretKey?: string
  logBatchSize?: number
  maxLogAgeSeconds?: number
}
async function sleep (ms: number): Promise<void> {
  return await new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}
export interface KinesisIngestArgs extends KinesisIngestConfigArgs {
  apiKey: string
}

export default class KinesisIngest {
  protected readonly kinesisStreamName: string
  protected readonly kinesisAccessKey?: string
  protected readonly kinesisSecretKey?: string
  protected readonly logBatchSize: number = 20
  protected readonly maxLogAgeSeconds: number = 10
  protected logCache: KinesisIngestWebLog[] = []
  private intervalSet: boolean = false

  constructor ({
    kinesisStreamName,
    kinesisAccessKey,
    kinesisSecretKey,
    maxLogAgeSeconds,
    logBatchSize
  }: KinesisIngestArgs) {
    this.kinesisStreamName = kinesisStreamName
    this.kinesisAccessKey = kinesisAccessKey
    this.kinesisSecretKey = kinesisSecretKey
    if (
      maxLogAgeSeconds !== undefined &&
      maxLogAgeSeconds < this.maxLogAgeSeconds &&
      maxLogAgeSeconds > 0
    ) {
      this.maxLogAgeSeconds = maxLogAgeSeconds
    }
    if (logBatchSize !== undefined) {
      this.logBatchSize = logBatchSize
    }
  }

  public async putToKinesis <MakeRequest extends KinesisMakeRequest>(makeRequest: MakeRequest): Promise<void> {
    if (this.logCache.length === 0) {
      return
    }
    const localCache = [...this.logCache]
    this.logCache = []
    try {
      const data = Kinesis.signRequest({
        streamName: this.kinesisStreamName,
        accessKeyId: this.kinesisAccessKey,
        secretAccessKey: this.kinesisSecretKey
      }, localCache, this.logBatchSize)
      await makeRequest({
        headers: data.headers,
        host: `https://${data.hostname}`,
        method: data.method,
        path: data.path,
        body: data.body
      })
    } catch (e) {
      this.logCache.push(...localCache)
      // eslint-disable-next-line no-console
      console.error(e)
    }
  }

  public async ingest <LogFormat extends KinesisIngestWebLog, MakeRequest extends KinesisMakeRequest>
  (log: LogFormat, makeRequest: MakeRequest): Promise<any> {
    this.logCache.push(log)
    if (!this.intervalSet) {
      this.intervalSet = true
      await sleep(this.maxLogAgeSeconds * 1000)
      await this.putToKinesis(makeRequest)
      this.intervalSet = false
    }
    if (this.logCache.length >= this.logBatchSize) {
      return await this.putToKinesis(makeRequest)
    }
  }
}
