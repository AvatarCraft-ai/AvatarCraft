const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const port = process.env.PORT || 3000;

const token = '7249609731:AAHD5rQg-EwR-MxGzTzJ32ObCOwyYTBzk6k';
const huggingFaceToken = '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';
const donationAlertToken = 'e2Le3MBy5gaExZW4u6dX';  // Получите свой токен в интерфейсе Donation Alerts
const donationAlertUrl = 'https://www.donationalerts.com/r/avatarcraft';  // URL для DonationAlerts

const bot = new TelegramBot(token, { polling: true });

// Middleware для парсинга POST данных webhook
app.use(bodyParser.json());

// Webhook для получения донатов через Donation Alerts
app.post('/donation-webhook', async (req, res) => {
  const donationData = req.body;  // Данные доната

  // Получаем данные о донате
  const { amount, currency, username } = donationData;

  // Обрабатываем донат
  if (amount && currency && username) {
    // Отправляем сообщение в Telegram о полученном донате
    const message = `🎉 Получен новый донат!\n\n` +
                    `💸 Сумма: ${amount} ${currency}\n` +
                    `👤 От: ${username}\n` +
                    `🙏 Спасибо за поддержку!`;

    // Уведомляем в Telegram
    await bot.sendMessage(1234567890, message);  // Замените на ID своего чата или канала
    res.send('Donation received!');
  } else {
    res.status(400).send('Invalid donation data');
  }
});

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
      console.log("Получено описание:", description);

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
        console.log("Изображение успешно получено.");

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
      `🔗 Поддержи проект: [Donationalerts](https://www.donationalerts.com/r/avatarcraft)`,
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

bot.onText(/🛒 Магазин/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    await bot.sendMessage(chatId, "🛍️ Добро пожаловать в магазин! Для покупки нажмите на нужную сумму:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Купить на 50 ₽", callback_data: "shop_50" }],
          [{ text: "Купить на 100 ₽", callback_data: "shop_100" }],
          [{ text: "Купить на 200 ₽", callback_data: "shop_200" }]
        ]
      }
    });
  } catch (error) {
    console.error('Error sending shop message:', error);
  }
});

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const action = query.data.split('_')[0];
  const amount = query.data.split('_')[1];

  try {
    if (action === 'donate') {
      // Обработка доната
      await bot.answerCallbackQuery(query.id, { text: `💰 Спасибо за поддержку на ${amount} ₽!` });

      // Перенаправление на DonationAlerts для оплаты
      await bot.sendMessage(chatId, `Для завершения доната перейдите по [ссылке для оплаты](https://www.donationalerts.com/r/avatarcraft).`, { parse_mode: "Markdown" });
    } else if (action === 'shop') {
      // Обработка покупки
      await bot.answerCallbackQuery(query.id, { text: `🛒 Вы выбрали покупку на ${amount} ₽!` });

      // Перенаправление на DonationAlerts для оплаты покупки
      await bot.sendMessage(chatId, `Для завершения покупки перейдите по [ссылке для оплаты](https://www.donationalerts.com/r/avatarcraft).`, { parse_mode: "Markdown" });
    }
  } catch (error) {
    console.error('Error processing callback query:', error);
  }
});

// Пример серверной настройки для Render
app.get('/', (req, res) => {
  res.send('Bot is running!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
