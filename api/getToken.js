const { GoogleAuth } = require('google-auth-library');
const path = require('path');
const fs = require('fs');

// Tokeni saklamak için dosya adı
const tokenFile = path.join(process.cwd(), 'api/access_token.json');


async function generateAccessToken() {
    try {
        const auth = new GoogleAuth({
            keyFile: path.join(process.cwd(), 'api/chatbot.json'),  
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });

        const client = await auth.getClient();
        const accessTokenResponse = await client.getAccessToken();
        const accessToken = accessTokenResponse.token; 

        console.log('Yeni erişim tokeni alındı.');
        fs.writeFileSync(tokenFile, JSON.stringify({ accessToken }));

    } catch (error) {
        console.error('Token yenileme hatası:', error);
    }
    
}

generateAccessToken();
module.exports = {
    generateAccessToken, 
};