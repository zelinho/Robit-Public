// Gerekli modülleri dahil et
const express = require('express');
const axios = require('axios');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const port = 3000; 
const cors = require('cors'); 
const { generateAccessToken } = require('./api/getToken');
const fs = require('fs');
require('dotenv').config(); 

app.use(cors()); 
app.use(bodyParser.json()); 

const CHATGPT_API_KEY = process.env.CHATGPT_API_KEY;
const telegramChatId = process.env.TELEGRAM_CHAT_ID;
const telegramToken = process.env.TELEGRAM_TOKEN

fs.readFile('api/access_token.json', 'utf8', (err, data) => {
    if (err) {
        console.error('Dosya okuma hatası:', err);
        return;
    }
});

app.use(express.json()); 
app.use(express.static(path.join(__dirname, 'public'))); 

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html')); 
});

// Chatbot API'sine POST isteği
app.post('/chatbot', async (req, res) => {
    const { message, event } = req.body; 
    let dialogflowRequest;

    try {
        // Eğer bir mesaj varsa, bunu Dialogflow'a yönlendir
        if (message) {
            dialogflowRequest = {
                queryInput: {
                    text: {
                        text: message,
                        languageCode: 'en' 
                    }
                }
            };
        } 
        // Eğer bir event varsa, bunu Dialogflow'a gönder
        else if (event) {
            console.log(`Event: ${event}`); 
            dialogflowRequest = {
                queryInput: {
                    event: {
                        name: event,
                        languageCode: 'en', 
                    }
                }
            };
        }

        // Dialogflow API'ye istek gönder
        const response = await axios.post(
            `https://dialogflow.googleapis.com/v2/projects/chatgpt-dialogflow-tu9x/agent/sessions/107911221563601342604:detectIntent`, 
            dialogflowRequest, 
            {
                headers: { 'Authorization': `Bearer ${await getAccessToken()}` } 
            }
        );

        const dialogflowReply = response.data.queryResult.fulfillmentText; 
        const fulfillmentMessages = response.data.queryResult.fulfillmentMessages; 

        let richContent = null;
        let isTextResponse = false;

        // Eğer zengin içerik veya metin mesajları varsa onları kontrol et
        if (fulfillmentMessages) {
            fulfillmentMessages.forEach(message => {
                if (message.payload && message.payload.richContent) {
                    richContent = message.payload.richContent; 
                }
                if (message.text && message.text.text.length > 0) {
                    isTextResponse = true; 
                }
            });
        }

        // Eğer metin cevabı varsa, bunu döndür
        if (isTextResponse && dialogflowReply) {
            res.json({
                reply: dialogflowReply, 
                richContent: richContent || null 
            });
        } 
        // Eğer sadece zengin içerik varsa, onu döndür
        else if (!isTextResponse && richContent) {
            res.json({
                reply: null, 
                richContent: richContent 
            });
        } 
        // Eğer hiçbir cevap yoksa ChatGPT'yi kullan
        else if (!dialogflowReply || dialogflowReply.trim() === '') {
            console.log("Dialogflow boş cevap döndü, ChatGPT çağrılıyor...");

            const chatGptResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-3.5-turbo', 
                messages: [
                    { role: 'system', content: 'Lütfen cevabınızı Türkçe olarak verin.' }, 
                    { role: 'user', content: message } 
                ]
            }, {
                headers: {
                    'Authorization': `Bearer ${CHATGPT_API_KEY}`, 
                    'Content-Type': 'application/json'
                }
            });

            const chatGptReply = chatGptResponse.data.choices[0].message.content; 
            res.json({ reply: chatGptReply }); 
        } else {
            res.status(404).send('Cevap bulunamadı.'); 
        }

    } catch (dialogflowError) {
        console.log('Dialogflow API hatasi:', dialogflowError.message); 

        // Dialogflow başarısız olursa ChatGPT'yi çağır
        try {
            const chatGptResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'Lütfen cevabınızı Türkçe olarak verin.' },
                    { role: 'user', content: message }
                ]
            }, {
                headers: {
                    'Authorization': `Bearer ${CHATGPT_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            const chatGptReply = chatGptResponse.data.choices[0].message.content; 
            res.json({ reply: chatGptReply });

        } catch (chatGptError) {
            console.log('ChatGPT API hatası:', chatGptError.message); 
            res.status(500).send('Hem Dialogflow hem de ChatGPT başarısız oldu.'); 
        }
    }
});

app.get('/get-api-keys', (req, res) => {
    res.json({ telegramToken, telegramChatId }); // Anahtarları JSON formatında gönderin
});

// Erişim tokenini dosyadan okuma
function getAccessToken() {
    const tokenFile = path.join(process.cwd(), 'api/access_token.json');
    if (fs.existsSync(tokenFile)) {
        const data = fs.readFileSync(tokenFile);
        const { accessToken } = JSON.parse(data);
        return accessToken;
    }
    return null;
}

// Token oluşturma işlemini başlat
generateAccessToken(); // Tokeni başlangıçta almak için çağırabilirsiniz

app.get('/api/data', (req, res) => {
    const token = getAccessToken(); // Güncel tokeni al

    if (!token) {
        return res.status(500).json({ error: 'Token mevcut değil' });
    }

    // Tokeni kullanarak işlem yapabilirsiniz
    console.log('Kullanılan Erişim Tokeni:', token);

    // Örnek cevap
    res.status(200).json({ message: 'Başarılı', token });
});


app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`); 
});

