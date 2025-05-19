const PointsSettings = require('../../models/points/settings');
const PointsRewards = require('../../models/points/rewards');
const PointsRules = require('../../models/points/rules');

exports.createCard = async (req, res) => {
  try {
    const { slug } = req.params; // 取得 slug

    // 1. 規則
    const rules = req.body['rules[]'] || req.body.rules || [];
    // 2. 獎勵
    const rewards = [];
    const files = req.files || [];

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

    // 3. 寫入資料庫
    // 3-1. 建立設定
    await PointsSettings.create({
      slug,
      type: 'points_settings',
      class: 'main_settings',
      state: 'enable',
      s_reward: 0,
    });

    // 3-2. 建立規則
    for (const ruleText of Array.isArray(rules) ? rules : [rules]) {
      await PointsRules.create({
        slug,
        type: 'points_rule',
        name: ruleText,
        points: 0,
        img: '', // 規則不需圖片
      });
    }

    // 3-3. 建立獎勵
    for (const reward of rewards) {
      await PointsRewards.create({
        slug,
        type: 'points_reward',
        name: reward.name,
        points: reward.points,
        img: reward.img,
      });
    }

    res.redirect(`/${slug}/backstage?success=1`);
  } catch (err) {
    console.error(err);
    res.status(500).send('建立失敗');
  }
};
