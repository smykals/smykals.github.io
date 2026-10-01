/* Geometry and rules. No DOM, timers, audio, or rendering dependencies. */
(function(root){
'use strict';
const R=22,STEP=Math.sqrt(3)*R,COLS=13,LEFT=45,TOP=35;
const FIELD={width:640,height:760,left:23,right:617,danger:635,origin:{x:320,y:704},speed:850};
const TYPES=[
 {id:'https',label:'HTTPS',glyph:'H',name:'Web traffic',color:'#45d5d0'},
 {id:'dns',label:'DNS',glyph:'D',name:'Name service',color:'#b995ff'},
 {id:'voip',label:'VoIP',glyph:'V',name:'Voice traffic',color:'#ffbb66'},
 {id:'management',label:'MGMT',glyph:'M',name:'Management',color:'#fa799d'},
 {id:'storage',label:'STORE',glyph:'S',name:'Storage',color:'#80b6ff'},
 {id:'streaming',label:'STREAM',glyph:'▶',name:'Media streaming',color:'#b4de74'}
];
const SCORING={routed:100,dropped:200,extraMatch:50,largeDrop:75,largeDropThreshold:3,streakStep:.25,maxStreakBonus:2.25,clear:1000,accuracy:1000,remainingAllowance:100};
const CONGESTION={missCost:1,matchRestore:0,restoreThreshold:5};
const key=(r,c)=>r+','+c;
const valid=(r,c)=>Number.isInteger(r)&&Number.isInteger(c)&&r>=0&&c>=0&&c<COLS;
function point(r,c,offset=0,parity=0){return{x:LEFT+c*R*2+((r+parity)%2?R:0),y:TOP+r*STEP+offset};}
function adjacent(r,c,parity=0){const d=(r+parity)%2?1:-1;return[[r,c-1],[r,c+1],[r-1,c],[r-1,c+d],[r+1,c],[r+1,c+d]].filter(([a,b])=>valid(a,b));}
function cluster(board,start,same=true,parity=0){const seen=new Set(),stack=[start],type=board.get(start)?.type;while(stack.length){const k=stack.pop(),p=board.get(k);if(!p||seen.has(k)||(same&&p.type!==type))continue;seen.add(k);for(const[r,c]of adjacent(p.r,p.c,parity))stack.push(key(r,c));}return [...seen];}
function unsupported(board,parity=0){const seen=new Set(),stack=[...board].filter(([,p])=>p.r===0).map(([k])=>k);while(stack.length){const k=stack.pop(),p=board.get(k);if(!p||seen.has(k))continue;seen.add(k);for(const[r,c]of adjacent(p.r,p.c,parity))stack.push(key(r,c));}return [...board].filter(([k])=>!seen.has(k)).map(([,p])=>p);}
function snap(board,x,y,offset=0,hit=null,parity=0){const cells=hit?adjacent(hit.r,hit.c,parity):Array.from({length:COLS},(_,c)=>[0,c]);let best=null,distance=Infinity;for(const[r,c]of cells){if(board.has(key(r,c)))continue;const p=point(r,c,offset,parity),d=(p.x-x)**2+(p.y-y)**2;if(d<distance){distance=d;best={r,c};}}return best;}
function scoreTurn(matches,drops,streak,config=SCORING){const routed=matches*config.routed,dropped=drops*config.dropped,matchBonus=Math.max(0,matches-3)*config.extraMatch,dropBonus=Math.max(0,drops-config.largeDropThreshold)*config.largeDrop;const base=routed+dropped+matchBonus+dropBonus,comboBonus=Math.round(base*Math.min(Math.max(0,streak-1)*config.streakStep,config.maxStreakBonus));return{routed,dropped,matchBonus,dropBonus,comboBonus,total:base+comboBonus};}
function allowanceAfter(remaining,matches,limit,rule=CONGESTION){return matches>=3?Math.min(limit,remaining+(matches>=rule.restoreThreshold?rule.matchRestore:0)):Math.max(0,remaining-rule.missCost);}
function pool(board){return [...new Set([...board.values()].map(p=>p.type))];}
function pick(board,rng=Math.random){const types=pool(board);return types.length?types[Math.floor(rng()*types.length)]:null;}
function insertRow(board,parity,types){const shifted=new Map();for(const p of board.values()){const copy={...p,r:p.r+1};shifted.set(key(copy.r,copy.c),copy);}types.forEach((type,c)=>shifted.set(key(0,c),{r:0,c,type}));return{board:shifted,parity:1-parity};}
// Exact ray/circle intersection. Preview and moving projectile share this solver.
function advance(projectile,distance,board,parity=0){const p={...projectile},path=[{x:p.x,y:p.y}],epsilon=1e-7;let bounces=0;
 for(let guard=0;distance>epsilon&&guard<100;guard++){
  let travel=distance,kind=null,hit=null;
  const wall=p.dx>0?(FIELD.right-R-p.x)/p.dx:p.dx<0?(FIELD.left+R-p.x)/p.dx:Infinity;
  if(wall>=-epsilon&&wall<=travel){travel=Math.max(0,wall);kind='wall';}
  const ceiling=p.dy<0?(TOP-p.y)/p.dy:Infinity;
  if(ceiling>=-epsilon&&ceiling<=travel){travel=Math.max(0,ceiling);kind='ceiling';}
  for(const q of board.values()){
   const v=point(q.r,q.c,0,parity),ox=p.x-v.x,oy=p.y-v.y,b=ox*p.dx+oy*p.dy,c=ox*ox+oy*oy-(R*2)**2,disc=b*b-c;
   if(disc<0||b>0)continue;const t=c<=0?0:-b-Math.sqrt(disc);
   if(t>=-epsilon&&t<=travel){travel=Math.max(0,t);kind='packet';hit=q;}
  }
  p.x+=p.dx*travel;p.y+=p.dy*travel;distance-=travel;path.push({x:p.x,y:p.y});
  if(kind==='packet'||kind==='ceiling')return{projectile:p,path,bounces,attached:true,cell:snap(board,p.x,p.y,0,hit,parity)};
  if(kind==='wall'){p.dx=-p.dx;bounces++;}else break;
 }
 return{projectile:p,path,bounces,attached:false};
}
root.PacketCore={R,STEP,COLS,LEFT,TOP,FIELD,TYPES,SCORING,CONGESTION,key,valid,point,adjacent,cluster,unsupported,snap,scoreTurn,allowanceAfter,pool,pick,insertRow,advance};
})(globalThis);
