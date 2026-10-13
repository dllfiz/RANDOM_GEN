/* zh-prompt.js —— 中文描述 → 适配底模的英文提示词（本地规则，无需联网） */
(function (global) {
  'use strict';

  const CHAR_MAP = [
    { keys: ['雪雾', 'yuki_miu', 'yukimiu', 'Yuki Miu', 'noob_yuki_miu'], trigger: 'noob_yuki_miu',
      core: 'noob_yuki_miu, 1girl, cat girl, white cat ears, pink inner ear, white hair, long hair, blue eyes, hair between eyes, hair ornament, small breasts, fair skin, white cat tail, white tip tail, bell choker, black choker' },
    { keys: ['铃羽', 'lingyu', 'Ling Yu', '鈴羽'], trigger: 'lingyu',
      core: 'lingyu, 1girl, cat girl, dark grey cat ears, light blue inner ear, grey hair, long hair, gradient hair, white hair tips, blue eyes, lake blue eyes, hair between eyes, small breasts, fair skin, dark grey cat tail' },
    { keys: ['猫羽雫', 'nekoha', 'noobna', 'Nekoha', 'shizuku'], trigger: 'noobna',
      core: 'noobna, 1girl, cat girl, black cat ears, light blue hair, long hair, twintails, blue eyes, hair between eyes, white hair ornament, small breasts, fair skin, black cat tail' },
    { keys: ['白花', 'shironaba', 'Shironaba'], trigger: 'shironaba',
      core: 'shironaba, 1girl, light pink hair, long hair, twintails, pink eyes, purple eyes, hair between eyes, small breasts, fair skin, blush, hair ribbon, pink ribbon' },
    { keys: ['nachonako', 'nacho', 'なち猫', 'NachoNeko', 'Nacho', 'noobnacho'], trigger: 'noobnacho',
      core: 'noobnacho, 1girl, cat girl, grey cat ears, pink inner ear, grey hair, silver hair, long hair, blue eyes, hair between eyes, hairpin, hair ornament, small breasts, fair skin, grey cat tail, white tip tail' },
    { keys: ['拉菲V2', 'laffey v2', 'Laffey V2'], trigger: 'laffey',
      core: 'laffey, 1girl, rabbit girl, white rabbit ears, pink rabbit ears, white hair, long hair, twintails, brown eyes, amber eyes, hair between eyes, small breasts, fair skin, blush' },
    { keys: ['拉菲', 'laffey', 'Laffey'], trigger: 'laffey',
      core: 'laffey, 1girl, rabbit girl, white rabbit ears, white hair, long hair, twintails, red eyes, hair between eyes, small breasts, fair skin, blush' }
  ];

  const PLACE = [
    [/海边|沙滩|海滩|海岸|浪花|海水/, 'beach, sandy beach, ocean, waves, shoreline'],
    [/卧室|床上|房间里/, 'bedroom, on bed, indoor'],
    [/客厅|沙发/, 'living room, on sofa, indoor'],
    [/教室|学校/, 'classroom, school'],
    [/街道|路边|路口/, 'street, roadside, outdoors'],
    [/小树林|森林|林间/, 'forest, woods, trees'],
    [/咖啡|咖啡馆/, 'cafe, indoor'],
    [/屋顶|天台/, 'rooftop, outdoors'],
    [/浴室|浴缸/, 'bathroom, bathtub'],
    [/公园/, 'park, outdoors'],
    [/窗边|窗前/, 'by the window, indoor']
  ];

  const TIME = [
    [/夏日|夏天|盛夏/, 'summer'],
    [/春|春天/, 'spring'],
    [/秋|秋天/, 'autumn'],
    [/冬|冬天|雪地/, 'winter'],
    [/清晨|早上|早晨/, 'morning, morning light'],
    [/黄昏|傍晚|夕阳|落日/, 'evening, sunset, golden hour'],
    [/夜晚|夜里|月光/, 'night, moonlight'],
    [/正午|午后|阳光/, 'daylight, sunlight'],
    [/阴天/, 'overcast']
  ];

  const OUTFIT = [
    [/白.?色?.{0,4}短袖衬衫|白色衬衫|白衬衫/, 'white short sleeves shirt, loose shirt'],
    [/衬衫/, 'shirt'],
    [/浅蓝.{0,6}百褶短裙|浅蓝色.{0,4}短裙|高腰百褶短裙|百褶短裙/, 'light blue high-waist pleated skirt, pleated skirt'],
    [/短裙/, 'short skirt'],
    [/长裙|连衣裙/, 'dress'],
    [/水手服|JK/, 'sailor uniform, school uniform'],
    [/泳装|比基尼/, 'swimsuit, bikini'],
    [/连衣裙|一袭/, 'dress'],
    [/外套|夹克/, 'jacket'],
    [/白.{0,2}凉鞋|白色凉鞋/, 'white sandals'],
    [/凉鞋/, 'sandals'],
    [/运动鞋/, 'sneakers'],
    [/丝袜|过膝袜/, 'thighhighs'],
    [/蝴蝶结/, 'bow'],
    [/宽松/, 'loose clothes']
  ];

  const POSE = [
    [/遮在额头|手遮额头|手搭在额头|遮阳/, 'hand on forehead, hand above eyes'],
    [/眯眼|眯起眼睛/, 'squinting'],
    [/望向远处|看向远方|望着海面/, 'looking afar, looking at viewer alternative'],
    [/转过头|回头/, 'looking back, turning head'],
    [/笑|笑容|俏皮/, 'smile, cheerful'],
    [/惊喜/, 'surprised, excited'],
    [/红晕|脸红|泛着.{0,2}红/, 'blush'],
    [/走来|向镜头走|走过来/, 'walking, approaching viewer'],
    [/站在|站着/, 'standing'],
    [/坐在|坐着/, 'sitting'],
    [/提着裙摆|掀裙|抓着裙/, 'holding skirt'],
    [/挥手/, 'waving']
  ];

  const LIGHT = [
    [/阳光|日光|金色光芒|金色/, 'sunlight, lens flare, sparkling light'],
    [/逆光/, 'backlighting'],
    [/柔和|柔光/, 'soft lighting'],
    [/明暗|光影/, 'chiaroscuro']
  ];

  const MOOD = [
    [/清新|自然|可爱|夏日气息/, 'fresh, natural, cute, summer vibe'],
    [/浪漫/, 'romantic'],
    [/安静|宁静/, 'calm, peaceful'],
    [/活泼/, 'lively']
  ];

  const CAMERA = [
    [/全身/, 'full body'],
    [/半身/, 'upper body'],
    [/特写/, 'close-up'],
    [/镜头|拍照|取景/, 'looking at viewer, depth of field']
  ];

  const QUALITY = 'masterpiece, best quality, anime style, clean lineart, cel shading, vibrant colors, detailed anime eyes, studio-quality anime key visual';
  const TAIL_NOOBAI = 'rating:general, year 2024, anime coloring';
  const NEG = 'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, artist name, bad feet, poorly drawn, extra limbs, disfigured, deformed, cross-eyed, mutated hands, out of frame, extra fingers, gross proportions, ugly, duplicate';

  function hitList(text, rules) {
    const out = [];
    const seen = {};
    rules.forEach(function (pair) {
      if (pair[0].test(text)) {
        String(pair[1]).split(',').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (t) {
          if (!seen[t]) { seen[t] = 1; out.push(t); }
        });
      }
    });
    return out;
  }

  function detectChars(text) {
    const found = [];
    const low = text.toLowerCase();
    CHAR_MAP.forEach(function (c) {
      for (let i = 0; i < c.keys.length; i++) {
        const k = c.keys[i];
        if (text.indexOf(k) >= 0 || low.indexOf(String(k).toLowerCase()) >= 0) {
          found.push(c);
          break;
        }
      }
    });
    return found;
  }

  function dedupeJoin(parts) {
    const seen = {};
    const out = [];
    parts.forEach(function (p) {
      String(p || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (t) {
        const key = t.toLowerCase();
        if (!seen[key]) { seen[key] = 1; out.push(t); }
      });
    });
    return out.join(', ');
  }

  function convertZhToPrompt(zhText, opts) {
    opts = opts || {};
    const text = String(zhText || '').trim();
    if (!text) return { prompt: '', negative: NEG, chars: [], notes: [] };

    /* forcedChars: 来自工具「角色来源」的选中卡，优先于中文里的名字 */
    let chars = [];
    const notes = [];
    if (opts.forcedChars && opts.forcedChars.length) {
      chars = opts.forcedChars.map(function (c) {
        return {
          trigger: c.trigger || '',
          core: c.core || c.base || ''
        };
      }).filter(function (c) { return c.core || c.trigger; });
      notes.push('角色来源优先：' + chars.map(function (c) { return c.trigger || '(卡)'; }).join('+'));
    } else {
      chars = detectChars(text);
    }
    const head = [];
    if (chars.length) {
      chars.forEach(function (c) { if (c.trigger) head.push(c.trigger); });
    }
    head.push(QUALITY);

    let body = '';
    if (chars.length === 1) {
      body = chars[0].core || (chars[0].trigger + ', 1girl');
      if (!opts.forcedChars) notes.push('角色：' + (chars[0].trigger || ''));
    } else if (chars.length > 1) {
      body = chars.map(function (c) { return c.core || c.trigger; }).join(', ');
      if (!opts.forcedChars) notes.push('多角色：' + chars.map(function (c) { return c.trigger; }).join('+'));
    } else {
      body = (opts.gender === 'male') ? '1boy, solo' : '1girl, solo';
      notes.push('未指定角色，使用通用人数标签');
    }
    if (opts.outfit) {
      body = body + ', ' + opts.outfit;
      notes.push('服饰设定已并入');
    }

    const place = hitList(text, PLACE);
    const time = hitList(text, TIME);
    const outfit = hitList(text, OUTFIT);
    const pose = hitList(text, POSE);
    const light = hitList(text, LIGHT);
    const mood = hitList(text, MOOD);
    const camera = hitList(text, CAMERA);

    if (!camera.length) camera.push('full body', 'looking at viewer');

    const mid = [].concat(outfit, pose, place, time, light, mood, camera);
    const tail = opts.model === 'noobai' || !opts.model ? TAIL_NOOBAI : 'rating:general';

    const prompt = dedupeJoin([head.join(', '), body, mid.join(', '), tail]);

    let negative = NEG;
    if (/海边|沙滩|夏/.test(text)) {
      negative += ', snow, winter coat, heavy coat';
    }

    return {
      prompt: prompt,
      negative: negative,
      chars: chars.map(function (c) { return c.trigger; }),
      notes: notes,
      parts: { place: place, time: time, outfit: outfit, pose: pose, light: light, mood: mood, camera: camera }
    };
  }

  global.convertZhToPrompt = convertZhToPrompt;
})(typeof window !== 'undefined' ? window : globalThis);
