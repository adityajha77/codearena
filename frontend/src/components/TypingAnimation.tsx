import { useState, useEffect } from "react";

const phrases = [
  "Create a challenge",
  "Join with friends",
  "Compete with the community",
  "Build your streak",
  "Earn rewards by staying consistent",
];

const TypingAnimation = () => {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = phrases[phraseIndex];
    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          if (charIndex < current.length) {
            setCharIndex(charIndex + 1);
          } else {
            setTimeout(() => setIsDeleting(true), 1500);
          }
        } else {
          if (charIndex > 0) {
            setCharIndex(charIndex - 1);
          } else {
            setIsDeleting(false);
            setPhraseIndex((phraseIndex + 1) % phrases.length);
          }
        }
      },
      isDeleting ? 30 : 60
    );
    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, phraseIndex]);

  return (
    <span className="font-mono">
      <span className="gradient-text-primary">
        {phrases[phraseIndex].substring(0, charIndex)}
      </span>
      <span className="animate-pulse-glow text-primary">|</span>
    </span>
  );
};

export default TypingAnimation;
