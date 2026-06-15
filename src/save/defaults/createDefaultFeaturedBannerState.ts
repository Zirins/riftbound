// src/save/defaults/createDefaultFeaturedBannerState.ts

import { FEATURED_BANNER } from '../../constants/gameConfig';
import { FEATURED_BANNER_ROTATION } from '../../data/banners';
import type { FeaturedBannerState } from '../../types';
import { getLocalDateKey, parseLocalDateKey } from '../utils/saveDateUtils';

export function createDefaultFeaturedBannerState(now = Date.now()): FeaturedBannerState {
  const firstBanner = FEATURED_BANNER_ROTATION[0];
  const bannerStartDate = getLocalDateKey(new Date(now));
  const endDate = parseLocalDateKey(bannerStartDate);
  endDate.setDate(endDate.getDate() + FEATURED_BANNER.DURATION_DAYS);

  return {
    currentBannerId: firstBanner.id,
    bannerStartDate,
    bannerEndDate: getLocalDateKey(endDate),
    pityCounter: 0,
    guaranteedFeatured: false,
    totalPullsOnCurrentBanner: 0,
  };
}
