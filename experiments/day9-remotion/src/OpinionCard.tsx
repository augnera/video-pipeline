import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import {
  AbsoluteFill, Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig,
} from "remotion";
import shot from "./generated/shot-005.json";

// Local, existing Chinese font. loadFont waits before screenshots are captured.
void loadFont({ family: "Day9Chinese", url: staticFile("wqy-zenhei.ttf"), format: "truetype" });

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const Background = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <AbsoluteFill style={{
    background: "radial-gradient(ellipse at 88% 18%, #352274 0%, transparent 46%), radial-gradient(ellipse at 0% 90%, #103d75 0%, transparent 55%), #090d22",
  }}>
    <AbsoluteFill style={{ opacity: 0.12, backgroundImage: "linear-gradient(#9aafff 1px, transparent 1px), linear-gradient(90deg, #9aafff 1px, transparent 1px)", backgroundSize: "96px 96px", maskImage: "linear-gradient(transparent, black 40%, transparent)" }} />
    <div style={{ position: "absolute", left: 88, top: 1610, height: 3, width: 904, background: "#ffffff20" }}>
      <div style={{ height: "100%", background: "linear-gradient(90deg,#65cfff,#a78bfa)", width: `${interpolate(frame, [0, Math.ceil(shot.audioDurationSeconds * fps) - 1], [0, 100], clamp)}%` }} />
    </div>
  </AbsoluteFill>;
};

const Headline = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <div style={{ position: "absolute", left: 88, top: 428, width: 904 }}>
    <div data-check="eyebrow" style={{ fontSize: 48, color: "#a4b5ff", letterSpacing: 6, display: "flex", alignItems: "center", gap: 24,
      opacity: interpolate(frame, [0, 0.3 * fps], [0, 1], clamp) }}>
      <span style={{ width: 8, height: 48, background: "#8d8bff", borderRadius: 4 }} />{shot.overlayHeading}
      <span style={{ width: 1, height: 36, background: "#8d8bff88" }} />
    </div>
    <div data-check="headline" style={{ marginTop: 104, fontSize: 184, fontWeight: 700, lineHeight: 1.15, letterSpacing: 4,
      opacity: interpolate(frame, [0.1 * fps, 0.48 * fps], [0, 1], clamp),
      translate: interpolate(frame, [0.1 * fps, 0.6 * fps], ["0px 44px", "0px 0px"], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
    }}>{shot.overlayLines[0]}</div>
    <div data-check="emphasis" style={{ marginTop: 36, fontSize: 142, fontWeight: 700, letterSpacing: 0, lineHeight: 1.3,
      color: "#91b8ff", textShadow: `0 0 ${interpolate(frame, [1.84 * fps, 2.22 * fps, 3.1 * fps], [0, 24, 8], clamp)}px #7975ff55`,
      opacity: interpolate(frame, [0.3 * fps, 0.7 * fps], [0, 1], clamp),
      translate: interpolate(frame, [0.3 * fps, 0.75 * fps], ["0px 30px", "0px 0px"], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
    }}>{shot.overlayLines[1]}</div>
    <div style={{ marginTop: 26, width: interpolate(frame, [1.84 * fps, 2.72 * fps], [0, 850], clamp), height: 7, borderRadius: 4, background: "linear-gradient(90deg,#60caff,#a78bfa)" }} />
  </div>;
};

const FeatureStack = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <div aria-label="抽象功能叠加示意，不是真实产品界面" style={{ position: "absolute", left: 204, top: 1150, width: 672, height: 340 }}>
    {[0, 1, 2].map((i) => <div key={i} style={{ position: "absolute", left: i * 32, top: i * -24, width: 570, height: 188, borderRadius: 26,
      border: "2px solid #9c9aff88", background: "linear-gradient(115deg,#1a2f59ef,#2e2257ed)",
      opacity: interpolate(frame, [(0.65 + i * 0.46) * fps, (0.95 + i * 0.46) * fps], [0, 1], clamp),
      translate: interpolate(frame, [(0.65 + i * 0.46) * fps, (1.1 + i * 0.46) * fps], ["0px 65px", "0px 0px"], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
    }}>
      <div style={{ position: "absolute", left: 36, top: 44, width: 100, height: 100, border: "1px solid #98aaff88", borderRadius: 18, display: "flex", justifyContent: "center", alignItems: "center", fontSize: 72, color: "#c3ceff" }}>+</div>
      <div style={{ position: "absolute", top: 64, left: 178, width: 200, height: 13, borderRadius: 8, background: "#b3c1ff88" }} />
      <div style={{ position: "absolute", top: 104, left: 178, width: 294, height: 10, borderRadius: 8, background: "#b3c1ff33" }} />
    </div>)}
  </div>;
};

export const OpinionCard: React.FC<{ includeAudio?: boolean; showBrand?: boolean }> = ({ includeAudio = true, showBrand = true }) => <AbsoluteFill style={{ fontFamily: "Day9Chinese, sans-serif", color: "#f3f4ff" }}>
  <Background />
  {showBrand&&<div data-check="brand" style={{ position: "absolute", left: 88, top: 160, fontSize: 42, letterSpacing: 3, color: "#d4ddff" }}>小陈AI说</div>}
  {showBrand&&<div style={{ position: "absolute", left: 88, top: 258, height: 1, width: 904, background: "#ffffff22" }} />}
  <Headline />
  <FeatureStack />
  {includeAudio && <Audio name="已验收第5镜原始配音" src={staticFile("shot-005.wav")} />}
</AbsoluteFill>;
