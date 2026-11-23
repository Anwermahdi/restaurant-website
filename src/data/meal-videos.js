/**
 * The best meals: real videos or photos of dishes, added by hand. They swap
 * one after another in the banner at the top of the front page.
 *
 * To add one:
 *   1. Put the file in public/videos/meals/
 *        video: MP4, 5-15 s, no sound needed, ideally under 4 MB
 *               (e.g. nino-truffle-pizza.mp4)
 *        photo: JPG or WebP, at least 1200 px wide (e.g. nino-pizza.jpg)
 *   2. Add a line below. restaurantId must match an id in restaurants.js.
 *        a video:  { restaurantId: "nino", dish: "Truffle pizza",
 *                    src: "/videos/meals/nino-truffle-pizza.mp4",
 *                    poster: "/videos/meals/nino-truffle-pizza.jpg" },
 *        a photo:  { restaurantId: "nino", dish: "Truffle pizza",
 *                    poster: "/videos/meals/nino-pizza.jpg" },
 *      (poster is the still image: optional for a video, the photo itself
 *      for a photo.)
 *
 * Each meal also opens as the first frame of its restaurant's story (tap
 * the logo on its card), with the dish name as the caption.
 *
 * While this list is empty, the banner shows only its welcome slide
 * (the Manama sunset).
 */
export const MEAL_VIDEOS = [];
