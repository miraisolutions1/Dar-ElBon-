import { chromium } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import sharp from 'sharp';

// Original vector tutorial: no brand photography is altered or external generation claimed.
const root = process.cwd();
const frames = path.join(root, '.local/brew-motion-frames');
await mkdir(frames, { recursive: true });
await mkdir('public/media', { recursive: true });
const font = (
  await readFile('node_modules/@fontsource-variable/cairo/files/cairo-arabic-wght-normal.woff2')
).toString('base64');
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 768, height: 432 }, deviceScaleFactor: 1 });
await page.setContent(
  `<style>@font-face{font-family:Cairo;src:url(data:font/woff2;base64,${font})}*{box-sizing:border-box}body{margin:0;background:#211a14;color:#fff7e4;font-family:Cairo}main{width:768px;height:432px;position:relative;padding:34px 38px;overflow:hidden}header{font-size:14px;color:#ffd200;text-align:right;font-weight:750}h1{font-size:27px;text-align:right;margin:4px 0 0;font-weight:850}.scene{position:absolute;left:26px;top:98px;width:365px;height:260px}.copy{position:absolute;right:38px;top:153px;width:295px;text-align:right}.number{font-size:15px;color:#ffd200}h2{font-size:27px;line-height:1.55;margin:9px 0;font-weight:850}p{font-size:15px;line-height:1.9;color:#d7c9b5;margin:0}.steps{position:absolute;bottom:26px;right:38px;left:38px;display:flex;gap:10px;direction:rtl}.steps i{height:4px;flex:1;background:#4d4031;border-radius:5px;overflow:hidden}.steps b{height:100%;display:block;background:#ffd200}svg{width:100%;height:100%}</style><main dir="rtl"><header>الحكاية في الفنجان.</header><h1>٣ خطوات لفنجان تركي مظبوط</h1><div class="scene"><svg viewBox="0 0 365 260"><defs><linearGradient id="pot"><stop stop-color="#ba702e"/><stop offset=".5" stop-color="#e7b16a"/><stop offset="1" stop-color="#9b572a"/></linearGradient></defs><circle cx="176" cy="143" r="114" fill="#ffd200" opacity=".07"/><ellipse cx="175" cy="242" rx="94" ry="7" fill="#000" opacity=".25"/><g id="potGroup"><path d="M124 93L111 210Q172 242 237 210L222 93Z" fill="url(#pot)"/><ellipse cx="173" cy="93" rx="50" ry="13" fill="#e9bd7d"/><ellipse id="coffee" cx="173" cy="93" rx="42" ry="8" fill="#623a25"/><path d="M222 104L305 73" stroke="#c1894e" stroke-width="12" stroke-linecap="round"/><path d="M128 95Q139 156 132 207" stroke="#ffdda3" stroke-width="5" opacity=".4"/></g><g id="steam" fill="none" stroke="#f4dbc0" stroke-width="3" stroke-linecap="round"><path d="M148 66Q164 53 149 40Q139 30 153 18"/><path d="M173 64Q190 45 176 32Q167 23 183 9"/><path d="M197 67Q212 57 200 45Q190 36 204 23"/></g><g id="flame" fill="#ffd200"><path d="M148 253Q132 240 151 221Q149 238 160 240Q167 247 158 253Z"/><path d="M178 256Q159 240 180 215Q176 234 189 240Q196 252 178 256Z"/><path d="M208 253Q191 240 213 222Q208 236 216 241Q223 249 208 253Z"/></g><g id="pour"><path d="M173 20L173 87" stroke="#a8cad0" stroke-width="6" stroke-linecap="round" stroke-dasharray="8 6"/><circle cx="184" cy="45" r="3" fill="#926746"/><circle cx="166" cy="62" r="4" fill="#926746"/></g></svg></div><div class="copy"><span class="number" id="number"></span><h2 id="title"></h2><p id="detail"></p></div><div class="steps"><i><b></b></i><i><b></b></i><i><b></b></i></div></main>`,
);
await page.evaluate(() => document.fonts.ready);
const steps = [
  [
    'مياه + بن',
    'حط مياه بدرجة حرارة الغرفة، وضيف البن والسكر حسب ذوقك. قلّب قبل ما تحطها على النار.',
  ],
  ['على نار هادية', 'سيب القهوة تسخن بالراحة. بعد ما تحط الكنكة على النار، بلاش تقليب عشان الوش.'],
  ['ارفعها قبل الغليان', 'أول ما الوش يعلى، ارفع الكنكة وصب بالراحة. الغليان الشديد بيضيّع الوش.'],
];
for (let frame = 0; frame < 108; frame++) {
  const time = frame / 12;
  const step = Math.floor(time / 3);
  const progress = (time % 3) / 3;
  await page.evaluate(
    ({ step, progress, time, copy }) => {
      document.querySelector('#number').textContent = `الخطوة ${['١', '٢', '٣'][step]} من ٣`;
      document.querySelector('#title').textContent = copy[0];
      document.querySelector('#detail').textContent = copy[1];
      document.querySelector('#steam').style.opacity =
        step === 0 ? '0' : `${0.35 + 0.3 * Math.sin(time * 3)}`;
      document
        .querySelector('#steam')
        .setAttribute('transform', `translate(0 ${-5 * Math.sin(time * 2)})`);
      document.querySelector('#flame').style.opacity =
        step === 1 ? `${0.65 + 0.25 * Math.sin(time * 8)}` : '0';
      document.querySelector('#pour').style.opacity = step === 0 ? '1' : '0';
      document
        .querySelector('#pour')
        .setAttribute('transform', `translate(0 ${8 * Math.sin(time * 4)})`);
      document
        .querySelector('#potGroup')
        .setAttribute('transform', step === 2 ? `translate(0 ${-7 * progress})` : 'translate(0 0)');
      document.querySelectorAll('.steps b').forEach((el, index) => {
        el.style.width = `${index < step ? 100 : index === step ? progress * 100 : 0}%`;
      });
    },
    { step, progress, time, copy: steps[step] },
  );
  await page.screenshot({ path: path.join(frames, `${String(frame).padStart(4, '0')}.png`) });
}
await browser.close();
execFileSync(
  'ffmpeg',
  [
    '-y',
    '-framerate',
    '12',
    '-i',
    path.join(frames, '%04d.png'),
    '-c:v',
    'libx264',
    '-crf',
    '28',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    'public/media/brew-guide.mp4',
  ],
  { stdio: 'ignore' },
);
execFileSync(
  'ffmpeg',
  [
    '-y',
    '-i',
    'public/media/brew-guide.mp4',
    '-vf',
    'fps=8,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=64[p];[s1][p]paletteuse=dither=bayer',
    '-loop',
    '0',
    'public/media/brew-guide.gif',
  ],
  { stdio: 'ignore' },
);
await sharp(path.join(frames, '0000.png'))
  .webp({ quality: 85 })
  .toFile('public/media/brew-guide-poster.webp');
console.log('Created original 9 second vector preparation tutorial MP4, GIF and poster.');
