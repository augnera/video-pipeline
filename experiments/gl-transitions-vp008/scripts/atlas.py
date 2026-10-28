import json,pathlib,subprocess,collections,html,csv
root=pathlib.Path(__file__).resolve().parents[3];out=root/'orchestrator/output/day9-vp008';catalog=json.loads((out/'transition-catalog.json').read_text());p=out/'atlas';p.mkdir(exist_ok=True)
groups=collections.defaultdict(list)
for e in catalog['effects']:
 if e['technicalStatus']=='VERIFIED':groups[e['category']].append(e)
volumes=[]
for category,entries in sorted(groups.items()):
 for start in range(0,len(entries),20):
  part=entries[start:start+20];name=f'{category}-{start//20+1:02}.mp4';listing=p/(name+'.concat.txt');listing.write_text(''.join("file '"+str(root/e['previewPath']).replace("'","'\\''")+"'\n" for e in part));
  subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',str(listing),'-c','copy','-movflags','+faststart',str(p/name)],check=True)
  subprocess.run(['ffmpeg','-v','error','-i',str(p/name),'-f','null','-'],check=True)
  volumes.append({'category':category,'path':str((p/name).relative_to(root)),'effectIds':[e['transitionId'] for e in part],'count':len(part),'durationSeconds':len(part)})
summary={'upstreamTotal':125,'registeredTotal':len(catalog['effects']),'technical':dict(collections.Counter(e['technicalStatus'] for e in catalog['effects'])),'humanEvaluation':dict(collections.Counter(e['humanEvaluation'] for e in catalog['effects'])),'volumes':volumes}
(out/'library-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
lines=['# GL Transitions 2.0.0 图鉴','', '125 个上游独立效果；方向、颜色参数不重复计数。全部人工评价 NOT_EVALUATED。VERIFIED 仅表示已记录的默认参数技术检查通过，供私人本地探索。','', '## 分卷','']
for v in volumes:lines.append(f"- [{v['category']} ({v['count']})](atlas/{pathlib.Path(v['path']).name})")
lines+=['','## 单项索引','','|ID / 上游名|中文描述|类别|技术状态|人工评价|预览|证据|','|---|---|---|---|---|---|---|']
rows=[]
for e in catalog['effects']:
 preview=f"[MP4]({pathlib.Path(e['previewPath']).relative_to('orchestrator/output/day9-vp008')})" if e['previewPath'] else '—'
 evidence=e['validationEvidence'] or e['renderEvidence'];evidence=f"[JSON]({pathlib.Path(evidence).relative_to('orchestrator/output/day9-vp008')})" if evidence else '—'
 lines.append('|'+ '|'.join([e['transitionId'],e['descriptionZh'],e['category'],e['technicalStatus'],e['humanEvaluation'],preview,evidence])+'|')
 rows.append({k:e[k] for k in ['transitionId','upstreamName','descriptionZh','category','technicalStatus','humanEvaluation','previewPath','validationEvidence']})
(out/'preview-index.md').write_text('\n'.join(lines)+'\n')
with (out/'preview-index.csv').open('w') as f:
 w=csv.DictWriter(f,fieldnames=rows[0].keys());w.writeheader();w.writerows(rows)
(out/'preview-index.html').write_text('<!doctype html><meta charset="utf-8"><title>VP008 125效果</title><style>body{font:16px sans-serif;background:#101629;color:#e3eaff}a{color:#80d7fa}table{border-collapse:collapse}td,th{padding:9px;border:1px solid #42516b}video{width:180px}</style><h1>GL Transitions 2.0.0</h1><p>技术状态与人工评价分开；所有人工评价待定。默认参数、360×640、30fps、18帧转场验证。</p>'+''.join(f'<p><a href="atlas/{pathlib.Path(v["path"]).name}">{v["category"]} / {v["count"]}效果图鉴</a></p>' for v in volumes)+'<table><tr><th>ID</th><th>描述</th><th>状态</th><th>预览</th></tr>'+''.join('<tr><td>'+html.escape(e['transitionId'])+'</td><td>'+html.escape(e['descriptionZh'])+'</td><td>'+e['technicalStatus']+' / '+e['humanEvaluation']+'</td><td>'+(f'<a href="previews/{e["upstreamName"]}.mp4">MP4</a>' if e['previewPath'] else '无合格预览')+'</td></tr>' for e in catalog['effects'])+'</table>')
print(json.dumps(summary,ensure_ascii=False))
