/* Option 2 scene: sunrise over the sea at Da Nang. Marble Mountains with a pagoda on the left,
   coconut palms on the beach, a string of Hoi An lanterns, and a basket boat (thúng chai).
   Depth comes from layers: hazy far range, misty back karsts, textured front karsts with light
   on their sun-side edges, wet sand, shadows, then dark fronds in the foreground. */
window.SCENES = window.SCENES || {};
window.SCENES.danang = function({f1, circ, rng, LEAF}){
  const HZ=292, FLOOR=456, SUN={x:500,y:HZ};
  const LP={bx:318,by:456,cx:348,cy:198}, RP={bx:712,by:458,cx:612,cy:170};
  const shore='C 880 380 760 386 660 392 C 560 400 460 404 360 398 C 200 388 0 382 -200 386';
  const BOAT={x:430,y:338};
  const STR={a:[354,201],c:[480,262],b:[606,177]};
  const qpt=t=>[(1-t)*(1-t)*STR.a[0]+2*t*(1-t)*STR.c[0]+t*t*STR.b[0],(1-t)*(1-t)*STR.a[1]+2*t*(1-t)*STR.c[1]+t*t*STR.b[1]];
  const LT=[.14,.26,.38,.5,.62,.74,.86];
  const KARST='M-200 386V230C-150 210-90 200-50 230C-20 252-12 300-10 386Z'
    +'M-10 386C0 330 14 262 30 214C40 184 52 160 66 152C78 146 90 156 98 172C108 192 112 214 118 232C128 262 140 320 152 386Z'
    +'M108 386C118 320 132 240 148 180C156 150 168 124 182 112C192 104 206 104 214 114C226 128 232 152 240 176C252 214 262 250 270 290C278 330 284 360 292 386Z'
    +'M248 386C256 340 266 290 278 252C284 232 292 216 302 216C312 216 318 232 322 252C330 290 338 340 346 386Z';
  // sun-side edges of the karsts, for a thin line of light
  const KRIM='M66 152C78 146 90 156 98 172C108 192 112 214 118 232C128 262 140 320 152 386'
    +'M182 112C192 104 206 104 214 114C226 128 232 152 240 176C252 214 262 250 270 290C278 330 284 360 292 386'
    +'M302 216C312 216 318 232 322 252C330 290 338 340 346 386';

  function trunk(p){
    const mx=(p.bx+p.cx)/2, my=(p.by+p.cy)/2, dx=p.cx-p.bx, dy=p.cy-p.by, L=Math.hypot(dx,dy), nx=-dy/L, ny=dx/L, bend=(p.cx<p.bx?-1:1)*26;
    const kx=mx+nx*bend, ky=my+ny*bend;
    let rings=''; for(let t=.08;t<.95;t+=.06){ const x=(1-t)*(1-t)*p.bx+2*t*(1-t)*kx+t*t*p.cx, y=(1-t)*(1-t)*p.by+2*t*(1-t)*ky+t*t*p.cy, w=5-3*t; rings+=`M${f1(x-w)} ${f1(y)}h${f1(w*2)}` }
    return {d:`M${p.bx-5} ${p.by}Q${f1(kx-3)} ${f1(ky)} ${p.cx-2} ${p.cy}H${p.cx+2}Q${f1(kx+3)} ${f1(ky)} ${p.bx+5} ${p.by}Z`, rings};
  }
  function crown(p,seed,k=1,angles=[-165,-138,-110,-80,-52,-24,8,160,192,-95,-125]){
    const r=rng(seed); let back='', front='', ribs='';
    angles.forEach((deg,i)=>{
      const a=deg*Math.PI/180, len=((i>8?40:54)+r()*16)*k, droop=len*.38*Math.abs(Math.cos(a))+8*k;
      const tx=p.cx+Math.cos(a)*len, ty=p.cy+Math.sin(a)*len+droop;
      const mx=(p.cx+tx)/2, my=(p.cy+ty)/2-len*.2, ux=(tx-p.cx)/len, w=7*k;
      const uy=(ty-p.cy)/len, nx=-uy, ny=ux;
      const leaf=`M${p.cx} ${p.cy}Q${f1(mx+nx*w)} ${f1(my+ny*w)} ${f1(tx)} ${f1(ty)}Q${f1(mx-nx*w*.3)} ${f1(my-ny*w*.3)} ${p.cx} ${p.cy}Z`;
      if(k===1&&(i>8||(deg>-130&&deg<-70))) back+=leaf; else front+=leaf;
      for(let t=.2;t<.92;t+=.09/k){ const bx=(1-t)*(1-t)*p.cx+2*t*(1-t)*mx+t*t*tx, by=(1-t)*(1-t)*p.cy+2*t*(1-t)*my+t*t*ty, l=(11*(1-t)+3)*k;
        ribs+=`M${f1(bx)} ${f1(by)}l${f1(ux*l*.4)} ${f1(l)}` }
    });
    return {back, front:front+circ(p.cx,p.cy,6), ribs};
  }
  function shadow(bx,by,len,spread){
    const dir=(bx-SUN.x)/Math.abs(bx-SUN.x||1);
    return `M${bx-4} ${by}L${f1(bx+dir*len-spread)} 500L${f1(bx+dir*len+spread)} 500L${bx+4} ${by}Z`;
  }

  function art(P=''){
    const r=rng(23);
    const sky=`<rect fill="url(#${P}g-sky)" x="-200" y="-300" width="1200" height="${HZ+300}"/>`;
    const pagoda='M191 105V92H205V105Z M181 89Q186 93 190 92L198 84L206 92Q210 93 215 89L211 95H185Z M194 86V78H202V86Z M187 75Q191 79 194 78L198 72L202 78Q205 79 209 75L206 80H190Z M197.4 72V64H198.6V72Z';
    // shrubs along the foot of the mountains, one continuous band
    let shrub='M-200 394V378'; for(let x=-200;x<360;x+=9){ const y=372+r()*8+(x>300?(x-300)*.2:0); shrub+=`Q${x+4.5} ${f1(y-6-r()*5)} ${x+9} ${f1(y)}` } shrub+='L372 392V394Z';
    // tufts of plants clinging to the karsts
    let tufts=''; [[58,166,4],[90,168,3.5],[30,214,4],[162,150,4.5],[176,124,3.5],[230,150,4],[250,206,4.5],[124,236,4],[272,300,4],[290,224,3.5],[318,240,3],[-70,226,4.5],[-130,212,4],[110,300,5],[200,250,4],[18,300,4.5]].forEach(([x,y,s])=>{
      tufts+=circ(x,y,s)+circ(x+s*.9,y+s*.3,s*.8)+circ(x-s*.9,y+s*.4,s*.7) });
    // vertical limestone streaks, clipped to the karsts
    let striae=''; for(let x=-200;x<350;x+=5){ const y0=120+r()*160, h=20+r()*70; striae+=`M${x} ${f1(y0)}l${f1(r()*2-1)} ${f1(h)}` }
    // far range behind the mountains, and headlands on the right
    const farL='M-200 292V246C-140 236-90 224-40 232C10 240 60 226 120 234C190 244 250 236 320 250C400 266 470 278 560 292Z';
    const backK='M60 386C76 320 92 258 112 214C120 196 132 190 142 204C156 226 166 300 178 386Z M318 386C330 340 342 300 356 272C364 256 376 252 386 264C398 280 416 330 440 386Z';
    const headFar=`M520 ${HZ}C600 290 660 282 720 270C780 258 860 246 1000 248V${HZ}Z`;
    const headNear=`M800 ${HZ}C840 286 880 270 920 262C950 256 980 256 1000 258V${HZ}Z`;
    // sun sparkle on the sea, faint waves, distant boats
    let gA='', gB=''; for(let i=0;i<54;i++){ const y=HZ+4+Math.pow(r(),1.4)*110, spread=8+(y-HZ)*.9, x=SUN.x+(r()-.5)*2*spread, l=3+r()*(6+(y-HZ)*.18); const s=`M${f1(x-l/2)} ${f1(y)}h${f1(l)}`; if(i%2) gA+=s; else gB+=s }
    let waves=''; for(let i=0;i<30;i++){ const y=HZ+6+Math.pow(r(),1.2)*95, x=-100+r()*900, l=20+r()*80; waves+=`M${x.toFixed(0)} ${f1(y)}h${l.toFixed(0)}` }
    const farBoats=[[640,291,.5],[668,292,.4],[760,291,.45]].map(([x,y,s])=>`<path d="M${x-10*s} ${y}h${20*s}l${-3*s} ${3*s}h${-14*s}Z M${x-1*s} ${y}v${-10*s}l${6*s} ${8*s}Z"/>`).join('');
    // sand texture and shadows
    let tex=''; for(let i=0;i<70;i++){ const y=404+Math.pow(r(),.8)*90, x=-100+r()*900, w=4+(y-400)*.12; tex+=`M${f1(x)} ${f1(y)}q${f1(w/2)} -2 ${f1(w)} 0` }
    const shadows=shadow(LP.bx,LP.by,70,14)+shadow(RP.bx,RP.by,60,14)+shadow(122,456,40,10)+'M444 459Q470 470 500 459Q500 476 470 480Q440 474 444 459Z';
    const clouds=[[150,210,120,2.4],[330,236,90,2],[690,214,150,3],[600,140,110,2],[120,90,90,1.6],[440,40,140,2.4],[200,-50,110,2],[640,-80,150,2.6],[560,250,70,1.4]].map(([x,y,rx,ry])=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`).join('');
    const rays=[-58,-34,-14,8,30,52].map(a=>{ const t=a*Math.PI/180, L=520, w=.035; return `M${SUN.x} ${HZ}L${f1(SUN.x+Math.sin(t-w)*L)} ${f1(HZ-Math.cos(t-w)*L)}L${f1(SUN.x+Math.sin(t+w)*L)} ${f1(HZ-Math.cos(t+w)*L)}Z` }).join('');
    const birds=[[420,130,1],[438,122,.8],[452,134,.7],[700,92,.9],[716,100,.7],[300,60,.6]].map(([x,y,s])=>`<path class="bird" d="M${x-6*s} ${y-2*s}Q${x-3*s} ${y-4*s} ${x} ${y}Q${x+3*s} ${y-4*s} ${x+6*s} ${y-2*s}"/>`).join('');
    const L=crown(LP,3), R=crown(RP,8), TL=trunk(LP), TR=trunk(RP);
    const BX=122, BY=410;
    const bl=[-170,-130,-92,-56,-14].map((a,i)=>`<path d="M0 0C12-8 32-10 ${46+i*2} -1C32 4 12 4 0 0Z" transform="translate(${BX} ${BY}) rotate(${a})"/>`).join('');
    const bunch=[[110,424],[117,422],[124,424],[112,431],[119,430],[115,438],[122,437]].map(([x,y])=>`<path class="bn" d="M${x-5} ${y}q5 5 11 -1"/>`).join('');
    // foreground: big dark fronds in the bottom corners, beach grass
    const FL=crown({cx:-10,cy:520},5,2.4,[-78,-56,-34]), FR=crown({cx:830,cy:524},9,2.2,[-104,-128,-150]);
    const fgFronds=FL.front+FR.front;
    let grass=''; [[690,494],[704,496],[716,494],[200,497],[212,495]].forEach(([x,y],i)=>{ for(let k=-2;k<=2;k++) grass+=`M${x} ${y}q${k*3} -10 ${k*6+(i%2?2:-2)} -${16+Math.abs(k)*-2+6}` });
    const lans=LT.map((t,i)=>{ const [x,y]=qpt(t); return `<g class="lan" data-i="${i}" transform="translate(${f1(x)} ${f1(y)})"><g class="sw">
      <line class="tas" x1="0" y1="0" x2="0" y2="6"/><circle class="halo" cx="0" cy="15" r="16" fill="url(#${P}g-lan)"/>
      <ellipse class="body c${i%4+1}" cx="0" cy="15" rx="7" ry="9"/><path class="shine" d="M-3 9q-2 6 0 12"/><rect class="cap" x="-3.5" y="5" width="7" height="2.4"/><rect class="cap" x="-3" y="23.6" width="6" height="2"/>
      <line class="tas" x1="0" y1="25.5" x2="0" y2="32"/><circle class="hit" cx="0" cy="16" r="14"/></g></g>` }).join('');
    const boat=`<g id="${P}boat" class="boat" transform="translate(${BOAT.x} ${BOAT.y})"><ellipse class="sil" cx="0" cy="9" rx="22" ry="3" opacity=".25"/><g class="spin">
      <path class="sil" d="M-17 0Q-15 9 0 9Q15 9 17 0Z"/><ellipse class="rock" cx="0" cy="0" rx="17" ry="3.2"/>
      <path class="sil" d="M-2.5 -1L-3.2 -13Q0 -15 3.2 -13L2.5 -1Z"/><circle class="sil" cx="0" cy="-16.5" r="2.6"/>
      <path class="hat" d="M-7.5 -16L0 -23.5L7.5 -16Q0 -14.5 -7.5 -16Z"/><path class="lstr" d="M3 -10L14 5"/></g>
      <circle class="hit boat-hit" cx="0" cy="-6" r="24"/></g>`;
    return `
      <defs>
        <linearGradient id="${P}g-sky" gradientUnits="userSpaceOnUse" x1="0" y1="-150" x2="0" y2="${HZ}">
          <stop offset="0" class="s0"/><stop offset=".3" class="s1"/><stop offset=".52" class="s2"/><stop offset=".7" class="s3"/><stop offset=".86" class="s4"/><stop offset="1" class="s5"/>
        </linearGradient>
        <radialGradient id="${P}g-glow" gradientUnits="userSpaceOnUse" cx="${SUN.x}" cy="${HZ}" r="360" gradientTransform="translate(0 ${HZ}) scale(1 .42) translate(0 ${-HZ})"><stop offset="0" class="gl0"/><stop offset="1" class="gl1"/></radialGradient>
        <radialGradient id="${P}g-halo" gradientUnits="userSpaceOnUse" cx="${SUN.x}" cy="${HZ}" r="110"><stop offset=".3" class="sh0"/><stop offset="1" class="sh1"/></radialGradient>
        <linearGradient id="${P}g-sea" gradientUnits="userSpaceOnUse" x1="0" y1="${HZ}" x2="0" y2="420"><stop offset="0" class="sea0"/><stop offset="1" class="sea1"/></linearGradient>
        <linearGradient id="${P}g-sand" gradientUnits="userSpaceOnUse" x1="0" y1="380" x2="0" y2="500"><stop offset="0" class="sand0"/><stop offset="1" class="sand1"/></linearGradient>
        <linearGradient id="${P}g-wet" gradientUnits="userSpaceOnUse" x1="0" y1="380" x2="0" y2="420"><stop offset="0" class="ws0"/><stop offset="1" class="ws1"/></linearGradient>
        <linearGradient id="${P}g-rock" gradientUnits="userSpaceOnUse" x1="-200" y1="0" x2="350" y2="0"><stop offset="0" class="kg0"/><stop offset="1" class="kg1"/></linearGradient>
        <radialGradient id="${P}g-fog"><stop offset="0" class="mi1"/><stop offset="1" class="mi0"/></radialGradient>
        <radialGradient id="${P}g-vig" gradientUnits="userSpaceOnUse" cx="420" cy="230" r="640"><stop offset=".5" class="vg0"/><stop offset="1" class="vg1"/></radialGradient>
        <radialGradient id="${P}g-lan"><stop offset="0" class="lh0"/><stop offset="1" class="lh1"/></radialGradient>
        <clipPath id="${P}c-sky"><rect x="-200" y="-300" width="1200" height="${HZ+300}"/></clipPath>
        <clipPath id="${P}c-karst"><path d="${KARST}"/></clipPath>
      </defs>
      ${sky}
      <rect fill="url(#${P}g-glow)" x="-200" y="0" width="1200" height="${HZ}"/>
      <path class="ray deco" d="${rays}"/>
      <circle fill="url(#${P}g-halo)" cx="${SUN.x}" cy="${HZ}" r="110" clip-path="url(#${P}c-sky)" class="deco"/>
      <circle class="sunc" cx="${SUN.x}" cy="${SUN.y+6}" r="40" clip-path="url(#${P}c-sky)"/>
      <g class="clouds">${clouds}</g>
      <g class="deco">${birds}</g>
      <path class="far" d="${farL}"/><path class="far" d="${headFar}"/><path class="mid" d="${headNear}"/>
      <rect fill="url(#${P}g-sea)" x="-200" y="${HZ}" width="1200" height="210"/>
      <rect fill="url(#${P}g-glow)" x="-200" y="${HZ}" width="1200" height="140" opacity=".55"/>
      <path class="hzl deco" d="M-200 ${HZ+.6}H1000"/>
      <path class="waves" d="${waves}"/><path class="glit" d="${gA}"/><path class="glit b" d="${gB}"/>
      <g class="sil deco" opacity=".5">${farBoats}</g>
      <path class="hit water-hit" d="M-200 ${HZ}H1000V378${shore}Z"/>
      <g id="${P}boatwrap">${boat}</g>
      <path class="far" d="${backK}" style="opacity:.32"/>
      <ellipse class="deco" fill="url(#${P}g-fog)" cx="120" cy="372" rx="420" ry="54"/>
      <path fill="url(#${P}g-rock)" d="${KARST}"/>
      <path class="striae" d="${striae}" clip-path="url(#${P}c-karst)"/>
      <path class="rim" d="${KRIM}"/>
      <path class="sil" d="${pagoda}"/>
      <path class="sil" d="${shrub}"/>
      <path fill="url(#${P}g-sand)" d="M1000 378${shore}V500H1000Z"/>
      <path fill="url(#${P}g-wet)" d="M1000 378${shore}V420H1000Z"/>
      <path class="tex deco" d="${tex}"/>
      <path class="foam" d="M1000 378${shore}"/>
      <path class="foam" d="M1000 371${shore.replace(/(\d+(?:\.\d+)?) (\d+(?:\.\d+)?)/g,(m,a,b)=>a+' '+(+b-7))}" stroke-dasharray="40 26" opacity=".5"/>
      <path class="shadow deco" d="${shadows}"/>
      <path class="rock" d="M444 459Q445 447 453 441Q462 434 474 437Q489 440 495 452L497 459Z M496 460Q499 451 507 450Q515 451 517 460Z"/>
      <path class="sil" opacity=".82" d="${L.back}${R.back}"/>
      <path class="sil" d="${TL.d}${TR.d}${L.front}${R.front}"/>
      <path class="ring deco" d="${TL.rings}${TR.rings}"/>
      <path class="frond" d="${L.ribs}${R.ribs}" style="stroke-width:1.4"/>
      <path class="sil" d="M${BX-3} ${FLOOR}L${BX-2} ${BY}H${BX+2}L${BX+3} ${FLOOR}Z"/><g class="sil">${bl}</g>
      <path class="lstr" d="M${STR.a[0]} ${STR.a[1]}Q${STR.c[0]} ${STR.c[1]} ${STR.b[0]} ${STR.b[1]}"/>
      ${lans}
      <g class="deco fg"><path d="${fgFronds}"/><path class="frond" d="${FL.ribs}${FR.ribs}" style="stroke-width:2.4"/><path class="reed" d="${grass}"/></g>
      <g id="${P}l-bunch" class="l-bunch"><path class="hvine" d="M${BX} ${BY}Q${BX-6} ${BY+6} ${BX-4} ${BY+12}"/>${bunch}<path class="bud" d="M116 442q-3 5 0 9q3 -4 0 -9Z"/><circle class="hit" cx="117" cy="430" r="24"/></g>
      <rect class="deco" fill="url(#${P}g-vig)" x="-200" y="-300" width="1200" height="800"/>`;
  }

  /* lanterns that light up and swing, and a basket boat that spins */
  let lans=[], lit=[], sw=[], boat=null, spinT=-1, cheered=false;
  const extras={
    init(api){
      lans=[...api.svg.querySelectorAll('.lan')]; lit=lans.map(()=>false); sw=lans.map(()=>null);
      boat={g:api.svg.querySelector('.boat'),spin:api.svg.querySelector('.boat .spin')};
    },
    click(e,api){
      const l=e.target.closest('.lan');
      if(l){
        const i=+l.dataset.i; lit[i]=true; l.classList.add('lit'); sw[i]=api.clock();
        if(!cheered&&lit.every(Boolean)){ cheered=true; api.bubble('đẹp quá!',480,206) }
        api.start(); return true;
      }
      if(e.target.closest('.boat-hit')){ if(spinT<0){ spinT=api.clock(); api.bubble('wheee!',BOAT.x,BOAT.y-34); api.start() } return true }
      return false;
    },
    step(t,dt,api){
      lans.forEach((l,i)=>{
        let a=api.REDUCED?0:Math.sin(t*1.3+i*.9)*2.2;
        if(sw[i]!=null){ const k=t-sw[i]; if(k>4.5) sw[i]=null; else if(!api.REDUCED) a+=24*Math.exp(-k/1.4)*Math.sin(k*6.5) }
        l.firstElementChild.setAttribute('transform',`rotate(${a.toFixed(2)})`);
      });
      if(!boat||!boat.g) return;
      const by=api.REDUCED?0:Math.sin(t*1.4)*1.6, br=api.REDUCED?0:Math.sin(t*1.1)*2.5;
      boat.g.setAttribute('transform',`translate(${BOAT.x} ${f1(BOAT.y+by)}) rotate(${br.toFixed(2)})`);
      if(spinT>=0){
        const k=Math.min(1,(t-spinT)/(api.REDUCED?.01:1.8)), th=4*Math.PI*(1-Math.cos(Math.PI*k))/2;
        boat.spin.setAttribute('transform',`scale(${Math.cos(th).toFixed(3)} 1)`);
        if(k>=1){ spinT=-1; boat.spin.removeAttribute('transform') }
      }
    }
  };

  return {
    art, extras,
    hint: 'Tap a monkey, the bananas, a coconut, the lanterns, the basket boat or the sea.',
    says: ['ook!','eek!','xin chào!','hm?'],
    views: { mobile: '50 -150 700 630', desktop: '0 -10 800 490' },
    cardView: '0 70 800 330',
    waterTop: HZ,
    floorY: () => FLOOR,
    anchors: [{x:LP.cx,y:LP.cy+6},{x:RP.cx,y:RP.cy+6}],   // monkeys swing on the coconut palms
    bunch: { x: 117, y: 428 },
    nuts: { spots: [[606,181],[616,182],[611,188]], hit: [611,182,22], perch: 'rp' },
    start: ['pg','rp','g1'],
    perches: [
      {id:'pg',x:198,y:72,k:'bld'},{id:'k1',x:66,y:150,k:'bld'},{id:'k2',x:238,y:172,k:'bld'},{id:'k3',x:302,y:216,k:'bld'},
      {id:'lp',x:348,y:188,k:'tree'},{id:'rp',x:612,y:160,k:'tree'},{id:'bn',x:122,y:372,k:'tree'},
      {id:'rk',x:470,y:439,k:'bld'},
      {id:'g1',x:250,y:FLOOR,k:'ground'},{id:'g2',x:598,y:458,k:'ground'},{id:'g3',x:760,y:FLOOR,k:'ground'}
    ]
  };
};
