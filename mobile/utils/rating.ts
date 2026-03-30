export function starsToRating(stars: number): number {
  return Math.round(stars * 2);
}

export function ratingToStars(rating: number): number {
  return rating / 2;
}
