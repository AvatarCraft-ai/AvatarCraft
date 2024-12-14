const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const token = '7249609731:AAHD5rQg-EwR-MxGzTzJ32ObCOwyYTBzk6k';
const huggingFaceToken = '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';

const bot = new TelegramBot(token, { polling: true });

const mainMenu = {
  reply_markup: {
    keyboard: [
      [{ text: "🎨 Сгенерировать аватар" }, { text: "🛒 Магазин" }],
      [{ text: "💰 Поддержать проект" }, { text: "ℹ О боте" }]
    ],
    resize_keyboard: true
  }
};

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    await bot.sendMessage(chatId,
      "👋 Привет! Я бот *AvatarCraft* — твой помощник в создании уникальных аватаров!\n" +
      "✨ Нажми на кнопки, чтобы начать!", {
        parse_mode: "Markdown",
        reply_markup: mainMenu.reply_markup
      }
    );
  } catch (error) {
    console.error('Error sending /start message:', error);
  }
});

bot.onText(/🎨 Сгенерировать аватар/, async (msg) => {
  const chatId = msg.chat.id;

  // Шаг 1: Запрос описания
  bot.sendMessage(chatId, "🖼️ Опиши, как ты хочешь, чтобы выглядел твой аватар! Например: 'Кот в броне Minecraft рядом с лисой'.", {
    reply_markup: {
      force_reply: true
    }
  }).then(sentMessage => {
    const replyId = sentMessage.message_id;

    // Шаг 2: Ожидание ответа пользователя
    bot.onReplyToMessage(chatId, replyId, async (reply) => {
      const description = reply.text;
      console.log("Получено описание:", description); // Отладочный вывод

      try {
        // Запрос к API Hugging Face
        const response = await axios.post(
          'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev',
          { inputs: description },
          {
            headers: { Authorization: `Bearer ${huggingFaceToken}` },
            responseType: 'arraybuffer'
          }
        );

        const imageBuffer = Buffer.from(response.data, 'binary');
        console.log("Изображение успешно получено."); // Отладочный вывод

        // Шаг 3: Отправка изображения
        await bot.sendPhoto(chatId, imageBuffer, {
          caption: `🎨 Вот твой уникальный аватар, созданный по запросу: "${description}".`
        });
      } catch (error) {
        console.error('Error generating image:', error.response?.data || error.message);
        bot.sendMessage(chatId, "❌ Ошибка при генерации аватара. Попробуй снова.");
      }
    });
  }).catch(error => {
    console.error("Error sending force reply message:", error);
  });
});

bot.onText(/ℹ О боте/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    await bot.sendMessage(chatId,
      "🌟 *AvatarCraft* — это бот для генерации уникальных аватаров.\n\n" +
      "🔗 Поддержи проект: [Donationalerts](https://www.donationalerts.com/r/avatarcraft)",
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    console.error('Error sending bot info:', error);
  }
});

bot.onText(/💰 Поддержать проект/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    await bot.sendMessage(chatId, "💖 Спасибо за желание поддержать! Выберите сумму поддержки:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Поддержать на 50 ₽", callback_data: "donate_50" }],
          [{ text: "Поддержать на 100 ₽", callback_data: "donate_100" }],
          [{ text: "Поддержать на 200 ₽", callback_data: "donate_200" }]
        ]
      }
    });
  } catch (error) {
    console.error('Error sending donation options:', error);
  }
});
