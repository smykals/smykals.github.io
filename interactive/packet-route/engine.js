/* Explicit turn state machine; usable without a browser or renderer. */
(function(root){
'use strict';
const C=PacketCore;
const STATES=Object.freeze({READY:'READY',AIMING:'AIMING',FIRING:'FIRING',RESOLVING_MATCH:'RESOLVING_MATCH',DROPPING_PACKETS:'DROPPING_PACKETS',ADDING_TRAFFIC:'ADDING_TRAFFIC',LEVEL_COMPLETE:'LEVEL_COMPLETE',NETWORK_SATURATED:'NETWORK_SATURATED',PAUSED:'PAUSED'});
const ACTIVE=new Set(['AIMING','FIRING','RESOLVING_MATCH','DROPPING_PACKETS','ADDING_TRAFFIC']);
class Engine{
 constructor({emit=()=>{},rng=Math.random,scoring={},congestion={}}={}){this.emit=()=>{};this.rng=rng;this.scoring={...C.SCORING,...scoring};this.congestion={...C.CONGESTION,...congestion};this.start(1);this.state=STATES.READY;this.emit=emit;}
 start(level=this.level){this.level=level;this.config=PacketLevels.get(level);this.board=PacketLevels.build(this.config);this.parity=0;this.offset=0;this.state=STATES.AIMING;this.resumeState=null;this.shot=null;this.pending=null;this.timer=0;this.elapsed=0;this.score=0;this.streak=0;this.routed=0;this.dropped=0;this.shots=0;this.hits=0;this.bonus=0;this.trafficRows=0;this.turnsSinceTraffic=0;this.allowance=this.config.allowance;this.current=C.pick(this.board,this.rng);this.next=C.pick(this.board,this.rng);this.emit('start');}
 swap(){if(this.state!==STATES.AIMING)return false;[this.current,this.next]=[this.next,this.current];this.emit('swap');return true;}
 fire(angle){if(this.state!==STATES.AIMING)return false;angle=Math.max(-Math.PI+.12,Math.min(-.12,angle));this.shot={...C.FIELD.origin,dx:Math.cos(angle),dy:Math.sin(angle),type:this.current};this.shots++;this.state=STATES.FIRING;this.emit('fire');return true;}
 preview(angle){return C.advance({...C.FIELD.origin,dx:Math.cos(angle),dy:Math.sin(angle),type:this.current},10000,this.board,this.parity);}
 pause(){if(this.state===STATES.PAUSED){this.state=this.resumeState;this.resumeState=null;return true;}if(!ACTIVE.has(this.state))return false;this.resumeState=this.state;this.state=STATES.PAUSED;return true;}
 update(dt){if(!ACTIVE.has(this.state))return;this.elapsed+=dt;
  if(this.state===STATES.FIRING){const move=C.advance(this.shot,C.FIELD.speed*dt,this.board,this.parity);this.shot=move.projectile;if(move.bounces)this.emit('wall');if(move.attached)this.attach(move.cell);return;}
  if(this.state===STATES.AIMING)return;
  this.timer=Math.max(0,this.timer-dt);
  if(this.state===STATES.ADDING_TRAFFIC)this.offset=-C.STEP*(this.timer/.4);
  if(this.timer>1e-7)return;
  if(this.state===STATES.RESOLVING_MATCH)this.drop();
  else if(this.state===STATES.DROPPING_PACKETS)this.scoreAndCongestion();
  else if(this.state===STATES.ADDING_TRAFFIC){this.offset=0;this.allowance=this.config.allowance;this.turnsSinceTraffic=0;this.finishTurn();}
 }
 attach(cell){if(!cell){this.end(false);return;}const p={...cell,type:this.shot.type};this.board.set(C.key(p.r,p.c),p);this.shot=null;const group=C.cluster(this.board,C.key(p.r,p.c),true,this.parity);const matched=group.length>=3?group.map(k=>this.board.get(k)):[];this.pending={matched,fallen:[],at:C.point(p.r,p.c,0,this.parity)};for(const q of matched)this.board.delete(C.key(q.r,q.c));this.state=STATES.RESOLVING_MATCH;this.timer=matched.length?.28:.12;if(matched.length)this.emit('route',{packets:matched,at:this.pending.at});}
 drop(){if(this.pending.matched.length){this.pending.fallen=C.unsupported(this.board,this.parity);for(const p of this.pending.fallen)this.board.delete(C.key(p.r,p.c));}this.state=STATES.DROPPING_PACKETS;this.timer=this.pending.fallen.length?1.3:0;if(this.pending.fallen.length)this.emit('drop',{packets:this.pending.fallen});if(!this.timer)this.scoreAndCongestion();}
 scoreAndCongestion(){const {matched,fallen,at}=this.pending;this.streak=matched.length?this.streak+1:0;if(matched.length)this.hits++;this.routed+=matched.length;this.dropped+=fallen.length;const points=C.scoreTurn(matched.length,fallen.length,this.streak,this.scoring);this.score+=points.total;if(points.total)this.emit('score',{...points,at,matched:matched.length,fallen:fallen.length,streak:this.streak});
  if(!this.board.size){this.bonus=this.scoring.clear+Math.round(this.accuracy*this.scoring.accuracy)+this.allowance*this.scoring.remainingAllowance;this.score+=this.bonus;this.end(true);return;}
  this.turnsSinceTraffic++;this.allowance=C.allowanceAfter(this.allowance,matched.length,this.config.allowance,this.congestion);
  if(this.allowance===0||this.turnsSinceTraffic>=this.config.advanceEvery){const added=C.insertRow(this.board,this.parity,PacketLevels.traffic(this.config,this.trafficRows++));this.board=added.board;this.parity=added.parity;this.offset=-C.STEP;this.timer=.4;this.state=STATES.ADDING_TRAFFIC;this.emit('traffic');return;}
  this.finishTurn();
 }
 finishTurn(){if([...this.board.values()].some(p=>C.point(p.r,p.c,0,this.parity).y+C.R>=C.FIELD.danger)){this.end(false);return;}const available=C.pool(this.board);this.current=available.includes(this.next)?this.next:C.pick(this.board,this.rng);this.next=C.pick(this.board,this.rng);this.pending=null;this.state=STATES.AIMING;this.emit('ready');}
 end(clear){this.shot=null;this.pending=null;this.state=clear?STATES.LEVEL_COMPLETE:STATES.NETWORK_SATURATED;this.emit(clear?'complete':'saturated');}
 get accuracy(){return this.shots?this.hits/this.shots:0;}
}
root.PacketEngine=Engine;root.PacketStates=STATES;
})(globalThis);

