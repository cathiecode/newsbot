import { getDocumentByUrl } from "./dom.ts";
import { Article, isArticle } from "./types.ts";
import { map } from "./utils.ts";

export function extractNikkeiNewsArticles(document: Document): Article[] {
  const baseUrl = "https://www.nikkei.com";
  const articlesElement = document.getElementsByTagName("article");

  const articles = [...articlesElement]
    .map((article) => ({
      title: article.querySelector("h2")?.textContent,
      url: `${baseUrl}${article.querySelector("a")?.href}`,
      date: map(
        article.querySelector("time")?.dateTime,
        (dateTime) => new Date(dateTime),
      ),
    }))
    .filter((article) => isArticle(article));

  return articles;
}

export async function getNikkeiNewsArticles(): Promise<Article[]> {
  const url = "https://www.nikkei.com/news/category/";
  const document = await getDocumentByUrl(url);

  return extractNikkeiNewsArticles(document);
}
