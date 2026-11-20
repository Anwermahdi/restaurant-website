import { useEffect, useRef, useState } from "react";
import RestaurantCard from "./RestaurantCard.jsx";
import RestaurantCardSkeleton from "./RestaurantCardSkeleton.jsx";

// How many cards the grid shows at first, and how many more each time.
const FIRST_PAGE = 16;
const PAGE = 16;

/**
 * The restaurant grid.
 *
 * Cards arrive a page at a time so a long list never paints all at once,
 * and the filters above it stay exactly where the visitor left them.
 */
export default function RestaurantGrid({
  restaurants,
  view = "grid",
  favourites,
  onToggleSaved,
  onOpen,
  hasStory,
  onOpenStory,
  onOpenMenu,
  onChooseBranch,
  onOpenOffers,
  onOpenGallery,
}) {
  const [visible, setVisible] = useState(FIRST_PAGE);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef(null);

  // A new set of results starts again at the first page.
  useEffect(() => {
    setVisible(FIRST_PAGE);
  }, [restaurants]);

  const shown = restaurants.slice(0, visible);
  const hasMore = visible < restaurants.length;

  const loadMore = () => {
    if (!hasMore || loading) return;
    setLoading(true);
    // A short pause so the placeholders read as deliberate, not as a stall.
    window.setTimeout(() => {
      setVisible((count) => Math.min(count + PAGE, restaurants.length));
      setLoading(false);
    }, 160);
  };

  // Load the next page on its own once the end of the list comes into view.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin: "320px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loading, visible]);

  if (view === "map") return null;

  return (
    <>
      <div className={view === "list" ? "list" : "grid"}>
        {shown.map((restaurant, index) => (
          <RestaurantCard
            key={restaurant.id}
            restaurant={restaurant}
            index={index}
            isSaved={favourites.has(restaurant.id)}
            onToggleSaved={onToggleSaved}
            onOpen={onOpen}
            hasStory={Boolean(hasStory?.(restaurant.id))}
            onOpenStory={onOpenStory}
            onOpenMenu={onOpenMenu}
            onChooseBranch={onChooseBranch}
            onOpenOffers={onOpenOffers}
            onOpenGallery={onOpenGallery}
          />
        ))}

        {loading &&
          Array.from({ length: Math.min(PAGE, restaurants.length - visible) }, (_, i) => (
            <RestaurantCardSkeleton key={`skeleton-${i}`} />
          ))}
      </div>

      {hasMore && (
        <div className="grid-more" ref={sentinelRef}>
          <button type="button" className="grid-more-btn" onClick={loadMore} disabled={loading}>
            {loading ? "Loading more…" : `Show more restaurants (${restaurants.length - visible} left)`}
          </button>
        </div>
      )}
    </>
  );
}
