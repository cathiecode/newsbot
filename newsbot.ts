import { format } from "npm:date-fns";
import { tz } from "npm:@date-fns/tz";
import { parseArgs } from "jsr:@std/cli/parse-args";

import { withRetry } from "./utils.ts";
import { getNikkeiNewsArticles } from "./nikkei.ts";
import { Article } from "./types.ts";
import { getLastRunDate, updateLastRunDate } from "./debounce.ts";
import { DenoTextFileKVS } from "./kvs.ts";

function articleToMarkdown({ title, url, date }: Article, timeZone: string) {
  return `
    ${title} ${
    format(date, "yyyy-MM-dd HH:mm", { in: tz(timeZone) })
  } (${timeZone})
    ${url}
  `.split("\n").map((line) => line.trim()).join("\n").trim();
}

async function postToMisskey(
  article: Article,
  server: string,
  token: string,
  timeZone: string,
  dryRun: boolean = false,
) {
  const url = `${server}/api/notes/create`;
  const option = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
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
      "poll": null,
    }),
  };

  if (dryRun) {
    console.log("Skipping post to misskey due to dry run:", url, option);
  } else {
    await fetch(url, option);
  }
}

async function main() {
  const args = parseArgs(Deno.args);

  const misskeyToken = Deno.env.get("MISSKEY_TOKEN");
  const misskeyServer = Deno.env.get("MISSKEY_SERVER");
  const dryRun = Deno.env.has("NEWSBOT_DRY_RUN");
  const timeZone = "Asia/Tokyo";
  const leastIntervalSeconds = 60 * 10;

  const kvs = new DenoTextFileKVS();

  if (misskeyToken === undefined) {
    console.error("Environment variable MISSKEY_TOKEN is not set.");
    return;
  }

  if (misskeyServer === undefined) {
    console.error("Environment variable MISSKEY_SERVER is not set.");
    return;
  }

  const lastRunDate = await getLastRunDate(kvs);

  if (!updateLastRunDate(kvs, new Date(), leastIntervalSeconds, dryRun)) {
    return;
  }

  const articles = await withRetry(3, () => getNikkeiNewsArticles());

  const latestArticles = articles.filter((article) =>
    article.date > lastRunDate
  );

  latestArticles.sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const article of latestArticles) {
    await withRetry(
      2,
      () =>
        postToMisskey(article, misskeyServer, misskeyToken, timeZone, dryRun),
    );
  }
}

main();
