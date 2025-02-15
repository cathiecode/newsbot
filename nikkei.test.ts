import { assertEquals } from "jsr:@std/assert";
import { getNikkeiNewsArticles } from "./nikkei.ts";
import { withRetry } from "./utils.ts";

Deno.test("getNikkeiNewsArticles returns articles", async () => {
  const articles = await withRetry(3, () => getNikkeiNewsArticles());
  assertEquals(articles.length > 0, true);
});
