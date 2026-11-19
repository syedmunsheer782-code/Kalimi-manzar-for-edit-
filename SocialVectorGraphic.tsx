import React from 'react';
import {SocialAnimationLayer} from '../types/editor';
import {
  evaluateSocialAnimFrame,
  getSocialLogicalSize,
  getSocialPalette,
  SOCIAL_VECTOR_PATHS,
} from '../utils/socialVectorRenderer';

interface SocialVectorGraphicProps {
  layer: SocialAnimationLayer;
  globalTime: number;
  previewLoop?: boolean;
  className?: string;
}

/**
 * Hardware-accelerated native inline SVG renderer for Social Animations.
 * Completely transparent (zero background box or card behind the graphic) so
 * YouTube, Facebook, and Instagram overlays float cleanly directly over video
 * with razor-sharp vector geometry and legible haloed typography at 1080p & 4K.
 */
export const SocialVectorGraphic: React.FC<SocialVectorGraphicProps> = ({
  layer,
  globalTime,
  previewLoop = false,
  className = 'w-full h-full block',
}) => {
  const anim = evaluateSocialAnimFrame(layer, globalTime, previewLoop);
  if (!anim.visible || anim.alpha <= 0.01) return null;

  const {width: viewW, height: viewH} = getSocialLogicalSize(layer.platform, layer.showActions);
  const pal = getSocialPalette(layer.platform, layer.themeStyle);
  const fontStack = '"Plus Jakarta Sans", "DM Sans", -apple-system, BlinkMacSystemFont, sans-serif';
  const uid = layer.id.replace(/[^a-zA-Z0-9_-]/g, '');

  const truncate = (str: string, maxChars: number) =>
    str.length > maxChars ? `${str.slice(0, maxChars - 1)}…` : str;

  const textHaloColor =
    layer.themeStyle === 'mono-light'
      ? 'rgba(255, 255, 255, 0.85)'
      : 'rgba(0, 0, 0, 0.78)';

  return (
    <svg
      viewBox={`0 0 ${viewW} ${viewH}`}
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="geometricPrecision"
      textRendering="geometricPrecision"
      className={className}
      style={{
        overflow: 'visible',
        background: 'transparent',
        opacity: anim.alpha,
        transform: `translate3d(0, ${anim.offsetY * 0.35}px, 0) scale(${anim.cardScale})`,
        transformOrigin: 'center center',
        willChange: 'transform, opacity',
      }}
    >
      <defs>
        <filter id={`float-shadow-${uid}`} x="-14%" y="-24%" width="128%" height="156%">
          <feDropShadow
            dx="0"
            dy="2.5"
            stdDeviation="3.5"
            floodColor={layer.themeStyle === 'mono-light' ? '#FFFFFF' : '#000000'}
            floodOpacity={layer.themeStyle === 'mono-light' ? '0.65' : '0.82'}
          />
        </filter>
        <linearGradient id={`ig-icon-${uid}`} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F58529" />
          <stop offset="35%" stopColor="#DD2A7B" />
          <stop offset="70%" stopColor="#8134AF" />
          <stop offset="100%" stopColor="#515BD4" />
        </linearGradient>
        <linearGradient id={`ig-btn-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F58529" />
          <stop offset="50%" stopColor="#DD2A7B" />
          <stop offset="100%" stopColor="#8134AF" />
        </linearGradient>
        <clipPath id={`btn-clip-${uid}`}>
          <rect x={-73} y={-22} width={146} height={44} rx={12} />
        </clipPath>
      </defs>

      {/* Transparent floating container — ZERO background box/card behind the animation */}
      <g filter={`url(#float-shadow-${uid})`}>
        {/* YOUTUBE TRANSPARENT VECTOR GRAPHIC */}
        {layer.platform === 'youtube' && (
          <g>
            {/* Floating YouTube Vector Emblem (no box behind it) */}
            <g transform="translate(22, 30) scale(2.08)">
              <path
                d={SOCIAL_VECTOR_PATHS.youtubeBg}
                fill={
                  layer.themeStyle === 'mono-light'
                    ? '#0A0A0A'
                    : layer.themeStyle === 'mono-dark'
                      ? '#FFFFFF'
                      : '#FF0033'
                }
              />
              <path
                d={SOCIAL_VECTOR_PATHS.youtubePlay}
                fill={layer.themeStyle === 'mono-dark' ? '#000000' : '#FFFFFF'}
              />
            </g>

            {/* Channel Name + Verified Badge + Subtitle */}
            <text
              x={90}
              y={50}
              fill={pal.titleColor}
              stroke={textHaloColor}
              strokeWidth={4}
              strokeLinejoin="round"
              paintOrder="stroke"
              fontFamily={fontStack}
              fontSize={25}
              fontWeight={800}
              letterSpacing="-0.01em"
            >
              {truncate(layer.title || 'Channel Name', 18)}
            </text>
            {layer.verified && (
              <g
                transform={`translate(${
                  90 + Math.min(242, truncate(layer.title || 'Channel Name', 18).length * 14.2) + 14
                }, 42)`}
              >
                <circle cx={0} cy={0} r={9} fill={pal.verifiedFill} />
                <g transform="translate(-7.5, -7.5) scale(0.625)">
                  <path
                    d={SOCIAL_VECTOR_PATHS.verifiedCheck}
                    fill="none"
                    stroke={pal.verifiedCheck}
                    strokeWidth={2.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              </g>
            )}
            <text
              x={90}
              y={75}
              fill={pal.subtitleColor}
              stroke={textHaloColor}
              strokeWidth={3}
              strokeLinejoin="round"
              paintOrder="stroke"
              fontFamily={fontStack}
              fontSize={14}
              fontWeight={600}
            >
              {truncate(layer.subtitle || 'Official YouTube Channel', 30)}
            </text>

            {/* Animated Subscribe / Subscribed Button + Ringing Bell */}
            <g transform={`translate(${viewW - 18 - 83}, 54)`}>
              {anim.rippleProgress > 0 && anim.rippleProgress < 1 && (
                <rect
                  x={-83 - anim.rippleProgress * 18}
                  y={-24 - anim.rippleProgress * 11}
                  width={166 + anim.rippleProgress * 36}
                  height={48 + anim.rippleProgress * 22}
                  rx={28}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={2.2}
                  opacity={(1 - anim.rippleProgress) * 0.65}
                />
              )}
              <g transform={`scale(${anim.buttonPressScale})`}>
                <rect
                  x={-83}
                  y={-24}
                  width={166}
                  height={48}
                  rx={24}
                  fill={anim.isClicked ? pal.btnActiveBg : pal.btnBg}
                  stroke={anim.isClicked ? pal.btnActiveBorder : 'rgba(255,255,255,0.22)'}
                  strokeWidth={1.6}
                />
                {anim.isClicked ? (
                  <>
                    <g transform={`translate(-52, 0) rotate(${anim.bellShakeDeg})`}>
                      <g transform="translate(-10, -10) scale(0.8333)">
                        <path d={SOCIAL_VECTOR_PATHS.bellBody} fill={pal.btnActiveText} />
                        <path
                          d={SOCIAL_VECTOR_PATHS.bellClapper}
                          fill="none"
                          stroke={pal.btnActiveText}
                          strokeWidth={2.2}
                          strokeLinecap="round"
                        />
                      </g>
                    </g>
                    <text
                      x={14}
                      y={6}
                      textAnchor="middle"
                      fill={pal.btnActiveText}
                      fontFamily={fontStack}
                      fontSize={16}
                      fontWeight={700}
                    >
                      {layer.activeButtonLabel || 'Subscribed'}
                    </text>
                  </>
                ) : (
                  <text
                    x={0}
                    y={6}
                    textAnchor="middle"
                    fill={pal.btnText}
                    fontFamily={fontStack}
                    fontSize={16}
                    fontWeight={700}
                  >
                    {layer.buttonLabel || 'Subscribe'}
                  </text>
                )}
              </g>
            </g>

            {/* Transparent Floating Like, Comment, Share Row (no card or boxes behind them) */}
            {layer.showActions && (
              <g>
                {[
                  {label: 'Like', path: SOCIAL_VECTOR_PATHS.thumbsUp, p: anim.likeProgress, fillMode: true},
                  {label: 'Comment', path: SOCIAL_VECTOR_PATHS.comment, p: anim.commentProgress, fillMode: false},
                  {label: 'Share', path: SOCIAL_VECTOR_PATHS.share, p: anim.shareProgress, fillMode: true},
                ].map((act, idx) => {
                  const gap = 16;
                  const itemW = (viewW - 44 - gap * 2) / 3;
                  const cx = 22 + idx * (itemW + gap) + itemW / 2;
                  const cy = 136;
                  const active = act.p > 0.35;
                  const popScale = 1 + Math.sin(Math.max(0, Math.min(1, act.p)) * Math.PI) * 0.14;
                  const fg = active ? pal.actionActiveText : pal.actionText;

                  return (
                    <g key={act.label} transform={`translate(${cx}, ${cy}) scale(${popScale})`}>
                      <g transform="translate(-48, -11) scale(0.92)">
                        <path
                          d={act.path}
                          fill={act.fillMode ? fg : 'none'}
                          stroke={act.fillMode ? textHaloColor : fg}
                          strokeWidth={act.fillMode ? 1.2 : 2.5}
                          paintOrder="stroke"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </g>
                      <text
                        x={-16}
                        y={6}
                        fill={fg}
                        stroke={textHaloColor}
                        strokeWidth={3.4}
                        strokeLinejoin="round"
                        paintOrder="stroke"
                        fontFamily={fontStack}
                        fontSize={16}
                        fontWeight={800}
                      >
                        {act.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}
          </g>
        )}

        {/* FACEBOOK TRANSPARENT VECTOR GRAPHIC (Name First + Animated Follow, zero box) */}
        {layer.platform === 'facebook' && (
          <g>
            {/* Floating Facebook Circle Emblem */}
            <circle
              cx={48}
              cy={viewH / 2}
              r={27}
              fill={
                layer.themeStyle === 'mono-light'
                  ? '#0A0A0A'
                  : layer.themeStyle === 'mono-dark'
                    ? '#FFFFFF'
                    : '#1877F2'
              }
            />
            <g transform={`translate(32, ${viewH / 2 - 16}) scale(1.3333)`}>
              <path
                d={SOCIAL_VECTOR_PATHS.facebookF}
                fill={layer.themeStyle === 'mono-dark' ? '#000000' : '#FFFFFF'}
              />
            </g>

            {/* Name First */}
            <text
              x={90}
              y={48}
              fill={pal.titleColor}
              stroke={textHaloColor}
              strokeWidth={4}
              strokeLinejoin="round"
              paintOrder="stroke"
              fontFamily={fontStack}
              fontSize={25}
              fontWeight={800}
              letterSpacing="-0.01em"
            >
              {truncate(layer.title || 'Page Name', 15)}
            </text>
            {layer.verified && (
              <g
                transform={`translate(${
                  90 + Math.min(204, truncate(layer.title || 'Page Name', 15).length * 14) + 14
                }, 41)`}
              >
                <circle cx={0} cy={0} r={9} fill={pal.verifiedFill} />
                <g transform="translate(-7.5, -7.5) scale(0.625)">
                  <path
                    d={SOCIAL_VECTOR_PATHS.verifiedCheck}
                    fill="none"
                    stroke={pal.verifiedCheck}
                    strokeWidth={2.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              </g>
            )}
            <text
              x={90}
              y={74}
              fill={pal.subtitleColor}
              stroke={textHaloColor}
              strokeWidth={3}
              strokeLinejoin="round"
              paintOrder="stroke"
              fontFamily={fontStack}
              fontSize={14}
              fontWeight={600}
            >
              {truncate(layer.subtitle || 'Facebook Page', 24)}
            </text>

            {/* Animated Follow / Following Button */}
            <g transform={`translate(${viewW - 18 - 74}, ${viewH / 2})`}>
              {anim.rippleProgress > 0 && anim.rippleProgress < 1 && (
                <rect
                  x={-74 - anim.rippleProgress * 16}
                  y={-23 - anim.rippleProgress * 10}
                  width={148 + anim.rippleProgress * 32}
                  height={46 + anim.rippleProgress * 20}
                  rx={16}
                  fill="none"
                  stroke={layer.themeStyle === 'brand' ? '#1877F2' : '#FFFFFF'}
                  strokeWidth={2.2}
                  opacity={(1 - anim.rippleProgress) * 0.65}
                />
              )}
              <g transform={`scale(${anim.buttonPressScale})`}>
                <rect
                  x={-74}
                  y={-23}
                  width={148}
                  height={46}
                  rx={12}
                  fill={anim.isClicked ? pal.btnActiveBg : pal.btnBg}
                  stroke={anim.isClicked ? pal.btnActiveBorder : 'rgba(255,255,255,0.22)'}
                  strokeWidth={1.6}
                />
                <g transform="translate(-52, -9) scale(0.75)">
                  <path
                    d={anim.isClicked ? SOCIAL_VECTOR_PATHS.check : SOCIAL_VECTOR_PATHS.plus}
                    fill="none"
                    stroke={anim.isClicked ? pal.btnActiveText : pal.btnText}
                    strokeWidth={2.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
                <text
                  x={-26}
                  y={6}
                  fill={anim.isClicked ? pal.btnActiveText : pal.btnText}
                  fontFamily={fontStack}
                  fontSize={16}
                  fontWeight={700}
                >
                  {anim.isClicked
                    ? layer.activeButtonLabel || 'Following'
                    : layer.buttonLabel || 'Follow'}
                </text>
              </g>
            </g>
          </g>
        )}

        {/* INSTAGRAM TRANSPARENT VECTOR GRAPHIC ('kalam_e_aamiria' + Follow Button/Badge, zero box) */}
        {layer.platform === 'instagram' && (
          <g>
            {/* Floating Crisp Instagram Camera Vector Icon */}
            <g transform={`translate(22, ${viewH / 2 - 28})`}>
              <rect
                x={0}
                y={0}
                width={56}
                height={56}
                rx={16}
                fill={
                  layer.themeStyle === 'brand'
                    ? `url(#ig-icon-${uid})`
                    : layer.themeStyle === 'mono-light'
                      ? '#0A0A0A'
                      : '#FFFFFF'
                }
              />
              <rect
                x={11}
                y={11}
                width={34}
                height={34}
                rx={9}
                fill="none"
                stroke={layer.themeStyle === 'mono-dark' ? '#000000' : '#FFFFFF'}
                strokeWidth={3.2}
              />
              <circle
                cx={28}
                cy={28}
                r={8.2}
                fill="none"
                stroke={layer.themeStyle === 'mono-dark' ? '#000000' : '#FFFFFF'}
                strokeWidth={3.2}
              />
              <circle
                cx={37.5}
                cy={18.5}
                r={2.3}
                fill={layer.themeStyle === 'mono-dark' ? '#000000' : '#FFFFFF'}
              />
            </g>

            {/* Handle 'kalam_e_aamiria' + Verified Badge */}
            <text
              x={92}
              y={48}
              fill={pal.titleColor}
              stroke={textHaloColor}
              strokeWidth={4}
              strokeLinejoin="round"
              paintOrder="stroke"
              fontFamily={fontStack}
              fontSize={23}
              fontWeight={800}
              letterSpacing="-0.01em"
            >
              {truncate(layer.title || 'kalam_e_aamiria', 18)}
            </text>
            {layer.verified && (
              <g
                transform={`translate(${
                  92 + Math.min(208, truncate(layer.title || 'kalam_e_aamiria', 18).length * 12.8) + 13
                }, 41)`}
              >
                <circle cx={0} cy={0} r={9} fill={pal.verifiedFill} />
                <g transform="translate(-7.5, -7.5) scale(0.625)">
                  <path
                    d={SOCIAL_VECTOR_PATHS.verifiedCheck}
                    fill="none"
                    stroke={pal.verifiedCheck}
                    strokeWidth={2.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              </g>
            )}
            <text
              x={92}
              y={74}
              fill={pal.subtitleColor}
              stroke={textHaloColor}
              strokeWidth={3}
              strokeLinejoin="round"
              paintOrder="stroke"
              fontFamily={fontStack}
              fontSize={14}
              fontWeight={600}
            >
              {truncate(layer.subtitle || 'Instagram', 24)}
            </text>

            {/* Animated Follow Button / Badge */}
            <g transform={`translate(${viewW - 18 - 73}, ${viewH / 2})`}>
              {anim.rippleProgress > 0 && anim.rippleProgress < 1 && (
                <rect
                  x={-73 - anim.rippleProgress * 16}
                  y={-22 - anim.rippleProgress * 10}
                  width={146 + anim.rippleProgress * 32}
                  height={44 + anim.rippleProgress * 20}
                  rx={16}
                  fill="none"
                  stroke={layer.themeStyle === 'brand' ? '#DD2A7B' : '#FFFFFF'}
                  strokeWidth={2.2}
                  opacity={(1 - anim.rippleProgress) * 0.65}
                />
              )}
              <g transform={`scale(${anim.buttonPressScale})`}>
                <rect
                  x={-73}
                  y={-22}
                  width={146}
                  height={44}
                  rx={12}
                  fill={
                    !anim.isClicked && layer.themeStyle === 'brand'
                      ? `url(#ig-btn-${uid})`
                      : anim.isClicked
                        ? pal.btnActiveBg
                        : pal.btnBg
                  }
                  stroke={anim.isClicked ? pal.btnActiveBorder : 'rgba(255,255,255,0.22)'}
                  strokeWidth={1.6}
                />
                {anim.isClicked && anim.badgeShimmer > 0 && anim.badgeShimmer < 1 && (
                  <g clipPath={`url(#btn-clip-${uid})`}>
                    <rect
                      x={-146 + anim.badgeShimmer * 340}
                      y={-26}
                      width={42}
                      height={56}
                      fill="rgba(255,255,255,0.25)"
                      transform="skewX(-18)"
                    />
                  </g>
                )}
                {anim.isClicked ? (
                  <>
                    <g transform="translate(-52, -9) scale(0.75)">
                      <path
                        d={SOCIAL_VECTOR_PATHS.check}
                        fill="none"
                        stroke={pal.btnActiveText}
                        strokeWidth={2.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                    <text
                      x={-26}
                      y={6}
                      fill={pal.btnActiveText}
                      fontFamily={fontStack}
                      fontSize={16}
                      fontWeight={700}
                    >
                      {layer.activeButtonLabel || 'Following'}
                    </text>
                  </>
                ) : (
                  <text
                    x={0}
                    y={6}
                    textAnchor="middle"
                    fill={pal.btnText}
                    fontFamily={fontStack}
                    fontSize={16}
                    fontWeight={700}
                  >
                    {layer.buttonLabel || 'Follow'}
                  </text>
                )}
              </g>
            </g>
          </g>
        )}

        {/* Animated Crisp Vector Pointer Cursor */}
        {anim.cursorVisible && anim.cursorOpacity > 0.01 && (
          <g
            opacity={anim.cursorOpacity}
            transform={`translate(${anim.cursorX}, ${anim.cursorY}) scale(${anim.cursorScale})`}
          >
            <g transform="translate(-6, -4) scale(1.25)">
              <path
                d={SOCIAL_VECTOR_PATHS.cursor}
                fill="#FFFFFF"
                stroke="#000000"
                strokeWidth={2.2}
                strokeLinejoin="round"
              />
            </g>
          </g>
        )}
      </g>
    </svg>
  );
};
