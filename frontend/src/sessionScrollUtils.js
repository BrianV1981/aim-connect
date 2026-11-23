export const HOP_BOTTOM_THRESHOLD_PX = 90;
export const CLASSIC_NEAR_BOTTOM_PX = 180;

export function computeScrollDistanceFromBottom(scrollHeight, scrollTop, clientHeight) {
  return Math.max(
    0,
    (Number(scrollHeight) || 0) - (Number(scrollTop) || 0) - (Number(clientHeight) || 0)
  );
}

export function isViewportScrolledUp(
  scrollHeight,
  scrollTop,
  clientHeight,
  threshold = HOP_BOTTOM_THRESHOLD_PX
) {
  return computeScrollDistanceFromBottom(scrollHeight, scrollTop, clientHeight) > threshold;
}

export function decideTurnScrollAction({
  autoScroll = false,
  wasPinnedBeforeUpdate = true,
  postRenderDistancePx = 0,
  optimisticAdded = false,
}) {
  if (autoScroll) {
    if (optimisticAdded || wasPinnedBeforeUpdate) {
      return { shouldScrollToBottom: true, markUnseenBelow: false };
    }
    return {
      shouldScrollToBottom: false,
      markUnseenBelow: postRenderDistancePx > HOP_BOTTOM_THRESHOLD_PX,
    };
  }

  // Default (Auto-Scroll OFF): preserve classic non-intrusive reading flow (#261, #277)
  if (postRenderDistancePx < CLASSIC_NEAR_BOTTOM_PX) {
    return { shouldScrollToBottom: true, markUnseenBelow: false };
  }
  return {
    shouldScrollToBottom: false,
    markUnseenBelow: postRenderDistancePx > HOP_BOTTOM_THRESHOLD_PX,
  };
}
