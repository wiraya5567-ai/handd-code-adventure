'use strict';

const $ = (id) => document.getElementById(id);
const screens = [...document.querySelectorAll('.screen')];
const STORAGE_KEY = 'hca-unlimited-v1';
const SCORE = { success:100, fail:20, hint:5 };
const DIRS = [{x:1,y:0},{x:0,y:1},{x:-1,y:0},{x:0,y:-1}];
const DIR_NAMES = ['ขวา','ลง','ซ้าย','ขึ้น'];

const state = {
  screen:'menu', playerName:'ผู้เล่น', levelIndex:0, level:null,
  program:[], robot:null, score:0, coins:0, stars:0, timer:0, timerId:null,
  running:false, failedRun:false, sound:true, showCursor:true, reducedMotion:false,
  hand: {ready:false, gesture:null, confidence:0, stableSince:0, lastAcceptedAt:0, lastLabel:'', cursor:null},
  camera: {stream:null, deviceId:null, status:'OFF', retry:0},
  mediaPipe:null, handLoop:false, lastVideoTime:-1, customLevels:[]
};

function loadSave(){
  try{const raw=localStorage.getItem(STORAGE_KEY); if(raw) Object.assign(state,JSON.parse(raw));}catch(e){console.warn('loadSave',e)}
  state.sound = state.sound !== false; state.showCursor = state.showCursor !== false;
}
function saveSave(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify({playerName:state.playerName,score:state.score,coins:state.coins,stars:state.stars,levelProgress:getProgress(),sound:state.sound,showCursor:state.showCursor,reducedMotion:state.reducedMotion,customLevels:state.customLevels})); }catch(e){console.warn('saveSave',e)}
}
function getProgress(){
  const data={};
  GAME_LEVELS.forEach((l)=> data[l.id]={stars: Number(localStorage.getItem(`hca-stars-${l.id}`)||0), completed:localStorage.getItem(`hca-complete-${l.id}`)==='1'});
  return data;
}
function completedCount(){return GAME_LEVELS.filter(l=>localStorage.getItem(`hca-complete-${l.id}`)==='1').length}
function setScreen(id){screens.forEach(s=>s.classList.toggle('active',s.id===id)); state.screen=id.replace('screen','').toLowerCase(); if(id==='screenSettings') updateShareUrl();}
function toast(msg,type=''){const box=$('debugBox'); if(box){box.textContent=msg;box.className='debug-box '+(type==='error'?'error':'')}}
function playTone(freq,duration=.08,type='sine'){ if(!state.sound) return; try{const ctx=playTone.ctx||(playTone.ctx=new AudioContext()); const o=ctx.createOscillator(), g=ctx.createGain(); o.type=type;o.frequency.value=freq;g.gain.value=.04;o.connect(g);g.connect(ctx.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);o.stop(ctx.currentTime+duration)}catch(e){} }

function init(){
  loadSave();
  $('playerName').value=state.playerName;
  $('soundToggle').checked=state.sound; $('cursorToggle').checked=state.showCursor; $('motionToggle').checked=state.reducedMotion;
  updatePlayerBadge(); renderLevels(); bindUI(); updatePortrait();
  window.addEventListener('resize',updatePortrait); window.addEventListener('orientationchange',updatePortrait);
  document.addEventListener('keydown',onKey);
  setScreen('screenMenu');
}
function bindUI(){
  $('startBtn').onclick=()=>{captureName(); renderLevels(); setScreen('screenLevels');};
  $('howBtn').onclick=()=>setScreen('screenHow');
  $('teacherBtn').onclick=()=>{updateTeacherStats();setScreen('screenTeacher')};
  $('settingsBtn').onclick=()=>setScreen('screenSettings');
  document.querySelectorAll('.backBtn').forEach(b=>b.onclick=()=>setScreen('screenMenu'));
  document.querySelectorAll('.backToMenuBtn').forEach(b=>b.onclick=()=>setScreen('screenMenu'));
  $('soundBtn').onclick=toggleSound; $('soundToggle').onchange=e=>{state.sound=e.target.checked;saveSave();updateSoundIcon()};
  $('cursorToggle').onchange=e=>{state.showCursor=e.target.checked;saveSave()};
  $('motionToggle').onchange=e=>{state.reducedMotion=e.target.checked;document.documentElement.classList.toggle('reduced-motion',state.reducedMotion);saveSave()};
  $('cameraOpenBtn').onclick=()=>startCamera(); $('cameraCloseBtn').onclick=()=>stopCamera(); $('cameraRetryBtn').onclick=()=>startCamera(true);
  $('continueBtn').onclick=()=>{startLevel(state.levelIndex);}
  $('backLevelsBtn').onclick=()=>{stopTimer(); setScreen('screenLevels'); renderLevels();}
  $('resetLevelBtn').onclick=()=>resetLevel(); $('undoBtn').onclick=()=>{state.program.pop();renderProgram();}; $('clearBtn').onclick=()=>{state.program=[];renderProgram();};
  document.querySelectorAll('.command-btn[data-cmd]').forEach(b=>b.onclick=()=>addCommand(b.dataset.cmd));
  $('runBtn').onclick=runProgram; $('hintBtn').onclick=useHint;
  $('cameraTestBtn').onclick=()=>startCamera(true);
  $('nextLevelBtn').onclick=nextLevel; $('retryResultBtn').onclick=()=>{startLevel(state.levelIndex);}; $('resultLevelsBtn').onclick=()=>{renderLevels();setScreen('screenLevels')};
  $('downloadProgressBtn').onclick=downloadProgress; $('resetProgressBtn').onclick=resetProgress; $('saveCustomBtn').onclick=saveCustomLevel;
  $('copyLinkBtn').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);$('copyLinkBtn').textContent='คัดลอกแล้ว ✓';setTimeout(()=>$('copyLinkBtn').textContent='Copy Link',1200)}catch(e){alert(location.href)}};
  $('testModeBtn').onclick=toggleTestPanel;$('closeTestBtn').onclick=()=>$('testPanel').classList.add('hidden');$('forceSuccessBtn').onclick=()=>finishLevel(true);$('testResetLevelBtn').onclick=resetLevel;$('resetCameraBtn').onclick=()=>startCamera(true);$('testClearStorageBtn').onclick=()=>{localStorage.clear();location.reload()};
}
function captureName(){const n=$('playerName').value.trim()||'ผู้เล่น';state.playerName=n;saveSave();updatePlayerBadge()}
function updatePlayerBadge(){ $('playerBadge').textContent='ผู้เล่น: '+state.playerName; }
function toggleSound(){state.sound=!state.sound;$('soundToggle').checked=state.sound;saveSave();updateSoundIcon();playTone(600)}
function updateSoundIcon(){$('soundBtn').textContent=state.sound?'🔊':'🔇'}
function renderLevels(){
  $('progressSummary').textContent=`${completedCount()}/${GAME_LEVELS.length} ด่าน`;
  $('levelGrid').innerHTML=GAME_LEVELS.map((l,i)=>{
    const stars=Number(localStorage.getItem(`hca-stars-${l.id}`)||0); const completed=localStorage.getItem(`hca-complete-${l.id}`)==='1';
    return `<button class="level-card" data-index="${i}"><div class="level-num">LEVEL ${l.id}</div><h3>${l.title}</h3><span class="level-concept">${l.concept}</span><div class="stars">${'⭐'.repeat(Math.min(stars,3))}${'☆'.repeat(3-Math.min(stars,3))} ${completed?'✅':''}</div></button>`
  }).join('');
  document.querySelectorAll('.level-card').forEach(b=>b.onclick=()=>openSetup(Number(b.dataset.index)));
}
function openSetup(index){state.levelIndex=index; $('setupError').classList.add('hidden');$('calibrationFill').style.width='0%';$('calibrationResult').textContent='ยังไม่ได้เริ่ม';$('calibrationGuide').textContent='กด “เปิดกล้อง” หรือใช้เกมแบบไม่ใช้กล้องก็ได้';$('continueBtn').disabled=false;setScreen('screenSetup');}

async function startCamera(force=false){
  $('setupError').classList.add('hidden');
  if(!navigator.mediaDevices?.getUserMedia){return cameraError('Browser นี้ไม่รองรับ Camera API')}
  if(!window.isSecureContext && !['localhost','127.0.0.1'].includes(location.hostname)) return cameraError('กรุณาเปิดเกมผ่าน HTTPS หรือ localhost เพื่อใช้กล้อง');
  if(state.camera.stream) stopCamera();
  try{
    state.camera.status='REQUESTING'; updateSetupCameraStatus();
    const devices=await navigator.mediaDevices.enumerateDevices(); const cams=devices.filter(d=>d.kind==='videoinput');
    const constraints={video:state.camera.deviceId?{deviceId:{exact:state.camera.deviceId},width:{ideal:640},height:{ideal:480}}:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false};
    const stream=await navigator.mediaDevices.getUserMedia(constraints); state.camera.stream=stream; state.camera.status='READY';
    const video=$('gameVideo'); const setupVideo=$('setupVideo'); video.srcObject=stream; setupVideo.srcObject=stream;
    await Promise.all([waitMeta(video),waitMeta(setupVideo)]); await Promise.all([video.play(),setupVideo.play()]);
    if(!(video.videoWidth>0&&video.videoHeight>0)) throw new Error('VIDEO_DIMENSION_ZERO');
    if(window.Hands && !state.mediaPipe) initMediaPipe();
    startHandLoop(); updateSetupCameraStatus(); $('continueBtn').disabled=false;
    if(cams.length>1) toast('พบกล้องหลายตัว สามารถเพิ่มเมนูเลือกกล้องได้ใน Teacher Mode');
  }catch(err){console.error(err);state.camera.status='ERROR';updateSetupCameraStatus();cameraError(normalizeCameraError(err));}
}
function waitMeta(video){return new Promise((resolve,reject)=>{if(video.readyState>=1&&video.videoWidth>0)return resolve();const t=setTimeout(()=>reject(new Error('VIDEO_METADATA_TIMEOUT')),5000);video.onloadedmetadata=()=>{clearTimeout(t);resolve()}})}
function stopCamera(){state.handLoop=false;if(state.camera.stream){state.camera.stream.getTracks().forEach(t=>t.stop())}state.camera.stream=null;state.camera.status='OFF';['gameVideo','setupVideo'].forEach(id=>{const v=$(id);v.srcObject=null});updateSetupCameraStatus();}
function cameraError(msg){$('setupError').textContent=msg;$('setupError').classList.remove('hidden');playTone(180,.15,'square')}
function normalizeCameraError(err){if(err?.name==='NotAllowedError')return'ไม่สามารถเปิดกล้องได้ กรุณาอนุญาต Camera ใน Browser';if(err?.name==='NotFoundError')return'ไม่พบกล้องในอุปกรณ์';if(err?.name==='NotReadableError')return'กล้องอาจกำลังถูกใช้งานโดยโปรแกรมอื่น เช่น Zoom / Teams / Meet';if(err?.message==='VIDEO_METADATA_TIMEOUT')return'กล้องไม่ส่งภาพให้ Video ลองกด “ลองใหม่” หรือเปลี่ยนกล้อง';return'ไม่สามารถเปิดกล้องได้ กรุณาลองใหม่อีกครั้ง'}
function updateSetupCameraStatus(){ $('setupCameraStatus').textContent='Camera: '+state.camera.status; }
function initMediaPipe(){
  try{
    const hands=new Hands({locateFile:(file)=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`});
    hands.setOptions({maxNumHands:1,modelComplexity:1,minDetectionConfidence:.55,minTrackingConfidence:.55});
    hands.onResults(processHandResults); state.mediaPipe=hands;
    $('setupHandStatus').textContent='Hand Detection: READY'; $('setupHandStatus').style.background='#eaf9ee'; $('setupHandStatus').style.color='#26783f';
  }catch(e){console.warn('MediaPipe unavailable',e);state.mediaPipe=null;$('setupHandStatus').textContent='Hand Detection: FALLBACK';}
}
function startHandLoop(){if(state.handLoop)return;state.handLoop=true;const tick=async()=>{if(!state.handLoop)return;const v=$('gameVideo');if(v.readyState>=2&&v.videoWidth>0&&state.mediaPipe&&v.currentTime!==state.lastVideoTime){state.lastVideoTime=v.currentTime;try{await state.mediaPipe.send({image:v})}catch(e){console.warn('hand send',e)}}requestAnimationFrame(tick)};requestAnimationFrame(tick)}
function processHandResults(results){
  const canvas=$('handOverlay'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
  if(!results.multiHandLandmarks?.length){state.hand.gesture=null;$('gestureLabel').textContent='ไม่พบมือ';$('gestureConfidence').textContent='0%';$('gestureStatus').textContent='กรุณายกมือให้อยู่ในกรอบกล้อง';return;}
  const lm=results.multiHandLandmarks[0]; drawHand(ctx,lm,canvas.width,canvas.height);
  const det=classifyGesture(lm); state.hand.gesture=det.label;state.hand.confidence=det.confidence;state.hand.cursor={x:lm[8].x,y:lm[8].y};
  $('gestureLabel').textContent=det.icon+' '+det.label;$('gestureConfidence').textContent=Math.round(det.confidence*100)+'%';$('gestureStatus').textContent='กำลังอ่าน Gesture…';
  const now=performance.now();
  if(det.confidence<0.66)return;
  if(state.hand.lastLabel!==det.label){state.hand.lastLabel=det.label;state.hand.stableSince=now;return;}
  if(now-state.hand.stableSince>=650 && now-state.hand.lastAcceptedAt>=1100){
    state.hand.lastAcceptedAt=now;
    if(det.label==='RUN') runProgram(); else if(det.label!=='NONE') addCommand(det.label);
    state.hand.stableSince=now;
  }
}
function drawHand(ctx,lm,w,h){ctx.strokeStyle='rgba(108,99,255,.7)';ctx.lineWidth=3;const edges=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],[0,17],[17,18],[18,19],[19,20]];for(const [a,b] of edges){ctx.beginPath();ctx.moveTo(lm[a].x*w,lm[a].y*h);ctx.lineTo(lm[b].x*w,lm[b].y*h);ctx.stroke()}for(const p of lm){ctx.beginPath();ctx.arc(p.x*w,p.y*h,4,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();}}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function classifyGesture(lm){
  const wrist=lm[0]; const tips=[4,8,12,16,20],mcp=[2,5,9,13,17];
  const straight=(tip,base)=>dist(lm[tip],wrist)>dist(lm[base],wrist)*1.1;
  const index=straight(8,5), middle=straight(12,9), ring=straight(16,13), pinky=straight(20,17);
  const thumb=dist(lm[4],lm[17])>dist(lm[3],lm[17])*1.08;
  let label='NONE',icon='🖐️',confidence=.5;
  if(!index&&!middle&&!ring&&!pinky){label='STOP';icon='✊';confidence=.92}
  else if(index&&!middle&&!ring&&!pinky){label='MOVE';icon='☝️';confidence=.93}
  else if(index&&middle&&!ring&&!pinky){label='RIGHT';icon='✌️';confidence=.9}
  else if(index&&middle&&ring&&!pinky){label='LEFT';icon='🤟';confidence=.86}
  else if(thumb&&!index&&!middle&&!ring&&!pinky){label='RUN';icon='👍';confidence=.92}
  return{label,icon,confidence}
}

function startLevel(index){
  stopCamera(); state.levelIndex=index; state.level=GAME_LEVELS[index]; state.program=[]; state.running=false; state.failedRun=false;
  state.robot={...state.level.start}; state.timer=0; clearInterval(state.timerId); state.timerId=setInterval(()=>{if(!state.running){state.timer++;$('timerStat').textContent='⏱️ '+formatTime(state.timer)}},1000);
  $('levelTitle').textContent=`LEVEL ${state.level.id} — ${state.level.title}`;$('levelObjective').textContent=state.level.objective;toast('สร้างคำสั่งของคุณ แล้วกด RUN ได้เลย');renderProgram();drawGame();setScreen('screenGame');
  setTimeout(()=>startCamera(false),300);
}
function stopTimer(){clearInterval(state.timerId);state.timerId=null}
function formatTime(sec){const m=String(Math.floor(sec/60)).padStart(2,'0'),s=String(sec%60).padStart(2,'0');return`${m}:${s}`}
function addCommand(cmd){if(state.running)return;state.program.push(cmd);renderProgram();playTone(720);toast(`เพิ่มคำสั่ง ${labelFor(cmd)} แล้ว`,'success')}
function labelFor(cmd){return({MOVE:'☝️ MOVE',RIGHT:'✌️ RIGHT',LEFT:'🤟 LEFT',STOP:'✊ STOP',REPEAT2:'🔁 REPEAT ×2',REPEAT3:'🔁 REPEAT ×3',IF_RED_LEFT:'🔴 IF RED → LEFT',IF_BLUE_RIGHT:'🔵 IF BLUE → RIGHT'})[cmd]||cmd}
function renderProgram(errorIndex=-1){
  const q=$('programQueue'); if(!state.program.length){q.innerHTML='<span style="color:#8a8eae">ยังไม่มีคำสั่ง — เลือกปุ่มด้านล่างได้เลย</span>'}else{q.innerHTML=state.program.map((c,i)=>`<div class="queue-item ${i===errorIndex?'error':''}"><span class="num">${i+1}</span><b>${labelFor(c)}</b></div>`).join('')}
  $('commandCount').textContent=`${state.program.length} คำสั่ง`;updateTestPanel();
}
function buildExecution(program){
  const out=[];
  for(let i=0;i<program.length;i++){
    const c=program[i];
    if(c==='REPEAT2'||c==='REPEAT3'){const times=c==='REPEAT2'?2:3; const next=program[i+1]; if(next){for(let t=0;t<times;t++)out.push({cmd:next,index:i,source:`${c}+${next}`});i++;}continue}
    out.push({cmd:c,index:i,source:c});
  }
  return out;
}
function simulate(){
  const level=state.level; const r={...level.start}; const exec=buildExecution(state.program); const steps=[];
  for(let k=0;k<exec.length;k++){
    const step=exec[k],cmd=step.cmd;
    if(cmd==='STOP'){steps.push({index:step.index,cmd,status:'stop'});break;}
    if(cmd==='RIGHT'){r.dir=(r.dir+1)%4;steps.push({index:step.index,cmd,status:'ok',x:r.x,y:r.y,dir:r.dir});continue}
    if(cmd==='LEFT'){r.dir=(r.dir+3)%4;steps.push({index:step.index,cmd,status:'ok',x:r.x,y:r.y,dir:r.dir});continue}
    if(cmd==='IF_RED_LEFT'||cmd==='IF_BLUE_RIGHT'){
      const color=cmd==='IF_RED_LEFT'?'red':'blue';const marker=level.markers.find(m=>m.x===r.x&&m.y===r.y&&m.color===color); if(marker)r.dir=(r.dir+(color==='red'?3:1))%4; steps.push({index:step.index,cmd,status:marker?'condition-true':'condition-skip',x:r.x,y:r.y,dir:r.dir});continue
    }
    if(cmd==='MOVE'){
      const d=DIRS[r.dir],nx=r.x+d.x,ny=r.y+d.y;
      if(nx<0||ny<0||nx>=level.grid.w||ny>=level.grid.h) return{success:false,errorIndex:step.index,errorReason:'Robot ออกนอกพื้นที่',steps,robot:{...r}};
      if(level.obstacles.some(o=>o.x===nx&&o.y===ny)) return{success:false,errorIndex:step.index,errorReason:'Robot ชนกำแพง',steps,robot:{...r}};
      r.x=nx;r.y=ny;steps.push({index:step.index,cmd,status:'move',x:r.x,y:r.y,dir:r.dir});
      if(r.x===level.goal.x&&r.y===level.goal.y)return{success:true,errorIndex:-1,errorReason:'ถึงเป้าหมาย',steps,robot:{...r}};
    }
  }
  const success=r.x===level.goal.x&&r.y===level.goal.y;
  return{success,errorIndex:success?-1:(exec.at(-1)?.index??Math.max(0,state.program.length-1)),errorReason:success?'ถึงเป้าหมาย':'ยังไม่ถึงเป้าหมาย',steps,robot:{...r}};
}
async function runProgram(){
  if(state.running||!state.level)return;
  if(!state.program.length){toast('ยังไม่มีคำสั่ง ลองเพิ่ม MOVE ก่อน');return}
  state.running=true; state.failedRun=false; toast('กำลังทำตาม Algorithm…');playTone(800,.06);
  const result=simulate(); await animateExecution(result); state.running=false;
  if(result.success){finishLevel(true,result)}else{state.failedRun=true;state.score=Math.max(0,state.score-SCORE.fail);saveSave();finishLevel(false,result)}
}
async function animateExecution(result){
  const steps=result.steps; for(let i=0;i<steps.length;i++){const s=steps[i];state.robot={x:s.x??state.robot.x,y:s.y??state.robot.y,dir:s.dir??state.robot.dir};drawGame(s.index===result.errorIndex?-1:-2);await sleep(180)}
}
function finishLevel(success,result={}){
  if(success){playTone(950,.2);state.robot=result.robot||{...state.level.goal,dir:state.robot?.dir||0};
    const already=localStorage.getItem(`hca-complete-${state.level.id}`)==='1'; if(!already){state.score+=SCORE.success;state.coins+=10;state.stars+=1;localStorage.setItem(`hca-complete-${state.level.id}`,'1');const prev=Number(localStorage.getItem(`hca-stars-${state.level.id}`)||0);localStorage.setItem(`hca-stars-${state.level.id}`,String(Math.min(3,Math.max(prev,3))))} renderResult(true,result);
  }else{playTone(180,.15,'square');renderProgram(result.errorIndex);const reason=result.errorReason||'ยังไม่ถึงเป้าหมาย';toast(`${reason} • -${SCORE.fail} คะแนน`,'error');drawGame(result.errorIndex)}
}
function renderResult(success,result){stopTimer();$('resultEmoji').textContent=success?'🎉':'🔧';$('resultTitle').textContent=success?'ภารกิจสำเร็จ!':'ยังไม่ถึงเป้าหมาย';$('resultMessage').textContent=success?'Robot ถึงดาวแล้ว!':'ลองแก้ Algorithm แล้วกลับมา RUN ใหม่';$('resultScore').textContent=state.score;$('resultStars').textContent=state.stars;$('resultCoins').textContent=state.coins;$('resultCommands').textContent=state.program.length;$('nextLevelBtn').style.display=success&&state.levelIndex<GAME_LEVELS.length-1?'block':'none';setScreen('screenResult');}
function nextLevel(){if(state.levelIndex<GAME_LEVELS.length-1)startLevel(state.levelIndex+1);else{renderLevels();setScreen('screenLevels')}}
function resetLevel(){if(!state.level)return;state.program=[];state.robot={...state.level.start};state.failedRun=false;renderProgram();drawGame();toast('รีเซ็ตด่านแล้ว')}
function useHint(){if(state.running)return;state.score=Math.max(0,state.score-SCORE.hint);saveSave();const l=state.level;if(!l)return;let hint='ลองวางแผนเส้นทางทีละช่วง'; if(l.id===5||l.id===6)hint='ด่านนี้ลองใช้ REPEAT ช่วยลดการกดคำสั่งซ้ำ'; if(l.id===4||l.id===7||l.id===10)hint='มองหา Marker สีแดง/น้ำเงินก่อนใช้ IF'; if(l.id===8)hint='ดูคำสั่งที่ทำให้ Robot หันผิดทิศ';toast(`💡 ${hint} • -${SCORE.hint} คะแนน`);}

function drawGame(errorIndex=-1){
  const c=$('gameCanvas'),ctx=c.getContext('2d'),W=c.width,H=c.height,l=state.level;if(!l)return;
  ctx.clearRect(0,0,W,H);const pad=26,cw=(W-pad*2)/l.grid.w,ch=(H-pad*2)/l.grid.h;ctx.fillStyle='#eaf3ff';ctx.fillRect(0,0,W,H);
  for(let y=0;y<l.grid.h;y++)for(let x=0;x<l.grid.w;x++){ctx.fillStyle=(x+y)%2===0?'#f7fbff':'#eef6ff';ctx.fillRect(pad+x*cw,pad+y*ch,cw-2,ch-2)}
  for(const o of l.obstacles){ctx.fillStyle='#6b7280';ctx.fillRect(pad+o.x*cw+5,pad+o.y*ch+5,cw-12,ch-12);ctx.fillStyle='#9ca3af';ctx.fillRect(pad+o.x*cw+10,pad+o.y*ch+10,cw-22,ch-22)}
  for(const m of l.markers){ctx.fillStyle=m.color==='red'?'#ff7b7b':'#62b7ff';ctx.beginPath();ctx.arc(pad+m.x*cw+cw/2,pad+m.y*ch+ch/2,Math.min(cw,ch)*.22,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='700 16px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(m.color==='red'?'R':'B',pad+m.x*cw+cw/2,pad+m.y*ch+ch/2)}
  ctx.font=`${Math.min(cw,ch)*.42}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⭐',pad+l.goal.x*cw+cw/2,pad+l.goal.y*ch+ch/2);
  const r=state.robot||l.start;ctx.save();ctx.translate(pad+r.x*cw+cw/2,pad+r.y*ch+ch/2);ctx.rotate(r.dir*Math.PI/2);ctx.font=`${Math.min(cw,ch)*.42}px sans-serif`;ctx.fillText('🤖',0,0);ctx.restore();
  if(state.showCursor&&state.hand.cursor&&state.hand.ready){ctx.fillStyle='#6c63ff';ctx.beginPath();ctx.arc(state.hand.cursor.x*W,state.hand.cursor.y*H,8,0,Math.PI*2);ctx.fill()}
  if(errorIndex>=0){const qi=Math.min(errorIndex,state.program.length-1);if(qi>=0){ctx.strokeStyle='#ef4444';ctx.lineWidth=5;ctx.strokeRect(8,H-40,200,28)}}
  updateTestPanel();
}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function onKey(e){
  if(e.key==='F9'){e.preventDefault();toggleTestPanel();return}
  if(state.screen!=='game'||state.running)return;
  const k=e.key.toLowerCase(); if(e.key==='ArrowUp'||k==='w')addCommand('MOVE'); if(e.key==='ArrowRight'||k==='d')addCommand('RIGHT'); if(e.key==='ArrowLeft'||k==='a')addCommand('LEFT'); if(e.key===' '){e.preventDefault();addCommand('STOP')} if(e.key==='Enter')runProgram();
}
function updateTeacherStats(){
  $('teacherStats').textContent=`ผู้เล่น: ${state.playerName}\nด่านที่ผ่าน: ${completedCount()}/${GAME_LEVELS.length}\nดาวรวม: ${state.stars}\nเหรียญ: ${state.coins}\nคะแนน: ${state.score}`;
}
function downloadProgress(){const blob=new Blob([JSON.stringify({player:state.playerName,score:state.score,stars:state.stars,coins:state.coins,completed:getProgress()},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='hand-code-adventure-progress.json';a.click();URL.revokeObjectURL(a.href)}
function resetProgress(){if(!confirm('ต้องการล้าง Progress หรือไม่?'))return;GAME_LEVELS.forEach(l=>{localStorage.removeItem(`hca-complete-${l.id}`);localStorage.removeItem(`hca-stars-${l.id}`)});state.score=0;state.stars=0;state.coins=0;saveSave();renderLevels();updateTeacherStats()}
function saveCustomLevel(){const title=$('customTitle').value.trim()||'ภารกิจครู';const objective=$('customObjective').value.trim()||'พา Robot ไปหา Goal';const concept=$('customConcept').value;const custom={id:900+state.customLevels.length,title,objective,concept};state.customLevels.push(custom);try{localStorage.setItem('hca-custom-levels',JSON.stringify(state.customLevels))}catch(e){}$('customMsg').textContent='บันทึกด่านตัวอย่างแล้ว (ต้นแบบ Teacher Mode)';$('customMsg').className='message success';$('customMsg').classList.remove('hidden');}
function updateShareUrl(){$('shareUrl').textContent=location.href}
function toggleTestPanel(){const p=$('testPanel');p.classList.toggle('hidden');updateTestPanel()}
function updateTestPanel(){const out=$('testOutput');if(!out)return;out.textContent=JSON.stringify({screen:state.screen,level:state.level?.id||null,robot:state.robot||null,dir:state.robot?DIR_NAMES[state.robot.dir]:'-',program:state.program,score:state.score,camera:state.camera.status,gesture:state.hand.gesture,confidence:state.hand.confidence,fps:'Browser dependent'},null,2)}
function updatePortrait(){const bad=matchMedia('(orientation: portrait) and (max-width: 760px)').matches;$('portraitOverlay').classList.toggle('hidden',!bad)}

window.addEventListener('beforeunload',()=>stopCamera());
loadSave();state.customLevels=JSON.parse(localStorage.getItem('hca-custom-levels')||'[]');
init();
