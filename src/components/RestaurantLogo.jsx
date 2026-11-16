import { useState } from "react";
import { handleLogoError } from "./media.js";

/**
 * A restaurant's own logo, drawn edge to edge in its tile.
 *
 * The mark fills the whole tile on purpose: several logos arrive as a square
 * image with their own background, and inset them inside a white frame made
 * them look double-framed. The tile itself provides the rounded corners,
 * hairline border and soft shadow; this component only decides between the
 * real image and a plain letter if every logo file fails.
 */
export default function RestaurantLogo({ restaurant }) {
  const [missing, setMissing] = useState(false);

  if (missing) {
    return (
      <span className="logo-mark-fallback" aria-hidden="true">
        {restaurant.name.charAt(0)}
      </span>
    );
  }

  return (
    <img
      className="logo-mark-img"
      src={restaurant.logoUpload}
      data-rid={restaurant.id}
      data-official={restaurant.logo}
      alt=""
      width="96"
      height="96"
      loading="lazy"
      decoding="async"
      onError={(event) => {
        if (handleLogoError(event) === false) setMissing(true);
      }}
    />
  );
}
