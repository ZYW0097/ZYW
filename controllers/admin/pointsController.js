const getClientDb = require('../../utils/dbManager');
const pointsSettingsSchema = require('../../models/points/settings');
const pointsRewardsSchema = require('../../models/points/rewards');
const pointsRulesSchema = require('../../models/points/rules');

exports.createCard = async (req, res) => {
  try {
    const { storeSlug } = req.params;
    if (!storeSlug) throw new Error('storeSlug is required');

    const db = getClientDb(storeSlug, 'CDB');
    const PointsSettings = db.model('PointsSettings', pointsSettingsSchema);
    const PointsRules = db.model('PointsRules', pointsRulesSchema);
    const PointsRewards = db.model('PointsRewards', pointsRewardsSchema);

    // 1. 規則
    const rules = req.body['rules[]'] || req.body.rules || [];
    // 2. 獎勵
    const rewards = [];
    const files = req.files || [];

    console.log('req.files:', files);
    console.log('req.body:', req.body);

    // 依據前端欄位組合獎勵資料
    Object.keys(req.body)
      .filter(key => key.startsWith('rewards[') && key.endsWith('][name]'))
      .forEach((nameKey) => {
        const idx = nameKey.match(/rewards\[(\d+)\]\[name\]/)[1];
        const name = req.body[`rewards[${idx}][name]`];
        const points = req.body[`rewards[${idx}][points]`];
        // 找對應的圖片
        const file = files.find(f => f.fieldname === `rewards[${idx}][img]`);
        rewards.push({
          name,
          points: Number(points),
          img: file ? file.path : '',
        });
      });

    console.log('rewards to insert:', rewards);

    // 3-1. 建立設定（先檢查是否已存在）
    const exist = await PointsSettings.findOne({
      slug: storeSlug,
      type: 'points_settings',
      class: 'main_settings'
    });
    if (!exist) {
      await PointsSettings.create({
        slug: storeSlug,
        type: 'points_settings',
        class: 'main_settings',
        state: 'enable',
        s_reward: 0,
      });
    }

    // 3-2. 建立規則
    const rulesArr = Array.isArray(rules) ? rules : [rules];
    for (let i = 0; i < rulesArr.length; i++) {
      await PointsRules.create({
        slug: storeSlug,
        type: 'points_settings',
        class: 'rule_settings',
        article: i + 1,
        text: rulesArr[i],
        updatedAt: new Date()
      });
    }

    // 3-3. 建立獎勵
    for (const reward of rewards) {
      if (reward.name && reward.img) {
        await PointsRewards.create({
          slug: storeSlug,
          type: 'points_reward',
          name: reward.name,
          points: reward.points,
          img: reward.img,
        });
      }
    }

    res.redirect(`/${storeSlug}/backstage?success=1`);
  } catch (err) {
    console.error(err);
    res.status(500).send('建立失敗');
  }
};
