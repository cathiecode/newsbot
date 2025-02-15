import { z as zod } from "npm:zod";

export const Article = zod.object({
  title: zod.string(),
  url: zod.string(),
  date: zod.date(),
});

export function isArticle(value: unknown): value is Article {
  return Article.safeParse(value).success;
}

export type Article = zod.infer<typeof Article>;
