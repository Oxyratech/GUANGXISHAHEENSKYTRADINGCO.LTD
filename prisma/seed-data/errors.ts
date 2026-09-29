/** Operator mistakes (bad or missing environment values). Printed as a plain message, no stack trace. */
export class SeedConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeedConfigError";
  }
}
