export const DEFAULT_TRANSFORM_WIDTH = 1024;

export const IMAGE_LOAD_MODE = {
  OPTIMIZED: "optimized",
  ORIGINAL: "original",
  FALLBACK: "fallback",
};

export function parseWixMediaUrl(src) {
  if (!src || typeof src !== "string") {
    return null;
  }

  return {
    baseUrl: src,
    filename: src.split("/").pop() || "",
  };
}

export function buildTransformUrl(parsed) {
  return parsed?.baseUrl || "";
}

export function buildSrcSet(parsed) {
  return parsed?.baseUrl || "";
}

export function getOriginalImageUrl(src) {
  return src || "";
}

export function nextImageLoadMode(mode) {
  return mode === IMAGE_LOAD_MODE.OPTIMIZED
    ? IMAGE_LOAD_MODE.ORIGINAL
    : IMAGE_LOAD_MODE.FALLBACK;
}