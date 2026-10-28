import { Composition } from "remotion";
import { OpinionCard } from "./OpinionCard";
import shot from "./generated/shot-005.json";
import { Day9Full } from "./Day9Full";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Day9Shot05"
        component={OpinionCard}
        durationInFrames={Math.ceil(shot.audioDurationSeconds * 30)}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition id="Day9Full" component={Day9Full} durationInFrames={2514} fps={30} width={1080} height={1920} defaultProps={{ showCaptions: true }} />
    </>
  );
};
