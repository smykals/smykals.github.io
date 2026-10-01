(function (root) {
  'use strict';
  const groups = {
    device: [['router','Router','⌘','DEVICE DISCOVERED'],['switch','Switch','⇄','INFRASTRUCTURE DISCOVERED'],['server','Server','▤','HOST ONLINE'],['laptop','Laptop','▱','HOST ONLINE'],['printer','Printer','▣','DEVICE DISCOVERED'],['nas','NAS','▥','STORAGE DISCOVERED'],['ap','Access Point','◉','WIRELESS NODE FOUND'],['firewall','Firewall','▦','SECURITY DEVICE DETECTED']],
    service: [['dns','DNS','◎','SERVICE DETECTED'],['dhcp','DHCP','⇥','ADDRESS ASSIGNED'],['http','HTTP','↗','WEB TRAFFIC DETECTED'],['https','HTTPS','◆','SECURE TRAFFIC DETECTED'],['ssh','SSH','>_','SECURE SHELL DETECTED'],['rdp','RDP','▧','REMOTE SESSION FOUND'],['icmp','ICMP','↔','CONTROL MESSAGE RECEIVED'],['ftp','FTP','⇅','FILE TRANSFER DETECTED']],
    network: [['vlan','VLAN','⊞','VIRTUAL NETWORK FOUND'],['vpn','VPN','⛨','SECURE TUNNEL DETECTED'],['gateway','Gateway','⋈','GATEWAY DISCOVERED'],['ipv4','IPv4','v4','ADDRESS DETECTED'],['ipv6','IPv6','v6','ADDRESS DETECTED'],['ethernet','Ethernet','⌁','WIRED LINK DETECTED'],['wifi','Wi-Fi','◔','WIRELESS NETWORK DETECTED'],['packet','Packet','◇','PACKET RECEIVED'],['ping','Ping','⌖','ICMP RESPONSE RECEIVED']],
    system: [['linux','Linux','λ','SYSTEM DISCOVERED'],['windows','Windows','⊞','SYSTEM DISCOVERED'],['cloud','Cloud','☁','CLOUD CONNECTED'],['database','Database','▰','DATABASE ONLINE'],['iot','IoT','⬡','SMART DEVICE FOUND'],['voip','VoIP','☎','VOICE TRAFFIC DETECTED']]
  };
  const items = Object.entries(groups).flatMap(([category, rows]) => rows.map(([id,name,icon,eventMessage]) => ({id,name,icon,eventMessage,category})));
  const scoring = { correct:100, quickMax:50, quickWindow:8000, line:1000, combo:500, perfect:500 };
  const difficulties = { easy:{interval:12000,penalty:0,pool:items.filter(x=>!['icmp','ftp','ipv6','rdp','vlan','nas','voip'].includes(x.id))}, normal:{interval:8000,penalty:25,pool:items}, hard:{interval:4500,penalty:50,pool:items} };
  function shuffle(array, random=Math.random) { const out=[...array]; for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out; }
  function makeCard(pool, random) { const card=shuffle(pool,random).slice(0,24).map(x=>({...x}));card.splice(12,0,{id:'free',name:'LOCALHOST',icon:'⌘',category:'free'});for(let c=0;c<5;c++){const nums=shuffle(Array.from({length:15},(_,i)=>c*15+i+1),random);for(let r=0;r<5;r++)if(r*5+c!==12)card[r*5+c].number=nums[r];}return card; }
  const cardKey = card => card.map(item=>item.id).join('|');
  function freshCard(pool, seen) {
    const card=makeCard(pool);
    // Resolve even a repeated random shuffle without reusing a dealt layout.
    const slots=Array.from({length:25},(_,i)=>i).filter(i=>i!==12);
    while(seen.has(cardKey(card))) {
      let i=slots.length-2;
      while(i>=0 && card[slots[i]].id>=card[slots[i+1]].id)i--;
      if(i<0) { const sorted=slots.map(s=>card[s]).sort((a,b)=>a.id<b.id?-1:1);slots.forEach((s,n)=>card[s]=sorted[n]); }
      else { let j=slots.length-1;while(card[slots[j]].id<=card[slots[i]].id)j--;[card[slots[i]],card[slots[j]]]=[card[slots[j]],card[slots[i]]];let l=i+1,r=slots.length-1;while(l<r){[card[slots[l]],card[slots[r]]]=[card[slots[r]],card[slots[l]]];l++;r--;} }
    }
    for(let c=0;c<5;c++){const nums=shuffle(Array.from({length:15},(_,i)=>c*15+i+1));for(let r=0;r<5;r++)if(r*5+c!==12)card[r*5+c].number=nums[r];}
    seen.add(cardKey(card));return card;
  }
  function advanceNetwork(s, seen) {
    if(!s.won)return s;
    const next=createState(s.level,freshCard(difficulties[s.level].pool,seen),Number(s.network)+1);
    for(const key of ['score','totalBingos','bestCombo','highestMultiplier','correct','mistakes'])next[key]=s[key];
    return next;
  }
  const lines = [...Array.from({length:5},(_,r)=>Array.from({length:5},(_,c)=>r*5+c)),...Array.from({length:5},(_,c)=>Array.from({length:5},(_,r)=>r*5+c)),[0,6,12,18,24],[4,8,12,16,20]];
  function winningLines(card, marked) { return lines.filter(line=>line.every(index=>marked.has(card[index].id))); }
  const patterns={corners:[0,4,20,24],cross:[2,7,10,11,12,13,14,17,22],diamond:[2,6,8,10,12,14,16,18,22]};
  function levelConfig(n,profile='normal') {
    n=Math.max(1,Number(n));
    const intro=[
      {type:'STANDARD',bingos:1}, {type:'DOUBLE BINGO',bingos:2},
      {type:'PATTERN',diagonal:true}, {type:'INTERSECTION',intersection:true},
      {type:'CHALLENGE',pattern:'corners',bingos:1},
      {type:'SCORE ATTACK',target:6500}, {type:'COMBO',combo:4,bingos:1},
      {type:'DOUBLE BINGO',bingos:3}, {type:'PATTERN',pattern:'cross'},
      {type:'MAJOR CHALLENGE',pattern:'diamond',bingos:2},
      {type:'BLACKOUT',blackout:true}, {type:'SPECIAL CHALLENGE',target:16000,bingos:3,multiplier:4}
    ];
    const tier=Math.floor((n-13)/6);
    const endless=[{type:'STANDARD',bingos:Math.min(8,3+tier)}, {type:'SCORE ATTACK',target:Math.min(28000,17000+tier*1500)}, {type:'PATTERN',pattern:'diamond',bingos:Math.min(6,2+tier)}, {type:'INTERSECTION',intersection:true,bingos:Math.min(8,3+tier)}, {type:'COMBO',combo:Math.min(24,5+tier),bingos:3}, {type:'BLACKOUT',blackout:true}];
    const config={...(intro[n-1]||endless[(n-13)%6]),number:n,bonus:1000+n*750,interval:Math.max(1800,difficulties[profile].interval*Math.pow(.96,n-1)),multiplierCap:n<3?1:Math.min(8,2+Math.floor(n/2)),powerEvery:n<4?0:n<7?4:Math.min(8,5+Math.floor(n/10)),timeLimit:n>=10&&n%5===0?Math.max(180000,360000-(n-10)*3000):0};
    config.unlock=({1:'Basic BINGO + scoring',2:'3-square chain bonuses',3:'Score multipliers',4:'Double power daubs',5:'First challenge level',6:'Intersection bonuses',7:'Burst power daubs',10:'Advanced patterns'})[n]||'';
    const goals=[];
    if(config.target)goals.push(`Score ${config.target.toLocaleString()} this level`);
    if(config.bingos)goals.push(`Complete ${config.bingos} BINGO${config.bingos>1?'s':''}`);
    if(config.diagonal)goals.push('Complete a diagonal BINGO');
    if(config.intersection)goals.push('Complete two intersecting BINGOs');
    if(config.pattern)goals.push(`Mark the ${config.pattern} pattern`);
    if(config.combo)goals.push(`Build a ${config.combo}-daub combo`);
    if(config.multiplier)goals.push(`Reach x${config.multiplier}`);
    if(config.blackout)goals.push('Mark the entire card');
    config.description=goals.join(' AND ');return config;
  }
  function createState(level='normal',card=null,network=1) {
    card=card||makeCard(difficulties[level].pool);
    const onCard=new Map(card.filter(x=>x.id!=='free').map(x=>[x.id,x]));
    const used=new Set(card.filter(x=>x.id!=='free').map(x=>x.number));
    const spare=shuffle(Array.from({length:75},(_,i)=>i+1).filter(x=>!used.has(x)));
    const calls=difficulties[level].pool.map(x=>onCard.get(x.id)||{...x,number:spare.pop()});
    const deck=shuffle([...calls,...spare.map(number=>({id:'signal-'+number,number,name:'Network signal',icon:'◇',category:'network',eventMessage:'PACKET RECEIVED'}))]);
    return {level,network,config:levelConfig(network,level),card,deck,marked:new Set(['free']),called:new Map(),history:[],current:null,score:0,levelScore:0,correct:0,mistakes:0,levelMistakes:0,elapsed:0,started:false,paused:false,won:false,failed:false,routes:[],totalBingos:0,combo:0,bestCombo:0,levelBestCombo:0,multiplier:1,highestMultiplier:1,levelHighestMultiplier:1,powers:new Map(),chains:new Set(),intersections:0,bonus:0};
  }
  function callNext(s) { if(s.won||s.failed||s.paused||!s.deck.length)return null; const item=s.deck.pop();s.started=true;s.current=item;s.called.set(item.id,s.elapsed);s.history.unshift(item);return item; }
  function objectiveProgress(s) {
    const c=s.config,parts=[];
    const add=(label,value,target)=>parts.push({label,value,target,done:value>=target});
    if(c.target)add('Level score',s.levelScore,c.target);
    if(c.bingos)add('BINGOs',s.routes.length,c.bingos);
    if(c.diagonal)add('Diagonal BINGO',s.routes.some(r=>r===lines[10]||r===lines[11])?1:0,1);
    if(c.intersection)add('Intersecting lines',s.intersections?1:0,1);
    if(c.pattern)add(c.pattern+' squares',patterns[c.pattern].filter(i=>s.marked.has(s.card[i].id)).length,patterns[c.pattern].length);
    if(c.combo)add('Best combo',s.levelBestCombo,c.combo);
    if(c.multiplier)add('Highest multiplier',s.levelHighestMultiplier,c.multiplier);
    if(c.blackout)add('Marked squares',s.marked.size,25);
    return parts;
  }
  function checkOutcome(s) {
    if(s.won||s.failed)return;
    if(objectiveProgress(s).every(p=>p.done)){s.won=true;s.bonus=s.config.bonus+(s.levelMistakes===0?scoring.perfect:0);s.score+=s.bonus;return;}
    const exhausted=!s.deck.length&&!s.card.some(x=>s.called.has(x.id)&&!s.marked.has(x.id));
    if(exhausted||(s.config.timeLimit&&s.elapsed>=s.config.timeLimit)){s.failed=true;s.failureReason=exhausted?'All calls used before the objective was met.':'Challenge timer expired.';}
  }
  function select(s,id) {
    if(s.won||s.failed||s.paused||!s.started||s.marked.has(id))return {kind:'ignored'};
    if(!s.card.some(x=>x.id===id)||!s.called.has(id)){s.mistakes++;s.levelMistakes++;s.combo=0;s.multiplier=1;const penalty=Math.min(s.score,difficulties[s.level].penalty);s.score-=penalty;s.levelScore=Math.max(0,s.levelScore-penalty);return {kind:'invalid',points:-penalty};}
    const events=[],oldRoutes=s.routes;
    const award=(label,base)=>{const points=base*s.multiplier;s.score+=points;s.levelScore+=points;events.push({label,points});};
    s.marked.add(id);s.correct++;s.combo++;s.bestCombo=Math.max(s.bestCombo,s.combo);s.levelBestCombo=Math.max(s.levelBestCombo,s.combo);
    award('DAUB',scoring.correct+Math.max(0,Math.round(scoring.quickMax*(1-(s.elapsed-s.called.get(id))/scoring.quickWindow))));
    if(s.powers.has(id)){const power=s.powers.get(id);s.powers.delete(id);award(power==='double'?'DOUBLE DAUB':'BURST DAUB',power==='double'?250:100*s.card.filter((x,i)=>s.marked.has(x.id)&&Math.abs(i%5-s.card.findIndex(x=>x.id===id)%5)<=1&&Math.abs(Math.floor(i/5)-Math.floor(s.card.findIndex(x=>x.id===id)/5))<=1).length);}
    if(s.network>=2)for(let l=0;l<lines.length;l++)for(let start=0;start<3;start++){const segment=lines[l].slice(start,start+3),key=l+':'+start;if(!s.chains.has(key)&&segment.every(i=>s.marked.has(s.card[i].id))){s.chains.add(key);award('3 CHAIN',250);}}
    s.routes=winningLines(s.card,s.marked);const fresh=s.routes.filter(r=>!oldRoutes.includes(r));
    fresh.forEach(()=>award('BINGO!',scoring.line));s.totalBingos+=fresh.length;
    if(fresh.length>1)award(`${fresh.length} BINGOs!`,scoring.combo*(fresh.length-1));
    let crossings=0;for(let a=0;a<s.routes.length;a++)for(let b=a+1;b<s.routes.length;b++)if(s.routes[a].some(i=>s.routes[b].includes(i)))crossings++;
    if(s.network>=6&&crossings>s.intersections)award('CROSSOVER',750*(crossings-s.intersections));s.intersections=crossings;
    if(s.network>=3&&(fresh.length||s.combo%3===0)){s.multiplier=Math.min(s.config.multiplierCap,s.multiplier+1);events.push({label:`x${s.multiplier} MULTIPLIER`,points:0});}
    s.highestMultiplier=Math.max(s.highestMultiplier,s.multiplier);s.levelHighestMultiplier=Math.max(s.levelHighestMultiplier,s.multiplier);
    if(s.config.powerEvery&&s.combo%s.config.powerEvery===0){const eligible=s.card.filter(x=>x.id!=='free'&&!s.marked.has(x.id)&&!s.powers.has(x.id));if(eligible.length){const candidate=eligible.find(x=>s.called.has(x.id))||eligible[0];s.powers.set(candidate.id,s.network>=7&&s.combo%2?'burst':'double');events.push({label:'POWER DAUB READY',points:0});}}
    const points=events.reduce((sum,e)=>sum+e.points,0);checkOutcome(s);return {kind:s.won?'win':'correct',points,events};
  }
  root.PacketBingo={items,scoring,difficulties,shuffle,makeCard,cardKey,freshCard,advanceNetwork,lines,winningLines,patterns,levelConfig,objectiveProgress,checkOutcome,createState,callNext,select};
})(typeof globalThis!=='undefined'?globalThis:this);
