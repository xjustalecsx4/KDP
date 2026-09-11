import "server-only";
import { cookies } from "next/headers";
import {
  cloneElement,
  isValidElement,
  type ReactNode,
  type ReactElement,
} from "react";
import { english } from "@/lib/bookstore-translations";
export async function getStoreLocale() {
  return (await cookies()).get("bookstore-language")?.value === "ro"
    ? "ro"
    : "en";
}
export function translate(text: string, locale: string) {
  if (locale === "ro") return text;
  const trimmed = text.trim();
  const translated = english[trimmed] ?? english[text];
  return translated === undefined
    ? text
    : text.replace(trimmed, translated.trim());
}
// Public editorial JSX only. Never used on database content or the private workspace.
export function localize(node: ReactNode, locale: string): ReactNode {
  if (typeof node === "string") return translate(node, locale);
  if (Array.isArray(node))
    return node.map((child, index) => {
      const result = localize(child, locale);
      return isValidElement(result)
        ? cloneElement(result, { key: result.key ?? index })
        : result;
    });
  if (!isValidElement(node)) return node;
  const element = node as ReactElement<{
    children?: ReactNode;
    "aria-label"?: string;
  }>;
  return cloneElement(element, {
    ...(element.props["aria-label"]
      ? { "aria-label": translate(element.props["aria-label"], locale) }
      : {}),
    ...(element.props.children !== undefined
      ? { children: localize(element.props.children, locale) }
      : {}),
  });
}
