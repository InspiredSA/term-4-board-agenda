(function(root){
'use strict';
const S=root.AgendaSchema||(typeof require==='function'?require('./schema.js'):null);
function blank(table){return Object.fromEntries(S.definitions[table].map(f=>[f.key,f.type==='select'?(f.options[0]||''):'']));}
function fresh(){const data={schema:S.version,id:uuid(),updatedAt:new Date().toISOString()};for(const t of Object.keys(S.definitions)) data[t]=[];data.Metadata=[{...blank('Metadata'),school:'',planningPeriod:'Term 4 2026',region:'South Africa',currency:'ZAR'}];data.Sections=S.sections.map(s=>({...blank('Sections'),sectionId:s.id}));return data;}
function uuid(){return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16);});}
function school(d){const m=d.Metadata[0];return m.school==='Other'?m.otherSchool:m.school;}
function key(d){return [school(d),d.Metadata[0].planningPeriod,d.Metadata[0].meetingDate].map(x=>x.trim().toLowerCase().replace(/\s+/g,' ')).join('|');}
function validate(d){
 if(!d||d.schema!==S.version)throw Error('Unsupported schema version. Use an export from this application (inspired-board-v1).');
 if(typeof d.id!=='string'||!d.id||typeof d.updatedAt!=='string')throw Error('Missing submission identity or update timestamp.');
 const clean={schema:d.schema,id:d.id,updatedAt:d.updatedAt};
 for(const [t,defs] of Object.entries(S.definitions)){
  if(!Array.isArray(d[t])||d[t].length>2000)throw Error(t+': missing table or more than 2,000 records.');
  clean[t]=d[t].map((r,i)=>{if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).some(k=>!defs.some(f=>f.key===k)))throw Error(t+': unexpected fields at row '+(i+1));const row={};
   for(const f of defs){let v=r[f.key];if(typeof v!=='string')throw Error(t+' row '+(i+1)+': '+f.key+' must be text.');if(v.length>30000)throw Error(t+': a field exceeds 30,000 characters.');
    if(f.type==='select'&&!(v===''&&((t==='Metadata'&&f.key==='school')||f.key==='boardRating'))&&!f.options.includes(v))throw Error(t+': invalid '+f.label+' value.');
    if(f.type==='date'&&v&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||Number.isNaN(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v))throw Error(t+': invalid date in '+f.label+'. Use YYYY-MM-DD.');
    if(f.type==='number'&&v&&(!Number.isFinite(Number(v))||Number(v)<0))throw Error(t+': invalid non-negative number in '+f.label+'.');
    row[f.key]=v;
   }return row;
  });
 }
 if(clean.Metadata.length!==1)throw Error('Expected exactly one school metadata row.');
 if(clean.Sections.length!==10||new Set(clean.Sections.map(s=>s.sectionId)).size!==10||clean.Sections.some(s=>!S.sections.some(x=>x.id===s.sectionId)))throw Error('Exactly the ten distinct agenda sections are required.');
 return clean;
}
function issues(d){const out=[],m=d.Metadata[0];for(const [v,l]of [[school(d),'school'],[m.planningPeriod,'planning period'],[m.meetingDate,'meeting date'],[m.reportingDate,'reporting date'],[m.currency,'currency']])if(!v.trim())out.push('Complete '+l+'.');
 for(const s of d.Sections){const label='Section '+s.sectionId, rating=s.boardRating||s.schoolRating;
 if(!s.reason.trim())out.push(label+': provide rating reason and evidence (or N/A reason).');
 if(!s.assessmentDate)out.push(label+': provide assessment date.');
 if(rating==='Not assessed'&&!s.dueDate)out.push(label+': set a date to supply missing evidence.');
 if(['Amber','Red'].includes(rating)&&(!s.nextAction||!s.owner||!s.dueDate))out.push(label+': record corrective/recovery action, owner and deadline.');
 if(rating==='Red'&&!s.support)out.push(label+': record the escalation route / support required.');
 if(rating!=='Not assessed'&&rating!=='N/A'&&!s.reviewDate)out.push(label+': set next review date.');
 }return out;
}
function addSheet(X,wb,name,headers,rows){const ws=X.utils.aoa_to_sheet([headers,...rows]);ws['!cols']=headers.map(h=>({wch:/notes|evidence|action|reason|summary|risk|milestones|target|baseline|opportunity|pilot|exceptions/i.test(h)?58:24}));if(rows.length)ws['!autofilter']={ref:ws['!ref']};X.utils.book_append_sheet(wb,ws,name);}
function workbook(X,submissions,consolidated=false){
 const docs=submissions.map(validate),wb=X.utils.book_new();
 addSheet(X,wb,'Overview',['School','Planning period','Meeting date','Section','School rating','Board rating','Effective rating','Material exceptions','Next action','Owner','Due date','Support','Next review'],docs.flatMap(d=>d.Sections.map(s=>[school(d),d.Metadata[0].planningPeriod,d.Metadata[0].meetingDate,S.sections.find(a=>a.id===s.sectionId).title,s.schoolRating,s.boardRating,s.boardRating||s.schoolRating,s.exceptions,s.nextAction,s.owner,s.dueDate,s.support,s.reviewDate])));
 addSheet(X,wb,'Manifest',['schema','kind','submissionId','updatedAt'],docs.map(d=>[S.version,consolidated?'consolidated':'school',d.id,d.updatedAt]));
 for(const [t,defs] of Object.entries(S.definitions))addSheet(X,wb,t,consolidated?['school','planningPeriod','meetingDate','submissionId',...defs.map(f=>f.key)]:defs.map(f=>f.key),docs.flatMap(d=>d[t].map(r=>[...(consolidated?[school(d),d.Metadata[0].planningPeriod,d.Metadata[0].meetingDate,d.id]:[]),...defs.map(f=>r[f.key])])));
 if(consolidated){
 const records=docs.flatMap(d=>[...d.Priorities.map(p=>({d,p,kind:'Priority',title:p.action,destination:p.destination})),...d.Opportunities.map(p=>({d,p,kind:'Strategic opportunity',title:p.title,destination:'D'}))]);const rank={High:0,Medium:1,Low:2,'Not assessed':3,'':4};records.sort((a,b)=>(rank[a.p.urgency]-rank[b.p.urgency])||(rank[a.p.impact]-rank[b.p.impact]));
 addSheet(X,wb,'Regional priorities',['School','Planning period','Type','Destination','Action or opportunity','Impact','Urgency','Rating','Owner','Target date'],records.map(({d,p,kind,title,destination})=>[school(d),d.Metadata[0].planningPeriod,kind,destination,title,p.impact,p.urgency,p.rating,p.owner,p.targetDate]));
 }
 addSheet(X,wb,'Review gaps',['School','Planning period','Missing information'],docs.flatMap(d=>issues(d).map(i=>[school(d),d.Metadata[0].planningPeriod,i])));
 addSheet(X,wb,'Field guide',['Table','Column','Meaning','Allowed values'],Object.entries(S.definitions).flatMap(([t,defs])=>defs.map(f=>[t,f.key,f.label,(f.options||[]).join('; ')])));
 addSheet(X,wb,'Read me',['Topic','Guidance'],[
 ['Purpose','School-level inputs for the CEO regional report. School approval does not imply regional or global funding approval.'],
 ['RAG','Green: on track. Amber: corrective action needed. Red: urgent intervention/material change. N/A requires a reason. Not assessed requires an evidence due date. Do not average ratings.'],
 ['Import','Import original school exports only. Preserve all table names and column headers. Edit data in the app and export again. Consolidated reports are not school imports.'],
 ['Privacy','Non-identifying summaries only. No confidential safeguarding cases or sensitive individual HR details. Use existing restricted channels.'],
 ['Regions','A: Region at a glance (1,6,8,9). B: Status of agreed priorities. C: Proposed priorities (2–10). D: Strategic opportunities.'],
 ['Evidence','Use common reporting dates, definitions and currency; distinguish Actual, Forecast and Target. Include academic cohort sizes and equivalent qualifications.'],
 ['Review','Review gaps lists incomplete information. It is not an approval. Not assessed and N/A are never Green.'],
 ['Source','Agenda wording: School Board Meeting Agenda – Draft 10/9. Timing discrepancies remain unresolved; meeting duration is entered by the school.']]);
 return wb;
}
function readWorkbook(X,bytes){
 const w=X.read(bytes,{type:'array',cellFormula:true,cellDates:false});
 for(const name of w.SheetNames){const ws=w.Sheets[name];if(ws['!ref']){const range=X.utils.decode_range(ws['!ref']);if(range.e.r>10000||range.e.c>200)throw Error('Workbook exceeds permitted table size.');}for(const [k,c]of Object.entries(ws))if(!k.startsWith('!')&&c.f)throw Error('Formula cells are not accepted. Re-export data from the app.');}
 const table=name=>{if(!w.Sheets[name])throw Error('Missing sheet: '+name);return X.utils.sheet_to_json(w.Sheets[name],{header:1,defval:'',raw:true,blankrows:false});};
 const manifest=table('Manifest');if(JSON.stringify(manifest[0])!==JSON.stringify(['schema','kind','submissionId','updatedAt'])||manifest.length!==2||manifest[1][1]!=='school')throw Error('Import a single-school export, not a consolidated report.');
 const d={schema:String(manifest[1][0]),id:String(manifest[1][2]),updatedAt:String(manifest[1][3])};
 for(const [t,defs]of Object.entries(S.definitions)){const [headers,...rows]=table(t),expected=defs.map(f=>f.key);if(JSON.stringify(headers)!==JSON.stringify(expected))throw Error(t+': column schema does not match.');d[t]=rows.map(r=>{if(r.length>headers.length)throw Error(t+': unexpected extra cells.');return Object.fromEntries(headers.map((h,i)=>[h,String(r[i]??'')]));});}
 return validate(d);
}
const api={fresh,blank,school,key,validate,issues,workbook,readWorkbook};root.AgendaCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
