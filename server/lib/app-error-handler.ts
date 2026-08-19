import type { ErrorHandler } from 'elysia';

type AppError = Error & {
  status?: number;
  statusCode?: number;
};

function getErrorStatus(error: AppError): number {
  return error.statusCode ?? error.status ?? 500;
}

export const handleAppError: ErrorHandler = ({ error, set }) => {
  const appError = error as AppError;
  set.status = getErrorStatus(appError);

  return appError.message;
};
