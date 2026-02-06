import React from 'react';

export interface AnimationIndicatorProps {
  currentAnimation: string | null;
  isSpeaking?: boolean;
}

export const AnimationIndicator: React.FC<AnimationIndicatorProps> = ({ currentAnimation, isSpeaking = false }) => {
  const formatAnimationName = (name: string): string => {
    return name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
  };

  const displayText = currentAnimation ? formatAnimationName(currentAnimation) : 'Idle';
  const isActive = currentAnimation !== null;
  const color = isActive ? (isSpeaking ? '#14b8a6' : '#a855f7') : '#6b7280';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: 'rgba(31,41,55,0.5)', borderTop: '1px solid rgba(107,114,128,0.5)' }}>
      <span style={{ color, fontSize: '0.75rem', fontWeight: 500 }}>Animation:</span>
      <span style={{ color, fontSize: '0.75rem', fontWeight: 600 }}>{displayText}</span>
      {isActive && (
        <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', backgroundColor: color, display: 'inline-block' }} />
      )}
    </div>
  );
};
