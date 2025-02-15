import { assertEquals } from "jsr:@std/assert";

import { map, sleep, withRetry } from "./utils.ts";

function throwsTwice() {
  let i = 0;

  // deno-lint-ignore require-await
  return async () => {
    if (i < 2) {
      i++;
      console.log(i);
      throw new Error("Failed");
    }

    return "Success";
  };
}

function callCount<T extends [], U>(fn: (...args: T) => U) {
  let i = 0;

  const lambda = (...args: T) => {
    i++;
    return fn(...args);
  };

  lambda.callCount = () => i;

  return lambda;
}

Deno.test("withRetry retries until success", async () => {
  const lambda = callCount(throwsTwice());

  await withRetry(3, lambda);
  assertEquals(lambda.callCount(), 3);
});

Deno.test("withRetry throws if failed after all retries", async () => {
  const lambda = callCount(throwsTwice());

  try {
    await withRetry(2, lambda);
  } catch {
    assertEquals(lambda.callCount(), 2);
    return;
  }

  throw new Error("withRetry did not throw.");
});

Deno.test("sleep waits for the specified time", async () => {
  const start = Date.now();
  await sleep(1000);
  const end = Date.now();

  assertEquals(end - start >= 1000, true);
});

Deno.test("map returns undefined for undefined", () => {
  assertEquals(
    map(undefined, (_) => "failed"),
    undefined,
  );
});

Deno.test("map returns the result of the process function", () => {
  assertEquals(
    map(1, (x) => x + 1),
    2,
  );
});

Deno.test(
  "map returns the result of the process function when value was 0",
  () => {
    assertEquals(
      map(0, (x) => x + 1),
      1,
    );
  },
);
