export type Role = 'Đấu sĩ' | 'Pháp sư' | 'Sát thủ' | 'Xạ thủ' | 'Đỡ đòn' | 'Trợ thủ';
export type HeroId = 'libai' | 'diaochan' | 'hanxin' | 'houyi' | 'lvbu' | 'daqiao';
export type SkinModel = 'qinglian' | 'thousand-fox' | 'phoenix' | 'bewitching' | 'midsummer' | 'cat-dance' | 'national-warrior' | 'white-dragon' | 'street-fighter' | 'demigod' | 'sagittarius' | 'endless-stars' | 'peerless-demon' | 'heavenly-demon' | 'doomsday' | 'tide' | 'pet-diary' | 'white-crane';
export type Motif = 'wind' | 'fox' | 'phoenix' | 'petal' | 'butterfly' | 'cat' | 'spear' | 'dragon' | 'street' | 'sun' | 'gold' | 'tech' | 'demon' | 'water' | 'pet' | 'crane';
export interface Skin { name:string; title:string; model:SkinModel; motif:Motif; description:string; primary:string; secondary:string; glow:string; hair:string; trim:string; }
export interface Ability { name:string; description:string; icon:string; cooldown:number; range:number; }
export interface HeroDef {
  id:HeroId; name:string; sourceName:string; sourceId:number; epithet:string; role:Role; quote:string; lore:string;
  hp:number; attack:number; speed:number; range:number; attackRate:number;
  difficulty:number; stats:number[]; weapon:'sword' | 'fan' | 'spear' | 'bow' | 'halberd' | 'tide-staff';
  skins:Skin[]; skills:Ability[];
}
export const LEGACY_HERO_IDS:Record<string,HeroId>={phong:'libai',lien:'diaochan',nguyet:'hanxin',vu:'houyi',son:'lvbu',mieu:'daqiao'};
export const HEROES:HeroDef[]=[
  {
    "id": "libai",
    "name": "Lý Bạch",
    "epithet": "THANH LIÊN KIẾM TIÊN",
    "role": "Sát thủ",
    "quote": "Một bầu rượu, một thanh kiếm, một đời tiêu dao.",
    "lore": "Kiếm khách lãng du của Trường An. Áo trắng, bầu rượu và thanh trường kiếm tạo nên phong thái thi sĩ giữa chiến trường.",
    "hp": 1550,
    "attack": 93,
    "speed": 242,
    "range": 95,
    "attackRate": 0.72,
    "difficulty": 2,
    "stats": [
      9,
      7,
      8,
      4
    ],
    "weapon": "sword",
    "skins": [
      {
        "name": "Thanh Liên Kiếm Tiên",
        "title": "NGUYÊN BẢN",
        "model": "qinglian",
        "motif": "wind",
        "description": "Áo trắng viền xanh, tóc nâu, khăn choàng đỏ và bầu rượu bên hông.",
        "primary": "#e9e4cf",
        "secondary": "#34474f",
        "glow": "#a0e8ec",
        "hair": "#734c3d",
        "trim": "#b89459"
      },
      {
        "name": "Thiên Niên Chi Hồ",
        "title": "SỬ THI",
        "model": "thousand-fox",
        "motif": "fox",
        "description": "Tai hồ ly, tóc tím bạc, giáp đen tím và đuôi hồ ly ánh điện.",
        "primary": "#9e7ab9",
        "secondary": "#292638",
        "glow": "#c0a3ff",
        "hair": "#bca4d8",
        "trim": "#c7b4db"
      },
      {
        "name": "Phượng Cầu Hoàng",
        "title": "HUYỀN THOẠI",
        "model": "phoenix",
        "motif": "phoenix",
        "description": "Tóc trắng, trường bào trắng vàng, lông phượng và trường kiếm đỏ ánh kim.",
        "primary": "#f4eee3",
        "secondary": "#8e3434",
        "glow": "#ffd593",
        "hair": "#eff0ed",
        "trim": "#d8b66b"
      }
    ],
    "skills": [
      {
        "name": "Tương Tiến Tửu",
        "description": "Lướt theo hướng ngắm, chém mọi kẻ địch trên đường. Gây 180 sát thương.",
        "icon": "slash",
        "cooldown": 5,
        "range": 320
      },
      {
        "name": "Thần Lai Chi Bút",
        "description": "Vẽ kiếm trận quanh người, gây 220 sát thương và làm chậm địch trong 2 giây.",
        "icon": "spin",
        "cooldown": 8,
        "range": 175
      },
      {
        "name": "Thanh Liên Kiếm Ca",
        "description": "Tung năm kiếm ảnh vào vùng ngắm, gây tổng 480 sát thương và choáng 1 giây.",
        "icon": "sword",
        "cooldown": 24,
        "range": 450
      }
    ],
    "sourceName": "李白",
    "sourceId": 131
  },
  {
    "id": "diaochan",
    "name": "Điêu Thuyền",
    "epithet": "BẾ NGUYỆT CHI NHAN",
    "role": "Pháp sư",
    "quote": "Vũ điệu chớm nở, cánh hoa đã phủ kín trời.",
    "lore": "Vũ cơ với dải lụa hồng và những cánh hoa xoay theo bước chân. Vẻ thanh thoát ẩn chứa ma pháp làm chủ cả giao tranh.",
    "hp": 1100,
    "attack": 66,
    "speed": 218,
    "range": 330,
    "attackRate": 0.95,
    "difficulty": 2,
    "stats": [
      10,
      4,
      5,
      9
    ],
    "weapon": "fan",
    "skins": [
      {
        "name": "Bế Nguyệt Chi Nhan",
        "title": "NGUYÊN BẢN",
        "model": "bewitching",
        "motif": "petal",
        "description": "Váy hồng nhiều lớp, tóc đen nâu, trâm hoa và dải lụa vũ cơ.",
        "primary": "#eb8cab",
        "secondary": "#803653",
        "glow": "#ffc0df",
        "hair": "#43303b",
        "trim": "#e2bd72"
      },
      {
        "name": "Trọng Hạ Dạ Chi Mộng",
        "title": "HUYỀN THOẠI",
        "model": "midsummer",
        "motif": "butterfly",
        "description": "Váy tím dạ hội, tóc bạc tím, vương miện và cánh bướm trong suốt.",
        "primary": "#aa8cdb",
        "secondary": "#493660",
        "glow": "#d8b9ff",
        "hair": "#e4d6f3",
        "trim": "#d6c2ef"
      },
      {
        "name": "Miêu Ảnh Huyễn Vũ",
        "title": "FMVP",
        "model": "cat-dance",
        "motif": "cat",
        "description": "Mặt nạ mèo, tóc bạc, phục trang tím đen và dải lụa đỏ của vũ hội huyễn ảnh.",
        "primary": "#9578bf",
        "secondary": "#302437",
        "glow": "#ec9ae8",
        "hair": "#eae2ef",
        "trim": "#d5a873"
      }
    ],
    "skills": [
      {
        "name": "Lạc Hồng Vũ",
        "description": "Phóng hoa cầu theo hướng ngắm, gây 220 sát thương diện rộng khi trúng địch.",
        "icon": "flower",
        "cooldown": 4,
        "range": 650
      },
      {
        "name": "Duyên Tâm Kết",
        "description": "Đặt hoa trận tại vùng ngắm, gây 75 sát thương mỗi nhịp trong 3 giây và làm chậm.",
        "icon": "petal",
        "cooldown": 10,
        "range": 520
      },
      {
        "name": "Trản Phong Hoa",
        "description": "Mở đóa sen ma pháp, tấn công vùng ngắm 5 nhịp, gây tổng 600 sát thương.",
        "icon": "flower",
        "cooldown": 27,
        "range": 650
      }
    ],
    "sourceName": "貂蝉",
    "sourceId": 141
  },
  {
    "id": "hanxin",
    "name": "Hàn Tín",
    "epithet": "QUỐC SĨ VÔ SONG",
    "role": "Sát thủ",
    "quote": "Mũi thương đã tới, chiến cuộc đã định.",
    "lore": "Chiến tướng cơ động với trường thương và mái tóc đỏ buộc cao. Những pha lao tới quyết đoán mở đường thẳng vào hậu tuyến.",
    "hp": 1180,
    "attack": 110,
    "speed": 266,
    "range": 83,
    "attackRate": 0.57,
    "difficulty": 3,
    "stats": [
      10,
      4,
      10,
      5
    ],
    "weapon": "spear",
    "skins": [
      {
        "name": "Quốc Sĩ Vô Song",
        "title": "NGUYÊN BẢN",
        "model": "national-warrior",
        "motif": "spear",
        "description": "Tóc đỏ buộc cao, giáp bạc, chiến bào đỏ và trường thương lưỡi bạc.",
        "primary": "#d3d9df",
        "secondary": "#772d36",
        "glow": "#f3c5b2",
        "hair": "#ba493e",
        "trim": "#bfa477"
      },
      {
        "name": "Bạch Long Ngâm",
        "title": "SỬ THI",
        "model": "white-dragon",
        "motif": "dragon",
        "description": "Tóc trắng, long giáp trắng xanh, mão sừng rồng và trường thương đầu rồng.",
        "primary": "#e4eef0",
        "secondary": "#365e7a",
        "glow": "#9ddfff",
        "hair": "#e9f3f2",
        "trim": "#cfb76d"
      },
      {
        "name": "Nhai Đầu Bá Vương",
        "title": "DŨNG GIẢ",
        "model": "street-fighter",
        "motif": "street",
        "description": "Áo hoodie vàng, mũ lưỡi trai, quần tối màu và trường thương đường phố.",
        "primary": "#efbd42",
        "secondary": "#343844",
        "glow": "#ffe59a",
        "hair": "#bc493b",
        "trim": "#f2eee0"
      }
    ],
    "skills": [
      {
        "name": "Vô Tình Xung Phong",
        "description": "Lướt qua kẻ địch bằng trường thương, gây 200 sát thương và tăng tốc trong 2 giây.",
        "icon": "spear",
        "cooldown": 5,
        "range": 360
      },
      {
        "name": "Bối Thủy Nhất Chiến",
        "description": "Tung thương khí hình quạt. Năm luồng thương khí, mỗi luồng gây 100 sát thương.",
        "icon": "arrows",
        "cooldown": 7,
        "range": 520
      },
      {
        "name": "Quốc Sĩ Vô Song",
        "description": "Áp sát kẻ địch gần điểm ngắm, tung liên hoàn thương gây 450 sát thương.",
        "icon": "spear",
        "cooldown": 23,
        "range": 550
      }
    ],
    "sourceName": "韩信",
    "sourceId": 150
  },
  {
    "id": "houyi",
    "name": "Hậu Nghệ",
    "epithet": "BÁN THẦN CHI CUNG",
    "role": "Xạ thủ",
    "quote": "Ánh mặt trời cũng phải nhường đường cho mũi tên.",
    "lore": "Thần xạ thủ nắm giữ sức mạnh mặt trời. Giáp vàng, cung lớn và mũi tên ánh sáng là dấu ấn trên mọi chiến trường.",
    "hp": 1060,
    "attack": 95,
    "speed": 232,
    "range": 395,
    "attackRate": 0.63,
    "difficulty": 2,
    "stats": [
      9,
      3,
      7,
      7
    ],
    "weapon": "bow",
    "skins": [
      {
        "name": "Bán Thần Chi Cung",
        "title": "NGUYÊN BẢN",
        "model": "demigod",
        "motif": "sun",
        "description": "Tóc nâu đỏ, giáp vàng đồng, dải chiến bào đỏ và trường cung mặt trời.",
        "primary": "#d7b267",
        "secondary": "#643a34",
        "glow": "#ffd68b",
        "hair": "#9b4a36",
        "trim": "#f0d59a"
      },
      {
        "name": "Hoàng Kim Xạ Thủ",
        "title": "HOÀNG ĐẠO",
        "model": "sagittarius",
        "motif": "gold",
        "description": "Thánh y Nhân Mã vàng, mũ trụ có cánh, đôi cánh vàng lớn và cung hoàng kim.",
        "primary": "#edc45b",
        "secondary": "#886324",
        "glow": "#fff0a8",
        "hair": "#ad743c",
        "trim": "#fff0b5"
      },
      {
        "name": "Vô Tận Tinh Mang",
        "title": "HUYỀN THOẠI",
        "model": "endless-stars",
        "motif": "tech",
        "description": "Chiến giáp tương lai xanh bạc, kính năng lượng và cung cơ giới ánh lam.",
        "primary": "#c5dce8",
        "secondary": "#253d5d",
        "glow": "#8feaff",
        "hair": "#d2e8ee",
        "trim": "#73bde9"
      }
    ],
    "skills": [
      {
        "name": "Đa Trọng Tiễn Thỉ",
        "description": "Bắn ba mũi tên xuyên thấu theo hình quạt, mỗi mũi gây 150 sát thương.",
        "icon": "arrows",
        "cooldown": 5,
        "range": 700
      },
      {
        "name": "Lạc Nhật Dư Huy",
        "description": "Bước lùi chiến thuật, hồi 90 máu và tăng 45% tốc chạy trong 3 giây.",
        "icon": "sun",
        "cooldown": 9,
        "range": 240
      },
      {
        "name": "Chước Nhật Chi Thỉ",
        "description": "Bắn thần tiễn mặt trời xuyên thấu cực xa, gây 500 sát thương.",
        "icon": "phoenix",
        "cooldown": 25,
        "range": 1100
      }
    ],
    "sourceName": "后羿",
    "sourceId": 169
  },
  {
    "id": "lvbu",
    "name": "Lữ Bố",
    "epithet": "VÔ SONG CHI MA",
    "role": "Đấu sĩ",
    "quote": "Phương thiên họa kích, ai dám cản đường?",
    "lore": "Chiến thần với phương thiên họa kích, giáp đỏ đen và hai dải linh vũ trên mão. Hiện diện của hắn báo hiệu giao tranh dữ dội.",
    "hp": 2200,
    "attack": 76,
    "speed": 200,
    "range": 110,
    "attackRate": 1,
    "difficulty": 1,
    "stats": [
      6,
      10,
      4,
      9
    ],
    "weapon": "halberd",
    "skins": [
      {
        "name": "Vô Song Chi Ma",
        "title": "NGUYÊN BẢN",
        "model": "peerless-demon",
        "motif": "demon",
        "description": "Giáp đỏ đen, mão hai linh vũ dài, tóc đen và phương thiên họa kích.",
        "primary": "#af3c3b",
        "secondary": "#302e37",
        "glow": "#ffad8b",
        "hair": "#232532",
        "trim": "#d6b16c"
      },
      {
        "name": "Thiên Ma Liễu Loạn",
        "title": "HUYỀN THOẠI",
        "model": "heavenly-demon",
        "motif": "demon",
        "description": "Sừng quỷ, giáp hắc tử, cánh ma lớn và chiến kích ánh tím.",
        "primary": "#766085",
        "secondary": "#2b2436",
        "glow": "#dc9bff",
        "hair": "#c9bdde",
        "trim": "#b7a4d2"
      },
      {
        "name": "Mạt Nhật Cơ Giáp",
        "title": "SỬ THI",
        "model": "doomsday",
        "motif": "tech",
        "description": "Cơ giáp trắng xám, khớp máy xanh neon, kính quang học và kích cơ giới.",
        "primary": "#c3d4c9",
        "secondary": "#293d3c",
        "glow": "#b6ff8c",
        "hair": "#afc5bf",
        "trim": "#8ccd68"
      }
    ],
    "skills": [
      {
        "name": "Phương Thiên Họa Trảm",
        "description": "Lao tới vung phương thiên họa kích, gây 170 sát thương và làm choáng địch trên đường.",
        "icon": "halberd",
        "cooldown": 7,
        "range": 280
      },
      {
        "name": "Tham Lang Chi Ác",
        "description": "Hấp thụ tinh lực, nhận 450 lá chắn trong 5 giây và hồi 120 máu.",
        "icon": "shield",
        "cooldown": 11,
        "range": 1
      },
      {
        "name": "Ma Thần Giáng Thế",
        "description": "Giáng chiến kích xuống đất, gây 420 sát thương và choáng 1,5 giây quanh bản thân.",
        "icon": "quake",
        "cooldown": 26,
        "range": 280
      }
    ],
    "sourceName": "吕布",
    "sourceId": 123
  },
  {
    "id": "daqiao",
    "name": "Đại Kiều",
    "epithet": "THƯƠNG HẢI CHI DIỆU",
    "role": "Trợ thủ",
    "quote": "Dòng nước sẽ dẫn lối trở về.",
    "lore": "Thiếu nữ Giang Đông bên cây trượng cá chép. Dòng thủy triều và những vòng nước dịu dàng kết nối đồng đội khắp chiến trường.",
    "hp": 1250,
    "attack": 62,
    "speed": 240,
    "range": 320,
    "attackRate": 0.85,
    "difficulty": 1,
    "stats": [
      5,
      6,
      7,
      10
    ],
    "weapon": "tide-staff",
    "skins": [
      {
        "name": "Thương Hải Chi Diệu",
        "title": "NGUYÊN BẢN",
        "model": "tide",
        "motif": "water",
        "description": "Tóc nâu cam buộc đôi, váy trắng xanh, nơ lớn và trượng cá chép.",
        "primary": "#c5e6e4",
        "secondary": "#27778b",
        "glow": "#a4efff",
        "hair": "#b9673e",
        "trim": "#d8bb77"
      },
      {
        "name": "Miêu Cẩu Nhật Ký",
        "title": "SỬ THI",
        "model": "pet-diary",
        "motif": "pet",
        "description": "Mũ tai cún, tóc nâu, váy yếm xanh kem, túi đeo và chú cún đồng hành.",
        "primary": "#eee2be",
        "secondary": "#4c7d76",
        "glow": "#d1f2bf",
        "hair": "#96573c",
        "trim": "#daa95e"
      },
      {
        "name": "Bạch Hạc Lương Thần Nữ",
        "title": "SỬ THI",
        "model": "white-crane",
        "motif": "crane",
        "description": "Tóc đen dài, bạch y thủy mặc, dải lụa xanh ngọc và trượng bạch hạc.",
        "primary": "#f0eee0",
        "secondary": "#365962",
        "glow": "#bde6df",
        "hair": "#272e3b",
        "trim": "#c6b376"
      }
    ],
    "skills": [
      {
        "name": "Lý Dược Chi Triều",
        "description": "Phóng thủy cầu gây 180 sát thương, đồng thời hồi 80 máu cho đồng minh gần bên.",
        "icon": "wave",
        "cooldown": 4,
        "range": 600
      },
      {
        "name": "Túc Mệnh Chi Hải",
        "description": "Hồi 260 máu và ban 150 lá chắn trong 4 giây cho bản thân, đồng minh trong vùng.",
        "icon": "wave",
        "cooldown": 10,
        "range": 300
      },
      {
        "name": "Tuyền Qua Chi Môn",
        "description": "Mở thủy trận trong 5 giây, mỗi nhịp hồi đồng minh 110 máu và gây địch 95 sát thương.",
        "icon": "portal",
        "cooldown": 28,
        "range": 500
      }
    ],
    "sourceName": "大乔",
    "sourceId": 521
  }
];
export const heroById=(id:HeroId)=>HEROES.find(h=>h.id===id)!;
export interface Item {id:string;name:string;price:number;icon:string;description:string;attack?:number;hp?:number;speed?:number;haste?:number;lifesteal?:number;color:string;}
export const ITEMS: Item[] = [
  {id:'boots',name:'Giày phong hành',price:300,icon:'feather',description:'+30 tốc chạy',speed:30,color:'#9ac9a1'},
  {id:'blade',name:'Kiếm bình minh',price:500,icon:'sword',description:'+35 công vật lý',attack:35,color:'#e7cb84'},
  {id:'heart',name:'Trái tim sơn cước',price:550,icon:'shield',description:'+450 máu tối đa',hp:450,color:'#90b5cd'},
  {id:'crystal',name:'Tinh thạch',price:650,icon:'rune',description:'+20% hồi kỹ năng · +20 công',haste:.2,attack:20,color:'#b1a1dd'},
  {id:'fang',name:'Nanh huyết nguyệt',price:800,icon:'moon',description:'+45 công · hút máu 12%',attack:45,lifesteal:.12,color:'#df9398'},
  {id:'crown',name:'Vương miện cổ',price:1100,icon:'crown',description:'+65 công · +350 máu',attack:65,hp:350,color:'#f5db97'},
];
export const BOT_NAMES = ['Mây Lang Thang','Mèo Cầm Kiếm','Gió Đầu Mùa','Sương Bạc','Rồng Con','Hạt Dẻ','Trăng Non','Bão Nhỏ','Lá Phong'];
