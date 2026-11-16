import { TagIcon, tagTint } from "./icons.jsx";

/**
 * One food type on a card: a pastel pill with a small picture in it.
 * The colour is picked from the word itself, so the same cuisine always
 * looks the same across the site.
 */
export default function CuisineBadge({ label, tint }) {
  return (
    <span className={`cuisine-badge cuisine-badge--${tint || tagTint(label)}`}>
      <TagIcon tag={label} />
      <span className="cuisine-badge-text">{label}</span>
    </span>
  );
}
