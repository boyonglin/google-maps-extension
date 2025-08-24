// Simple contrast checker for key token pairs
const colors = {
  light: {
    bg: '#ffffff',
    text: '#202833',
    secondary: '#70757a'
  },
  dark: {
    bg: '#121417',
    text: '#f1f2f4',
    secondary: '#b3b9c2'
  }
};

function luminance(hex) {
  const rgb = hex.replace('#','').match(/.{2}/g).map(c => parseInt(c,16)/255).map(v => {
    return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4);
  });
  return 0.2126*rgb[0] + 0.7152*rgb[1] + 0.0722*rgb[2];
}

function contrast(fg, bg) {
  const L1 = luminance(fg);
  const L2 = luminance(bg);
  return ((Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05)).toFixed(2);
}

['light','dark'].forEach(mode => {
  console.log(`Mode: ${mode}`);
  console.log('  text-primary vs bg:', contrast(colors[mode].text, colors[mode].bg));
  console.log('  text-secondary vs bg:', contrast(colors[mode].secondary, colors[mode].bg));
});
