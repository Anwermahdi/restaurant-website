import { useEffect } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keeps Tab and Shift+Tab inside an open pop-up, so a keyboard user never
 * lands on the page hidden behind it. Optionally moves focus into the pop-up
 * when it opens (`focusFirst`): to `initialRef`, or else its first control.
 * Putting focus back afterwards stays with whoever opened the pop-up.
 */
export default function useFocusTrap(containerRef, { active = true, focusFirst = false, initialRef = null } = {}) {
  useEffect(() => {
    if (!active) return undefined;
    const frame = focusFirst
      ? window.requestAnimationFrame(() => {
          const container = containerRef.current;
          (initialRef?.current || container?.querySelector(FOCUSABLE))?.focus();
        })
      : 0;
    const onKeyDown = (event) => {
      const container = containerRef.current;
      if (event.key !== "Tab" || !container) return;
      const items = [...container.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!container.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [containerRef, active, focusFirst, initialRef]);
}
