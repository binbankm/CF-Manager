const { Sequelize } = require('sequelize');
const path = require('path');

// 数据库路径
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/database.sqlite');

// 创建Sequelize实例
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
        timestamps: true,
        underscored: true
    }
});

/**
 * 初始化数据库连接
 */
async function initDatabase() {
    try {
        await sequelize.authenticate();
        console.log('✅ 数据库连接成功');

        // 同步数据库模型
        await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
        console.log('✅ 数据库模型同步完成');
    } catch (error) {
        console.error('❌ 数据库连接失败:', error);
        throw error;
    }
}

module.exports = {
    sequelize,
    initDatabase
};
