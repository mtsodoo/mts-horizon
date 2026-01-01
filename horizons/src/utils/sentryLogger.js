
import * as Sentry from "@sentry/react";

const { logger } = Sentry;

export const logError = (message, data = {}) => {
  logger.error(message, data);
};

export const logWarning = (message, data = {}) => {
  logger.warn(message, data);
};

export const logInfo = (message, data = {}) => {
  logger.info(message, data);
};

export const captureError = (error, context = {}) => {
  Sentry.captureException(error, { extra: context });
};

export const trackAction = (actionName, callback) => {
  return Sentry.startSpan(
    { op: "ui.action", name: actionName },
    callback
  );
};

export default { logError, logWarning, logInfo, captureError, trackAction };
