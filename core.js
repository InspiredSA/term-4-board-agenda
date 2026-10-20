(function(root){
'use strict';
const S=root.AgendaSchema||(typeof require==='function'?require('./schema.js'):null);
function blank(table){return Object.fromEntries(S.definitions[table].map(f=>[f.key,f.type==='select'?(f.options[0]||''):'']));}
function fresh(){const data={schema:S.version,id:uuid(),updatedAt:new Date().toISOString()};for(const t of Object.keys(S.definitions)) data[t]=[];data.Metadata=[{...blank('Metadata'),school:'',planningPeriod:'Term 4 2026',region:'South Africa',currency:'ZAR'}];data.PromptAnswers=S.prompts.map(p=>({...p,answer:''}));data.Sections=S.sections.map(s=>({...blank('Sections'),sectionId:s.id}));return data;}
function uuid(){return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16);});}
function school(d){return d.Metadata[0].school;}
function key(d){return [school(d),d.Metadata[0].planningPeriod,d.Metadata[0].meetingPeriod].map(x=>x.trim().toLowerCase().replace(/\s+/g,' ')).join('|');}
const legacyKeys=['school','otherSchool','meetingDate','planningPeriod','region','currency','reportingDate','preparedBy','duration','summary','implication1','implication2','implication3','decisionsSought','riskSummary','regionalA','financialDefinitions'];
function migrate(d){
 if(!d||!['inspired-board-v1','inspired-board-v2',S.version].includes(d.schema))return d;
 if(['inspired-board-v1','inspired-board-v2'].includes(d.schema)&&Array.isArray(d.Commitments)){const {Commitments,...rest}=d;d={...rest,legacyCommitments:Commitments.map(r=>({...r}))};}
 for(const t of ['Opportunities','Evidence'])if(['inspired-board-v1','inspired-board-v2'].includes(d.schema)&&Array.isArray(d[t])){const next={...d,['legacy'+t]:d[t].map(r=>({...r}))};delete next[t];d=next;}
 if(Array.isArray(d.Priorities)&&d.Priorities.some(p=>Object.hasOwn(p,'destination'))){d={...d,legacyPriorityDestinations:d.Priorities.map((p,i)=>({record:String(i+1),destination:p.destination||''})),Priorities:d.Priorities.map(p=>{const {destination,...rest}=p;return rest;})};}
 if(Array.isArray(d.Sections)&&d.Sections.some(s=>s&&(Object.hasOwn(s,'boardRating')||Object.hasOwn(s,'reviewDate')))){const archived=d.Sections.filter(s=>s&&(Object.hasOwn(s,'boardRating')||Object.hasOwn(s,'reviewDate'))).map(s=>({sectionId:s.sectionId,...(Object.hasOwn(s,'boardRating')?{boardRating:s.boardRating}:{}),...(Object.hasOwn(s,'reviewDate')?{reviewDate:s.reviewDate}:{})}));d={...d,legacySectionData:archived,Sections:d.Sections.map(s=>{const {boardRating,reviewDate,...rest}=s;return rest;})};}
 if(d.schema==='inspired-board-v2')return {...d,schema:S.version,PromptAnswers:S.prompts.map(p=>({...p,answer:''}))};
 if(d.schema!== 'inspired-board-v1')return d;
 if(!Array.isArray(d.Metadata)||d.Metadata.length!==1)throw Error('Expected exactly one school metadata row.');
 const m=d.Metadata[0];
 if(!m||Object.keys(m).some(k=>!legacyKeys.includes(k))||legacyKeys.some(k=>typeof m[k]!=='string'||m[k].length>30000))throw Error('Invalid legacy metadata.');
 const normalize=v=>v.trim().toLowerCase().replace(/\bhouse\b/g,'').replace(/\s+/g,' ');
 const name=m.school==='Other'?m.otherSchool:m.school;
 const mapped=S.schools.find(s=>normalize(s)===normalize(name))||'';
 const next={...d,schema:S.version,legacyMetadata:{...m},PromptAnswers:S.prompts.map(p=>({...p,answer:''})),Metadata:[{school:mapped,meetingPeriod:'2026 Term 4',planningPeriod:m.planningPeriod,region:m.region,currency:m.currency,submittedDate:m.reportingDate,preparedBy:m.preparedBy}]};
 return next;
}
function validate(d){
 d=migrate(d);
 if(!d||d.schema!==S.version)throw Error('Unsupported schema version. Use an export from this application (inspired-board-v1, v2 or v3).');
 if(typeof d.id!=='string'||!d.id||typeof d.updatedAt!=='string')throw Error('Missing submission identity or update timestamp.');
 const clean={schema:d.schema,id:d.id,updatedAt:d.updatedAt};
 if(d.legacyPriorityDestinations!==undefined){if(!Array.isArray(d.legacyPriorityDestinations)||d.legacyPriorityDestinations.length>2000||d.legacyPriorityDestinations.some(p=>!p||typeof p.record!=='string'||typeof p.destination!=='string'||p.destination.length>100))throw Error('Invalid archived priority destinations.');clean.legacyPriorityDestinations=d.legacyPriorityDestinations.map(p=>({record:p.record,destination:p.destination}));}
 for(const t of ['Opportunities','Evidence']){const a=d['legacy'+t],defs=S['legacy'+t+'Definitions'];if(a!==undefined){if(!Array.isArray(a)||a.length>2000||a.some(r=>!r||typeof r!=='object'||Object.keys(r).some(k=>!defs.some(f=>f.key===k))||defs.some(f=>typeof r[f.key]!=='string'||r[f.key].length>30000)))throw Error('Invalid archived '+t+'.');clean['legacy'+t]=a.map(r=>({...r}));}}
 if(d.legacyCommitments!==undefined){if(!Array.isArray(d.legacyCommitments)||d.legacyCommitments.length>2000||d.legacyCommitments.some(r=>!r||typeof r!=='object'||Object.keys(r).some(k=>!S.legacyCommitmentDefinitions.some(f=>f.key===k))||S.legacyCommitmentDefinitions.some(f=>typeof r[f.key]!=='string'||r[f.key].length>30000)))throw Error('Invalid archived commitments.');clean.legacyCommitments=d.legacyCommitments.map(r=>({...r}));}
 if(d.legacySectionData!==undefined){if(!Array.isArray(d.legacySectionData)||d.legacySectionData.length>10||d.legacySectionData.some(s=>!s||!S.sections.some(x=>x.id===s.sectionId)||Object.entries(s).some(([k,v])=>!['sectionId','boardRating','reviewDate'].includes(k)||typeof v!=='string'||v.length>100)))throw Error('Invalid archived section fields.');clean.legacySectionData=d.legacySectionData.map(s=>({...s}));}
 if(d.legacyMetadata!==undefined){if(!d.legacyMetadata||typeof d.legacyMetadata!=='object'||Array.isArray(d.legacyMetadata)||Object.entries(d.legacyMetadata).some(([k,v])=>!legacyKeys.includes(k)||typeof v!=='string'||v.length>30000))throw Error('Invalid archived legacy metadata.');clean.legacyMetadata={...d.legacyMetadata};}
 for(const [t,defs] of Object.entries(S.definitions)){
  if(!Array.isArray(d[t])||d[t].length>2000)throw Error(t+': missing table or more than 2,000 records.');
  clean[t]=d[t].map((r,i)=>{if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).some(k=>!defs.some(f=>f.key===k)))throw Error(t+': unexpected fields at row '+(i+1));const row={};
   for(const f of defs){let v=r[f.key];if(typeof v!=='string')throw Error(t+' row '+(i+1)+': '+f.key+' must be text.');if(v.length>30000)throw Error(t+': a field exceeds 30,000 characters.');
    if(f.type==='select'&&!(v===''&&((t==='Metadata'&&f.key==='school')))&&!f.options.includes(v))throw Error(t+': invalid '+f.label+' value.');
    if(f.type==='date'&&v&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||Number.isNaN(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v))throw Error(t+': invalid date in '+f.label+'. Use YYYY-MM-DD.');
    if(f.type==='number'&&v&&(!Number.isFinite(Number(v))||Number(v)<0))throw Error(t+': invalid non-negative number in '+f.label+'.');
    row[f.key]=v;
   }return row;
  });
 }
 if(clean.Metadata.length!==1)throw Error('Expected exactly one school metadata row.');
 if(clean.Sections.length!==10||new Set(clean.Sections.map(s=>s.sectionId)).size!==10||clean.Sections.some(s=>!S.sections.some(x=>x.id===s.sectionId)))throw Error('Exactly the ten distinct agenda sections are required.');
 if(clean.PromptAnswers.length!==S.prompts.length||new Set(clean.PromptAnswers.map(p=>p.promptId)).size!==S.prompts.length||clean.PromptAnswers.some(p=>!S.prompts.some(q=>q.promptId===p.promptId&&q.sectionId===p.sectionId&&q.question===p.question)))throw Error('Exactly the 26 distinct original discussion prompts are required.');
 return clean;
}
function gaps(d){const out=[],m=d.Metadata[0],add=(message,page,field)=>out.push({message,page,field});
 for(const [k,l]of [['school','school'],['planningPeriod','planning period'],['meetingPeriod','board meeting'],['submittedDate','report submitted date'],['currency','currency']])if(!m[k].trim())add('Complete '+l+'.','setup','Metadata-0-'+k);
 for(const [i,s]of d.Sections.entries()){const label='Section '+s.sectionId,rating=s.schoolRating,need=(key,message)=>{if(!s[key].trim())add(label+': '+message,s.sectionId,'Sections-'+i+'-'+key);};
 if(rating!=='N/A')for(const [j,p]of d.PromptAnswers.entries())if(p.sectionId===s.sectionId&&!p.answer.trim())add(label+' · Question '+(S.prompts.filter(q=>q.sectionId===s.sectionId).findIndex(q=>q.promptId===p.promptId)+1)+': add a brief answer (or explain what evidence is needed).',s.sectionId,'PromptAnswers-'+j+'-answer');
 if(['Amber','Red'].includes(rating)){need('reason','describe the key issue and supporting evidence.');need('nextAction','record the corrective action or decision.');need('owner','name the accountable owner.');need('dueDate','set the action due date.');}
 if(rating==='N/A')need('reason','explain why this function is not applicable.');
 if(rating==='Not assessed'){need('reason','explain the evidence needed.');need('dueDate','set a date to supply missing evidence.');add(label+': assess the school rating when evidence is available.',s.sectionId,'Sections-'+i+'-schoolRating');}
 }return out;
}
function issues(d){return gaps(d).map(g=>g.message);}
function addSheet(X,wb,name,headers,rows){const ws=X.utils.aoa_to_sheet([headers,...rows]);ws['!cols']=headers.map(h=>({wch:/notes|evidence|action|reason|summary|risk|milestones|target|baseline|opportunity|pilot|exceptions/i.test(h)?58:24}));if(rows.length)ws['!autofilter']={ref:ws['!ref']};X.utils.book_append_sheet(wb,ws,name);}
function workbook(X,submissions,consolidated=false){
 const docs=submissions.map(validate),wb=X.utils.book_new();
 addSheet(X,wb,'Overview',['School','Planning period','Board meeting','Section','School rating','Material exceptions','Next action','Owner','Due date','Support'],docs.flatMap(d=>d.Sections.map(s=>[school(d),d.Metadata[0].planningPeriod,d.Metadata[0].meetingPeriod,S.sections.find(a=>a.id===s.sectionId).title,s.schoolRating,s.exceptions,s.nextAction,s.owner,s.dueDate,s.support])));
 addSheet(X,wb,'Manifest',['schema','kind','submissionId','updatedAt'],docs.map(d=>[S.version,consolidated?'consolidated':'school',d.id,d.updatedAt]));
 for(const [t,defs] of Object.entries(S.definitions))addSheet(X,wb,t,consolidated?['school','planningPeriod','meetingPeriod','submissionId',...defs.map(f=>f.key)]:defs.map(f=>f.key),docs.flatMap(d=>d[t].map(r=>[...(consolidated?[school(d),d.Metadata[0].planningPeriod,d.Metadata[0].meetingPeriod,d.id]:[]),...defs.map(f=>r[f.key])])));
 if(consolidated){
 const records=docs.flatMap(d=>d.Priorities.map(p=>({d,p,kind:'Priority',title:p.action})));const rank={High:0,Medium:1,Low:2,'Not assessed':3,'':4};records.sort((a,b)=>(rank[a.p.urgency]-rank[b.p.urgency])||(rank[a.p.impact]-rank[b.p.impact]));
 addSheet(X,wb,'Regional priorities',['School','Planning period','Type','Action or opportunity','Impact','Urgency','Rating','Owner','Target date'],records.map(({d,p,kind,title})=>[school(d),d.Metadata[0].planningPeriod,kind,title,p.impact,p.urgency,p.rating,p.owner,p.targetDate]));
 }
 addSheet(X,wb,'Review gaps',['School','Planning period','Missing information'],docs.flatMap(d=>issues(d).map(i=>[school(d),d.Metadata[0].planningPeriod,i])));
 addSheet(X,wb,'Field guide',['Table','Column','Meaning','Allowed values'],Object.entries(S.definitions).flatMap(([t,defs])=>defs.map(f=>[t,f.key,f.label,(f.options||[]).join('; ')])));
 addSheet(X,wb,'Read me',['Topic','Guidance'],[
 ['Purpose','School-level inputs for the CEO regional report. School approval does not imply regional or global funding approval.'],
 ['RAG','Green: on track. Amber: corrective action needed. Red: urgent intervention/material change. N/A requires a reason. Not assessed requires an evidence due date. Do not average ratings.'],
 ['Import','Import original school exports only. Preserve all table names and column headers. Edit data in the app and export again. Consolidated reports are not school imports.'],
 ['Privacy','Non-identifying summaries only. No confidential safeguarding cases or sensitive individual HR details. Use existing restricted channels.'],
 ['Evidence','Use common reporting dates, definitions and currency; distinguish Actual, Forecast and Target. Include academic cohort sizes and equivalent qualifications.'],
 ['Review','Review gaps lists incomplete information. It is not an approval. Not assessed and N/A are never Green.'],
 ['Source','Agenda wording: School Board Meeting Agenda – Draft 10/9. Meeting details simplified in schema v3; separate prompt answers retained and retired fields omitted.']]);
 return wb;
}
function readWorkbook(X,bytes){
 const w=X.read(bytes,{type:'array',cellFormula:true,cellDates:false});
 for(const name of w.SheetNames){const ws=w.Sheets[name];if(ws['!ref']){const range=X.utils.decode_range(ws['!ref']);if(range.e.r>10000||range.e.c>200)throw Error('Workbook exceeds permitted table size.');}for(const [k,c]of Object.entries(ws))if(!k.startsWith('!')&&c.f)throw Error('Formula cells are not accepted. Re-export data from the app.');}
 const table=name=>{if(!w.Sheets[name])throw Error('Missing sheet: '+name);return X.utils.sheet_to_json(w.Sheets[name],{header:1,defval:'',raw:true,blankrows:false});};
 const manifest=table('Manifest');if(JSON.stringify(manifest[0])!==JSON.stringify(['schema','kind','submissionId','updatedAt'])||manifest.length!==2||manifest[1][1]!=='school')throw Error('Import a single-school export, not a consolidated report.');
 const d={schema:String(manifest[1][0]),id:String(manifest[1][2]),updatedAt:String(manifest[1][3])};
 if(['inspired-board-v1','inspired-board-v2'].includes(d.schema)){const [headers,...rows]=table('Commitments');if(JSON.stringify(headers)!==JSON.stringify(S.legacyCommitmentDefinitions.map(f=>f.key)))throw Error('Commitments: column schema does not match.');d.Commitments=rows.map(r=>{if(r.length>headers.length)throw Error('Commitments: unexpected extra cells.');return Object.fromEntries(headers.map((h,i)=>[h,String(r[i]??'')]));});}
 if(['inspired-board-v1','inspired-board-v2'].includes(d.schema))for(const t of ['Opportunities','Evidence']){const [headers,...rows]=table(t),defs=S['legacy'+t+'Definitions'];if(JSON.stringify(headers)!==JSON.stringify(defs.map(f=>f.key)))throw Error(t+': column schema does not match.');d[t]=rows.map(r=>{if(r.length>headers.length)throw Error(t+': unexpected extra cells.');return Object.fromEntries(headers.map((h,i)=>[h,String(r[i]??'')]));});}
 for(const [t,defs]of Object.entries(S.definitions)){if(t==='PromptAnswers'&&['inspired-board-v1','inspired-board-v2'].includes(d.schema))continue;const [headers,...rows]=table(t),expected=t==='Metadata'&&d.schema==='inspired-board-v1'?legacyKeys:defs.map(f=>f.key);if(t==='Priorities'&&['inspired-board-v1','inspired-board-v2'].includes(d.schema))expected.splice(expected.indexOf('impact'),0,'destination');if(t==='Sections'&&d.schema==='inspired-board-v1'){expected.splice(2,0,'boardRating');expected.splice(expected.indexOf('exceptions'),0,'reviewDate');}if(JSON.stringify(headers)!==JSON.stringify(expected))throw Error(t+': column schema does not match.');d[t]=rows.map(r=>{if(r.length>headers.length)throw Error(t+': unexpected extra cells.');return Object.fromEntries(headers.map((h,i)=>[h,String(r[i]??'')]));});}
 return validate(d);
}
const api={migrate,legacyKeys,fresh,blank,school,key,validate,gaps,issues,workbook,readWorkbook};root.AgendaCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
