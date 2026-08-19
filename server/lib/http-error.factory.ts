import { status } from 'http-status';

const statusRecord = status as Record<string, unknown>;
export const getHttpErrorName = (code: number): string => {
  const httpErrorName = statusRecord[`${code}_NAME`] as string;
  if (!httpErrorName) return 'Unknown_Error';
  return httpErrorName;
};

export const getHttpErrorMessage = (code: number): string => {
  const httpErrorMessage = statusRecord[`${code}_MESSAGE`] as string;
  if (!httpErrorMessage) return 'Unknown_Error_Message';
  return httpErrorMessage;
};

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

function createHttpErrorClass(statusCode: number, className: string) {
  return class extends Error {
    code: string;
    status: number;
    constructor(message?: string) {
      super(message ?? getHttpErrorMessage(statusCode));
      this.name = className;
      this.code = getHttpErrorName(statusCode);
      this.status = statusCode;
    }
  };
}

// 4xx Client Errors
export const BadRequestError = createHttpErrorClass(status.BAD_REQUEST, 'BadRequestError');
export const UnauthorizedError = createHttpErrorClass(status.UNAUTHORIZED, 'UnauthorizedError');
export const ForbiddenError = createHttpErrorClass(status.FORBIDDEN, 'ForbiddenError');
export const NotFoundError = createHttpErrorClass(status.NOT_FOUND, 'NotFoundError');
export const MethodNotAllowedError = createHttpErrorClass(
  status.METHOD_NOT_ALLOWED,
  'MethodNotAllowedError',
);
export const NotAcceptableError = createHttpErrorClass(status.NOT_ACCEPTABLE, 'NotAcceptableError');
export const ConflictError = createHttpErrorClass(status.CONFLICT, 'ConflictError');
export const GoneError = createHttpErrorClass(status.GONE, 'GoneError');
export const PayloadTooLargeError = createHttpErrorClass(
  status.REQUEST_ENTITY_TOO_LARGE,
  'PayloadTooLargeError',
);
export const UriTooLongError = createHttpErrorClass(status.REQUEST_URI_TOO_LONG, 'UriTooLongError');
export const UnsupportedMediaTypeError = createHttpErrorClass(
  status.UNSUPPORTED_MEDIA_TYPE,
  'UnsupportedMediaTypeError',
);
export const RangeNotSatisfiableError = createHttpErrorClass(
  status.REQUESTED_RANGE_NOT_SATISFIABLE,
  'RangeNotSatisfiableError',
);
export const ExpectationFailedError = createHttpErrorClass(
  status.EXPECTATION_FAILED,
  'ExpectationFailedError',
);
export const UnprocessableEntityError = createHttpErrorClass(
  status.UNPROCESSABLE_ENTITY,
  'UnprocessableEntityError',
);
export const TooManyRequestsError = createHttpErrorClass(
  status.TOO_MANY_REQUESTS,
  'TooManyRequestsError',
);

// 5xx Server Errors
export const InternalServerError = createHttpErrorClass(
  status.INTERNAL_SERVER_ERROR,
  'InternalServerError',
);
export const NotImplementedError = createHttpErrorClass(status.NOT_IMPLEMENTED, 'NotImplementedError');
export const BadGatewayError = createHttpErrorClass(status.BAD_GATEWAY, 'BadGatewayError');
export const ServiceUnavailableError = createHttpErrorClass(
  status.SERVICE_UNAVAILABLE,
  'ServiceUnavailableError',
);
export const GatewayTimeoutError = createHttpErrorClass(status.GATEWAY_TIMEOUT, 'GatewayTimeoutError');
