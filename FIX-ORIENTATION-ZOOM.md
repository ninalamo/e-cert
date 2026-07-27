# Fix: Orientation Switch Zoom Reset

## Problem
When switching canvas orientation (A4 Landscape → Portrait → Landscape), the canvas layout appears "messed up" because `calcAutoFitZoom` recalculates zoom on every `CANVAS_W`/`CANVAS_H` change with a 100ms delay, causing a visual flash and scale shift.

## Root Cause
`template-canvas.tsx` line 2228-2244:
```js
useEffect(() => {
  function calcAutoFitZoom() { ... setZoom(scale); }
  const timer = setTimeout(calcAutoFitZoom, 100);
  return () => clearTimeout(timer);
}, [CANVAS_W, CANVAS_H]); // ← fires on every orientation/size change
```

Elements data (`el.x`, `el.y`, `el.w`, `el.h`) never changes — the "mess" is purely visual from zoom recalculating.

## Fix
Change the `calcAutoFitZoom` effect to only run on:
1. **Initial mount** (first render)
2. **Window resize** (browser resize, not canvas dimension changes)

Remove `CANVAS_W` and `CANVAS_H` from the dependency array and use a `hasMounted` ref to skip the first auto-fit if the user already has a zoom level, or simply run it once on mount via a separate `useEffect`.

### File: `src/features/templates/components/template-canvas.tsx`

**Before (line 2228-2244):**
```js
useEffect(() => {
  function calcAutoFitZoom() {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const maxW = rect.width - 48;
    const maxH = rect.height - 48;
    if (maxW <= 0 || maxH <= 0) return;
    const scale = Math.min(1, maxW / CANVAS_W, maxH / CANVAS_H);
    setZoom(scale);
  }
  const timer = setTimeout(calcAutoFitZoom, 100);
  return () => {
    clearTimeout(timer);
  };
}, [CANVAS_W, CANVAS_H]);
```

**After:**
```js
// Auto-fit zoom once on mount and on window resize only (not on canvas dimension changes)
const calcAutoFitZoom = useCallback(() => {
  const container = containerRef.current;
  if (!container) return;
  const rect = container.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  const maxW = rect.width - 48;
  const maxH = rect.height - 48;
  if (maxW <= 0 || maxH <= 0) return;
  const scale = Math.min(1, maxW / CANVAS_W, maxH / CANVAS_H);
  setZoom(scale);
}, [CANVAS_W, CANVAS_H]);

// Run once on mount
useEffect(() => {
  const timer = setTimeout(calcAutoFitZoom, 100);
  return () => clearTimeout(timer);
}, []); // eslint-disable-line react-hooks/exhaustive-deps

// Re-fit on window resize (not on canvas dimension changes)
useEffect(() => {
  window.addEventListener("resize", calcAutoFitZoom);
  return () => window.removeEventListener("resize", calcAutoFitZoom);
}, [calcAutoFitZoom]);
```

## Tradeoffs
- **Pros:** Orientation toggle keeps current zoom — no visual flash, elements stay aligned
- **Cons:** After orientation change, if canvas is now larger than viewport, user may need to manually zoom out (Ctrl+scroll or zoom controls). This is acceptable since the zoom controls are always visible.

## Verification
1. Open a template in A4 Landscape
2. Switch to Portrait → elements should stay at same zoom, some may be clipped (expected)
3. Switch back to Landscape → canvas should look identical to step 1
4. Open preview modal → should match canvas exactly
5. Resize browser window → zoom should auto-fit
