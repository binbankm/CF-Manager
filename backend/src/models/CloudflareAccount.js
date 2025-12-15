const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const { encrypt, decrypt } = require('../utils/encryption');

const CloudflareAccount = sequelize.define('CloudflareAccount', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    account_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    api_token_encrypted: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    account_id: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'cloudflare_accounts'
});

// 设置关联
User.hasMany(CloudflareAccount, { foreignKey: 'user_id', as: 'accounts' });
CloudflareAccount.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

/**
 * 设置API Token（自动加密）
 * @param {string} token - 明文API Token
 */
CloudflareAccount.prototype.setApiToken = function (token) {
    this.api_token_encrypted = encrypt(token);
};

/**
 * 获取API Token（自动解密）
 * @returns {string} 明文API Token
 */
CloudflareAccount.prototype.getApiToken = function () {
    return decrypt(this.api_token_encrypted);
};

module.exports = CloudflareAccount;
