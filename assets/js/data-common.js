/* =========================================================
   data-common.js —— 通用词库（外貌 / 服装 / 场景 / 画风）
   ========================================================= */

/* ---------- 姓名池：按世界背景分组 ---------- */
const WORLD_NAME = {
  modern: {
    type: 'east',
    sur: ['林','沈','顾','苏','江','温','许','周','阮','白','叶','程','宋','陆','夏','洛','安','乔','楚','裴'],
    female: ['晚晚','清越','知夏','疏月','眠眠','昭昭','南栀','霁月','听澜','以宁','若薇','浅浅','书瑶','星野','海棠','未晞','子衿','初语','知微','静姝'],
    male: ['子聿','砚舟','嘉衍','斯年','亦舟','牧之','云深','述白','知珩','临川','观棋','祈年','照野','北辰','行止','少商','敬亭','扶苏']
  },
  campus: {
    type: 'east',
    sur: ['樱井','佐藤','高桥','藤原','中村','西园寺','七海','如月','白鸟','清水','南','小泉','林','苏','陈','夏'],
    female: ['结衣','凛','葵','遥','琴音','心春','纱月','铃','惠','麻由','栞','雫','步美','千夏','阳菜','诗织','晚晴','小满'],
    male: ['悠真','莲','大和','奏太','飒太','京一','隼人','拓真','瑛太','陆','凌','明轩','子航','思远']
  },
  xianxia: {
    type: 'east',
    sur: ['南宫','东方','百里','慕容','轩辕','令狐','上官','司徒','北冥','澹台','独孤','公孙','第五'],
    female: ['清漪','揽月','沉香','漱玉','扶摇','绛珠','苍梧','素问','雪见','栖梧','青芜','照水','疏影','碧落'],
    male: ['无咎','长风','玄策','观澜','墨白','寒山','重霄','临渊','景行','紫陌','疏狂','问渠','执夜']
  },
  western: {
    type: 'west',
    female: ['Aria','Seraphine','Lysandra','Rowena','Isolde','Elowen','Morgana','Cassia','Thalia','Nerys','Yvaine','Freya','Aurelia','Wren','Sable','Lenore'],
    male: ['Caelum','Dorian','Alaric','Theron','Evander','Rurik','Lucian','Gideon','Soren','Malrik','Fenwick','Corvin','Aldric','Bram','Orin'],
    last: ['Ashfell','Duskwood','Silvermane','Emberhold','Stormraven','Blackwood','Winterbourne','Vaelmoor','Hollowbrook','Ironvale','Marchetti','Lacroix']
  },
  cyber: {
    type: 'code',
    pool: ['V-09 幽蓝','霓雀 NEON','灰鸦 GREY','零号蜜糖','SILK-77','赤蝎 CRIMSON','白噪音 WN','断线 ANNA','蜜獾 R-13','银鲤 KOI','三千代 MIYU','裂隙 RIFT','午夜突触','电子骨 E-BONE','糖霜 ICING','第九区 N-9','缄默 MUTE','猎犬 HOUND','虚数 IMG','霓虹喉舌']
  },
  postapoc: {
    type: 'code',
    pool: ['铁锈 RUST','老狼','灰烬 ASH','断齿','砂隼','哑炮','三号罐头','盐婆','锈钉','荒犬','沙岚','末班车','哑铃','半条命','铅灰','拾荒者K','枯藤','风蚀','铁蹄','旧伤']
  },
  office: {
    type: 'east',
    sur: ['陆','傅','裴','贺','梁','崔','秦','薛','罗','唐','殷','邱'],
    female: ['知微','静姝','书宁','语棠','子佩','若安','熙雯','清和','疏桐','婉之'],
    male: ['行舟','子墨','砚青','望舒','承宇','敬亭','砚白','思齐','嘉树','立诚','安之','致远']
  }
};

/* ---------- 发色 ---------- */
const HAIR_COLOR = [
  '鸦羽黑','墨蓝黑','深栗','焦糖棕','亚麻金','蜂蜜金','奶茶棕','玫瑰粉','薄藤紫','雾霭灰',
  '雪白银','冰蓝','薄荷绿','绯红','珊瑚橙','烟熏蓝紫','渐变：根部墨黑、发尾酒红','渐变：银白转冰蓝',
  '挑染：一缕赤红','挑染：耳侧冰蓝','月光银白','深酒红','孔雀蓝','灰粉','玳瑁棕金'
];

/* ---------- 发型 ---------- */
const HAIR_STYLE = [
  '及腰长直发','微卷波浪长发','高马尾','双马尾','丸子头','姬发式','公主切','波波头','齐刘海短发',
  '侧分锁骨发','蓬松羊毛卷','低盘发髻','编发侧辫','半扎公主头','狼尾短发','寸头','背头',
  '碎盖微卷','脏辫','大波浪卷','湿发贴颈','自然蓬松及肩发','双丸子','鱼骨辫','高扎灯笼辫'
];

/* ---------- 瞳色 ---------- */
const EYE_COLOR = [
  '琥珀金','雾灰','深海蓝','翡翠绿','榛果棕','紫罗兰','银灰','赤铜红','墨黑','冰蓝',
  '异色瞳：左金右蓝','异色瞳：左绿右紫','桃花粉','琉璃青','鎏金竖瞳','烟紫','琥珀偏绿','苍灰蓝'
];

/* ---------- 身材体型 ---------- */
const BODY_FEMALE = [
  '纤细柔弱，肩线单薄','沙漏型，腰线极细、胯宽','运动型紧致，腰腹有薄肌','丰满丰腴，胸臀饱满',
  '高挑冷感，四肢修长','娇小玲珑，比例幼态','瑜伽型，线条流畅','芭蕾型，颈颈修长',
  '运动型，大腿结实有力','骨感清瘦，锁骨分明','肉感柔软，抱起来很沉','健美型，肩背有轮廓'
];
const BODY_MALE = [
  '精瘦有力，腹肌分明','宽肩窄腰，倒三角','高大健壮，胸肌厚实','修长单薄，书卷气',
  '矮壮结实，臂围惊人','肌肉虬结，青筋明显','瘦削嶙峋，肋骨隐现','运动员体型，爆发力强',
  '圆润微胖，肚腩柔软','少年感未褪，骨架清瘦','粗犷硬朗，体毛浓密','干练精悍，肌肉线条紧绷'
];

/* ---------- 体型档位自选（人生组图：Q版 → 成人大体型）----------
   用户锁定后覆盖随机身材；weight 由界面 ★ 控制写入 (tag:1.2) 形式 */
const BODY_SIZE_TIERS = [
  { id: 'chibi',   zh: 'Q版',       en: 'chibi, super deformed, 2 heads tall, cute proportions' },
  { id: 'toddler', zh: '幼小比例',   en: 'very short stature, large head, toddler proportions, tiny body' },
  { id: 'child',   zh: '儿童比例',   en: 'short stature, child proportions, small frame, large head relative to body' },
  { id: 'loli',    zh: '萝莉',       en: 'loli, petite, flat chest, child-like proportions, small stature, short height, young girl, cute face' },
  { id: 'teen',    zh: '少年少女',   en: 'teenage proportions, slender youth, growing body, adolescent figure' },
  { id: 'young',   zh: '青年标准',   en: 'young adult, average build, balanced proportions' },
  { id: 'adult',   zh: '成人匀称',   en: 'adult body, well-proportioned, mature figure' },
  { id: 'curvy',   zh: '成人丰满',   en: 'voluptuous adult body, full curves, mature and plump figure' },
  { id: 'tall',    zh: '成人高大',   en: 'tall adult, long limbs, imposing height' },
  { id: 'large',   zh: '大体型',     en: 'large body, thick build, heavy frame, wide shoulders' },
  { id: 'muscular',zh: '健壮肌肉',   en: 'muscular adult body, defined muscles, athletic bulk' }
];


/* ---------- 皮肤与体貌特征 ---------- */
const SKIN_FEATURE = [
  '冷白皮，血管隐约可见','小麦色，晒痕清晰','瓷白细腻，几乎无瑕','蜜色光泽','苍白病态',
  '脖颈有一颗小痣','锁骨下方一颗朱砂痣','左肩胛有陈旧疤','腰侧一道细长疤','耳后有胎记',
  '脸颊有浅浅雀斑','眼下有一颗泪痣','后背有大片纹身','手腕内侧纹着一行小字','腹部有妊娠纹',
  '锁骨处纹一朵花','大腿外侧有一道划痕','肩头有咬痕状的旧疤','乳白色，手感像凝脂','晒出的泳衣痕迹'
];

/* ---------- 表情 / 气质 ---------- */
const EXPRESSION = [
  '面无表情，眼神冷淡','微微喘息，嘴角湿润','半敛眼帘，睫毛轻颤','咬着下唇，眼眶泛红',
  '笑意慵懒，带着倦意','眉头轻蹙，忍耐着什么','张口失神，眼神失焦','侧头回避，耳根通红',
  '挑眉带笑，游刃有余','茫然失神，嘴角挂着涎','紧闭双眼，下巴微抬','垂眸顺从，睫毛在抖',
  '含着东西鼓起脸颊','喉结滚动，吞咽着','额头抵着什么，汗湿了鬓角'
];

/* ---------- 服装：上装（按世界） ---------- */
const TOP_WEAR = {
  modern: ['oversize白衬衫','针织开衫','吊带背心','紧身高领毛衣','宽松卫衣','真丝衬衫','短款皮夹克','西装外套','露脐T恤','薄纱罩衫'],
  campus: ['水手服上衣','白衬衫配领结','针织背心配衬衫','运动外套','宽松校服','oversize毛衣','短款学院风外套','衬衫外搭开衫'],
  xianxia: ['月白广袖长袍','蹙金云肩外衫','墨色劲装','鲛绡轻纱','素色中衣','玄色绣金纹长袍','碧色齐胸襦裙上襦','雪貂裘氅'],
  western: ['束腰皮质胸甲','亚麻罩衫','丝绒长裙上身','锁子甲内衬','法师长袍','粗布猎装','宫廷束腰衣','皮革马甲'],
  cyber: ['发光光纤夹克','紧身战术背心','透明PVC上衣','机械义体外露的短夹克','霓虹条纹紧身衣','破洞网纱上衣','模块化胸甲','露腰机能服'],
  postapoc: ['磨破的帆布外套','防弹背心','粗麻斗篷','拼接皮甲','厚重防风雨衣','补丁摞补丁的罩衫','军用战术服'],
  office: ['定制西装外套','丝绸衬衫','修身马甲','白衬衫挽起袖口','职业套装上衣','高领羊绒衫','西装马甲配领带']
};

/* ---------- 服装：下装 ---------- */
const BOTTOM_WEAR = {
  modern: ['高腰牛仔裤','百褶短裙','包臀长裙','阔腿西裤','骑行短裤','纱裙','工装裤','紧身皮裤','开衩长裙','运动短裤'],
  campus: ['百褶校服裙','格子裙','运动短裤','及膝袜配乐福鞋','针织长裙','牛仔背带裙'],
  xianxia: ['月白长裙','曳地纱裙','劲装长裤','绡纱罗裙','绣纹马面裙','阔腿练功裤'],
  western: ['皮革长裤','亚麻长裙','及地礼服裙','战斗短裤','束口裤配长靴','层叠塔裙'],
  cyber: ['机能工装裤','发光条纹紧身裤','皮质热裤','机械义肢配短裤','PVC长裤','网纱裙'],
  postapoc: ['耐磨工装裤','绑腿配短裤','厚重皮裤','拼接长裙','军用战术裤'],
  office: ['铅笔裙','西装西裤','包臀裙','阔腿裤','及膝A字裙']
};

/* ---------- 鞋袜与配饰 ---------- */
const SHOES_SOCKS = [
  '黑色过膝袜','白色及膝袜','蕾丝边短袜','吊带袜配高跟','光脚','细带高跟凉鞋','厚底靴',
  '帆布鞋','loafer 乐福鞋','绑带长靴','赤足踩在地毯上','丝袜（薄黑）','渔网袜','蕾丝长筒袜',
  '脚踝系带高跟','运动鞋','木屐','皮靴及膝','裸色丝袜','防滑袜'
];
const ACCESSORY = [
  '细银项链','choker 项圈','珍珠耳坠','金属臂环','腕表','细框眼镜','发带','贝雷帽',
  '皮质手套','腰链','脚链','鼻环','唇钉','耳骨钉成排','丝绒发带','发夹','围巾',
  '皮质束腕','耳机挂颈','墨镜','胸针','腰封','单片眼镜','指环'
];

/* ---------- 场景：场所（按世界） ---------- */
const PLACE = {
  modern: [
    '高层公寓的落地窗前','浴室，水汽弥漫','厨房料理台旁','客厅沙发','卧室大床','阳台护栏边',
    '地下车库','便利店后巷','电梯轿厢内','办公室加班的深夜','车后座','洗衣房','试衣间',
    '天台水塔旁','酒店房间','更衣室长椅','录音棚','画室',
    /* 扩充：日常 / 户外 / 季节 */
    '海边沙滩，浪花拍脚','海边礁石，黄昏','海边木栈道',
    '家里卧室床上','卧室落地窗前','客厅沙发上','客厅地毯上','家里浴室','家里厨房',
    '小树林深处','林间小路','公园长椅','路边路灯下','巷弄转角','天桥上',
    '咖啡馆靠窗','便利店货架前','电车车厢内','车站站台','屋顶天台',
    '游泳池边','温泉池畔','神社参道','樱花树下','花田小路',
    /* 四季场景 */
    '春日樱花大道，花瓣飘落','春日公园草坪，新绿',
    '夏日海边沙滩，烈日','夏日祭典摊位旁，灯笼','夏日教室开窗，蝉鸣',
    '秋日银杏大道，落叶','秋日校园，红叶铺地','秋日湖畔，倒影',
    '冬日雪夜街道，路灯','冬日被炉旁','冬日窗边，霜花','冬日温泉，白汽'
  ],
  campus: ['放学后的空教室','图书室书架间','体育馆器材室','天台','校医室','泳池更衣室','社团活动室','操场看台下','走廊楼梯转角','宿舍上下铺','音乐教室钢琴旁','实验准备室','自行车棚'],
  xianxia: ['洞府石室','竹林深处的温泉','云海之上的飞舟','宗门大殿后殿','药庐','雪山洞窟','花海结界内','剑冢','湖心亭','马车车厢','灵泉池畔','藏书阁顶层'],
  western: ['城堡寝室','酒馆二楼房间','马厩干草堆','教堂告解室','森林溪畔','王座厅','地下牢房','法师塔顶','马车车厢','集市后巷','温泉浴场','龙巢深处'],
  cyber: ['霓虹街角的胶囊旅馆','数据中心的机房','废弃地铁车厢','天台雨夜','全息广告牌背面','义体诊所','下水道维护通道','悬浮车后座','地下拳台更衣室','VR 舱内','天桥下的黑市','公司高层办公室'],
  postapoc: ['废弃加油站','地下掩体','锈蚀的车厢内','废弃医院病房','沙暴中的帐篷','水塔顶部','废墟图书馆','防空洞','废弃泳池','临时营地篝火旁'],
  office: ['总裁办公室','会议室长桌','电梯间','加班后的办公位','复印室','储物间','公司天台','地下停车场','出差酒店房间','茶水间']
};

/* ---------- 时间 / 光线 ---------- */
const TIME_LIGHT = [
  '正午顶光，影子很短','黄昏斜阳，橙金色逆光','深夜台灯，暖黄局部光','清晨薄雾，冷调散射光',
  '午后窗光，百叶窗条纹投影','霓虹灯下的彩色光斑','烛火摇曳的暖光','暴雨天，闪电一瞬的惨白',
  '满月清辉，蓝调夜色','阴天柔光，无硬阴影','浴霸白炽灯','显示器屏幕的冷蓝反光',
  '车灯扫过的一瞬','手电筒直射','篝火跃动的橙红','清晨第一缕直射光',
  '黄金时刻逆光，轮廓发光','蓝调时刻，天光将尽','日出时分，粉橙渐变天空',
  '午后树荫斑驳光','夜间城市霓虹反射','月光透过窗帘','阴雨天窗外灰光',
  '雪天漫反射柔光','夏日正午刺眼强光','秋日夕阳长影'
];

/* ---------- 天气 / 氛围 ---------- */
const MOOD_ATMOS = [
  '空气黏腻湿热','冷气开得很足，皮肤起鸡皮疙瘩','下着细雨，玻璃上有水痕','尘土在光柱里浮',
  '远处有雷声','蝉鸣不绝','安静到只剩呼吸','雨后的土腥味','血腥味混着铁锈',
  '消毒水的气味','檀香袅袅','酒精与烟草味','汗味与体液的腥甜','洗衣液的干净气味',
  '灰尘与旧纸张的味道','海风的咸腥','雪夜的寂静','香薰蜡烛的甜腻',
  '温暖被窝的安心感','阳光透过纱帘的慵懒','雨声淅沥的宁静','节日灯火的热闹',
  '独处时的自在','紧张又期待的心跳','淡淡的寂寞','被宠爱的甜蜜',
  '春天花粉与青草香','夏夜凉风与虫鸣','秋日干燥落叶味','冬日暖炉与热可可香'
];

/* ---------- 构图 / 镜头 ---------- */
const CAMERA = [
  '全身像，略俯视','半身近景','特写：面部与湿润的眼','过肩镜头','低角度仰拍',
  '躺姿俯拍，四肢舒展','镜面反射构图','侧后方视角','第一人称手持感',
  '广角，环境占比大','中景，双人互动','局部特写：交合处','腿部线条特写',
  '背影回眸','蜷缩抱膝的构图','四肢张开的仰躺','逆光剪影','镜中倒影',
  '极特写：眼睛与睫毛','上半身三分构图','侧面剪影','从脚边仰拍全身',
  '窗边逆光半身','肩上视角','荷兰角倾斜构图','远景环境小人'
];


/* ---------- 眼睛特效 / 瞳孔细节（自选） ---------- */
const EYE_SPECIAL = [
  '普通瞳孔',
  '星星眼，瞳孔里闪着星光',
  '瞳孔冒星星，看到喜欢的东西时',
  '爱心瞳孔，瞳孔变成粉色爱心',
  '看到零食时瞳孔变成爱心',
  '闪亮高光眼，大而有神',
  '水润含泪眼',
  '半眯慵懒眼',
  '瞪圆惊讶眼',
  '异色瞳，左右瞳色不同'
];
const EYE_SPECIAL_EN = [
  'normal pupils',
  'starry eyes, sparkling stars in pupils',
  'star pupils, eyes lighting up with stars',
  'heart-shaped pupils, pink hearts in eyes',
  'heart pupils when seeing favorite snacks',
  'sparkling highlight eyes, large and vivid',
  'moist teary eyes',
  'half-lidded lazy eyes',
  'wide open surprised eyes',
  'heterochromia, different eye colors'
];

/* =========================================================
   二次元通用随机池 —— 给「预设角色随机补全」用
   与上面的世界观词库分开：这里只放二次元立绘里最常见的服装 / 动作 / 背景
   ========================================================= */

/* 成套服装（抽中成套时不再另抽上下装） */
const ANIME_OUTFIT = [
  '白色水手服校服，红领巾，百褶裙','黑色西装式校服，金扣，格子裙','白衬衫配藏青针织背心，百褶裙',
  '运动服，蓝白条纹，短裤','体操服，白色紧身，蓝色短裤','泳装，藏青竞技款，白色线条',
  '比基尼，细带，荷叶边','女仆装，黑白配色，围裙，裙撑','兔女郎装，黑色紧身衣，兔耳，网袜',
  '旗袍，红色缎面，高开衩，盘扣','改良旗袍，白底青花，短款','和服，樱花纹样，宽腰带，木屐',
  '浴衣，藏青金鱼纹，木屐','巫女服，白衣红袴','婚纱，白纱拖尾，头纱','哥特萝莉装，黑色蓬裙，蕾丝头饰',
  '古典洛丽塔，粉色蓬裙，蝴蝶结','护士服，白色连衣裙，护士帽','军装，深绿制服，皮带，军帽',
  '飞行员夹克，橙色内衬，徽章','连帽卫衣，oversize，短裤','吊带连衣裙，碎花，凉鞋',
  '针织长裙，高领，长靴','皮夹克配紧身皮裤，高跟短靴','西装三件套，领带，皮鞋',
  '实验白大褂，内搭衬衫，眼镜','咖啡厅围裙，棕色，荷叶边','舞会礼服，露背长裙，长手套',
  '舞台偶像服，亮片短裙，长靴','赛车服，防火层，拉链半开','潜水服，黑色紧身，拉链',
  '睡衣，宽松棉质，条纹','内衣套装，蕾丝，吊带袜','紧身衣，高叉，光泽面料',
  '连体泳衣，高叉，学校款','圣诞装，红白配色，绒边','和风振袖，长袖垂坠，金纹',
  '骑士铠甲，金属光泽，披风','修女服，黑白头巾','魔法少女裙，粉色蓬裙，缎带，短杖',
  /* ---- 扩充：国风 / 汉服 ---- */
  '汉服，齐胸襦裙，藕荷色，披帛垂肩','汉服，交领襦裙，月白配靛蓝，系带束腰','明制袄裙，织金马面裙，立领对襟',
  '汉服，宋制褙子，纱质外披，素雅','唐制齐胸襦裙，大红团花，金步摇','晋制交领襦裙，宽袖，素麻质感',
  '马面裙配立领短袄，革带，玉佩','汉元素日常裙，短褙子配改良裙','汉服，襦裙配大袖衫，层叠飘逸',
  '苗族银饰盛装，蓝靛绣纹，银冠',
  /* ---- 扩充：JK / 水手服 ---- */
  'JK 制服，白衬衫配藏青格裙，领结','JK 制服，水手领短袖，深蓝百褶裙','JK 制服，米色针织背心配格裙，过膝袜',
  'JK 制服，黑色西装外套配格裙','JK 制服，雨季款，长袖衬衫配深绿格裙','JK 制服，粉色系，蝴蝶结领结，短袜',
  /* ---- 扩充：泳装 ---- */
  '竞技泳衣，黑色连体，露背高叉','比基尼，系带款，碎花，腰间薄纱','泳装，白色连体配镂空侧边',
  '死库水，藏青，胸前提名布','泳装，运动风，拼色拉链款','比基尼，纯色三角，挂脖',
  '泳装外披薄罩衫，沙滩风，宽檐帽','潜水泳衣，长袖防晒，印花',
  /* ---- 扩充：兔女郎 / 酒馆 / 性感 ---- */
  '兔女郎装，酒红紧身衣，兔耳发箍，袖扣','兔女郎装，白色，蓬松尾球，高跟','黑丝兔女郎，马甲式，网袜吊带',
  '酒馆女侍装，低胸白衫，束腰，短裙','紧身皮衣，拉链全开，铆钉','薄纱睡衣，半透明，蕾丝边',
  '高开叉礼服，露背，鱼尾裙摆','洛丽塔女仆装，蕾丝围裙配长袜',
  /* ---- 扩充：职业 / 制服 ---- */
  '空乘制服，藏青套装，丝巾，行李箱','白大褂配听诊器，医疗风','警服，藏青，肩章，警帽',
  '教师装，西装套裙配眼镜，抱书','银行职员，白衬衫配马甲，工牌','消防战斗服，橙红反光条',
  '快递工装，橙色，鸭舌帽','图书管理员，开衫配长裙，发髻',
  /* ---- 扩充：运动 / 机能 ---- */
  '田径运动服，亮色紧身，短裤','篮球服，宽松背心，号码','啦啦队服，短裙配绒球',
  '击剑服，白色，护面','马术装，紧身马裤配长靴','棒球服，条纹，及膝袜',
  '机能冲锋衣，黑色，多口袋，束带','赛博机能装，发光条纹，护目镜',
  /* ---- 扩充：和风 / 西式礼裙 ---- */
  '女仆和风装，短振袖配围裙','花魁和服，层层叠穿，金簪','羽织披肩配和装，竹伞',
  '洛可可宫廷裙，蓬袖，束腰，团扇','哥特新娘礼服，黑纱，蕾丝手套','复古旗袍，墨绿丝绒，盘发',
  '晚礼服，一字肩，亮片，长手套','朋克摇滚装，破洞网袜，腰带链',
  /* ---- 扩充：奇幻 / 舞台 ---- */
  '女武神装，羽翼肩甲，短甲裙','精灵游侠装，皮革披肩，长弓','恶魔装，黑红，角饰，尾饰',
  '天使装，白纱羽毛，光环','忍者装，黑色紧身，围巾，护额','武士装，和式甲胄，腰刀',
  '舞台礼服，开背，亮片，拖尾','偶像演出服，渐变短裙，过膝靴，发光手环',
  '护士装，粉白配色，短裙','魔法学院袍，斗篷，徽章，魔杖',
  /* ---- 从「提示词工坊」预设库并入（服饰穿搭 480 条）---- */
  'T恤牛仔裤',
  '连帽卫衣',
  '短款卫衣',
  '牛仔夹克',
  '皮夹克',
  '横须贺夹克',
  '校队便装',
  '夏威夷便装',
  '吊带夏裙',
  '夏日长裙',
  '露肩短裤',
  '短上衣高腰裙',
  '吊带短靴',
  '卷袖衬衫',
  '宽松衬衫',
  '衬衫当外衣',
  '毛衣短裙',
  '开衫叠裙',
  '高领牛仔裤',
  '敞开衬衫',
  '工装背带',
  '连身工装',
  '连体短裤',
  '阔腿卫衣',
  '喇叭裤',
  '诗人衫',
  '森系',
  'Y2K短裙',
  '美式辣妹',
  '姬系辣妹',
  '摇滚辣妹',
  '曼巴辣妹',
  '男辣妹',
  '复古高腰',
  '八十年代',
  '摩德短裙',
  '叠穿',
  '宽松卫衣',
  '吊带袜套装',
  '鱼网吊带袜',
  '连身袜',
  '束腰吊带袜',
  '荷叶束腰',
  '娃娃内衣',
  '新娘内衣',
  '兔女郎',
  '变体兔女郎',
  '反穿兔女郎',
  '透明兔女郎',
  '猫女紧身衣',
  '腿环内衣',
  '颈铃内衣',
  '十字架内衣',
  '珍珠内衣',
  '网纱手套',
  '只穿围裙',
  '丁字紧身衣',
  '露胸紧身衣',
  '连体内衣',
  '过膝吊带袜',
  '手套连身袜',
  '陆军常服',
  '军礼服',
  '海军',
  '海军裙装',
  '警服',
  '女警短裙',
  '战术装',
  '防弹背心',
  '飞行服',
  '坦克兵',
  '军大衣',
  '军装夹克',
  '船形帽军服',
  '侧帽海军',
  '仪仗',
  '头盔作战',
  '女兵裙装',
  '海军大衣',
  '军靴长裤',
  '警官腰带',
  '飞行皮夹克',
  '高领军大衣',
  '防弹战术',
  '大衣围巾',
  '牛角扣大衣',
  '派克大衣',
  '羽绒服',
  '短羽绒服',
  '海军呢大衣',
  '风衣',
  '长大衣',
  '毛皮大衣',
  '连帽大衣',
  '高领大衣',
  '斗篷冬装',
  '雨衣',
  '滑雪装',
  '耳罩大衣',
  '绞花毛衣',
  '毛线套装',
  '俄式皮帽',
  '双排扣大衣',
  '冬日校园',
  '毛衣裙',
  '皮草披肩',
  '雪地靴毛衣',
  '正装和服',
  '振袖',
  '浴衣木屐',
  '短浴衣',
  '羽织和服',
  '宽松和服',
  '分层和服',
  '巫女服',
  '改款巫女',
  '白无垢',
  '袴装',
  '作务衣',
  '法被',
  '半缠',
  '束袖和服',
  '露背和服',
  '无袖和服',
  '侧开和服',
  '只穿和服',
  '和服连衣裙',
  '短和服',
  '草鞋和服',
  '地下足袋袴',
  '蓑衣',
  '抬轿衣',
  '花魁盛装',
  '男性和服',
  '居家作务衣',
  '无肩带和服',
  '哥特时装',
  '哥特十字架',
  '斗篷哥特',
  '紧身哥特',
  '鱼网束腰',
  '哥特晚礼服',
  '贵族斗篷',
  '情绪摇滚',
  '场景系',
  '地雷系',
  '暗黑护士',
  '敞胸毛衣',
  '传统修女',
  '短裙修女',
  '钉饰皮衣',
  '哥特洋装',
  '高领哥特',
  '吊带哥特',
  '复古束腰',
  '朋克皮裤',
  '倒十字哥特',
  '哥特礼帽',
  '露肩哥特',
  '哥特大衣',
  '环扣哥特',
  '珍珠哥特',
  '全身板甲',
  '哥特板甲',
  '胸甲披风',
  '鳞甲',
  '札甲',
  '日本甲',
  '中国甲',
  '希腊甲',
  '罗马甲',
  '锁子甲',
  '法师长袍',
  '女巫',
  '小女巫',
  '魔法少女',
  '魔法少女短披',
  '偶像舞台',
  '偶像练习',
  '插件紧身衣',
  '动力甲',
  '宇航服',
  '赛博街头',
  '紧身连体衣',
  '全身紧身衣',
  '连帽法师',
  '圣骑士',
  '单肩甲',
  '钉甲',
  '华丽甲',
  '肌肉胸甲',
  '天使紧身衣',
  '海盗',
  '盗贼',
  '精灵礼装',
  '恶魔戏服',
  '蝙蝠戏服',
  '经典水手服',
  '水手连衣裙',
  '夏季短袖水手服',
  '冬季围巾校服',
  '西式西装校服',
  '格纹褶裙校服',
  '开衫校服',
  '背心领带校服',
  '菱格背心校服',
  '松袜水手服',
  '过膝袜短裙校服',
  '室内鞋水手服',
  '学生帽水手服',
  '草帽夏日校服',
  '男学生西装',
  '诘襟学生服',
  '体操服',
  '灯笼裤体操服',
  '校队夹克',
  '高领毛衣校服',
  '背带裙校服',
  '领结女校服',
  '长裙冬校服',
  '学校泳装',
  '旧式学校泳装',
  '新式学校泳装',
  '竞技学校泳装',
  '水手比基尼',
  '幼儿园罩衣',
  '明治女学生',
  '男学生背心',
  '露肩夏日校服',
  '不对称长筒袜',
  '绝对领域校服',
  '旗袍高跟',
  '印花旗袍',
  '旗袍披肩',
  '奥黛斗笠',
  '奥黛高跟',
  '韩服',
  '德式围裙裙',
  '纱丽',
  '印度套装',
  '阿拉伯长袍',
  '头巾长裙',
  '古埃及',
  '古希腊希顿',
  '罗马托加',
  '希腊佩普洛斯',
  '苗族银饰',
  '藏袍',
  '蒙古袍',
  '维吾尔套装',
  '满族服装',
  '越南斗笠',
  '夏威夷衫',
  '泰式服装',
  '德式洋装',
  '俄式冬装',
  '中式唐装',
  '斗笠便装',
  '北非头巾',
  '原住民',
  '非洲服饰',
  '阿伊努',
  '齐胸襦裙',
  '交领襦裙',
  '齐胸褶裙',
  '齐胸破裙',
  '明制马面裙',
  '比甲马面裙',
  '短衫齐胸',
  '长衫马面',
  '圆领袍',
  '龙袍',
  '唐装套装',
  '披帛齐胸',
  '半臂齐腰',
  '上杉长裙',
  '短袄马面',
  '宋抹披帛',
  '云肩礼服',
  '交领半臂',
  '方领齐胸',
  '立领长衫',
  '妆花马面裙',
  '道袍',
  '汉服斗篷',
  '织金龙袍',
  '补服官服',
  '广袖披帛',
  '对襟比甲',
  '圆领披帛',
  '比基尼罩衫',
  '系带比基尼',
  '细绳比基尼',
  '微比基尼',
  '高叉比基尼',
  '荷叶边比基尼',
  '蝴蝶结比基尼',
  '单肩比基尼',
  '抹胸比基尼',
  '高腰比基尼',
  '连体泳装',
  '高叉连体',
  '露肩连体',
  '荷叶边连体',
  '无肩带连体',
  '水手连体',
  '女仆连体',
  '裙式泳装',
  '背心泳装',
  '防晒冲浪',
  '竞速泳裤',
  '湿式潜水',
  '敞开湿衣',
  '兔女郎泳装',
  '猫耳比基尼',
  '多层比基尼',
  '复古泳装',
  '竞技泳装',
  '男式泳裤',
  '甜系洛丽塔',
  '古典洛丽塔',
  '哥特洛丽塔',
  '和风洛丽塔',
  '中华风洛丽塔',
  '朋克洛丽塔',
  '军装洛丽塔',
  '王子系',
  '姬系洛丽塔',
  '田园洛丽塔',
  '蛋糕裙洛丽塔',
  '撑裙洛丽塔',
  '头纱洛丽塔',
  '短款甜系',
  '长款古典',
  '露肩洛丽塔',
  '泡袖洛丽塔',
  '十字架哥特洛丽塔',
  '珍珠姬洛丽塔',
  '发带甜系',
  '和风发簪洛丽塔',
  '立领中华洛丽塔',
  '不对称朋克洛丽塔',
  '围裙田园洛丽塔',
  '哥特发饰洛丽塔',
  '开衫日常洛丽塔',
  '吊带甜系',
  '军帽短裙洛丽塔',
  '分体睡衣',
  '印花睡衣',
  '敞开睡衣',
  '猫睡衣',
  '熊睡衣',
  '兔睡衣',
  '睡裙',
  '吊带睡裙',
  '娃娃睡裙',
  '蝴蝶结娃娃裙',
  '衬裙睡袍',
  '浴袍',
  '衬衫睡衣',
  '居家开衫',
  '家居短袖',
  '睡帽睡衣',
  '吊带居家',
  '卫衣居家',
  '睡袍',
  '病号服',
  '动物拖鞋居家',
  '毛绒睡裤',
  '高领居家',
  '婚纱头纱',
  '婚纱长手套',
  '婚纱吊带袜',
  '变体婚纱',
  '舞会礼服',
  '晚礼服',
  '鸡尾酒裙',
  '公主裙',
  '燕尾服',
  '燕尾夹克',
  '尾服手套',
  '三件套礼服',
  '婚礼西装',
  '短晚礼服',
  '鱼尾礼服',
  '挂脖礼服',
  '露背礼服',
  '单肩礼服',
  '开叉晚礼服',
  '礼帽正装',
  '头纱鸡尾酒',
  '弗拉明戈',
  '丧服',
  '贵族舞会',
  '高领礼裙',
  '披肩礼裙',
  '皇冠礼服',
  '新娘吊袜',
  '短裙女仆',
  '长裙女仆',
  '紧身女仆',
  '女仆泳装',
  '软帽女仆',
  '和风女仆',
  '中华风女仆',
  '护士裙',
  '短裙护士',
  '医生白大褂',
  '护士白大褂',
  '科研白大褂',
  '西装裙',
  '三件套西装',
  '女式裤套装',
  '衬衫铅笔裙',
  '高领职场',
  '厨师工装',
  '店员围裙',
  '侍者',
  '乐队制服',
  '空乘套装',
  '短裙服务员',
  '酒保',
  '飞行员',
  '便装飞行员',
  '神父',
  '教师西装',
  '咖啡围裙',
  '圣诞老人',
  '圣诞短裙',
  '圣诞紧身衣',
  '迷你圣诞帽',
  '驯鹿装',
  '圣诞毛衣',
  '圣诞比基尼',
  '万圣节服装',
  '南瓜女巫',
  '蝙蝠万圣节',
  '猫戏服',
  '兔戏服',
  '熊戏服',
  '海盗三角帽',
  '派对帽',
  '生日缎带',
  '节日唐装',
  '雪花圣诞',
  '圣诞斗篷',
  '兔耳万圣节',
  '狼戏服',
  '南瓜帽洋装',
  '驯鹿毛衣',
  '圣诞披肩',
  '小丑帽',
  '花冠夏装',
  '圣诞手套短裙',
  '田径套装',
  '篮球服',
  '棒球服',
  '足球服',
  '排球服',
  '网球连衣裙',
  '网球短裙',
  '骑行套装',
  '瑜伽套装',
  '健身背心',
  '啦啦队',
  '竞技紧身衣',
  '武道服',
  '摔角服',
  '花样滑冰',
  '压缩跑步',
  '连帽田径',
  '冰球毛衣',
  '热身服',
  '运动便装',
  '骑行头盔',
  '芭蕾舞裙',
  '练功服',
  '护膝排球',
  '橄榄球',
  '拳击'
];

/* 成人向成套服饰（仅 NSFW 模式使用，见 engine 的 outfit 分支）*/
const ANIME_OUTFIT_NSFW = [
  '开裆无罩杯',
  '开裆网袜',
  '开裆娃娃裙',
  '开裆连身袜',
  '开裆紧身衣',
  '开裆连体衣',
  '露胸开裆',
  '无罩杯束腰',
  '无罩杯连裤袜',
  '开裆连裤袜',
  '开裆灯笼裤',
  '托胸开裆',
  '胸衣开裆',
  '极小内衣',
  '细绳内衣',
  '环扣内衣',
  '真空束腰',
  '系带内衣',
  '荷叶边内衣',
  '透视情趣内衣',
  '连体情趣内衣',
  '乳贴阴贴',
  '心形遮点',
  '星形遮点',
  '十字遮点',
  '猫耳遮点',
  '黑桃遮点',
  '兔耳遮点',
  '贝壳遮点',
  '蝙蝠遮点',
  '乳贴丁字裤',
  '珍珠丁字裤',
  '后庭珠饰',
  'C字裤遮点',
  '乳帘遮点',
  '连身袜遮点',
  '网纱连身袜',
  '露胸连身袜',
  '无罩杯连身袜',
  '破洞连身袜',
  '乳胶紧身衣',
  '乳胶连身袜',
  '乳胶内衣',
  '皮革束腰',
  '皮革束带',
  '胶衣头套',
  '全包紧身衣',
  '套衣头套',
  '长手套紧身衣',
  '束缚装口球',
  '胸束带开裆',
  '束带遮点',
  '束带开裆',
  '单臂束缚装',
  '贞操内衣',
  '铆钉吊袜带',
  '赤膊护裆',
  '护裆贞操带',
  '开裆兔女郎',
  '反穿开裆兔娘',
  '兔装全套',
  '透明兔装',
  '猫爪紧身衣',
  '猫咪内衣',
  '真空女仆',
  '开裆女仆',
  '开裆护士',
  '开裆修女',
  '真空职业装',
  '真空警服',
  '真空水手服',
  '开裆新娘',
  '无内裤婚纱',
  '圣诞内衣',
  '圣诞泳装',
  '万圣遮点',
  '真空浴衣',
  '敞开和服',
  '兜裆布',
  '束带兜裆',
  '只穿衬衫',
  '处男杀手毛衣',
  '处男杀手装',
  '只穿卫衣',
  '只穿睡袍',
  '只披斗篷',
  '只围浴巾',
  '只缠缎带',
  '只缠绷带',
  '真空围裙',
  '真空吊带袜',
  '只留内衣',
  '衬衫露肩带',
  '破裙',
  '破袜破裤',
  '破衬衫',
  '透视睡裙',
  '真空衬裙',
  '透视睡袍',
  '真空娃娃裙',
  '极小比基尼',
  '吊带泳装',
  '透视细绳泳装',
  '开裆无罩杯泳装',
  '丁字泳装',
  '高叉泳装',
  '露臀泳装',
  '比基尼甲',
  '反穿比基尼甲',
  '环扣泳装'
];

/* 上装 */
const ANIME_TOP = [
  '白衬衫，袖口挽起','oversize 卫衣，帽子垂在背后','短款针织开衫，露出腰线','紧身高领毛衣',
  '水手服上衣，领巾','西装外套，垫肩','露脐短T','薄纱罩衫，若隐若现','皮夹克，金属拉链',
  '校服外套，徽章','吊带背心','真丝衬衫，领口微敞','连帽衫，拉链半开','棒球外套，刺绣',
  '毛衣背心配衬衫','束腰胸衣，系带','透明PVC 上衣','发光条纹紧身衣','战术背心，挂满装备',
  '和服上衣，交领','毛绒外套，毛领','抹胸，露肩','衬衫外搭马甲','机能风夹克，多口袋'
];

/* 下装 */
const ANIME_BOTTOM = [
  '百褶短裙','格子裙','高腰牛仔裤','包臀长裙','开衩长裙','工装短裤','紧身皮裤',
  '纱裙，层叠','运动短裤','灯笼裤','和服袴','阔腿西裤','背带裙','超短热裤',
  '网纱长裙','绣纹马面裙','骑行裤','绑带短裤','及地长裙','牛仔短裤，磨边'
];

/* 鞋袜 */
const ANIME_SHOES = [
  '黑色过膝袜','白色及膝袜','吊带袜配高跟','光脚','细带高跟凉鞋','厚底靴',
  '帆布鞋','乐福鞋','绑带长靴','裸色丝袜','渔网袜','蕾丝长筒袜','脚踝系带高跟',
  '运动鞋','木屐','皮靴及膝','泡泡袜','蕾丝边短袜','赤足踩在地板上','凉鞋'
];

/* 配饰 */
const ANIME_ACC = [
  '细银项链','choker 项圈','珍珠耳坠','发带','贝雷帽','细框眼镜','耳机挂颈',
  '皮质手套','腰链','腕表','丝绒发带','发夹','围巾','单片眼镜','指环',
  '毛绒发饰','星星发夹','铃铛脚链','蝴蝶结发带','胸针','墨镜','羽毛耳饰',
  '狐狸面具','猫耳发箍','缎带颈饰','肩挎小包','透明雨伞'
];

/* 背景 */
const ANIME_PLACE = [
  '教室，夕阳斜照，课桌整齐','学校天台，铁丝网护栏','图书馆书架间，光束穿过',
  '樱花树下，花瓣飘落','神社台阶，朱红鸟居','海边沙滩，浪花到脚边',
  '卧室，床单凌乱，窗帘透光','浴室，瓷砖，水汽弥漫','厨房，料理台，午后光',
  '屋顶，城市远景','霓虹街道，雨后积水反光','游戏中心，霓虹机台',
  '咖啡厅靠窗座位','电车车厢，车窗外的流光','夏日祭典，灯笼与烟火',
  '雪夜街道，路灯下飘雪','操场跑道，黄昏','音乐教室，钢琴旁',
  '天台水塔旁，夜风','神社境内，石灯笼','游泳池，水面反光','榻榻米和室，纸拉门',
  '校园走廊，夕阳拉长影子','车站站台','花田，薰衣草或向日葵','废弃工厂，铁锈与光柱',
  '水族馆，蓝色水光','摩天轮，夜景','阁楼，天窗光束','舞台聚光灯下',
  '电梯内，镜面金属','办公室深夜，显示器蓝光','竹林小径','湖畔，倒影',
  '游乐园，旋转木马','飞机机舱，云层窗外','古风庭院，回廊','废墟教堂，彩色玻璃'
];

/* 姿态 */
const ANIME_POSE = [
  '站立，双手自然垂下','双手抱胸，微微侧头','坐姿，翘二郎腿','坐在桌沿，一只脚着地',
  '回眸，肩膀微转','托腮，手肘撑在桌面','撩头发，手指穿过发丝','靠墙，单手插兜',
  '蹲下，手撑地面','伸懒腰，双臂上举','双手背在身后，身体前倾','比 V 字手势',
  '跪坐，双手放在膝上','趴在桌上，脸侧向一边','仰头，颈线拉长','侧身，重心在一只脚',
  '走路中被抓拍，裙摆扬起','双手捧着杯子','低头看手机，屏幕映在脸上',
  '单手叉腰，另一只手举起','双臂张开，迎风','抱膝坐在地上','一只手扶着帽檐',
  '身体微微后仰，手撑在身后','踮脚，像是要够什么','双手交叠在身前，拘谨',
  '歪头，发丝滑落肩头','抬手遮阳，看向远处','转身，衣摆扬起','盘腿坐着'
];

/* ---------- 画风 / 媒介 ---------- */
const ART_STYLE = {
  anime: ['anime style','clean lineart','cel shading','vibrant colors','soft gradient shading','detailed anime eyes','manga panel aesthetic','studio-quality anime key visual'],
  semi: ['semi-realistic','thick paint texture','painterly shading','rich color palette','detailed skin texture','soft rim light','illustration poster quality'],
  real: ['photorealistic','highly detailed skin pores','natural lighting','35mm photograph','shallow depth of field','film grain','realistic anatomy','raw photo'],
  comic: ['western comic style','bold ink lines','flat color blocks','dynamic shading','comic book cover','graphic novel aesthetic'],
  chibi: ['chibi style','big head small body','cute pastel palette','simple blush','rounded shapes','sticker illustration']
};

/* =========================================================
   底模预设 —— 不同底模的画质词、收尾标签、负面词写法不一样
   ========================================================= */
const MODEL_PRESETS = {

  /* Illustrious 系（光辉 / Illustrious-XL，含各类微调）：
     画质词放最前；不需要 rating 标签；负面词沿用官方推荐那串 */
  illustrious: {
    key: 'illustrious',
    name: 'Illustrious（光辉）',
    hint: '画质词前置，负面词用官方推荐串',
    prefix: ['masterpiece', 'best quality', 'amazing quality', 'very aesthetic', 'absurdres', 'newest'],
    suffix: [],
    neg: [
      'lowres','bad anatomy','bad hands','text','error','missing fingers','extra digit','fewer digits',
      'cropped','worst quality','low quality','normal quality','jpeg artifacts','signature','watermark',
      'username','blurry','artist name','bad feet','poorly drawn','extra limbs','disfigured','deformed',
      'cross-eyed','mutated hands','out of frame','extra fingers','gross proportions','ugly','duplicate',
      'morbid','mutilated','long neck','missing arms','extra legs','too many fingers'
    ]
  },

  /* Animagine XL 3.x：
     画质词前置，末尾必须补 (year) + (style) + rating:safe/sensitive/explicit */
  animagine: {
    key: 'animagine',
    name: 'Animagine XL 3.x',
    hint: '末尾补 year 2023 / anime coloring / rating:xxx',
    prefix: ['masterpiece', 'best quality'],
    suffix: [],
    year: 'year 2023',
    style: ['anime coloring'],
    rating: { sfw: 'rating:general', nsfw: 'rating:explicit' },
    neg: [
      'lowres','bad anatomy','bad hands','text','error','missing fingers','extra digit','fewer digits',
      'cropped','worst quality','low quality','normal quality','jpeg artifacts','signature','watermark',
      'username','blurry','artist name','bad feet','poorly drawn','extra limbs','disfigured','deformed',
      'cross-eyed','mutated hands','out of frame','extra fingers','gross proportions','ugly','duplicate'
    ]
  },

  /* Pony Diffusion V6：
     必须用 score_9 / score_8_up 这类评分标签，配 source_anime 与 rating_explicit */
  pony: {
    key: 'pony',
    name: 'Pony Diffusion V6',
    hint: '评分标签前置，配 source_anime / rating_xxx',
    prefix: ['score_9', 'score_8_up', 'score_7_up', 'score_6_up', 'score_5_up', 'score_4_up', 'source_anime'],
    suffix: [],
    rating: { sfw: 'rating_safe', nsfw: 'rating_explicit' },
    neg: [
      'score_6','score_5','score_4','score_3_down','source_pony','3d','low quality','bad anatomy',
      'bad hands','text','error','missing fingers','extra digit','fewer digits','cropped',
      'jpeg artifacts','signature','watermark','username','blurry','artist name','ugly','duplicate',
      'morbid','mutilated','extra limbs','disfigured','deformed','cross-eyed','mutated hands'
    ]
  },
  /* NoobAI-XL 系列（NoobAI / NoobAI-XL-v1.1 等，Illustrious 系微调）：
     质量词前置，风格接近 Illustrious；负面词沿用官方/常用串 */
  noobai: {
    key: 'noobai',
    name: 'NoobAI-XL',
    hint: 'NoobAI 系列，质量词前置，接近 Illustrious',
    prefix: ['masterpiece', 'best quality', 'amazing quality', 'very aesthetic', 'absurdres', 'newest'],
    suffix: [],
    neg: [
      'lowres','bad anatomy','bad hands','text','error','missing fingers','extra digit','fewer digits',
      'cropped','worst quality','low quality','normal quality','jpeg artifacts','signature','watermark',
      'username','blurry','artist name','bad feet','poorly drawn','extra limbs','disfigured','deformed',
      'cross-eyed','mutated hands','out of frame','extra fingers','gross proportions','ugly','duplicate',
      'morbid','mutilated','long neck','missing arms','extra legs','too many fingers'
    ]
  },

  /* ---------- 具体 Checkpoint（提示词写法继承对应系列，ckpt 供 Comfy 选用） ---------- */
  wai_illu_v170: {
    key: 'wai_illu_v170',
    name: 'waiIllustrious SDXL v170',
    hint: 'WAI Illustrious v170，质量词同光辉系',
    styleOf: 'illustrious',
    ckpt: 'waiIllustriousSDXL_v170.safetensors',
    prefix: ['masterpiece', 'best quality', 'amazing quality', 'very aesthetic', 'absurdres', 'newest'],
    suffix: [],
    neg: [
      'lowres','bad anatomy','bad hands','text','error','missing fingers','extra digit','fewer digits',
      'cropped','worst quality','low quality','normal quality','jpeg artifacts','signature','watermark',
      'username','blurry','artist name','bad feet','poorly drawn','extra limbs','disfigured','deformed',
      'cross-eyed','mutated hands','out of frame','extra fingers','gross proportions','ugly','duplicate',
      'morbid','mutilated','long neck','missing arms','extra legs','too many fingers'
    ]
  },
  wai_illu_v160: {
    key: 'wai_illu_v160',
    name: 'waiIllustrious SDXL v160',
    hint: 'WAI Illustrious v160，质量词同光辉系',
    styleOf: 'illustrious',
    ckpt: 'waiIllustriousSDXL_v160.safetensors',
    prefix: ['masterpiece', 'best quality', 'amazing quality', 'very aesthetic', 'absurdres', 'newest'],
    suffix: [],
    neg: [
      'lowres','bad anatomy','bad hands','text','error','missing fingers','extra digit','fewer digits',
      'cropped','worst quality','low quality','normal quality','jpeg artifacts','signature','watermark',
      'username','blurry','artist name','bad feet','poorly drawn','extra limbs','disfigured','deformed',
      'cross-eyed','mutated hands','out of frame','extra fingers','gross proportions','ugly','duplicate',
      'morbid','mutilated','long neck','missing arms','extra legs','too many fingers'
    ]
  },
  wai_illu_v140: {
    key: 'wai_illu_v140',
    name: 'waiIllustrious SDXL v140',
    hint: 'WAI Illustrious v140，质量词同光辉系',
    styleOf: 'illustrious',
    ckpt: 'waiIllustriousSDXL_v140.safetensors',
    prefix: ['masterpiece', 'best quality', 'amazing quality', 'very aesthetic', 'absurdres', 'newest'],
    suffix: [],
    neg: [
      'lowres','bad anatomy','bad hands','text','error','missing fingers','extra digit','fewer digits',
      'cropped','worst quality','low quality','normal quality','jpeg artifacts','signature','watermark',
      'username','blurry','artist name','bad feet','poorly drawn','extra limbs','disfigured','deformed',
      'cross-eyed','mutated hands','out of frame','extra fingers','gross proportions','ugly','duplicate',
      'morbid','mutilated','long neck','missing arms','extra legs','too many fingers'
    ]
  },
  illu_xl_v11: {
    key: 'illu_xl_v11',
    name: 'Illustrious-XL v1.1',
    hint: 'Illustrious-XL v1.1 原版，质量词同光辉系',
    styleOf: 'illustrious',
    ckpt: 'Illustrious-XL-v1.1.safetensors',
    prefix: ['masterpiece', 'best quality', 'amazing quality', 'very aesthetic', 'absurdres', 'newest'],
    suffix: [],
    neg: [
      'lowres','bad anatomy','bad hands','text','error','missing fingers','extra digit','fewer digits',
      'cropped','worst quality','low quality','normal quality','jpeg artifacts','signature','watermark',
      'username','blurry','artist name','bad feet','poorly drawn','extra limbs','disfigured','deformed',
      'cross-eyed','mutated hands','out of frame','extra fingers','gross proportions','ugly','duplicate',
      'morbid','mutilated','long neck','missing arms','extra legs','too many fingers'
    ]
  },
  illu_xl10_v10: {
    key: 'illu_xl10_v10',
    name: 'illustriousXL10 v10',
    hint: 'illustriousXL10 v10，质量词同光辉系',
    styleOf: 'illustrious',
    ckpt: 'illustriousXL10_v10.safetensors',
    prefix: ['masterpiece', 'best quality', 'amazing quality', 'very aesthetic', 'absurdres', 'newest'],
    suffix: [],
    neg: [
      'lowres','bad anatomy','bad hands','text','error','missing fingers','extra digit','fewer digits',
      'cropped','worst quality','low quality','normal quality','jpeg artifacts','signature','watermark',
      'username','blurry','artist name','bad feet','poorly drawn','extra limbs','disfigured','deformed',
      'cross-eyed','mutated hands','out of frame','extra fingers','gross proportions','ugly','duplicate',
      'morbid','mutilated','long neck','missing arms','extra legs','too many fingers'
    ]
  },
  coco_noobai_v70: {
    key: 'coco_noobai_v70',
    name: 'cocoStyle NoobAI-XL v70',
    hint: 'cocoStyle NoobAI-XL v70，质量词同 NoobAI 系',
    styleOf: 'noobai',
    ckpt: 'cocoStyleNoobaiXL_v70.safetensors',
    prefix: ['masterpiece', 'best quality', 'amazing quality', 'very aesthetic', 'absurdres', 'newest'],
    suffix: [],
    neg: [
      'lowres','bad anatomy','bad hands','text','error','missing fingers','extra digit','fewer digits',
      'cropped','worst quality','low quality','normal quality','jpeg artifacts','signature','watermark',
      'username','blurry','artist name','bad feet','poorly drawn','extra limbs','disfigured','deformed',
      'cross-eyed','mutated hands','out of frame','extra fingers','gross proportions','ugly','duplicate',
      'morbid','mutilated','long neck','missing arms','extra legs','too many fingers'
    ]
  }

};

/* ---------- 通用画质词（底模预设未覆盖时的兜底） ---------- */
const QUALITY_TAG = ['masterpiece','best quality','ultra-detailed','high resolution','8k','sharp focus','beautiful lighting'];

/* ---------- 负面提示词（底模预设未覆盖时的兜底） ---------- */
const NEG_BASE = [
  'lowres','bad anatomy','bad hands','missing fingers','extra digits','fewer digits','cropped',
  'worst quality','low quality','jpeg artifacts','signature','watermark','username','blurry',
  'bad proportions','gross proportions','error','duplicate','mutated hands','poorly drawn face'
];
const NEG_NSFW_EXTRA = ['censored','mosaic censoring','bar censor','covering body','clothed','underwear','bra','panties'];
