const mongoose = require('mongoose');

// 連接到主資料庫
mongoose.connect('mongodb://localhost:27017/zyw');

async function fixRulesData() {
    try {
        console.log('開始修復集點卡規則數據...');
        
        // 獲取所有客戶
        const Client = require('./models/Client');
        const clients = await Client.find({});
        
        console.log(`找到 ${clients.length} 個客戶`);
        
        for (const client of clients) {
            const { slugname } = client;
            console.log(`\n處理客戶: ${slugname}`);
            
            try {
                // 連接到客戶的CDB資料庫
                const cardDB = mongoose.connection.useDb(`${slugname}CDB`);
                const PointRulesSchema = require('./models/points/rules');
                const PointRules = cardDB.model('PointsRules', PointRulesSchema);
                
                // 查找所有規則
                const rules = await PointRules.find({});
                console.log(`  找到 ${rules.length} 條規則`);
                
                let fixedCount = 0;
                
                for (const rule of rules) {
                    let needsUpdate = false;
                    let newText = rule.text;
                    
                    // 檢查text欄位是否為陣列或有問題的格式
                    if (Array.isArray(rule.text)) {
                        console.log(`  規則 ${rule.article} 是陣列:`, rule.text);
                        // 如果是陣列，取第一個有效元素
                        newText = rule.text.find(item => item && String(item).trim().length > 0) || '';
                        needsUpdate = true;
                    } else if (typeof rule.text === 'string') {
                        // 檢查是否包含陣列格式的字符串 (如 '["text"]')
                        const trimmedText = rule.text.trim();
                        if (trimmedText.startsWith('[') && trimmedText.endsWith(']')) {
                            try {
                                const parsed = JSON.parse(trimmedText);
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                    console.log(`  規則 ${rule.article} 是陣列字符串:`, trimmedText);
                                    newText = String(parsed[0]).trim();
                                    needsUpdate = true;
                                }
                            } catch (e) {
                                // 如果無法解析，保持原始文字
                                console.log(`  規則 ${rule.article} 無法解析:`, trimmedText);
                            }
                        }
                    }
                    
                    // 確保文字長度不超過100字符
                    if (newText && newText.length > 100) {
                        newText = newText.substring(0, 100);
                        needsUpdate = true;
                    }
                    
                    if (needsUpdate && newText && newText.trim().length > 0) {
                        await PointRules.findByIdAndUpdate(rule._id, { 
                            text: newText.trim() 
                        });
                        console.log(`  ✅ 修復規則 ${rule.article}: "${rule.text}" -> "${newText.trim()}"`);
                        fixedCount++;
                    } else if (!newText || newText.trim().length === 0) {
                        // 如果規則為空，刪除它
                        await PointRules.findByIdAndDelete(rule._id);
                        console.log(`  🗑️ 刪除空規則 ${rule.article}`);
                        fixedCount++;
                    }
                }
                
                console.log(`  客戶 ${slugname} 修復了 ${fixedCount} 條規則`);
                
            } catch (error) {
                console.error(`處理客戶 ${slugname} 時發生錯誤:`, error.message);
            }
        }
        
        console.log('\n✅ 規則數據修復完成');
        
    } catch (error) {
        console.error('修復過程中發生錯誤:', error);
    } finally {
        await mongoose.disconnect();
    }
}

// 執行修復
fixRulesData(); 