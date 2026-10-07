// Builds both motion-graphic versions with an ElevenLabs voice-over (no music/SFX).
// Usage: node build-vo.js  (key via Network secret for api.elevenlabs.io, or ELEVENLABS_API_KEY=...)   [ELEVEN_MODEL=<model_id>] [ELEVEN_VOICE=<voice_id>]
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const KEY = process.env.ELEVENLABS_API_KEY, API = 'https://api.elevenlabs.io/v1';
const OUT = process.env.OUT || path.resolve('out');
const LINES = [
  'صديق التوفير… يساعدك تكتشف منتجات تستحق الشراء، وتوفّر.',
  'نفس المنتج، بسعر مختلف في كل متجر. طيب… مين الأرخص؟',
  'جرّب بوت صديق التوفير على تلجرام. أرسل له صورة المنتج، أو رابطه، أو اسمه.',
  'ويقارن لك بين أمازون وعلي إكسبرس، ويرتّب العروض من الأرخص… في ثواني.',
  'وفي الموقع، تصفّح المنتجات حسب القسم اللي يهمك.',
  'وأكواد خصم جاهزة لأكثر من عشرين متجر… انسخ الكود ووفّر.',
  'مع أدلة شراء ومقارنات تقرأها قبل ما تدفع.',
  'مجاني بالكامل، نعرض لك الخيارات… والقرار لك.',
  'صديق التوفير… ابدأ التوفير الحين.',
];
const B = [0, 4, 8.4, 13.4, 20, 24.4, 29.2, 32.8, 36, 38]; // original scene boundaries (s)
const LEAD = 0.3, TAIL = 0.45, FPS = 30;
// With a Network secret, the proxy adds the xi-api-key header itself, so KEY may be unset.
const AUTH = KEY ? { 'xi-api-key': KEY } : {};
// Requests go through curl: in cloud sessions Node's fetch takes a different egress path than curl.
const curl = (u, extra = []) => execFileSync('curl', ['-sS', '--fail-with-body', ...Object.entries(AUTH).flatMap(([k, v]) => ['-H', `${k}: ${v}`]), ...extra, u], { maxBuffer: 1 << 28 });
const get = async u => JSON.parse(curl(API + u).toString());
const dur = f => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString();

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let model = process.env.ELEVEN_MODEL, voice = process.env.ELEVEN_VOICE;
  if (!fs.existsSync(path.join(OUT, 'vo_0.mp3'))) {
    if (!model) {
      const ms = await get('/models');
      console.log('models:', ms.map(m => m.model_id).join(', '));
      const m = ms.find(m => /v4/i.test(m.model_id) && m.can_do_text_to_speech !== false);
      if (!m) throw new Error('No v4 model found; set ELEVEN_MODEL');
      model = m.model_id;
    }
    if (!voice) {
      const vs = (await get('/voices')).voices;
      const v = vs.find(v => /^adam\b/i.test(v.name));
      voice = v ? v.voice_id : 'pNInz6obpgDQGcFmaJgB';
      console.log('voice:', v ? v.name : 'Adam (default id)', voice);
    }
    console.log('model:', model);
    for (let i = 0; i < LINES.length; i++) {
      const body = JSON.stringify({ text: LINES[i], model_id: model, previous_text: LINES[i - 1], next_text: LINES[i + 1] });
      curl(`${API}/text-to-speech/${voice}?output_format=mp3_44100_128`, ['-H', 'content-type: application/json', '--data-binary', body, '-o', path.join(OUT, `vo_${i}.mp3`)]);
      console.log('vo', i, 'ok');
    }
  }
  // Time map: stretch any scene whose line is longer than the scene.
  const d = LINES.map((_, i) => dur(path.join(OUT, `vo_${i}.mp3`)));
  const segs = []; let A = 0;
  for (let i = 0; i < LINES.length; i++) {
    const orig = B[i + 1] - B[i], len = Math.max(orig, LEAD + d[i] + TAIL);
    segs.push({ A, a: B[i], k: orig / len, len }); A += len;
  }
  const TOTAL = A;
  console.log('durations', d.map(x => x.toFixed(2)).join(' '), 'total', TOTAL.toFixed(2));
  const map = t => { const s = segs.findLast(s => t >= s.A) || segs[0]; return s.a + (t - s.A) * s.k; };

  // Voice track
  const ins = [], flt = [];
  LINES.forEach((_, i) => { ins.push('-i', path.join(OUT, `vo_${i}.mp3`)); const ms = Math.round((segs[i].A + LEAD) * 1000); flt.push(`[${i}:a]adelay=${ms}|${ms}[a${i}]`); });
  const mix = LINES.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${LINES.length}:normalize=0,apad,atrim=0:${TOTAL.toFixed(3)},loudnorm=I=-16:TP=-1.5:LRA=11[out]`;
  const vo = path.join(OUT, 'voice.m4a');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...ins, '-filter_complex', flt.join(';') + ';' + mix, '-map', '[out]', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', vo]);

  // Render both layouts with the time map, then mux.
  const b = await chromium.launch();
  for (const [src, w, h, name] of [['motion.html', 1080, 1920, 'savemateksa-motion-voice.mp4'], ['motion-h.html', 1920, 1080, 'savemateksa-motion-16x9-voice.mp4']]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto('file://' + path.resolve(src) + '?capture=1'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
    const fr = path.join(OUT, 'fr_' + w); fs.rmSync(fr, { recursive: true, force: true }); fs.mkdirSync(fr);
    const N = Math.round(TOTAL * FPS);
    for (let i = 0; i < N; i++) {
      const t = i / FPS;
      await p.evaluate(([to, tr]) => { render(to); document.getElementById('bar').style.width = (tr * 100) + '%'; }, [map(t), t / TOTAL]);
      await p.screenshot({ path: `${fr}/f${String(i).padStart(5, '0')}.jpg`, quality: 92, type: 'jpeg' });
    }
    await p.close();
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${fr}/f%05d.jpg`, '-i', vo, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'slow', '-c:a', 'copy', '-shortest', '-movflags', '+faststart', path.join(OUT, name)]);
    fs.rmSync(fr, { recursive: true, force: true });
    console.log('wrote', name);
  }
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
