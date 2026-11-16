/**
 * A card-shaped placeholder.
 *
 * It holds the exact space the real card will take, so the grid never
 * jumps while a page of restaurants is on its way.
 */
export default function RestaurantCardSkeleton() {
  return (
    <div className="card card--skeleton" aria-hidden="true">
      <div className="card-media card-media--skeleton">
        <span className="skeleton-block" />
      </div>
      <div className="card-body">
        <span className="skeleton-line skeleton-line--title" />
        <span className="skeleton-line skeleton-line--text" />
        <span className="skeleton-line skeleton-line--short" />
        <span className="skeleton-pills">
          <span className="skeleton-pill" />
          <span className="skeleton-pill" />
        </span>
        <span className="skeleton-line skeleton-line--short" />
      </div>
    </div>
  );
}
