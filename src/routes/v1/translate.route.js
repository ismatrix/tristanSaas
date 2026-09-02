const express = require('express');
const https = require('https');
const catchAsync = require('../../utils/catchAsync');

const router = express.Router();

/**
 * 离线企业名称智能中英文词典引擎 (包含专有名词、品牌名、国家城市地名与企业类型后缀)
 */
function offlineTranslate(text, targetLang) {
  let str = text.trim();
  if (targetLang.startsWith('zh')) {
    // 1. 常见专有名词 / 知名品牌替换
    const brandMap = [
      [/\b(AliExpress)\b/gi, '速卖通'],
      [/\b(Alibaba)\b/gi, '阿里巴巴'],
      [/\b(Taobao)\b/gi, '淘宝'],
      [/\b(Tmall)\b/gi, '天猫'],
      [/\b(Ant Group|Ant Financial)\b/gi, '蚂蚁集团'],
      [/\b(Cainiao)\b/gi, '菜鸟'],
      [/\b(Lazada)\b/gi, 'Lazada'],
      [/\b(Tencent)\b/gi, '腾讯'],
      [/\b(Baidu)\b/gi, '百度'],
      [/\b(ByteDance)\b/gi, '字节跳动'],
      [/\b(Huawei)\b/gi, '华为'],
      [/\b(Xiaomi)\b/gi, '小米'],
      [/\b(JD|Jingdong)\b/gi, '京东'],
      [/\b(Meituan)\b/gi, '美团'],
      [/\b(NetEase)\b/gi, '网易'],
    ];

    // 2. 国家/地区与城市地名替换
    const locationMap = [
      [/\b(Korea|South Korea)\b/gi, '韩国'],
      [/\b(Japan)\b/gi, '日本'],
      [/\b(Singapore)\b/gi, '新加坡'],
      [/\b(China|Mainland China)\b/gi, '中国'],
      [/\b(Hong Kong|HongKong|HK)\b/gi, '香港'],
      [/\b(Macau|Macao)\b/gi, '澳门'],
      [/\b(Taiwan|TW)\b/gi, '台湾'],
      [/\b(United States|USA|US|America)\b/gi, '美国'],
      [/\b(United Kingdom|UK|Britain|Great Britain)\b/gi, '英国'],
      [/\b(Germany)\b/gi, '德国'],
      [/\b(France)\b/gi, '法国'],
      [/\b(Australia)\b/gi, '澳大利亚'],
      [/\b(Canada)\b/gi, '加拿大'],
      [/\b(India)\b/gi, '印度'],
      [/\b(Indonesia)\b/gi, '印度尼西亚'],
      [/\b(Malaysia)\b/gi, '马来西亚'],
      [/\b(Thailand)\b/gi, '泰国'],
      [/\b(Vietnam)\b/gi, '越南'],
      [/\b(Philippines)\b/gi, '菲律宾'],
      [/\b(Russia)\b/gi, '俄罗斯'],
      [/\b(Brazil)\b/gi, '巴西'],
      [/\b(Netherlands|Holland)\b/gi, '荷兰'],
      [/\b(Switzerland)\b/gi, '瑞士'],
      [/\b(United Arab Emirates|UAE)\b/gi, '阿联酋'],
      [/\b(Saudi Arabia)\b/gi, '沙特阿拉伯'],
      [/\b(Spain)\b/gi, '西班牙'],
      [/\b(Italy)\b/gi, '意大利'],
      [/\b(Mexico)\b/gi, '墨西哥'],
    ];

    // 3. 企业组织后缀与行业通用词替换
    const suffixMap = [
      [/\b(Private Limited|Pte\.? Ltd\.?)\b/gi, '私人有限公司'],
      [/\b(Company Limited|Co\.?,? Ltd\.?)\b/gi, '股份有限公司'],
      [/\b(Limited|Ltd\.?)\b/gi, '有限公司'],
      [/\b(Corporation|Corp\.?)\b/gi, '公司'],
      [/\b(Incorporated|Inc\.?)\b/gi, '股份有限公司'],
      [/\b(Holdings?|Holding)\b/gi, '控股'],
      [/\b(International|Intl\.?)\b/gi, '国际'],
      [/\b(Group)\b/gi, '集团'],
      [/\b(Technology|Technologies|Tech)\b/gi, '科技'],
      [/\b(Software)\b/gi, '软件'],
      [/\b(Information)\b/gi, '信息'],
      [/\b(Network|Networks)\b/gi, '网络'],
      [/\b(Telecom|Telecommunication|Telecommunications)\b/gi, '电信'],
      [/\b(Communication|Communications)\b/gi, '通信'],
      [/\b(Global)\b/gi, '全球'],
      [/\b(Enterprise|Enterprises)\b/gi, '企业'],
      [/\b(Services?)\b/gi, '服务'],
      [/\b(Solutions?)\b/gi, '解决方案'],
      [/\b(Development)\b/gi, '发展'],
      [/\b(Investment|Investments)\b/gi, '投资'],
      [/\b(Trading)\b/gi, '贸易'],
      [/\b(Industry|Industries)\b/gi, '实业'],
    ];

    // 按顺序做替换
    [...brandMap, ...locationMap, ...suffixMap].forEach(([regex, replacement]) => {
      str = str.replace(regex, ` ${replacement} `);
    });

    // 智能清除中文字符之间的多余空格，保留英文字符间的合理空格
    str = str
      .replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1$2')
      .replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1$2')
      .replace(/\s+/g, ' ')
      .trim();

    return str || text;
  } else {
    // 中文 -> 英文企业名称
    let enStr = text.trim();
    enStr = enStr.replace(/速卖通/g, 'AliExpress ');
    enStr = enStr.replace(/阿里巴巴/g, 'Alibaba ');
    enStr = enStr.replace(/韩国/g, 'Korea ');
    enStr = enStr.replace(/日本/g, 'Japan ');
    enStr = enStr.replace(/新加坡/g, 'Singapore ');
    enStr = enStr.replace(/股份有限公司/g, ' Co., Ltd.');
    enStr = enStr.replace(/私人有限公司/g, ' Pte. Ltd.');
    enStr = enStr.replace(/有限责任公司|有限公司/g, ' Co., Ltd.');
    enStr = enStr.replace(/集团/g, ' Group');
    enStr = enStr.replace(/科技/g, ' Technology');
    enStr = enStr.replace(/网络/g, ' Network');
    enStr = enStr.replace(/信息/g, ' Information');
    enStr = enStr.replace(/国际/g, ' International');
    enStr = enStr.replace(/控股/g, ' Holdings');
    return enStr.replace(/\s+/g, ' ').trim() || text;
  }
}

/**
 * 谷歌翻译代理接口
 * POST /v1/translate
 * Body: { text: string, targetLang: 'zh-CN' | 'en' }
 */
router.post(
  '/',
  catchAsync(async (req, res) => {
    const { text, targetLang = 'en' } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.send({ status: 'success', translatedText: '' });
    }

    const cleanText = text.trim();
    const tl = targetLang.startsWith('zh') ? 'zh-CN' : 'en';
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&q=${encodeURIComponent(
      cleanText
    )}`;

    const reqOptions = {
      timeout: 3500,
    };

    const requestObj = https.get(url, reqOptions, (googleRes) => {
      let rawData = '';
      googleRes.on('data', (chunk) => {
        rawData += chunk;
      });
      googleRes.on('end', () => {
        try {
          const parsed = JSON.parse(rawData);
          if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
            const translatedParts = parsed[0].map((item) => (Array.isArray(item) ? item[0] : '')).filter(Boolean);
            const translatedText = translatedParts.join('');
            if (translatedText && translatedText !== cleanText) {
              return res.send({
                status: 'success',
                translatedText: translatedText,
                source: 'google_online',
              });
            }
          }
          // 降级使用高精度词典
          const fallbackText = offlineTranslate(cleanText, tl);
          res.send({ status: 'success', translatedText: fallbackText, source: 'offline_engine' });
        } catch (err) {
          const fallbackText = offlineTranslate(cleanText, tl);
          res.send({ status: 'success', translatedText: fallbackText, source: 'offline_engine' });
        }
      });
    });

    requestObj.on('error', (err) => {
      console.warn('谷歌在线翻译代理不可达，降级使用智能高精度词典:', err.message);
      const fallbackText = offlineTranslate(cleanText, tl);
      res.send({ status: 'success', translatedText: fallbackText, source: 'offline_engine' });
    });

    requestObj.on('timeout', () => {
      requestObj.destroy();
      console.warn('谷歌在线翻译请求超时，自动摧毁并降级使用智能高精度词典');
      const fallbackText = offlineTranslate(cleanText, tl);
      res.send({ status: 'success', translatedText: fallbackText, source: 'offline_engine' });
    });
  })
);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Translate
 *   description: Corporate Multilingual Smart Translation Service
 */

/**
 * @swagger
 * /translate:
 *   post:
 *     summary: Translate company names and commercial terms
 *     description: Intelligent enterprise translation with Google online translation proxy and automatic offline enterprise dictionary fallback.
 *     tags: [Translate]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: Text to translate
 *               targetLang:
 *                 type: string
 *                 enum: [zh-CN, en]
 *                 default: en
 *                 description: Target language
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 translatedText:
 *                   type: string
 *                   example: Speed Telecom
 *                 source:
 *                   type: string
 *                   example: google_online
 */
