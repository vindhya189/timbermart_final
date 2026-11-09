
import React from 'react';

export default function TreeLoader({
  message = 'Growing your TimberMart...',
  fullScreen = true
}) {
  return (
    <div className={`tree-loader ${fullScreen ? 'fullscreen' : ''}`}>
      <div className="loader-card">

        <div className="tree-scene">

          {/* Soft background glow */}
          <div className="tree-glow"></div>

          {/* Sun */}
          <div className="sun">☀</div>

          {/* Growing tree */}
          <svg
            className="tree-svg"
            viewBox="0 0 180 190"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Roots */}
            <g className="roots">
              <path d="M90 150 Q72 165 58 169" />
              <path d="M90 150 Q108 165 122 169" />
              <path d="M90 153 Q90 166 90 174" />
              <path d="M90 153 Q77 162 78 173" />
              <path d="M90 153 Q103 162 102 173" />
            </g>

            {/* Trunk */}
            <path
              className="trunk"
              d="M84 153 Q81 120 87 88 Q90 65 90 42
                 L98 42 Q96 85 100 112 Q103 135 97 153 Z"
            />

            {/* Branches */}
            <g className="branches">
              <path d="M89 103 Q69 87 55 72" />
              <path d="M96 91 Q116 75 128 62" />
              <path d="M88 119 Q69 108 57 98" />
              <path d="M98 116 Q115 103 129 94" />
            </g>

            {/* Leaves */}
            <g className="leaves">
              <ellipse cx="53" cy="67" rx="19" ry="12"
                transform="rotate(35 53 67)" />
              <ellipse cx="130" cy="57" rx="20" ry="12"
                transform="rotate(-35 130 57)" />
              <ellipse cx="48" cy="94" rx="18" ry="11"
                transform="rotate(25 48 94)" />
              <ellipse cx="135" cy="88" rx="19" ry="12"
                transform="rotate(-25 135 88)" />
              <ellipse cx="90" cy="29" rx="22" ry="15" />
              <ellipse cx="70" cy="40" rx="19" ry="12"
                transform="rotate(-25 70 40)" />
              <ellipse cx="111" cy="40" rx="19" ry="12"
                transform="rotate(25 111 40)" />
            </g>

            {/* Seed */}
            <ellipse className="seed" cx="90" cy="151" rx="6" ry="9" />

            {/* Leaf shine */}
            <circle className="leaf-shine" cx="111" cy="25" r="3" />
          </svg>

          {/* Ground */}
          <div className="ground">
            <div className="ground-line"></div>
          </div>

          {/* Floating sparkles */}
          <span className="sparkle sparkle-one">✦</span>
          <span className="sparkle sparkle-two">✧</span>
          <span className="sparkle sparkle-three">✦</span>
        </div>

        <div className="loader-message">{message}</div>
        <div className="loader-subtitle">
          Growing something great for you
        </div>

        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>

      </div>

      <style jsx>{`
        .tree-loader {
          width: 100%;
          min-height: 230px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fbf7;
          font-family: Arial, sans-serif;
          overflow: hidden;
        }

        .fullscreen {
          position: fixed;
          inset: 0;
          z-index: 99999;
          min-height: 100vh;
          background: rgba(248, 251, 247, 0.97);
        }

        .loader-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 12px 20px 20px;
          width: 100%;
        }

        .tree-scene {
          width: 170px;
          height: 180px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .tree-glow {
          position: absolute;
          width: 125px;
          height: 125px;
          top: 20px;
          left: 22px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(126, 190, 105, 0.17),
            rgba(126, 190, 105, 0)
          );
          animation: glowPulse 3s ease-in-out infinite;
        }

        .sun {
          position: absolute;
          top: 10px;
          right: 12px;
          color: #e9b94e;
          font-size: 17px;
          animation: sunPulse 3s ease-in-out infinite;
        }

        .tree-svg {
          position: relative;
          z-index: 2;
          width: 155px;
          height: 165px;
          overflow: visible;
        }

        .roots path {
          fill: none;
          stroke: #9b704b;
          stroke-width: 2.5;
          stroke-linecap: round;
          stroke-dasharray: 40;
          stroke-dashoffset: 40;
          animation: growRoots 1.2s ease-out 0.3s forwards;
        }

        .trunk {
          fill: #a87549;
          transform-box: view-box;
          transform-origin: 90px 153px;
          transform: scaleY(0);
          animation: growTrunk 1.7s ease-out 1.1s forwards;
        }

        .branches path {
          fill: none;
          stroke: #a87549;
          stroke-width: 4;
          stroke-linecap: round;
          stroke-dasharray: 35;
          stroke-dashoffset: 35;
          animation: growBranches 1s ease-out 2.2s forwards;
        }

        .leaves {
          transform-box: fill-box;
          transform-origin: center bottom;
          transform: scale(0);
          animation: growLeaves 1.1s cubic-bezier(.2,.8,.2,1) 2.9s forwards,
                     treeSway 3s ease-in-out 4s infinite;
        }

        .leaves ellipse {
          fill: #398b50;
          stroke: #28783e;
          stroke-width: 1;
        }

        .leaves ellipse:nth-child(even) {
          fill: #70b85e;
        }

        .seed {
          fill: #bd8749;
          transform-box: fill-box;
          transform-origin: center;
          animation: seedPulse 1.5s ease-in-out infinite;
        }

        .leaf-shine {
          fill: #fff1a8;
          opacity: 0;
          animation: shine 1.5s ease-in-out 4s infinite alternate;
        }

        .ground {
          position: absolute;
          z-index: 1;
          bottom: 12px;
          width: 125px;
          height: 9px;
          border-radius: 50%;
          background: #dcebd5;
        }

        .ground-line {
          width: 38px;
          height: 5px;
          margin: 2px auto;
          border-radius: 50%;
          background: #a77a51;
        }

        .sparkle {
          position: absolute;
          z-index: 3;
          color: #d9ad42;
          opacity: 0;
          animation: sparkleFloat 2.5s ease-in-out infinite;
        }

        .sparkle-one {
          top: 50px;
          left: 9px;
        }

        .sparkle-two {
          top: 82px;
          right: 5px;
          animation-delay: 0.8s;
        }

        .sparkle-three {
          top: 25px;
          left: 48px;
          animation-delay: 1.4s;
        }

        .loader-message {
          margin-top: 3px;
          color: #285b36;
          font-size: 15px;
          font-weight: 700;
          text-align: center;
          letter-spacing: 0.1px;
        }

        .loader-subtitle {
          margin-top: 6px;
          color: #8a9b87;
          font-size: 11px;
          text-align: center;
        }

        .loading-dots {
          display: flex;
          gap: 5px;
          margin-top: 12px;
        }

        .loading-dots span {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #5c9b61;
          animation: dotBounce 1s ease-in-out infinite;
        }

        .loading-dots span:nth-child(2) {
          animation-delay: 0.15s;
        }

        .loading-dots span:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes growRoots {
          to { stroke-dashoffset: 0; }
        }

        @keyframes growTrunk {
          to { transform: scaleY(1); }
        }

        @keyframes growBranches {
          to { stroke-dashoffset: 0; }
        }

        @keyframes growLeaves {
          0% { transform: scale(0); }
          75% { transform: scale(1.12); }
          100% { transform: scale(1); }
        }

        @keyframes treeSway {
          0%, 100% { rotate: 0deg; }
          50% { rotate: 2deg; }
        }

        @keyframes seedPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(0.8); }
        }

        @keyframes glowPulse {
          0%, 100% { transform: scale(0.9); opacity: 0.6; }
          50% { transform: scale(1.12); opacity: 1; }
        }

        @keyframes sunPulse {
          0%, 100% { transform: scale(0.9); opacity: 0.7; }
          50% { transform: scale(1.1); opacity: 1; }
        }

        @keyframes shine {
          from { opacity: 0.2; transform: scale(0.7); }
          to { opacity: 1; transform: scale(1.4); }
        }

        @keyframes sparkleFloat {
          0% { opacity: 0; transform: translateY(8px) scale(0.7); }
          50% { opacity: 1; transform: translateY(-5px) scale(1); }
          100% { opacity: 0; transform: translateY(-13px) scale(0.7); }
        }

        @keyframes dotBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.45; }
          30% { transform: translateY(-4px); opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .tree-loader * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}
