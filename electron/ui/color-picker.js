let activeColorPicker=null;
function colorPicker(input,key,title){
 input.type='hidden';const wrapper=document.createElement('span');wrapper.className='color-picker';
 const button=document.createElement('button');button.type='button';button.className='color-swatch';button.setAttribute('aria-label','选择'+title);button.style.backgroundColor=input.value;
 const panel=document.createElement('div');panel.className='color-popover';panel.setAttribute('popover','auto');panel.setAttribute('aria-label',title+'选择器');
 const hex=document.createElement('input');hex.type='text';hex.maxLength=7;hex.setAttribute('aria-label',title+'颜色值');hex.value=input.value;
 const sliders=[];const sync=value=>{hex.value=value;button.style.backgroundColor=value;for(let i=0;i<3;i++)sliders[i].value=parseInt(value.slice(1+i*2,3+i*2),16);};
 const apply=value=>{input.value=value;sync(value);input.onchange();};
 const palette=document.createElement('div');palette.className='color-palette';for(const value of ['#000000','#333c38','#ffffff','#f7f2e8','#202725','#c4cdc5','#e4eee5','#2c4737','#e53935','#ffb300','#1e88e5','#8e24aa']){const swatch=document.createElement('button');swatch.type='button';swatch.style.backgroundColor=value;swatch.setAttribute('aria-label',value);swatch.onclick=()=>apply(value);palette.append(swatch);}panel.append(palette,hex);
 for(const [i,name] of ['R','G','B'].entries()){const row=document.createElement('label');row.append(name);const slider=document.createElement('input');slider.type='range';slider.min=0;slider.max=255;slider.setAttribute('aria-label',title+name);sliders.push(slider);slider.oninput=()=>apply('#'+sliders.map(s=>Number(s.value).toString(16).padStart(2,'0')).join(''));row.append(slider);panel.append(row);}
 hex.oninput=()=>{if(/^#[a-f0-9]{6}$/i.test(hex.value))apply(hex.value);};hex.onchange=()=>sync(input.value);
 button.onclick=()=>{sync(input.value);const rect=button.getBoundingClientRect();panel.style.left=Math.max(8,Math.min(innerWidth-228,rect.right-220))+'px';panel.style.top=Math.max(8,Math.min(innerHeight-210,rect.bottom+6))+'px';panel.togglePopover();};
 if(key==='annotationColor')panel.addEventListener('pointerleave',()=>panel.hidePopover());
 panel.addEventListener('toggle',()=>{button.setAttribute('aria-expanded',String(panel.matches(':popover-open')));activeColorPicker=panel.matches(':popover-open')?panel:null;});
 wrapper.append(button,panel);return wrapper;
}
document.addEventListener('pointerdown',event=>{for(const panel of document.querySelectorAll('.color-popover:popover-open')){if(!panel.contains(event.target)&&!panel.previousElementSibling?.contains(event.target))panel.hidePopover();}},true);
