import type { CSSProperties } from "react";

const svgStyle: CSSProperties = {
  position: "absolute",
  width: 0,
  height: 0,
};

export default function GlobalSvgDefs() {
  return (
    <svg style={svgStyle} aria-hidden="true">
      <defs>
        <filter id="blobDistort">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.008 0.012"
            numOctaves="2"
            seed="3"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="25"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
