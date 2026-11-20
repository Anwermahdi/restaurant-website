/**
 * A card-shaped placeholder that holds the exact space the real card takes,
 * so the grid never jumps while a page of restaurants is on its way.
 */
export default function RestaurantCardSkeleton() {
  return (
    <div className="cx cxa cx--skeleton" aria-hidden="true">
      <div className="cxa-mount">
        <div className="cx-media cxa-media"><span className="skeleton-block" /></div>
      </div>
      <div className="cxa-body">
        <span className="skeleton-line skeleton-line--title" />
        <span className="skeleton-line skeleton-line--text" />
        <span className="skeleton-line skeleton-line--short" />
      </div>
    </div>
  );
}
