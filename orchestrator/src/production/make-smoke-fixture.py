"""Regression fixture from VP010 shot2; no original Excel/voice/video edits, no inference."""
import json,pathlib,hashlib,wave,zipfile
from xml.sax.saxutils import escape
R=pathlib.Path(__file__).resolve().parents[3];S=R/'orchestrator/output/microsoft-veo-skills-20261028-vp010';D=R/'orchestrator/output/production-v1-validation/fresh-fixture';D.mkdir(parents=True,exist_ok=True)
if (D/'resources.json').exists():
 print('Existing frozen regression fixture retained:',D);raise SystemExit(0)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
source=json.load(open(S/'script.voiced.json'));shot=source['shots'][1];text=shot['narration'];start,end=shot['voiceover']['sourceSampleRange']
with wave.open(str(S/'voice/full-raw.wav')) as w:sr=w.getframerate();data=w.readframes(w.getnframes())[start*2:end*2]
with wave.open(str(D/'voice.wav'),'wb') as w:w.setparams((1,2,sr,len(data)//2,'NONE','not compressed'));w.writeframes(data)
dur=len(data)/2/sr;frames=__import__('math').ceil(dur*30)+24
rows=[['分镜号','分镜画面','旁白（口播原文）','建议时长','叠加文字规范'],[1,'真实手部键盘工作近景，不冒充AI操作',text,3,'重新检验技能价值']]
cells=[]
for i,row in enumerate(rows,1):
 items=[]
 for j,v in enumerate(row):
  ref=f'{chr(65+j)}{i}'
  items.append(f'<c r="{ref}"><v>{v}</v></c>' if isinstance(v,(int,float)) else f'<c r="{ref}" t="inlineStr"><is><t>{escape(v)}</t></is></c>')
 cells.append(f'<row r="{i}">{"".join(items)}</row>')
with zipfile.ZipFile(D/'input.xlsx','w') as z:
 z.writestr('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>')
 z.writestr('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
 z.writestr('xl/workbook.xml','<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet" sheetId="1" r:id="rId1"/></sheets></workbook>')
 z.writestr('xl/_rels/workbook.xml.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>')
 z.writestr('xl/worksheets/sheet1.xml','<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+''.join(cells)+'</sheetData></worksheet>')
cues=[dict(id=1,shotNumber=1,text=text,startSeconds=4.191020408163265-start/sr,endSeconds=6.796643990929705-start/sr)]
(D/'captions.json').write_text(json.dumps(cues,ensure_ascii=False,indent=2));(D/'voiced.json').write_text(json.dumps({'shots':[{'shotNumber':1,'narration':text,'voiceover':{'timelineStartSeconds':0,'timelineEndSeconds':dur}}]},ensure_ascii=False,indent=2))
def stamp(x):
 n=round(x*1000);return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
(D/'subtitles.srt').write_text(f"1\n{stamp(cues[0]['startSeconds'])} --> {stamp(cues[0]['endSeconds'])}\n{text}\n")
assets=json.load(open(S/'asset-catalog.json'));asset=next(a for a in assets['assets'] if a['assetId']=='mixkit-1781');(D/'catalog.json').write_text(json.dumps({'assets':[asset]},ensure_ascii=False,indent=2))
match=dict(projectId='video-pipeline',episodeId='production-v1-smoke',shotNumber=1,assetId=asset['assetId'],segmentStart=0,segmentEnd=frames/30,matchReason='原片实际可见双手操作键盘，用作技能讨论的工作情境，不冒充产品测试',cropMode='portrait_focus',matchStatus='proposed');(D/'matches.json').write_text(json.dumps([match],ensure_ascii=False,indent=2))
resources=dict(sourceExcelSha256=sha(D/'input.xlsx'),voice=str(D/'voice.wav'),voiceSha256=sha(D/'voice.wav'),voicedScript=str(D/'voiced.json'),captions=str(D/'captions.json'),srt=str(D/'subtitles.srt'),assetCatalog=str(D/'catalog.json'),assetMatches=str(D/'matches.json'));(D/'resources.json').write_text(json.dumps(resources,ensure_ascii=False,indent=2))
(D/'source-evidence.json').write_text(json.dumps({'origin':'VP010原版第2镜已有生成样本，测试夹具，不是新配音','sourceVoiceSha256':sha(S/'voice/full-raw.wav'),'sourceSampleRange':[start,end],'sourceExcelUnmodified':str(R/'docs/scripts/微软离职邀约_技能保值_分镜脚本.xlsx'),'text':text,'voiceDurationSeconds':dur},ensure_ascii=False,indent=2))
print(D)
