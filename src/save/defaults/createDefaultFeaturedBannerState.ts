// src/save/defaults/createDefaultFeaturedBannerState.ts

import { FEATURED_BANNER } from '../../constants/gameConfig';
import type { FeaturedBannerState } from '../../types';
import { toDateString } from '../utils/saveDateUtils';

export function createDefaultFeaturedBannerState(now = Date.now()): FeaturedBannerState {
  const bannerStartDate = toDateString(now);
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + FEATURED_BANNER.DURATION_DAYS);

  return {
    currentBannerId: 'featured_starter',
    bannerStartDate,
    bannerEndDate: toDateString(endDate.getTime()),
    pityCounter: 0,
    guaranteedFeatured: false,
    totalPullsOnCurrentBanner: 0,
  };
}
