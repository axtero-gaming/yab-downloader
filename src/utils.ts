import { Duration, format, milliseconds } from 'date-fns';
import { isNil, isNumber } from 'lodash-es';

export interface DurationWithMilliseconds extends Duration {
  milliseconds?: number;
}

export function sleep(duration: DurationWithMilliseconds | number) {
  let durationMs = 0;
  if (isNumber(duration)) {
    durationMs = duration;
  } else {
    durationMs = !isNil(duration.milliseconds) ? duration.milliseconds : milliseconds(duration);
  }

  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

export function log(...rest: any) {
  console.log(`[${format(new Date(), 'HH:mm:ss')}]:`, ...rest);
}
