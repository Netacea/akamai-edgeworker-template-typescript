import * as aws4 from 'aws4'
import type { KinesisIngestWebLog } from './KinesisIngest'
import type { SignedAwsRequest } from './AWS'
import { REGION } from './KinesisConstants'

export interface KinesisPayloadArgs {
  streamName: string
  accessKeyId?: string
  secretAccessKey?: string
}

interface KinesisRecord {
  Data: string
  PartitionKey: string
}
export default class Kinesis {
  public static batchArrayForKinesis (array: any[], size: number): KinesisRecord[] {
    const result: KinesisRecord[] = []
    for (let i = 0; i < array.length; i += size) {
      const chunk = array.slice(i, i + size)
      result.push({
        Data: Buffer.from(JSON.stringify(chunk)).toString('base64'),
        PartitionKey: Date.now().toString()
      })
    }
    return result
  }

  public static signRequest (
    kinesisOpts: KinesisPayloadArgs,
    webLog: KinesisIngestWebLog[],
    batchSize: number
  ): SignedAwsRequest {
    const { accessKeyId, secretAccessKey } = kinesisOpts
    const params: {
      Records: KinesisRecord[]
      PartitionKey: string
      StreamName: string
    } = {
      Records: this.batchArrayForKinesis(webLog, batchSize),
      PartitionKey: Date.now().toString(),
      StreamName: kinesisOpts.streamName
    }
    const kinesis = aws4.sign({
      service: 'kinesis',
      body: JSON.stringify(params),
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'Kinesis_20131202.PutRecords'
      },
      region: REGION
    }, {
      accessKeyId,
      secretAccessKey
    })
    return kinesis
  }
}
