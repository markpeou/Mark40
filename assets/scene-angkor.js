/* Option 1 scene: Angkor Wat at dawn across the north reflecting pool.
   Depth comes from layers: hazy far treeline, mid trees, the temple with light on its edges,
   mist at the base, the reflection, then dark reeds and lotus leaves in the foreground. */
window.SCENES = window.SCENES || {};
window.SCENES.angkor = function({f1, circ, rng, LEAF}){
  const G=330, W=338, RF=.85;
  const PALMS=[{x:92,y:146},{x:722,y:146}];

  function prang(x,base,h,w){
    // lotus-bud tower: stacked tiers that taper to a point
    const N=8, th=h*.88/N, f=t=>w*Math.pow(1-t*.93,.55)*(1+.1*t), left=[];
    for(let i=0;i<N;i++){ const y0=base-i*th, a=f(i/N), b=f((i+1)/N); left.push([x-a-1.3,y0],[x-a-1.3,y0-th*.32],[x-b,y0-th]) }
    const right=left.slice().reverse().map(([px,py])=>[2*x-px,py]);
    return 'M'+[...left,[x,base-h],...right].map(p=>f1(p[0])+' '+f1(p[1])).join('L')+'Z';
  }

  function art(P=''){
    const r=rng(11);
    const T=[[314,262,48,12],[350,258,56,14],[410,254,78,18],[470,258,56,14],[506,262,48,12]];
    const gal=(x0,x1,top)=>{ let s=`M${x0} ${G+1}V${top}H${x1}V${G+1}Z`; for(let x=x0+10;x<x1-4;x+=22) s+=`M${x-3} ${top}L${x} ${top-4}L${x+3} ${top}Z`; return s };
    // the central complex gets its own path so its edges can catch the light
    let core=`M256 ${G+1}V292H572V${G+1}Z M280 292V280H548V292Z M300 280V270H528V280Z`;
    core+='M376 271V264L382 259L388 264V271Z M432 271V264L438 259L444 264V271Z';
    core+=`M186 ${G+1}V270H190V262H195V255H200V249H214V255H219V262H224V270H228V${G+1}Z`;
    T.forEach(([x,b,h,w])=>{ core+=`M${x-w*1.6} 271V${b+6}H${x-w*1.25}V${b}H${x+w*1.25}V${b+6}H${x+w*1.6}V271Z`+prang(x,b,h,w) });
    let d=gal(-200,258,302)+gal(570,1000,302)+gal(640,668,290);
    [[140,322,10],[160,318,8],[250,320,9],[300,324,7],[330,322,11],[372,318,8],[455,321,10],[520,322,8],[600,320,9],[676,322,10]].forEach(c=>d+=circ(...c));
    [[20,292,22],[42,286,17],[6,306,18],[34,304,14],[-14,300,20]].forEach(c=>d+=circ(...c)); d+='M26 300H30V331H26Z';
    [[540,262,15],[556,258,13],[548,252,11],[548,272,13]].forEach(c=>d+=circ(...c)); d+='M546.5 270H549.5V331H546.5Z';
    [[742,284,24],[770,270,24],[796,280,22],[714,296,15],[758,296,18],[820,290,24]].forEach(c=>d+=circ(...c));
    PALMS.forEach(p=>{ d+=`M${p.x-4.5} ${G+1}Q${p.x-3} ${(G+p.y)/2} ${p.x-1.6} ${p.y+4}H${p.x+1.6}Q${p.x+1} ${(G+p.y)/2} ${p.x+1.5} ${G+1}Z`+circ(p.x,p.y,9) });
    let fr=''; PALMS.forEach((p,pi)=>{ for(let i=0;i<34;i++){ const a=i/34*Math.PI*2+pi*.13, len=(Math.sin(a)>.35?11:17)+((i*7)%6); fr+=`M${p.x} ${p.y}L${f1(p.x+Math.cos(a)*len)} ${f1(p.y+Math.sin(a)*len*.9)}` } });
    const BX=628, BY=298;
    d+=`M${BX-2.5} ${G+1}L${BX-1.5} ${BY}H${BX+1.5}L${BX+2.5} ${G+1}Z`;
    const bl=[-168,-128,-84,-44,-8].map((a,i)=>`<path d="M0 0C12-8 32-10 ${44+i*2} -1C32 4 12 4 0 0Z" transform="translate(${BX} ${BY}) rotate(${a}) scale(.85)"/>`).join('');
    const bunch=[[618,306],[625,304],[632,306],[620,313],[627,312],[623,320],[630,319]].map(([x,y])=>`<path class="bn" d="M${x-5} ${y}q5 5 11 -1"/>`).join('');

    // far, hazy treeline behind the galleries
    let far=`M-200 ${G+1}V296`; for(let x=-200;x<1000;x+=16){ const y=284+r()*12; far+=`Q${x+8} ${f1(y-9-r()*6)} ${x+16} ${f1(y)}` } far+=`V${G+1}Z`;
    // mid trees, a little closer
    const canopy=(x0,x1,base,top)=>{ let s=`M${x0} ${base}V${top+8}`; for(let x=x0;x<x1;x+=11){ const y=top+r()*10; s+=`Q${x+5.5} ${f1(y-8-r()*5)} ${x+11} ${f1(y)}` } return s+`V${base}Z` };
    const mid=canopy(120,250,304,276)+canopy(586,712,304,272);
    // light through the gallery colonnades
    let slits=''; [[-200,186],[228,256],[572,640],[668,1000]].forEach(([a,b])=>{ for(let x=a+6;x<b-4;x+=8) slits+=`M${x} 307h2.4v10h-2.4Z` });
    for(let x=262;x<566;x+=9) slits+=`M${x} 297h2v8h-2Z`;

    let lil=''; for(let c=0;c<17;c++){ const cx=-60+r()*920, cy=344+Math.pow(r(),1.6)*112, n=5+Math.floor(r()*9);
      for(let i=0;i<n;i++){ const y=cy+(r()-.5)*(4+(cy-W)*.12), x=cx+(r()-.5)*(30+(cy-W)*.9), rx=1.6+(y-W)*.055; lil+=`<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(rx)}" ry="${f1(rx*.32)}"/>` } }
    let lotus=''; for(let i=0;i<8;i++){ const x=40+r()*720, y=352+r()*95, s=1+(y-W)*.014; lotus+=`<path d="M${f1(x)} ${f1(y)}l${f1(-2*s)} ${f1(-3*s)}l${f1(2*s)} ${f1(s)}l${f1(2*s)} ${f1(-s)}Z"/>` }
    let rip=''; for(let i=0;i<40;i++){ const y=342+Math.pow(r(),1.3)*135, x=-40+r()*860, l=12+r()*70*(.4+(y-W)/140); rip+=`M${x.toFixed(0)} ${f1(y)}h${l.toFixed(0)}` }
    const clouds=[[160,214,130,2.6],[540,196,170,3.4],[700,238,100,2.2],[300,150,80,1.8],[620,120,120,2],[90,100,90,1.6],[420,40,140,2.4],[180,-40,110,2],[620,-80,150,2.6],[380,232,60,1.4]].map(([x,y,rx,ry])=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`).join('');
    const rays=[-62,-38,-18,0,20,40,64].map(a=>{ const t=a*Math.PI/180, L=520, w=.035; return `M410 300L${f1(410+Math.sin(t-w)*L)} ${f1(300-Math.cos(t-w)*L)}L${f1(410+Math.sin(t+w)*L)} ${f1(300-Math.cos(t+w)*L)}Z` }).join('');
    const birds=[[250,120,1],[268,112,.8],[284,124,.7],[560,86,.9],[578,94,.7]].map(([x,y,s])=>`<path class="bird" d="M${x-6*s} ${y-2*s}Q${x-3*s} ${y-4*s} ${x} ${y}Q${x+3*s} ${y-4*s} ${x+6*s} ${y-2*s}"/>`).join('');
    // foreground: reeds and big lotus leaves in the near water
    let reeds=''; [[-10,0],[8,1],[22,0],[36,1],[760,1],[776,0],[792,1],[808,0]].forEach(([x,k],i)=>{ const h=70+((i*37)%40), bend=(x<400?1:-1)*(10+((i*13)%12)); reeds+=`M${x} 495Q${x+bend*.4} ${495-h*.6} ${x+bend} ${495-h}` });
    const pads=[[30,476,46,9],[96,488,38,7],[742,480,52,10],[690,492,34,6]].map(([x,y,rx,ry])=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`).join('');
    const bud=`<path d="M58 495Q60 470 62 446" class="reed"/><path class="lotusbig" d="M62 446c-6-4-7-14 0-22c7 8 6 18 0 22Z"/>`;

    const sky=`<rect fill="url(#${P}g-sky)" x="-200" y="-300" width="1200" height="${W+300}"/><rect fill="url(#${P}g-glow)" x="-200" y="0" width="1200" height="${W}"/>`;
    return `
      <defs>
        <linearGradient id="${P}g-sky" gradientUnits="userSpaceOnUse" x1="0" y1="-150" x2="0" y2="${W}">
          <stop offset="0" class="s0"/><stop offset=".3" class="s1"/><stop offset=".52" class="s2"/><stop offset=".7" class="s3"/><stop offset=".86" class="s4"/><stop offset="1" class="s5"/>
        </linearGradient>
        <radialGradient id="${P}g-glow" gradientUnits="userSpaceOnUse" cx="410" cy="${G}" r="380" gradientTransform="translate(0 ${G}) scale(1 .38) translate(0 ${-G})"><stop offset="0" class="gl0"/><stop offset="1" class="gl1"/></radialGradient>
        <linearGradient id="${P}g-mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="mi0"/><stop offset=".6" class="mi1"/><stop offset="1" class="mi0"/></linearGradient>
        <linearGradient id="${P}g-deep" gradientUnits="userSpaceOnUse" x1="0" y1="${W}" x2="0" y2="500"><stop offset="0" class="wd0"/><stop offset="1" class="wd1"/></linearGradient>
        <radialGradient id="${P}g-vig" gradientUnits="userSpaceOnUse" cx="410" cy="240" r="640"><stop offset=".5" class="vg0"/><stop offset="1" class="vg1"/></radialGradient>
        <clipPath id="${P}c-water"><rect x="-200" y="${W}" width="1200" height="300"/></clipPath>
        <g id="${P}world">
          <path class="far" d="${far}"/><path class="mid" d="${mid}"/>
          <path class="sil" d="${d}${core}"/><path class="slit" d="${slits}"/><path class="rim" d="${core}"/>
          <path class="frond" d="${fr}"/><g class="sil">${bl}</g><rect class="grass" x="-200" y="${G}" width="1200" height="${W-G}"/>
        </g>
      </defs>
      ${sky}
      <path class="ray deco" d="${rays}"/>
      <g class="clouds">${clouds}</g>
      <g class="deco">${birds}</g>
      <use href="#${P}world"/>
      <rect class="deco" fill="url(#${P}g-mist)" x="-200" y="296" width="1200" height="40"/>
      <g clip-path="url(#${P}c-water)">
        <g transform="translate(0 ${W}) scale(1 ${-RF}) translate(0 ${-W})">${sky}<use href="#${P}world"/></g>
        <rect class="tint" x="-200" y="${W}" width="1200" height="300"/>
        <rect class="deco" fill="url(#${P}g-deep)" x="-200" y="${W}" width="1200" height="300"/>
      </g>
      <path class="hzl deco" d="M-200 ${W+.6}H1000"/>
      <path class="ripples" d="${rip}"/>
      <g class="lily">${lil}</g><g class="lotus">${lotus}</g>
      <rect class="hit water-hit" x="-200" y="${W+2}" width="1200" height="300"/>
      <g class="deco fg"><path class="reed" d="${reeds}"/>${pads}${bud}</g>
      <g id="${P}l-bunch" class="l-bunch"><path class="hvine" d="M${BX} ${BY}Q${BX-7} ${BY+2} ${BX-4} ${BY+7}"/>${bunch}<path class="bud" d="M624 322q-3 5 0 9q3 -4 0 -9Z"/><circle class="hit" cx="626" cy="312" r="24"/></g>
      <rect class="deco" fill="url(#${P}g-vig)" x="-200" y="-300" width="1200" height="800"/>`;
  }

  return {
    art,
    hint: 'Tap a monkey, the bananas, the coconuts or the pond.',
    views: { mobile: '50 -150 700 630', desktop: '0 -10 800 490' },
    cardView: '40 110 740 300',
    waterTop: W,
    floorY: () => G,
    anchors: PALMS.map(p => ({ x: p.x, y: p.y + 6 })),   // monkeys swing on vines hanging from the sugar palms
    bunch: { x: 626, y: 310 },
    nuts: { spots: [[87,157],[97,158],[92,163]], hit: [92,156,22], perch: 'lp' },
    start: ['t3','lp','mt'],
    perches: [
      {id:'lp',x:92,y:130,k:'tree'},{id:'rp',x:722,y:130,k:'tree'},
      {id:'lt',x:22,y:272,k:'tree'},{id:'mt',x:548,y:243,k:'tree'},{id:'rt',x:770,y:248,k:'tree'},
      {id:'gp',x:207,y:249,k:'bld'},
      {id:'t1',x:314,y:222,k:'bld'},{id:'t2',x:350,y:210,k:'bld'},{id:'t3',x:410,y:186,k:'bld'},{id:'t4',x:470,y:210,k:'bld'},{id:'t5',x:506,y:222,k:'bld'},
      {id:'w1',x:120,y:302,k:'bld'},{id:'w2',x:268,y:292,k:'bld'},{id:'w3',x:560,y:292,k:'bld'},{id:'w4',x:654,y:290,k:'bld'},
      {id:'bl',x:80,y:G,k:'ground'},{id:'bc',x:410,y:G,k:'ground'},{id:'br',x:690,y:G,k:'ground'}
    ]
  };
};
