import { storePath } from "@/lib/public-routes";
import "server-only";
import { headers } from "next/headers";
import {
  cloneElement,
  isValidElement,
  type ReactNode,
  type ReactElement,
} from "react";
import { english } from "@/lib/bookstore-translations";
export async function getStoreLocale(): Promise<"en" | "ro"> {
  return (await headers()).get("x-store-locale") === "ro" ? "ro" : "en";
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
    href?: string;
  }>;
  return cloneElement(element, {
    ...(element.props.href
      ? { href: storePath(element.props.href, locale) }
      : {}),
    ...(element.props["aria-label"]
      ? { "aria-label": translate(element.props["aria-label"], locale) }
      : {}),
    ...(element.props.children !== undefined
      ? { children: localize(element.props.children, locale) }
      : {}),
  });
}
