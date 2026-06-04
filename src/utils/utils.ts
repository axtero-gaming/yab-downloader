import { Duration, format, milliseconds } from 'date-fns';
import { isNil, isNumber } from 'lodash-es';
import path from 'node:path';

export interface DurationWithMilliseconds extends Duration {
  milliseconds?: number;
}

export function getDurationMs(duration: DurationWithMilliseconds | number) {
  let durationMs = 0;
  if (isNumber(duration)) {
    durationMs = duration;
  } else {
    durationMs = !isNil(duration.milliseconds) ? duration.milliseconds : milliseconds(duration);
  }
  return durationMs;
}

export function sleep(duration: DurationWithMilliseconds | number) {
  const durationMs = getDurationMs(duration);
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

export function log(...rest: any) {
  console.log(`[${format(new Date(), 'HH:mm:ss')}]:`, ...rest);
}

/**
 * Возвращает случайное число в указанных границах.
 */
export function getRandom(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

/**
 * Returns random integer.
 */
export function genRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min)) + min;
}
