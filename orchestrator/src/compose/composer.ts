import ffmpeg from "fluent-ffmpeg";

export interface ComposeLogger {
  info(msg: string): void;
  error(msg: string): void;
}

/**
 * 标准竖版模板:
 *   底层 = 产品录屏(拉伸铺满 1080x1920)
 *   画中画 = 数字人口播(先方形放右下角, 宽度约1/3)
 *   音轨 = TTS配音
 *   字幕 = 烧录SRT, 关键词高亮建议在剪映里做, 这里先统一样式
 * 时长以配音为准 (-shortest); 产出后检查时长在 20-60s 之间, 越界告警 (F1.5)。
 */
export function compose(opts: {
  screencast: string; // demo录屏 webm
  talkingHead: string; // 数字人口播 mp4 (自带对口型画面, 音频可忽略)
  narrationAudio: string; // TTS wav
  srt: string;
  outPath: string;
  log?: ComposeLogger;
}): Promise<string> {
  const log = opts.log ?? { info: console.log, error: console.error };
  return new Promise<string>((resolve, reject) => {
    ffmpeg()
      .input(opts.screencast)
      .input(opts.talkingHead)
      .input(opts.narrationAudio)
      .complexFilter([
        "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[bg]",
        "[1:v]scale=360:-2[pip]",
        "[bg][pip]overlay=W-w-40:H-h-220[withpip]",
        `[withpip]subtitles=filename=${escapeFilterValue(opts.srt)}:force_style='FontName=Noto Sans CJK TC,FontSize=16,Bold=1,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,Outline=2,MarginV=60'[v]`,
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
      .on("error", (e) => reject(new Error(`ffmpeg 合成失败: ${e.message}`)))
      .save(opts.outPath);
  }).then(async (out) => {
    await checkDuration(out, log);
    return out;
  });
}

/**
 * ffmpeg filtergraph 值的两级转义 (F1.5):
 * 第一级(滤镜选项解析): \ ' : 需加反斜杠
 * 第二级(filtergraph 解析): \ ' , ; [ ] 需加反斜杠
 * 两级叠加后每个特殊字符的最终形态, 如 : → \\:  ' → \\\'  \ → \\\\
 */
function escapeFilterValue(path: string): string {
  const level1 = path.replace(/[\\':]/g, (c) => `\\${c}`);
  return level1.replace(/[\\',;[\]]/g, (c) => `\\${c}`);
}

/** 产物时长检查: 20-60s 之外告警但不中断 (F1.5) */
function checkDuration(path: string, log: ComposeLogger): Promise<void> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(path, (err, data) => {
      if (err) {
        log.error(`ffprobe 无法读取成片时长 (${path}): ${err.message}`);
        return resolve();
      }
      const dur = data.format.duration;
      if (dur === undefined) log.error(`ffprobe 未返回时长 (${path})`);
      else if (dur < 20 || dur > 60)
        log.error(`⚠ 成片时长 ${dur.toFixed(1)}s 超出预期范围 20-60s, 请检查脚本长度或素材 (${path})`);
      else log.info(`成片时长 ${dur.toFixed(1)}s (符合 20-60s)`);
      resolve();
    });
  });
}
