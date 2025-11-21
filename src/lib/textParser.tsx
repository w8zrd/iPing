import { useNavigate } from 'react-router-dom';

interface ParsedTextProps {
  text: string;
}

export const ParsedText = ({ text }: ParsedTextProps) => {
  const navigate = useNavigate();

  const parseText = (text: string) => {
    const parts = [];
    const regex = /(https?:\/\/[^\s]+|#\w+|@\w+)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(
          <span key={lastIndex}>{text.substring(lastIndex, match.index)}</span>
        );
      }

      const matchedText = match[0];
      if (matchedText.startsWith('http://') || matchedText.startsWith('https://')) {
        // URL
        parts.push(
          <a
            key={match.index}
            href={matchedText}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-primary hover:underline font-medium break-all"
          >
            {matchedText}
          </a>
        );
      } else if (matchedText.startsWith('#')) {
        // Hashtag
        parts.push(
          <button
            key={match.index}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/search?q=${encodeURIComponent(matchedText)}`);
            }}
            className="text-primary hover:underline font-medium"
          >
            {matchedText}
          </button>
        );
      } else if (matchedText.startsWith('@')) {
        // Mention
        const username = matchedText.substring(1);
        parts.push(
          <button
            key={match.index}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/profile/${username}`);
            }}
            className="text-primary hover:underline font-medium"
          >
            {matchedText}
          </button>
        );
      }

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(<span key={lastIndex}>{text.substring(lastIndex)}</span>);
    }

    return parts;
  };

  return <>{parseText(text)}</>;
};
