
/* =========================================================
   data-pool-extend.js —— 工坊词池并入引擎（自动生成，勿手改）
   把 data-workshop-rand.js 的 5793 条中英对照词条按池并入
   引擎随机词池。规则：
   - 按英文去重（池里已有的英文 tag 不重复收）
   - zh / en 两个池严格同步 append，保持 PAIR 索引对齐
   - 提取时已过滤清水不安全词（见 data-workshop-rand.js）
   ========================================================= */
(function mergeWorkshopPools(){
  var D = (typeof window !== 'undefined') ? window.__WORKSHOP_POOLS : null;
  if (!D) return;
  var PAIR_PUSH = function(zhPool, enPool, items){
    var have = {};
    enPool.forEach(function(s){ have[String(s).toLowerCase()] = 1; });
    items.forEach(function(p){
      var k = p[0].toLowerCase();
      if (have[k]) return;
      have[k] = 1;
      zhPool.push(p[1]); enPool.push(p[0]);
    });
  };
  if (typeof HAIR_COLOR !== 'undefined' && typeof HAIR_COLOR_EN !== 'undefined' && D.hairColor){
    PAIR_PUSH(HAIR_COLOR, HAIR_COLOR_EN, D.hairColor);
  }
  if (typeof HAIR_STYLE !== 'undefined' && typeof HAIR_STYLE_EN !== 'undefined' && D.hairStyle){
    PAIR_PUSH(HAIR_STYLE, HAIR_STYLE_EN, D.hairStyle);
  }
  if (typeof EYE_COLOR !== 'undefined' && typeof EYE_COLOR_EN !== 'undefined' && D.eyeColor){
    PAIR_PUSH(EYE_COLOR, EYE_COLOR_EN, D.eyeColor);
  }
  if (typeof EYE_COLOR !== 'undefined' && typeof EYE_COLOR_EN !== 'undefined' && D.eyeStyle){
    PAIR_PUSH(EYE_COLOR, EYE_COLOR_EN, D.eyeStyle);
  }
  if (typeof EXPRESSION !== 'undefined' && typeof EXPRESSION_EN !== 'undefined' && D.exprMood){
    PAIR_PUSH(EXPRESSION, EXPRESSION_EN, D.exprMood);
  }
  if (typeof TOP_WEAR !== 'undefined' && typeof TOP_WEAR_EN !== 'undefined' && D.outfitTop){
    TOP_WEAR.modern = TOP_WEAR.modern || [];
    TOP_WEAR_EN.modern = TOP_WEAR_EN.modern || [];
    PAIR_PUSH(TOP_WEAR.modern, TOP_WEAR_EN.modern, D.outfitTop);
  }
  if (typeof BOTTOM_WEAR !== 'undefined' && typeof BOTTOM_WEAR_EN !== 'undefined' && D.outfitBot){
    BOTTOM_WEAR.modern = BOTTOM_WEAR.modern || [];
    BOTTOM_WEAR_EN.modern = BOTTOM_WEAR_EN.modern || [];
    PAIR_PUSH(BOTTOM_WEAR.modern, BOTTOM_WEAR_EN.modern, D.outfitBot);
  }
  if (typeof ANIME_OUTFIT !== 'undefined' && typeof ANIME_OUTFIT_EN !== 'undefined' && D.outfitDress){
    PAIR_PUSH(ANIME_OUTFIT, ANIME_OUTFIT_EN, D.outfitDress);
  }
  if (typeof SHOES_SOCKS !== 'undefined' && typeof SHOES_SOCKS_EN !== 'undefined' && D.sock){
    PAIR_PUSH(SHOES_SOCKS, SHOES_SOCKS_EN, D.sock);
  }
  if (typeof SHOES_SOCKS !== 'undefined' && typeof SHOES_SOCKS_EN !== 'undefined' && D.shoe){
    PAIR_PUSH(SHOES_SOCKS, SHOES_SOCKS_EN, D.shoe);
  }
  if (typeof ANIME_ACC !== 'undefined' && typeof ANIME_ACC_EN !== 'undefined' && D.headwear){
    PAIR_PUSH(ANIME_ACC, ANIME_ACC_EN, D.headwear);
  }
  if (typeof ANIME_ACC !== 'undefined' && typeof ANIME_ACC_EN !== 'undefined' && D.acc){
    PAIR_PUSH(ANIME_ACC, ANIME_ACC_EN, D.acc);
  }
  if (typeof ANIME_POSE !== 'undefined' && typeof ANIME_POSE_EN !== 'undefined' && D.poseBase){
    PAIR_PUSH(ANIME_POSE, ANIME_POSE_EN, D.poseBase);
  }
  if (typeof ANIME_POSE !== 'undefined' && typeof ANIME_POSE_EN !== 'undefined' && D.poseMod){
    PAIR_PUSH(ANIME_POSE, ANIME_POSE_EN, D.poseMod);
  }
  if (typeof ANIME_POSE !== 'undefined' && typeof ANIME_POSE_EN !== 'undefined' && D.interactAny){
    PAIR_PUSH(ANIME_POSE, ANIME_POSE_EN, D.interactAny);
  }
  if (typeof ANIME_POSE !== 'undefined' && typeof ANIME_POSE_EN !== 'undefined' && D.interactIn){
    PAIR_PUSH(ANIME_POSE, ANIME_POSE_EN, D.interactIn);
  }
  if (typeof ANIME_POSE !== 'undefined' && typeof ANIME_POSE_EN !== 'undefined' && D.interactOut){
    PAIR_PUSH(ANIME_POSE, ANIME_POSE_EN, D.interactOut);
  }
  if (typeof ANIME_PLACE !== 'undefined' && typeof ANIME_PLACE_EN !== 'undefined' && D.placeIn){
    PAIR_PUSH(ANIME_PLACE, ANIME_PLACE_EN, D.placeIn);
  }
  if (typeof ANIME_PLACE !== 'undefined' && typeof ANIME_PLACE_EN !== 'undefined' && D.placeOut){
    PAIR_PUSH(ANIME_PLACE, ANIME_PLACE_EN, D.placeOut);
  }
  if (typeof ANIME_PLACE !== 'undefined' && typeof ANIME_PLACE_EN !== 'undefined' && D.placeExtraIn){
    PAIR_PUSH(ANIME_PLACE, ANIME_PLACE_EN, D.placeExtraIn);
  }
  if (typeof ANIME_PLACE !== 'undefined' && typeof ANIME_PLACE_EN !== 'undefined' && D.placeExtraOut){
    PAIR_PUSH(ANIME_PLACE, ANIME_PLACE_EN, D.placeExtraOut);
  }
  if (typeof TIME_LIGHT !== 'undefined' && typeof TIME_LIGHT_EN !== 'undefined' && D.time){
    PAIR_PUSH(TIME_LIGHT, TIME_LIGHT_EN, D.time);
  }
  if (typeof TIME_LIGHT !== 'undefined' && typeof TIME_LIGHT_EN !== 'undefined' && D.light){
    PAIR_PUSH(TIME_LIGHT, TIME_LIGHT_EN, D.light);
  }
  if (typeof CAMERA !== 'undefined' && typeof CAMERA_EN !== 'undefined' && D.view){
    PAIR_PUSH(CAMERA, CAMERA_EN, D.view);
  }
  if (typeof CAMERA !== 'undefined' && typeof CAMERA_EN !== 'undefined' && D.angle){
    PAIR_PUSH(CAMERA, CAMERA_EN, D.angle);
  }
})();
