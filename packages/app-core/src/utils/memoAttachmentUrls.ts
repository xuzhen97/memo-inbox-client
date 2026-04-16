export function resolveMemoAttachmentUrl(baseUrl: string, url?: string) {
  if (!url) {
    return "";
  }

  if (url.startsWith("http") || url.startsWith("blob:")) {
    return url;
  }

  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function normalizeMemoAttachmentUrl(attachment: unknown) {
  if (typeof attachment === "string") {
    return attachment;
  }

  if (attachment && typeof attachment === "object" && "url" in attachment) {
    const url = (attachment as { url?: unknown }).url;
    return typeof url === "string" ? url : "";
  }

  return "";
}
