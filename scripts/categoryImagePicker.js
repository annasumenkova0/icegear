// Script to pick the best image for each category based on aspect ratio and resolution
// Usage: import and call pickBestCategoryImages(products)
import { getImageDimensions, scoreImage } from './imageUtils.js';

/**
 * Given an array of products [{category, image_links}], returns a map {category: bestImageUrl}
 */
export async function pickBestCategoryImages(products) {
  // Map: category -> Set of image URLs
  const catImages = {};
  for (const p of products) {
    if (!p.category || !p.image_links) continue;
    const cat = p.category.trim();
    for (const url of p.image_links.split(',')) {
      if (!url) continue;
      if (!catImages[cat]) catImages[cat] = new Set();
      catImages[cat].add(url.trim());
    }
  }
  // Map: category -> best image URL
  const result = {};
  for (const [cat, urls] of Object.entries(catImages)) {
    let bestScore = -Infinity;
    let bestUrl = null;
    for (const url of urls) {
      try {
        const dim = await getImageDimensions(url);
        if (!dim) continue;
        const score = scoreImage(dim.width, dim.height);
        if (score > bestScore) {
          bestScore = score;
          bestUrl = url;
        }
      } catch {}
    }
    if (bestUrl) result[cat] = bestUrl;
  }
  return result;
}
