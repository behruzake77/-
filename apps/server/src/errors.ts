export class ValidationError extends Error {
  constructor(
    public readonly code: string,
    public readonly issues?: unknown,
  ) {
    super(code);
    this.name = "ValidationError";
  }
}
