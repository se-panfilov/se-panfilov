/** An expected failure with a message for the user. Other errors are defects. */
export class GeneratorError extends Error {
  override name = 'GeneratorError';
}
