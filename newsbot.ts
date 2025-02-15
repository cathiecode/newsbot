// @ts-types="npm:@types/jsdom"
import { JSDOM } from "npm:jsdom";
import { z as zod } from "npm:zod";
import { format } from "npm:date-fns";
import { tz } from "npm:@date-fns/tz";

const Article = zod.object({
  title: zod.string(),
  url: zod.string(),
  date: zod.date(),
});

type Article = zod.infer<typeof Article>;

function tee<T>(value: T): T {
  console.log(value);
  return value;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function map<T, U>(mayValue: T | undefined, process: (value: T) => U): U | undefined {
  if (mayValue === undefined) {
    return undefined;
  }

  return process(mayValue);
}

async function withRetry<T>(count: number, lambda: () => Promise<T>): Promise<T> {
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

function isArticle(value: unknown): value is Article {
  return Article.safeParse(value).success;
}

async function getTextByUrl(url: string) {
  const result = await fetch(url);
  return result.text();
}

async function getDocumentByUrl(url: string) {
  const text = await getTextByUrl(url);
  const dom = new JSDOM(text);
  return dom.window.document;
}

function extractNikkeiNewsArticles(document: Document): Article[] {
  const baseUrl = "https://www.nikkei.com";
  const articlesElement = document.getElementsByTagName("article");

  const articles = [...articlesElement]
    .map((article) => ({
      title: article.querySelector("h2")?.textContent,
      url: `${baseUrl}${article.querySelector("a")?.href}`,
      date: map(article.querySelector("time")?.dateTime, dateTime => new Date(dateTime)),
    }))
    .filter((article) => isArticle(article));

  return articles;
}

async function getNikkeiNewsArticles(): Promise<Article[]> {
  const url = "https://www.nikkei.com/news/category/";
  const document = await getDocumentByUrl(url);

  return extractNikkeiNewsArticles(document);
}

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

  for (const article of latestArticles) {
    console.log("Write:", article);
    // await withRetry(2, () => postToMisskey(article, misskeyServer, misskeyToken, timeZone));
  }
}

main();
