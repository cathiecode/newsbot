import { KVS } from "./kvs.ts";
import { dateToSeconds } from "./utils.ts";

export async function getLastRunDate(kvs: KVS) {
  const lastRun = await kvs.get("last_run");

  if (lastRun === undefined) {
    return new Date(0);
  }

  return new Date(lastRun);
}

async function setLastRunDate(kvs: KVS, currentDate: Date) {
  await kvs.set("last_run", currentDate.toISOString());
}

export async function updateLastRunDate(
  kvs: KVS,
  currentDate: Date,
  thresholdSeconds: number,
  dryRun: boolean = false,
): Promise<boolean> {
  const lastRunDate = await getLastRunDate(kvs);

  const durationSinceLastRun = dateToSeconds(currentDate) -
    dateToSeconds(lastRunDate);

  if (durationSinceLastRun < thresholdSeconds) {
    console.log(
      `Skipping execution because the last run was in ${durationSinceLastRun}, less than ${thresholdSeconds} seconds ago.`,
    );
    return false;
  }

  if (dryRun) {
    console.log("Skipping write last-run date due to dry run.");
  } else {
    await setLastRunDate(kvs, currentDate);
  }

  return true;
}
