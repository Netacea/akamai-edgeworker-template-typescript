
/**
 * Exporting these scenario allows for reuse while also allowing specific
 * integrations to filter specific scenario during the development process.
 */
import {
  mitigationScenarios,
  ingestOnlyScenarios
} from './scenarios'

/**
 * Flexible framework for testing all worker types.
 */
export {
  runIntegrationTests,
  RunWorkerArgs,
  RunWorkerResult
} from './TestRunner'
export {
  HttpRequest,
  HttpResponse,
  ClientRequest,
  ClientResponse,
  MitigationRequest,
  MitigationResponse,
  IngestRequest,
  IngestResponse
} from './TestRunner.types'
export const scenarios = {
  mitigation: mitigationScenarios,
  ingestOnly: ingestOnlyScenarios
}

/**
 * Legacy framework for testing simple workers.
 */
export * from './MitigationTests'
export * from './IngestTests'
export * from './IngestOnlyTests'
export * from './InjectTests'
