/**
 * The home page's signboard: a red sign with the question, the number of
 * places and the search, and the Manama sunset showing through on the
 * right. The dish tiles sit directly under it.
 */
export default function HomeHero({ total, search }) {
  return (
    <header className="crave" id="top">
      <div className="crave-panel">
        <div className="crave-sky" aria-hidden="true" />
        <div className="crave-inner">
          <h1>What are you craving?</h1>
          <p>{total} restaurants across Bahrain, with real menus and hours where we have them.</p>
          <div className="crave-search">{search}</div>
        </div>
      </div>
    </header>
  );
}
