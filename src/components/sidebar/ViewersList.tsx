import React from 'react';
import { Badges } from '../chat/Badges';

interface ViewerEntry {
  login: string;
  role: string;
  isBot: boolean;
  avatarUrl?: string | null;
  displayName?: string | null;
  bannerUrl?: string | null;
  badges?: string[];
  badgeVersions?: Record<string, string>;
  badgeInfo?: Record<string, string>;
  lastSeen?: number;
  isFromFallback?: boolean;
}

interface ViewersListProps {
  viewers: ViewerEntry[];
  badgeSets: Record<string, Record<string, any>>;
  onViewerContextMenu: (e: React.MouseEvent, viewer: ViewerEntry) => void;
  textScale: number;
}

export const ViewersList: React.FC<ViewersListProps> = ({
  viewers,
  badgeSets,
  onViewerContextMenu,
  textScale
}) => {
  const now = Date.now();
  const maxAgeMs = 5 * 60 * 1000;

  return (
    <>
      {viewers.map((v) => {
        const hasModBadge = (v.badges || []).some(
          (b) => b.toLowerCase().startsWith('broadcaster') || b.toLowerCase().startsWith('moderator')
        );

        const isModOrBroadcastor = v.role === 'broadcaster' || v.role === 'moderator' || hasModBadge;

        const roleBgStyle = isModOrBroadcastor
          ? { backgroundColor: 'rgba(0,0,0,0.4)', borderLeft: '3px solid var(--color-primary)' }
          : {};

        const bannerStyle: React.CSSProperties = v.bannerUrl
          ? {
              backgroundImage: `url(${v.bannerUrl})`,
              backgroundPosition: 'center top',
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat'
            }
          : {};

        let activityDot: React.ReactNode = null;
        if (v.isFromFallback && typeof v.lastSeen === 'number') {
          const ageMs = now - v.lastSeen;
          const clampedAge = Math.min(Math.max(ageMs, 0), maxAgeMs);
          const ratio = clampedAge / maxAgeMs;
          const progress = 1 - ratio;

          activityDot = (
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                border: '1px solid #4b5563',
                background:
                  progress <= 0
                    ? 'var(--color-surface)'
                    : `conic-gradient(var(--color-success) ${progress * 360}deg, var(--color-surface) ${progress * 360}deg)`,
                flexShrink: 0
              }}
              title={`Активность: ${Math.round(progress * 100)}% (последнее сообщение ≈ ${
                Math.max(0, Math.round(ageMs / 60000)) || 0
              } мин назад)`}
            />
          );
        }

        return (
          <div
            key={v.login + v.role}
            onContextMenu={(e) => onViewerContextMenu(e, v)}
            style={{
              ...bannerStyle,
              ...roleBgStyle,
              cursor: 'context-menu',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 6px',
              borderRadius: 6,
              marginBottom: 2
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
              {activityDot}
              {v.avatarUrl && (
                <img
                  src={v.avatarUrl}
                  alt={v.login}
                  style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0 }}
                />
              )}

              {v.isBot && (
                <span
                  title="Bot"
                  style={{
                    minWidth: 14,
                    height: 14,
                    borderRadius: 4,
                    fontSize: 9 * textScale,
                    lineHeight: '14px',
                    textAlign: 'center',
                    background: '#eab308',
                    color: '#020617',
                    fontWeight: 700,
                    padding: '0 2px'
                  }}
                >
                  B
                </span>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Badges
                  badges={v.badges || []}
                  badgeVersions={v.badgeVersions}
                  badgeInfo={v.badgeInfo}
                  badgeSets={badgeSets}
                />
              </div>

              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontWeight: isModOrBroadcastor ? 'bold' : 'normal',
                  fontSize: 12 * textScale
                }}
              >
                {v.displayName || v.login}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
};
