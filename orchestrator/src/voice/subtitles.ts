/** Shared source-SRT reader extracted from the existing Quality Gate. No re-alignment. */
export function parseSrtCues(srt: string) {
    const sec = (value: string) => {
        if (!/^\d{2,}:\d{2}:\d{2}[,.]\d{3}$/.test(value)) throw Error('Invalid SRT timestamp');
        const a = value.replace(',', '.').split(':').map(Number);
        if (a[1] >= 60 || a[2] >= 60) throw Error('Invalid SRT timestamp');
        return a[0] * 3600 + a[1] * 60 + a[2];
    };
    const ids = new Set<number>();
    return srt.trim().split(/\r?\n\s*\r?\n/).map(block => {
        const [id, time, ...body] = block.split(/\r?\n/), pair = time?.split(' --> ');
        if (!pair || pair.length !== 2 || !/^\d+$/.test(id) || ids.has(Number(id)) || !body.length) throw Error('Invalid/duplicate SRT cue');
        ids.add(Number(id));
        const startSeconds = sec(pair[0]), endSeconds = sec(pair[1]);
        if (endSeconds <= startSeconds) throw Error('Invalid SRT duration');
        return { id: Number(id), startSeconds, endSeconds, text: body.join('\n') };
    });
}
