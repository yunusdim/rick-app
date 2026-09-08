/** Keyboard overlay height in CSS pixels. 0 when the layout already resized. */
export function watchKeyboard(onChange: (kb: number) => void): () => void {
  const report = (kb: number) => onChange(Math.max(0, Math.round(kb)));
  const vv = window.visualViewport;
  const vk = "virtualKeyboard" in navigator
    ? (navigator as Navigator & { virtualKeyboard: VirtualKeyboard }).virtualKeyboard
    : null;

  if (vk) {
    try {
      vk.overlaysContent = true;
    } catch {
      /* ignore */
    }
    const geo = () => report(vk.boundingRect.height);
    vk.addEventListener("geometrychange", geo);
    geo();
    return () => vk.removeEventListener("geometrychange", geo);
  }

  const fromViewport = () => {
    if (!vv) {
      report(0);
      return;
    }
    const overlay = Math.max(
      window.innerHeight - vv.height - vv.offsetTop,
      document.documentElement.clientHeight - vv.height,
      0,
    );
    report(overlay > 40 ? overlay : 0);
    window.scrollTo(0, 0);
  };

  fromViewport();
  vv?.addEventListener("resize", fromViewport);
  vv?.addEventListener("scroll", fromViewport);
  window.addEventListener("orientationchange", fromViewport);
  window.addEventListener("focusin", fromViewport);
  const late = window.setTimeout(fromViewport, 400);
  return () => {
    window.clearTimeout(late);
    vv?.removeEventListener("resize", fromViewport);
    vv?.removeEventListener("scroll", fromViewport);
    window.removeEventListener("orientationchange", fromViewport);
    window.removeEventListener("focusin", fromViewport);
  };
}

type VirtualKeyboard = {
  overlaysContent: boolean;
  boundingRect: DOMRect;
  addEventListener: (type: "geometrychange", fn: () => void) => void;
  removeEventListener: (type: "geometrychange", fn: () => void) => void;
};
