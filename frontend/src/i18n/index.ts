import { EN } from "./en";
import { FR } from "./fr";

export function getDict(lang: "EN" | "FR") {
  return lang === "FR" ? FR : EN;
}