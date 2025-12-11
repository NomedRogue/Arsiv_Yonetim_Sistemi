const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Arşiv Yönetim Sistemi API',
            version: '2.0.0',
            description: 'Arşiv Yönetim Sistemi Backend API Dokümantasyonu (Otomatik Oluşturulmuş)',
        },
        servers: [
            {
                url: 'http://localhost:3001/api',
                description: 'Local Development Server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    // API route'larını ve Modelleri tara
    apis: [
        './backend/src/routes/*.js',
        './backend/src/routes/**/*.js', // Alt klasörlerdeki route'lar için
        './backend/src/models/*.js'
    ],
};

const specs = swaggerJsdoc(options);

module.exports = specs;
