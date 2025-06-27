import { isElementScrollable } from "./isElementScrollable";

/**
 * Prevents overscroll behavior on wheel events
 * @param event - The wheel event
 */
export function preventOverscroll(event: WheelEvent): void {
  const target = event.target as HTMLElement;
  
  if (!target || !isElementScrollable(target)) {
    return;
  }

  const { deltaY } = event;
  const { scrollTop, scrollHeight, clientHeight } = target;

  if (deltaY < 0 && scrollTop <= 0) {
    target.scrollTop = 0;
    event.preventDefault();
    return;
  }

  if (deltaY > 0 && (scrollTop + clientHeight) >= scrollHeight) {
    target.scrollTop = scrollHeight - clientHeight;
    event.preventDefault();
  }
}
