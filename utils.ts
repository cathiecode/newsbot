export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  count: number,
  lambda: () => Promise<T>,
): Promise<T> {
  let i = 0;

  for (i = 0; i < count; i++) {
    try {
      return await lambda();
    } catch (e) {
      console.error(`Failed to execute lambda: ${e}`);
      await sleep(1000);
    }
  }

  throw new Error(`Failed to execute lambda after ${i} retries.`);
}

export function map<T, U>(
  mayValue: T | undefined,
  process: (value: T) => U,
): U | undefined {
  if (mayValue === undefined) {
    return undefined;
  }

  return process(mayValue);
}

export function tee<T>(value: T): T {
  console.log(value);
  return value;
}

export function dateToSeconds(date: Date) {
  return date.getTime() / 1000;
}
