import { foundationLabels } from '../visual-mvp/core.ts';
import type { Request } from '../visual-mvp/types.ts';
/** Explicit project-scoped semantic rules, not model inference or shot-number rotation. */
export function directFull(source: any) {
    const requests: Request[] = [], review: any[] = [];
    const cue = (shot: any, pattern: RegExp) => { const c = source.captions.find((c: any) => c.shotNumber === shot.shotNumber && pattern.test(c.text)); if (!c)
        throw Error('Missing semantic cue ' + pattern); return Math.round(c.startSeconds * 30); };
    function add(s: any, from: number, to: number, kind: Request['kind'], goal: Request['goal'], reason: string, extra: Partial<Request> = {}) { if (to <= from)
        throw Error('Empty scene'); requests.push({ requestId: `visual-${requests.length + 1}`, shotNumber: s.shotNumber, from, to, kind, goal, reason, ...extra }); }
    const graphic = (s: any, a: number, b: number, id: string, title: string, subtitle: string, labels: string[], reason: string, relation = 'progression') => add(s, a, b, 'diagram', 'concept', reason, { templateId: id, graphic: { title, subtitle, labels }, visualLanguage: id, transitionRelation: relation });
    for (let i = 0; i < source.shots.length; i++) {
        const s = source.shots[i], text = s.narration, a = s.startFrame, b = source.shots[i + 1]?.startFrame ?? s.endFrame;
        const first = requests.length;
        if (/上一次我讲/.test(text)) {
            const cut = Math.min(a + 75, cue(s, /但今天/));
            const next = cue(s, /如果不想/);
            add(s, a, cut, 'image_motion', 'night_work', 'Original opening context image; dwell capped at2.5s, followed by observed desk work.', { transitionRelation: 'continuation' });
            add(s, cut, next, 'live_action', 'office_work', 'Actual working detail matches opening founder context, not a real product demonstration.', { preferredSourceStart: 0, transitionRelation: 'detail' });
            graphic(s, next, b, 'branch', '三条正确的做法', '一人公司，真正的风险', ['身体', '流程', '上线'], 'Narration asks how to avoid pitfalls; introduce three real topics from the full script.', 'conclusion');
        }
        else if (/真正的风险.*不是你做错/.test(text)) {
            graphic(s, a, b, 'risk-switch', '真正的风险', '不是做错，而是迟迟没切换', ['错误的做法', '迟迟没切换', '正确的做法'], 'Contrast is explicit in source narration; show a loop and an alternative path.', 'continuation');
        }
        else if (/第一个错误.*身体/.test(text)) {
            const cut = cue(s, /熬夜/);
            add(s, a, cut, 'live_action', 'office_work', 'Context of seated desk work; use a later non-overlapping source interval.', { preferredSourceStart: 5.5, transitionRelation: 'chapter_change' });
            add(s, cut, b, 'live_action', 'fatigue', 'Existing sampled frames show glasses removal and lowered head, matching the physical-burden phrase; no medical inference.', { preferredSourceStart: 2, transitionRelation: 'progression' });
        }
        else if (/先稳住身体/.test(text)) {
            add(s, a, b, 'diagram', 'foundation', 'Advice/conclusion uses existing centered system-foundation animation.', { labels: foundationLabels(text)!, templateId: 'system-foundation', visualLanguage: 'system-foundation', transitionRelation: 'conclusion' });
        }
        else if (/第二个错误.*功能/.test(text)) {
            add(s, a, b, 'diagram', 'concept', 'Reuse original accepted OpinionCard visual and animation clock; hide decorative brand only.', { templateId: 'accepted-opinion-card', visualLanguage: 'feature-stack', requiresClearReading: true, transitionRelation: 'chapter_change' });
        }
        else if (/最小.*最顺.*跑通/.test(text)) {
            const cut = cue(s, /正确的做法/);
            graphic(s, a, cut, 'feedback-loop', '是在完善产品？', '还是在拖延真实反馈', ['完善产品', '继续准备', '真实反馈'], 'Show preparation loop versus feedback; no real feedback/product recording exists.');
            graphic(s, cut, b, 'minimal-flow', '最小、最顺、能跑通', '只保留一条完整流程', ['最小', '最顺', '跑通'], 'Narration explicitly asks for minimum runnable process; semantic diagram, not invented application UI.', 'progression');
        }
        else if (/第三个错误.*不上线/.test(text)) {
            const cut = cue(s, /你就不用面对用户/);
            graphic(s, a, cut, 'launch-barrier', '迟迟不上线', '准备不能代替验证', ['准备', '上线', '现实'], 'A barrier/clock metaphor conveys hesitation; no false real launch interface.', 'chapter_change');
            graphic(s, cut, b, 'validation-gap', '不上线，就不验证', '用户与判断之间仍有空缺', ['用户', '判断', '验证'], 'Source explicitly mentions users and unvalidated judgement; draw missing connection, not fake messages.', 'continuation');
        }
        else if (/尽快上线.*现实/.test(text)) {
            const cut = cue(s, /但它能帮你停止内耗/);
            graphic(s, a, cut, 'reality-loop', '把决策交给现实', '上线不是成功，是开始验证', ['上线', '现实反馈', '调整'], 'Three-step feedback diagram follows advice; does not claim the stock actor launched a product.', 'conclusion');
            add(s, cut, b, 'live_action', 'return_to_work', 'Existing late source frames show return of attention/hands to desk: a visual metaphor for ending preparation, not proof of a product launch.', { preferredSourceStart: 8.1, transitionRelation: 'detail' });
        }
        else if (/不是能力不够/.test(text)) {
            graphic(s, a, b, 'method-system', '问题在方式，不在能力', '停止用错误的方式硬撑', ['身体', '流程', '上线'], 'Conclusion reassembles the same three choices into one connected system; gap before next narration retains original silence.', 'conclusion');
        }
        else if (/下期.*工作结构/.test(text)) {
            const cut = cue(s, /关注我/);
            graphic(s, a, cut, 'daily-structure', '下一期：我的工作结构', '三条做法，拆成每天在用的结构', ['身体', '流程', '上线'], 'Preview is an explicit conceptual work structure; no invented schedule or product screenshot.', 'chapter_change');
            graphic(s, cut, b, 'closing', '关注我', '别错过下一期', ['下一期', '工作结构'], 'Short final CTA follows exact narration.', 'continuation');
            requests.at(-1)!.requiresClearReading = true;
        }
        else
            throw Error('Unsupported source semantics at shot ' + s.shotNumber);
        review.push({ shotNumber: s.shotNumber, narration: text, originalVisual: s.templateId, audioStartSeconds: s.startSeconds, audioEndSeconds: s.endSeconds, coverageFrames: [a, b], requestIds: requests.slice(first).map(r => r.requestId), preRenderStatus: 'REVIEWED_FOR_PRIVATE_RENDER', subjectiveApproval: 'NOT_EVALUATED' });
    }
    return { requests, review };
}
