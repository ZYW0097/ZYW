const fs = require('fs').promises;
const path = require('path');
const emailTypes = require('../templates/email/config/email-types');

class EmailTemplateEngine {
    constructor() {
        this.templateCache = new Map();
        this.basePath = path.join(__dirname, '../templates/email');
    }

    /**
     * 讀取檔案內容
     */
    async readFile(filePath) {
        try {
            return await fs.readFile(filePath, 'utf8');
        } catch (error) {
            throw new Error(`無法讀取檔案: ${filePath} - ${error.message}`);
        }
    }

    /**
     * 讀取並快取模板
     */
    async getTemplate(templateType, useCache = true) {
        if (useCache && this.templateCache.has(templateType)) {
            return this.templateCache.get(templateType);
        }

        // 讀取基礎模板
        const baseTemplate = await this.readFile(
            path.join(this.basePath, 'base.html')
        );

        // 讀取CSS樣式
        const cssStyles = await this.readFile(
            path.join(this.basePath, 'styles/base.css')
        );

        // 讀取內容模板
        const emailConfig = emailTypes[templateType];
        if (!emailConfig) {
            throw new Error(`未知的郵件類型: ${templateType}`);
        }

        const contentTemplate = await this.readFile(
            path.join(this.basePath, 'content', emailConfig.contentTemplate)
        );

        const template = {
            base: baseTemplate,
            styles: cssStyles,
            content: contentTemplate,
            config: emailConfig
        };

        if (useCache) {
            this.templateCache.set(templateType, template);
        }

        return template;
    }

    /**
     * 簡單的模板變數替換 (類似 Mustache 但更簡單)
     */
    renderTemplate(template, data) {
        let rendered = template;

        // 處理條件渲染 {{#variable}}...{{/variable}}
        rendered = rendered.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, variable, content) => {
            return data[variable] ? content : '';
        });

        // 處理變數替換 {{variable}}
        rendered = rendered.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
            return data[variable] || '';
        });

        return rendered;
    }

    /**
     * 生成完整的郵件HTML
     */
    async generateEmail(templateType, data) {
        try {
            const template = await this.getTemplate(templateType);
            
            // 準備模板資料
            const templateData = {
                emailTitle: template.config.title,
                emailSubtitle: template.config.subtitle,
                emailStyles: template.styles,
                emailContent: this.renderTemplate(template.content, data),
                ...data
            };

            // 渲染最終HTML
            const finalHtml = this.renderTemplate(template.base, templateData);

            return {
                html: finalHtml,
                subject: template.config.subject
            };

        } catch (error) {
            throw new Error(`生成郵件失敗: ${error.message}`);
        }
    }

    /**
     * 清除快取
     */
    clearCache() {
        this.templateCache.clear();
    }

    /**
     * 重新載入指定模板 (開發環境用)
     */
    async reloadTemplate(templateType) {
        this.templateCache.delete(templateType);
        return await this.getTemplate(templateType, false);
    }

    /**
     * 獲取所有可用的郵件類型
     */
    getAvailableTypes() {
        return Object.keys(emailTypes);
    }
}

module.exports = EmailTemplateEngine; 