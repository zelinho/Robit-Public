
async function fetchTelegramKeys() {
    try {
        const response = await axios.get('/get-api-keys');
        const { telegramToken, telegramChatId } = response.data;

        // Anahtarları kullanmak için global değişkenlere atayın
        window.telegramToken = telegramToken;
        window.telegramChatId = telegramChatId;
    } catch (error) {
        console.error('API anahtarlarını alırken hata oluştu:', error);
    }
}

fetchTelegramKeys();


function openPopup() {
    document.getElementById("popup").style.display = "block"; 
}

function closePopup() {
    document.getElementById("popup").style.display = "none"; 
}

document.addEventListener("click", function(event) {
    const popup = document.getElementById("popup");
    if (event.target === popup) {
        popup.style.display = "none"; 
    }
});

function OpenUnlemPopup() {
    document.getElementById("UnlemPopup").style.display = "block"; 
}

function CloseUnlemPopup() {
    document.getElementById("UnlemPopup").style.display = "none"; 
}

window.onclick = function(event) {
    const UnlemPopup = document.getElementById("UnlemPopup");
    if (event.target === UnlemPopup) {
        CloseUnlemPopup(); 
    }
};

async function sendMessage() {
    const userInput = document.getElementById("userInput").value; 

    if (!userInput) {
        return; 
    }
    displayMessage(userInput, "user");
    document.getElementById("userInput").value = ""; 

    if (isTelegramActive) { // Eğer Telegram aktifse
        const messagesDiv = document.getElementById("messages");
        // Telegram'a mesaj gönder
        const telegramResponse = await sendMessageToTelegram(telegramChatId, userInput);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    } 

    else {
        const loadingMessage = displayLoadingMessage(); 
        // Mesajı sunucuya gönder
        fetch('/chatbot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: userInput }) 
        })
        .then(response => response.json())
        .then(data => {
            console.log(data); 
            
            loadingMessage.remove(); 

            // Bot cevabı varsa harf harf yazma efekti ile göster
            if (data.reply) {
                displayMessageWithTypingEffect(data.reply, "bot", () => {
                    if (data.richContent) {
                        displayRichResponse(data.richContent); 
                    }
                });
            } else if (data.richContent) {
                displayRichResponse(data.richContent); 
            }
        })
        .catch(error => {
            console.error('Dialogflow Hata:', error); 
            displayMessage("Bir hata oluştu. Lütfen tekrar deneyin.", "bot");
        });}

    document.getElementById("userInput").value = ""; 
}

// Yükleniyor mesajını ekrana yansıtma
function displayLoadingMessage() {
    const messagesDiv = document.getElementById("messages");
    const loadingMessage = document.createElement("div");
    loadingMessage.className = "bot-message";
    loadingMessage.textContent = "..."; 
    messagesDiv.appendChild(loadingMessage);
    messagesDiv.scrollTop = messagesDiv.scrollHeight; 
    return loadingMessage; 
}

// Rich response içeriğini ekrana yansıtma
function displayRichResponse(richContent) {
    const messagesDiv = document.getElementById("messages");

    richContent.forEach(itemArray => {
        itemArray.forEach(item => {
            const newMessage = document.createElement("div");
            newMessage.className = "bot-message";

            switch(item.type) {
                case 'button': 
                    const button = document.createElement("button");
                    button.textContent = item.text;

                    button.onclick = () => {
                        
                        if (item.link) {
                            window.open(item.link, '_blank', 'noopener,noreferrer'); 
                        } else {
                            displayMessage(item.text, "user"); 
                            handleRichResponseEvent(item.event); 
                        }
                    };

                    newMessage.appendChild(button); 
                    break;

                case 'link':
                    const link = document.createElement("a");
                    link.href = item.link;
                    link.textContent = item.text;
                    link.target = "_blank"; 
                    link.rel = "noopener noreferrer"; 
                    newMessage.appendChild(link); 
                    break;

                case 'info': 
                    const info = document.createElement("p");
                    info.textContent = item.text;
                    newMessage.appendChild(info); 
                    break;

                case 'image': 
                    const img = document.createElement("img");
                    img.src = item.rawUrl;
                    img.alt = item.accessibilityText || "Görsel";
                    img.style.maxWidth = "100%"; 
                    newMessage.appendChild(img); 
                    break;

                default: 
                    const defaultMessage = document.createElement("p");
                    defaultMessage.textContent = "Bu içerik desteklenmiyor."; // 
                    newMessage.appendChild(defaultMessage);
            }

            messagesDiv.appendChild(newMessage); 
        });
    });

    messagesDiv.scrollTop = messagesDiv.scrollHeight; 
}

// Rich response'daki butona tıklanırsa yapılacak işlemler
function handleRichResponseEvent(event) {
    if (event && event.name) {
        
        fetch('/chatbot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ event: event.name })
        })
        .then(response => response.json())
        .then(data => {
            console.log(data); 
            if (data.reply) {
                displayMessageWithTypingEffect(data.reply, "bot", () => {
                    if (data.richContent) {
                        displayRichResponse(data.richContent); 
                    }
                });
            }
        })
        .catch(error => {
            console.error('Dialogflow Hata:', error); 
            displayMessage("Bir hata oluştu. Lütfen tekrar deneyin.", "bot");
        });
    }
}

// Mesaj gösterme fonksiyonu
function displayMessage(message, sender) {
    const messagesDiv = document.getElementById("messages");
    const newMessage = document.createElement("div");
    newMessage.className = sender === "user" ? "user-message" : "bot-message"; 
    newMessage.textContent = message; 
    messagesDiv.appendChild(newMessage); 
    messagesDiv.scrollTop = messagesDiv.scrollHeight; 
}

function displayMessageWithTypingEffect(message, sender, callback) {
    const messagesDiv = document.getElementById("messages");
    const newMessage = document.createElement("div");
    newMessage.className = sender === "user" ? "user-message" : "bot-message"; 

    messagesDiv.appendChild(newMessage); 
    messagesDiv.scrollTop = messagesDiv.scrollHeight; 

    let index = 0; 
    const typingInterval = setInterval(() => {
        if (index < message.length) {
            newMessage.textContent += message.charAt(index); 
            index++;
            messagesDiv.scrollTop = messagesDiv.scrollHeight; 
        } else {
            clearInterval(typingInterval); 
            if (callback) callback(); 
        }
    }, 15); 
}


// Botun başlangıç mesajını göster
function displayInitialBotMessage() {
    const loadingMessage = displayLoadingMessage(); 
    setTimeout(() => {
        loadingMessage.remove(); 
        displayMessageWithTypingEffect("Selam, ben muhteşem sanal asistanın Robit. Sana nasıl yardımcı olabilirim?", "bot"); 
    }, 1000); 
}

// Sayfa yüklendiğinde başlangıç mesajını göster
window.onload = function() {
    displayInitialBotMessage(); 
};

// Enter tuşuna basılınca mesaj gönder
document.getElementById("userInput").addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        sendMessage(); 
    }
});

// Sol el alanına gelindiğinde görseli büyüt
document.getElementById('sol-el-link').addEventListener('mouseenter', function() {
    document.getElementById('sol-el').classList.add('bigger'); 
    document.getElementById('label-sol').style.display = 'block'; 
});

// Sol el alanından çıkıldığında görseli eski haline getir
document.getElementById('sol-el-link').addEventListener('mouseleave', function() {
    document.getElementById('sol-el').classList.remove('bigger'); 
    document.getElementById('label-sol').style.display = 'none'; 
});

// Sağ el alanına gelindiğinde görseli büyüt
document.getElementById('sag-el-link').addEventListener('mouseenter', function() {
    document.getElementById('sag-el').classList.add('bigger');  
    document.getElementById('label-sag').style.display = 'block'; 
});

// Sağ el alanından çıkıldığında görseli eski haline getir
document.getElementById('sag-el-link').addEventListener('mouseleave', function() {
    document.getElementById('sag-el').classList.remove('bigger'); 
    document.getElementById('label-sag').style.display = 'none'; 
});

let isSagElClickable = true; 
let isTelegramActive = false; 

// Sağ el kısmına tıklandığında döndürme işlemi
document.getElementById('sag-el-link').addEventListener('click', function() {
    if (!isSagElClickable) return; 

    isTelegramActive = true; 
    isSagElClickable = false; 

    const chatbox = document.getElementById('chatbot-container');
    chatbox.classList.toggle('rotate-card'); 

    const messagesContainer = document.getElementById('messages');
    messagesContainer.innerHTML = ''; 
    const loadingMessage = displayLoadingMessage(); 

    setTimeout(() => {
        loadingMessage.remove(); 
        displayMessageWithTypingEffect("Müşteri hizmetlerine hoşgeldiniz. Ben Emre, size nasıl yardımcı olabilirim?", "bot"); 
    }, 1500); 

    setTimeout(() => {
        isSagElClickable = true; 
    }, 2000); 
});

let isSolElClickable = true; 

// Sol el kısmına tıklandığında
document.getElementById('sol-el-link').addEventListener('click', function() {
    if (!isSolElClickable) return; 

    isSolElClickable = false; 
    isTelegramActive= false 

    const chatbox = document.getElementById('chatbot-container');
    chatbox.classList.toggle('rotate-card'); 

    const messagesContainer = document.getElementById('messages');
    messagesContainer.innerHTML = ''; 

    const loadingMessage = displayLoadingMessage(); 
    setTimeout(() => {
        loadingMessage.remove(); 
        displayMessageWithTypingEffect("Selam, ben muhteşem sanal asistanın Robit. Sana nasıl yardımcı olabilirim?", "bot"); 
    }, 1500); 

    setTimeout(() => {
        isSolElClickable = true; 
    }, 2000); 
});


// Telegram'a mesaj gönderen fonksiyon
async function sendMessageToTelegram(chatId, message) {
    const telegramApiUrl = `https://api.telegram.org/bot${window.telegramToken}/sendMessage`; 
    try {
        const response = await axios.post(telegramApiUrl, {
            chat_id: chatId,  
            text: message 
        });
        console.log('Mesaj Telegrama gönderildi:', response.data); 
        return response.data; 
    } catch (error) {
        console.error('Error sending message to Telegram:', error.response ? error.response.data : error.message); 
        throw error; 
    }
}

let offset = 0; 

async function getTelegramMessages() {
    const telegramApiUrl = `https://api.telegram.org/bot${window.telegramToken}/getUpdates?offset=${offset}`;
    
    try {
        const response = await axios.get(telegramApiUrl);
        const messages = response.data.result;
        
        
        if (messages.length > 0) {
            
            for (const message of messages) {
                const chatId = message.message.chat.id; 
                const text = message.message.text; 
                const loadingMessage = displayLoadingMessage(); 
                setTimeout(() => {
                    loadingMessage.remove();
                displayMessageWithTypingEffect(text, "bot"); 
            }, 1500); 
            }
            
            offset = messages[messages.length - 1].update_id + 1;
            console.log('Telegramdan mesaj alındı:', response.data);
        }
        
    } catch (error) {
        console.error('Telegramdan mesaj alma hatası:', error);
    }
}

setInterval(getTelegramMessages, 3000);

