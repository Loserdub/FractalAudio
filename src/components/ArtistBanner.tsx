import React from 'react';

export interface BannerConfig {
  enabled: boolean;
  artistName: string;
  subtitle: string;
  font: string;
  position: 'bottom-left' | 'center' | 'top-center' | 'bottom-center';
  style: 'difference' | 'glass' | 'neon';
}

export const FONT_OPTIONS = [
  { id: 'font-notable', name: 'Notable', category: 'Geometric Heavy' },
  { id: 'font-lacquer', name: 'Lacquer', category: 'Dripping Street/Liquid' },
  { id: 'font-monoton', name: 'Monoton', category: 'Retro Multi-Line Neon' },
  { id: 'font-baumans', name: 'Baumans', category: 'Modernist Bauhaus' },
  { id: 'font-orbitron', name: 'Orbitron', category: 'Cyberpunk Sci-Fi' },
  { id: 'font-syne', name: 'Syne', category: 'Avant-Garde Techno' },
  { id: 'font-cinzel', name: 'Cinzel Decorative', category: 'Mystic Sacred Serif' },
  { id: 'font-silkscreen', name: 'Silkscreen', category: '8-Bit Arcade Pixel' },
  { id: 'font-glitch', name: 'Rubik Glitch', category: 'Digital Malfunction' },
  { id: 'font-space', name: 'Space Grotesk', category: 'Minimal Tech Clean' },
];

interface ArtistBannerProps {
  config: BannerConfig;
}

export const ArtistBanner: React.FC<ArtistBannerProps> = ({ config }) => {
  if (!config.enabled) return null;

  const artistText = config.artistName.trim() || 'ARTIST NAME';
  const subtitleText = config.subtitle.trim();

  // Position classes
  let positionClasses = 'fixed z-10 pointer-events-none select-none ';
  if (config.position === 'bottom-left') {
    positionClasses += 'bottom-24 left-8 text-left';
  } else if (config.position === 'center') {
    positionClasses += 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center max-w-[90vw]';
  } else if (config.position === 'top-center') {
    positionClasses += 'top-8 left-1/2 -translate-x-1/2 text-center max-w-[90vw]';
  } else if (config.position === 'bottom-center') {
    positionClasses += 'bottom-24 left-1/2 -translate-x-1/2 text-center max-w-[90vw]';
  }

  // Visual style classes
  let styleClasses = '';
  if (config.style === 'difference') {
    // Optical Color Inversion: text dynamically inverts against moving fractal hues
    styleClasses = 'mix-blend-difference text-white/90 drop-shadow-sm';
  } else if (config.style === 'glass') {
    // Frosted Glass VJ Watermark capsule
    styleClasses = 'backdrop-blur-xl bg-black/40 border border-white/15 shadow-2xl px-6 py-3 rounded-2xl text-white';
  } else if (config.style === 'neon') {
    // Pure Neon Glow
    styleClasses = 'text-lime-300 drop-shadow-[0_0_15px_rgba(163,230,53,0.75)]';
  }

  const isCenter = config.position === 'center';

  return (
    <div className={`${positionClasses} ${styleClasses} transition-all duration-300`}>
      <div className={`flex flex-col ${config.position === 'bottom-left' ? 'items-start' : 'items-center'} justify-center`}>
        <h2 
          className={`font-normal tracking-wider leading-none uppercase ${config.font} ${
            isCenter ? 'text-4xl sm:text-6xl md:text-7xl lg:text-8xl' : 'text-2xl sm:text-3xl md:text-4xl'
          }`}
          style={{ willChange: 'contents' }}
        >
          {artistText}
        </h2>

        {subtitleText && (
          <p 
            className={`font-mono uppercase tracking-[0.28em] text-white/70 mt-1.5 ${
              isCenter ? 'text-xs sm:text-sm md:text-base' : 'text-[10px] sm:text-xs'
            }`}
          >
            {subtitleText}
          </p>
        )}
      </div>
    </div>
  );
};
