import React from 'react';

interface ChannelIconProps {
  channel: string;
  avatarUrl?: string | null;
  size?: number;
  style?: React.CSSProperties;
}

// Renders a Twitch channel avatar icon (using static-cdn.jtvnw.net)
export const ChannelIcon: React.FC<ChannelIconProps> = ({
  channel,
  avatarUrl,
  size = 16,
  style
}) => {
  const login = channel.toLowerCase();
  // Use the standard Twitch CDN endpoint for user avatars by login
  // https://static-cdn.jtvnw.net/user-profile-picture/{login}-profile_image-70x70.png is NOT reliable
  // Instead, use https://static-cdn.jtvnw.net/user-default-pictures/{login}.png as fallback
  // But best is https://static-cdn.jtvnw.net/jtv_user_pictures/{userId}-profile_image-70x70.png, but we don't have userId
  // So use https://static-cdn.jtvnw.net/user-profile-picture/{login}-profile_image-70x70.png, fallback to default
  // Or use https://static-cdn.jtvnw.net/user-default-pictures/avatar-70x70.png for unknown
  // For now, use https://static-cdn.jtvnw.net/user-profile-picture/{login}-profile_image-70x70.png
  // If not found, fallback to default Twitch avatar
  const url = avatarUrl || (login
    ? `https://static-cdn.jtvnw.net/user-profile-picture/${login}-profile_image-70x70.png`
    : 'https://static-cdn.jtvnw.net/user-default-pictures/avatar-70x70.png');
  return (
    <img
      src={url}
      alt={channel}
      title={channel}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        objectFit: 'cover',
        background: '#18181b',
        border: '1px solid #4b5563',
        marginRight: 2,
        ...style
      }}
      onError={e => {
        (e.target as HTMLImageElement).src = 'https://static-cdn.jtvnw.net/user-default-pictures/avatar-70x70.png';
      }}
    />
  );
};
