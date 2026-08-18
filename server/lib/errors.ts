export class NotFoundError extends Error {
  constructor(message = 'NotFound') {
    super(message);
  }
}
