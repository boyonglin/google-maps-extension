import fs from 'fs';

function parseVars(block) {
  const vars = {};
  block.replace(/--([\w-]+):\s*([^;]+);/g, (_, k, v) => {
    vars[`--${k}`] = v.trim();
  });
  return vars;
}

const css = fs.readFileSync('Package/css/theme.css', 'utf8');
const lightBlock = css.match(/:root \{([\s\S]*?)\}/)[1];
const darkBlock = css.match(/\[data-theme="dark"\] \{([\s\S]*?)\}/)[1];
const light = parseVars(lightBlock);
const dark = parseVars(darkBlock);

function luminance(hex) {
  const rgb = hex.replace('#','').match(/.{2}/g).map(h=>parseInt(h,16)/255);
  const a = rgb.map(v=>{ v=v<=0.03928? v/12.92: Math.pow((v+0.055)/1.055,2.4); return v;});
  return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];
}
function contrast(c1,c2){
  const L1=luminance(c1); const L2=luminance(c2);
  return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
}
const pairs=[
  ['--text-primary','--color-bg'],
  ['--text-secondary','--color-bg'],
  ['--accent','--color-bg'],
  ['--danger','--color-bg']
];
for(const [fg,bg] of pairs){
  const ratioL=contrast(light[fg],light[bg]).toFixed(2);
  const ratioD=contrast(dark[fg],dark[bg]).toFixed(2);
  console.log(`${fg} on ${bg}: light ${ratioL}, dark ${ratioD}`);
}
