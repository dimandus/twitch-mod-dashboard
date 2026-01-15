import React from 'react';

interface MessageWithEmotesProps {
  text: string;
  emotes?: Record<string, string[]>;
}

export const MessageWithEmotes: React.FC<MessageWithEmotesProps> = ({ text, emotes }) => {
  if (!emotes || Object.keys(emotes).length === 0) return <>{text}</>;

  type EmoteToken = { start: number; end: number; id: string };
  const tokens: EmoteToken[] = [];

  for (const [id, ranges] of Object.entries(emotes)) {
    for (const r of ranges) {
      const [s, e] = r.split('-').map((n) => parseInt(n, 10));
      if (!Number.isNaN(s) && !Number.isNaN(e) && s <= e) {
        tokens.push({ start: s, end: e, id });
      }
    }
  }

  if (!tokens.length) return <>{text}</>;

  tokens.sort((a, b) => a.start - b.start);

  const result: React.ReactNode[] = [];
  let lastIndex = 0;

  tokens.forEach((t, idx) => {
    if (t.start > lastIndex) {
      result.push(
        <span key={`t-${idx}-${lastIndex}`}>
          {text.slice(lastIndex, t.start)}
        </span>
      );
    }
    const emoteCode = text.slice(t.start, t.end + 1);
    const url = `https://static-cdn.jtvnw.net/emoticons/v2/${t.id}/default/dark/1.0`;
    result.push(
      <img
        key={`e-${idx}-${t.id}`}
        src={url}
        alt={emoteCode}
        style={{
          verticalAlign: 'middle',
          margin: '0 1px',
          maxHeight: '1.2em'
        }}
      />
    );
    lastIndex = t.end + 1;
  });

  if (lastIndex < text.length) {
    result.push(
      <span key={'t-tail'}>{text.slice(lastIndex)}</span>
    );
  }

  return <>{result}</>;
};
