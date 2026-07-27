'use client';

import { useEffect, type MouseEvent } from 'react';
import { ExternalLink, Gift } from 'lucide-react';
import DailyMathChallenge from './DailyMathChallenge';
import AlphaCaptchaChallenge from './AlphaCaptchaChallenge';
import RewardedVideoOffer from './ads/RewardedVideoOffer';
import {
  type GameProgressDoc,
} from '../lib/economy';
import { openCpaGripOfferWall } from '../lib/cpagrip';
import { MONETAG_INTERSTITIAL_ZONE } from '../lib/ads-config';
import { trackAdEvent } from '../lib/ad-client';
import { ensureMonetagSdkLoaded } from '../lib/monetag-client';
import { guardClick, startIntrusiveAdGuard } from '../lib/ad-guards';

type UserLike = { uid: string; getIdToken: () => Promise<string>; email?: string | null } | null;

type Props = {
  user: UserLike;
  unlockedGames: string[];
  gameProgress: Record<string, GameProgressDoc>;
  onAlert: (msg: string, icon?: string) => void;
  onRefreshUser?: () => void;
  onOpenGames?: () => void;
};

/**
 * Tasks dashboard — four earn cards only:
 * 1) Rewarded Video (+20)
 * 2) Math Challenge (+5, 5/day)
 * 3) Alphanumeric Captcha (+10, 5/day)
 * 4) CPAGrip Offerwall (postback only)
 */
export default function HubEarnPanel({
  user,
  onAlert,
  onRefreshUser,
  onOpenGames,
}: Props) {
  useEffect(() => {
    startIntrusiveAdGuard();
    ensureMonetagSdkLoaded(MONETAG_INTERSTITIAL_ZONE).catch(() => {});
  }, []);

  const openOfferPartners = (e: MouseEvent) => {
    guardClick(e);
    if (!user) return onAlert('Please sign in first', '🔒');
    trackAdEvent(
      {
        event: 'click',
        placement: 'offerwall_rewarded_video',
        zoneId: MONETAG_INTERSTITIAL_ZONE,
        meta: { action: 'open_offer_partners_hub', provider: 'cpagrip' },
      },
      user
    ).catch(() => {});
    const result = openCpaGripOfferWall(user.uid);
    if (result.ok) {
      onAlert(
        'High payout tasks opened. AJ Coins 🪙 credit automatically after verified install/completion.',
        '🔗'
      );
    } else {
      onAlert(result.error || 'Could not open offer partners.', '⚠️');
    }
  };

  return (
    <div className="px-4 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-cyan-400 font-black uppercase tracking-widest">
          Tasks · Earn AJ Coins 🪙
        </p>
        {onOpenGames ? (
          <button
            type="button"
            onClick={(e) => {
              guardClick(e);
              onOpenGames();
            }}
            className="text-[9px] font-black text-pink-400 active:scale-90"
          >
            Gaming Zone →
          </button>
        ) : null}
      </div>

      {/* CARD 1 — Watch Rewarded Video (+20) */}
      <RewardedVideoOffer
        user={user}
        onAlert={onAlert}
        onRefreshUser={onRefreshUser}
      />

      {/* CARD 2 — Math Challenge (+5) */}
      <DailyMathChallenge
        user={user}
        onAlert={onAlert}
        onRefreshUser={onRefreshUser}
      />

      {/* CARD 3 — Premium Alphanumeric Captcha (+10) */}
      <AlphaCaptchaChallenge
        user={user}
        onAlert={onAlert}
        onRefreshUser={onRefreshUser}
      />

      {/* CARD 4 — Apps & Surveys (Offerwall) */}
      <button
        type="button"
        onClick={openOfferPartners}
        className="flex items-center gap-3 w-full rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 to-orange-950/30 p-4 active:scale-[0.99] text-left"
      >
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
          <Gift size={18} className="text-amber-300" />
        </div>
        <div className="text-left flex-1 min-w-0">
          <p className="text-sm font-black text-white">Apps & Surveys (Offerwall)</p>
          <p className="text-[11px] text-amber-200/90 font-bold mt-0.5">
            High Payout Tasks (200 - 1000+ Coins)
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Coins added automatically after install/completion.
          </p>
        </div>
        <ExternalLink size={14} className="text-gray-500 shrink-0" />
      </button>
    </div>
  );
}
