/* Deterministic, validated layouts: small color groups instead of large stripes. */
(function(root){
'use strict';
const configs=[
 {name:'First connection',types:4,rows:6,allowance:4,advanceEvery:8},
 {name:'Branch office',types:4,rows:7,allowance:4,advanceEvery:7},
 {name:'Traffic exchange',types:5,rows:7,allowance:3,advanceEvery:7},
 {name:'Core switch',types:5,rows:8,allowance:3,advanceEvery:6},
 {name:'Storage fabric',types:6,rows:8,allowance:3,advanceEvery:6},
 {name:'Full spectrum',types:6,rows:9,allowance:3,advanceEvery:5}
];
function random(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function generate(config,seed){const C=PacketCore,rng=random(seed),board=new Map();for(let r=0;r<config.rows;r++)for(let c=0;c<C.COLS;c++){
 const options=Array.from({length:config.types},(_,type)=>({type,rank:rng()})).sort((a,b)=>a.rank-b.rank).map(p=>p.type);
 // Some pairs give deliberate matching opportunities, but never large premade groups.
 const left=board.get(C.key(r,c-1));if(left&&rng()<.35){options.splice(options.indexOf(left.type),1);options.unshift(left.type);}
 let selected=false;for(const type of options){board.set(C.key(r,c),{r,c,type});if(C.cluster(board,C.key(r,c)).length<=3){selected=true;break;}}
 if(!selected)return null;
 }return [...Array(config.rows)].map((_,r)=>[...Array(C.COLS)].map((_,c)=>board.get(C.key(r,c)).type).join(''));}
function get(level){const base=configs[Math.min(configs.length-1,Math.max(0,level-1))],config={...base,number:level};for(let attempt=0;attempt<100;attempt++){config.layout=generate(config,level*7919+attempt*101);if(!config.layout)continue;try{build(config);return config;}catch(_){}}throw Error('Could not construct a valid level');}
function validate(board,config){const C=PacketCore;if(!board.size)throw Error('Level must contain packets');for(const[k,p]of board){if(!C.valid(p.r,p.c)||k!==C.key(p.r,p.c)||!Number.isInteger(p.type)||p.type<0||p.type>=config.types)throw Error('Invalid packet in level');if(C.point(p.r,p.c).y+C.R>=C.FIELD.danger)throw Error('Level starts saturated');}if(C.unsupported(board).length)throw Error('Level contains unsupported packets');for(const type of C.pool(board)){const members=[...board.values()].filter(p=>p.type===type);if(members.length<3||!members.some(p=>C.cluster(board,C.key(p.r,p.c)).length>=2))throw Error('Traffic needs a starting pair');}return board;}
function build(config){const board=new Map();config.layout.forEach((row,r)=>{if(row.length!==PacketCore.COLS)throw Error('Layout width must be 13');[...row].forEach((v,c)=>{if(v!=='.')board.set(PacketCore.key(r,c),{r,c,type:Number(v)});});});return validate(board,config);}
function traffic(config,turn){const rng=random(config.number*3571+turn*103+41),row=[];for(let c=0;c<PacketCore.COLS;c++){const choices=Array.from({length:config.types},(_,i)=>i).filter(t=>!(c>1&&row[c-1]===t&&row[c-2]===t));row.push(choices[Math.floor(rng()*choices.length)]);}return row;}
root.PacketLevels={configs,get,validate,build,traffic};
})(globalThis);
