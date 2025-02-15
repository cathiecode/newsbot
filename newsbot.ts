import { format } from "npm:date-fns";
import { tz } from "npm:@date-fns/tz";

import { withRetry } from "./utils.ts";
import { getNikkeiNewsArticles } from "./nikkei.ts";
import { Article } from "./types.ts";

function dateToSeconds(date: Date) {
  return date.getTime() / 1000;
}

function currentDate() {
  return new Date();
}

async function getLastRunDate() {
  try {
    return new Date(await Deno.readTextFile("last_run"));
  } catch(e) {
    if (e instanceof Deno.errors.NotFound) {
      return new Date(0);
    }
  }

  throw new Error("Failed to read last_run file.");
}

async function setLastRunTime() {
  await Deno.writeTextFile("last_run", (new Date()).toISOString());
}

function articleToMarkdown({title, url, date}: Article, timeZone: string) {
  return `
    ${title} ${format(date, "yyyy-MM-dd HH:mm", { in: tz(timeZone) })} (${timeZone})
    ${url}
  `.split("\n").map(line => line.trim()).join("\n").trim();
}

async function postToMisskey(article: Article, server: string, token: string, timeZone: string) {
  await fetch(`${server}/api/notes/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      "visibility": "home",
      "visibleUserIds": [],
      "cw": null,
      "localOnly": true,
      "reactionAcceptance": null,
      "noExtractMentions": false,
      "noExtractHashtags": false,
      "noExtractEmojis": false,
      "replyId": null,
      "renoteId": null,
      "channelId": null,
      "text": articleToMarkdown(article, timeZone),
      "poll": null
    })
  });
}

async function main() {
  const misskeyToken = Deno.env.get("MISSKEY_TOKEN");
  const misskeyServer = Deno.env.get("MISSKEY_SERVER");
  const timeZone = "Asia/Tokyo";
  const leastIntervalSeconds = 60 * 10;

  if (misskeyToken === undefined) {
    console.error("Environment variable MISSKEY_TOKEN is not set.");
    return;
  }

  if (misskeyServer === undefined) {
    console.error("Environment variable MISSKEY_SERVER is not set.");
    return;
  }

  // FIXME: No retry
  const lastRunDate = await getLastRunDate();

  const durationSinceLastRun = dateToSeconds(currentDate()) - dateToSeconds(lastRunDate);

  if (durationSinceLastRun < leastIntervalSeconds) {
    console.log(`Skipping execution because the last run was in ${durationSinceLastRun}, less than ${leastIntervalSeconds} seconds ago.`);
    return;
  }

  await setLastRunTime();

  const articles = await withRetry(3, () => getNikkeiNewsArticles());

  const latestArticles = articles.filter(article => article.date > lastRunDate);

  latestArticles.sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const article of latestArticles) {
    await withRetry(2, () => postToMisskey(article, misskeyServer, misskeyToken, timeZone));
  }
}

main();
