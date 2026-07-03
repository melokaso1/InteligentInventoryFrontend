/** Move focus out of an overlay before it is hidden from assistive tech. */
export function releaseOverlayFocus() {
  const active = document.activeElement
  if (active instanceof HTMLElement) {
    active.blur()
  }
}
