/**
 * A card-shaped placeholder that holds the exact space the real card takes,
 * so the grid never jumps while a page of restaurants is on its way.
 */
export default function RestaurantCardSkeleton() {
  return (
    <div className="cx cxs cx--skeleton" aria-hidden="true">
      <div className="cx-media cxs-media"><span className="skeleton-block" /></div>
      <div className="cxs-body">
        <span className="skeleton-line skeleton-line--title" />
        <span className="skeleton-line skeleton-line--text" />
        <span className="skeleton-line skeleton-line--short" />
      </div>
    </div>
  );
}
