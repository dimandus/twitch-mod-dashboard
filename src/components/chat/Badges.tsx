import React from 'react';
import { badgeTitle } from '../../utils/chatHelpers';

interface BadgesProps {
  badges: string[];
  badgeVersions?: Record<string, string>;
  badgeInfo?: Record<string, string>;
  badgeSets?: Record<string, Record<string, any>>;
}

export const Badges: React.FC<BadgesProps> = ({ badges, badgeVersions, badgeInfo, badgeSets }) => {
  if (!badges.length) return null;

  if (badgeSets && Object.keys(badgeSets).length > 0) {
    return (
      <>
        {badges.map((setId, i) => {
          const set = badgeSets[setId];
          if (!set) return null;

          const versionId = badgeVersions?.[setId] || '1';
          const verData = set[versionId] || Object.values(set)[0];

          if (!verData) return null;

          const url = verData.image_url_1x || verData.image_url_2x || verData.image_url_4x;
          if (!url) return null;

          const months = badgeInfo?.[setId];
          const title = verData.title || badgeTitle(setId, months);

          return (
            <img
              key={setId + i}
              src={url}
              alt={setId}
              title={title}
              style={{
                width: 18,
                height: 18,
                marginRight: 2,
                flexShrink: 0
              }}
            />
          );
        })}
      </>
    );
  }

  const mapping: Record<string, { label: string; color: string }> = {
    broadcaster: { label: 'S', color: '#a855f7' },
    moderator: { label: 'M', color: 'var(--color-success)' },
    vip: { label: 'V', color: '#0ea5e9' },
    subscriber: { label: 'Sub', color: '#f97316' },
    staff: { label: 'T', color: '#f97316' },
    admin: { label: 'T', color: '#f97316' },
    global_mod: { label: 'T', color: '#f97316' }
  };

  return (
    <>
      {badges.map((setId, i) => {
        const info = mapping[setId];
        if (!info) return null;

        const months = badgeInfo?.[setId];
        const title = badgeTitle(setId, months);

        return (
          <span
            key={setId + i}
            title={title}
            style={{
              minWidth: 14,
              height: 14,
              borderRadius: 4,
              fontSize: 9,
              lineHeight: '14px',
              textAlign: 'center',
              background: info.color,
              color: 'var(--color-chatBackground)',
              fontWeight: 700,
              padding: '0 2px',
              marginRight: 2,
              flexShrink: 0
            }}
          >
            {info.label}
          </span>
        );
      })}
    </>
  );
};
