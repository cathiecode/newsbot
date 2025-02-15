// @ts-types="npm:@types/jsdom"
import { JSDOM } from "npm:jsdom";

export async function getTextByUrl(url: string) {
  const result = await fetch(url);
  return result.text();
}

export async function getDocumentByUrl(url: string) {
  const text = await getTextByUrl(url);
  const dom = new JSDOM(text);
  return dom.window.document;
}
