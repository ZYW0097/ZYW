// 簡單的測試檔案 - 可以用來驗證認證系統
const { validatePassword, validatePhone, hashPassword, comparePassword } = require('./utils/auth');

// 測試密碼驗證
console.log('=== 密碼驗證測試 ===');
console.log('弱密碼測試:', validatePassword('123'));
console.log('強密碼測試:', validatePassword('Test123!@#'));

// 測試電話號碼驗證
console.log('\n=== 電話號碼驗證測試 ===');
console.log('正確格式:', validatePhone('0912345678'));
console.log('錯誤格式:', validatePhone('123456789'));

// 測試密碼加密
(async () => {
    console.log('\n=== 密碼加密測試 ===');
    const password = 'Test123!@#';
    const hashed = await hashPassword(password);
    console.log('原密碼:', password);
    console.log('加密後:', hashed);
    
    const isValid = await comparePassword(password, hashed);
    console.log('驗證結果:', isValid);
    
    const isInvalid = await comparePassword('wrongpassword', hashed);
    console.log('錯誤密碼驗證:', isInvalid);
})();

console.log('\n=== 認證系統測試完成 ==='); 