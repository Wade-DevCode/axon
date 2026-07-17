export type BrandDensity = "compact" | "normal" | "wide"

export function brandDensity(width: number, _height: number): BrandDensity {
  if (width < 80) return "compact"
  if (width < 120) return "normal"
  return "wide"
}

export function showSplashArtwork(width: number, height: number) {
  return width >= 80 && height >= 22
}
