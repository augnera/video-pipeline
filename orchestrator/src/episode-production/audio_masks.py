"""Deterministic BGM exclusion envelope on the existing global audio clock."""
import math,numpy as np

def music_envelope(count,sample_rate,ranges):
    envelope=np.ones(count,dtype=np.float32);duration=count/sample_rate;previous=0.
    for r in sorted(ranges,key=lambda r:r['startSeconds']):
        start=float(r['startSeconds']);end=float(r['endSeconds']);fade=float(r.get('fadeSeconds',.35))
        if not all(math.isfinite(x) for x in [start,end,fade]) or start<previous or not 0<=start<end<=duration+1/sample_rate or not 0<=fade<=2:raise ValueError('Invalid/overlapping BGM mute range')
        a=round(start*sample_rate);b=min(count,round(end*sample_rate));n=round(fade*sample_rate)
        envelope[a:b]=0
        left=max(0,a-n);right=min(count,b+n)
        if a>left:envelope[left:a]=np.minimum(envelope[left:a],np.linspace(1,0,a-left,endpoint=False,dtype=np.float32))
        if right>b:envelope[b:right]=np.minimum(envelope[b:right],np.linspace(0,1,right-b,endpoint=False,dtype=np.float32))
        previous=end
    return envelope
