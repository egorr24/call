const { Sequelize, DataTypes } = require('sequelize');

// Подключение к PostgreSQL (Railway автоматически предоставляет DATABASE_URL)
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://localhost:5432/flux_messenger', {
    dialect: 'postgres',
    dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' ? {
            require: true,
            rejectUnauthorized: false
        } : false
    },
    logging: false // Отключаем логи SQL в продакшене
});

// Модель пользователя
const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    avatar: {
        type: DataTypes.STRING,
        allowNull: true
    },
    lastSeen: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    isOnline: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'users',
    timestamps: true
});

// Модель чата
const Chat = sequelize.define('Chat', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    type: {
        type: DataTypes.ENUM('private', 'group'),
        defaultValue: 'private'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true // Для приватных чатов имя не нужно
    },
    avatar: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'chats',
    timestamps: true
});

// Модель участников чата
const ChatParticipant = sequelize.define('ChatParticipant', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    chatId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Chat,
            key: 'id'
        }
    },
    joinedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    role: {
        type: DataTypes.ENUM('member', 'admin', 'owner'),
        defaultValue: 'member'
    }
}, {
    tableName: 'chat_participants',
    timestamps: false
});

// Модель сообщения
const Message = sequelize.define('Message', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    chatId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Chat,
            key: 'id'
        }
    },
    senderId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    text: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    type: {
        type: DataTypes.ENUM('text', 'file', 'image', 'video', 'audio'),
        defaultValue: 'text'
    },
    fileData: {
        type: DataTypes.JSONB,
        allowNull: true
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    editedAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'messages',
    timestamps: true
});

// Модель файлов
const File = sequelize.define('File', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    originalName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    filename: {
        type: DataTypes.STRING,
        allowNull: false
    },
    mimetype: {
        type: DataTypes.STRING,
        allowNull: false
    },
    size: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    url: {
        type: DataTypes.STRING,
        allowNull: false
    },
    uploadedBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    }
}, {
    tableName: 'files',
    timestamps: true
});

// Связи между моделями
User.hasMany(ChatParticipant, { foreignKey: 'userId' });
ChatParticipant.belongsTo(User, { foreignKey: 'userId' });

Chat.hasMany(ChatParticipant, { foreignKey: 'chatId' });
ChatParticipant.belongsTo(Chat, { foreignKey: 'chatId' });

Chat.hasMany(Message, { foreignKey: 'chatId' });
Message.belongsTo(Chat, { foreignKey: 'chatId' });

User.hasMany(Message, { foreignKey: 'senderId' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

User.hasMany(File, { foreignKey: 'uploadedBy' });
File.belongsTo(User, { foreignKey: 'uploadedBy' });

// Функция инициализации базы данных
async function initDatabase() {
    try {
        await sequelize.authenticate();
        console.log('✅ Подключение к PostgreSQL установлено');
        
        // Синхронизируем модели с базой данных
        await sequelize.sync({ alter: true });
        console.log('✅ Модели базы данных синхронизированы');
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка подключения к базе данных:', error);
        return false;
    }
}

module.exports = {
    sequelize,
    User,
    Chat,
    ChatParticipant,
    Message,
    File,
    initDatabase
};