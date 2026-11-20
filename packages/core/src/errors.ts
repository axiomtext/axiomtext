/** Stable error codes. Each code has a docs page: https://axiomtext.dev/errors/<code> */
export type AxiomErrorCode =
  | 'AXIOM_E_INVALID_DOCUMENT'
  | 'AXIOM_E_UNSUPPORTED_VERSION'
  | 'AXIOM_E_DUPLICATE_PLUGIN'
  | 'AXIOM_E_DUPLICATE_SCHEMA_ITEM'
  | 'AXIOM_E_UNKNOWN_COMMAND'
  | 'AXIOM_E_DESTROYED';

export class AxiomError extends Error {
  readonly code: AxiomErrorCode;

  constructor(code: AxiomErrorCode, message: string) {
    super(`[${code}] ${message}`);
    this.name = 'AxiomError';
    this.code = code;
  }
}
