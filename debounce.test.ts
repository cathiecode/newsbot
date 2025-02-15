import { assertAlmostEquals, assertEquals } from "jsr:@std/assert";
import { updateLastRunDate } from "./debounce.ts";
import { MemoryKVS } from "./kvs.ts";
import { getLastRunDate } from "./debounce.ts";

Deno.test("updateLastRunDate returns true and set last run when kvs is not initialized", async () => {
  const kvs = new MemoryKVS();
  const currentDate = new Date();
  assertEquals(await updateLastRunDate(kvs, currentDate, 500), true);
  assertEquals((await getLastRunDate(kvs)).getTime(), currentDate.getTime());
});

Deno.test("updateLastRunDate returns true and set last run when enough time is elapsed", async () => {
  const kvs = new MemoryKVS();

  const pastDate = new Date("2025-02-15T00:00:00.000Z");
  const currentDate = new Date("2025-02-15T00:15:00.000Z");

  assertEquals(await updateLastRunDate(kvs, pastDate, 60 * 10), true);
  assertEquals(await updateLastRunDate(kvs, currentDate, 60 * 10), true);

  assertAlmostEquals(
    (await getLastRunDate(kvs)).getTime(),
    currentDate.getTime(),
  );
});

Deno.test("updateLastRunDate returns false and not set last run when enough time is not elapsed", async () => {
  const kvs = new MemoryKVS();

  const pastDate = new Date("2025-02-15T00:00:00.000Z");
  const currentDate = new Date("2025-02-15T00:05:00.000Z");

  assertEquals(await updateLastRunDate(kvs, pastDate, 60 * 10), true);
  assertEquals(await updateLastRunDate(kvs, currentDate, 60 * 10), false);

  assertAlmostEquals((await getLastRunDate(kvs)).getTime(), pastDate.getTime());
});
