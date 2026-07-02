import ffmpeg from "fluent-ffmpeg";

/**
 * 标准竖版模板:
 *   底层 = 产品录屏(拉伸铺满 1080x1920)
 *   画中画 = 数字人口播(圆角略过, 先方形放右下角, 宽度约1/3)
 *   音轨 = TTS配音
 *   字幕 = 烧录SRT, 关键词高亮建议在剪映里做, 这里先统一样式
 * 时长以配音为准 (-shortest)。
 */
export function compose(opts: {
  screencast: string; // demo录屏 webm
  talkingHead: string; // 数字人口播 mp4 (自带对口型画面, 音频可忽略)
  narrationAudio: string; // TTS wav
  srt: string;
  outPath: string;
}): Promise<string> {
  const srtEscaped = opts.srt.replace(/:/g, "\\:").replace(/'/g, "\\'");
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(opts.screencast)
      .input(opts.talkingHead)
      .input(opts.narrationAudio)
      .complexFilter([
        "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[bg]",
        "[1:v]scale=360:-2[pip]",
        "[bg][pip]overlay=W-w-40:H-h-220[withpip]",
        `[withpip]subtitles='${srtEscaped}':force_style='FontName=Noto Sans CJK TC,FontSize=16,Bold=1,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,Outline=2,MarginV=60'[v]`,
      ])
      .outputOptions([
        "-map", "[v]",
        "-map", "2:a",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "20",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        "-r", "30",
        "-pix_fmt", "yuv420p",
      ])
      .on("end", () => resolve(opts.outPath))
      .on("error", reject)
      .save(opts.outPath);
  });
}
