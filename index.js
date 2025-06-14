require('dotenv').config();
const puppeteer = require('puppeteer');
const dados = require('./dados.json');
const axios = require('axios');

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ID = process.env.TELEGRAM_USER_ID;

async function sendTelegram(msg) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_ID) return;
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await axios.post(url, { chat_id: TELEGRAM_ID, text: msg });
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('https://visa.vfsglobal.com/ago/pt/bra/login', { waitUntil: 'networkidle2' });

  // login
  await page.type('#email', process.env.EMAIL);
  await page.type('#password', process.env.PASSWORD);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2' })
  ]);

  console.log('Login concluído');

  while (true) {
    await page.reload({ waitUntil: 'networkidle2' });
    const pageText = await page.evaluate(() => document.body.innerText);
    if (!pageText.includes('No appointment slots are currently available')) {
      console.log('🔔 Vaga encontrada! Tentando reservar...');
      try {
        // Preenche dados
        await page.type('input[name="applicantName"]', dados.nome);
        await page.type('input[name="passportNumber"]', dados.passaporte);
        await page.type('input[name="dateOfBirth"]', dados.dataNascimento);
        await page.select('select[name="gender"]', dados.genero);
        await page.type('input[name="nationality"]', dados.nacionalidade);
        await page.type('input[name="phone"]', dados.telefone);
        // Avança
        await Promise.all([
          page.click('button.next'),
          page.waitForNavigation({ waitUntil: 'networkidle2' })
        ]);
        console.log('✅ Reserva concluída!');
        await sendTelegram('✅ Vaga reservada com sucesso!');
      } catch (e) {
        console.error('❌ Erro preenchendo formulário:', e);
        await sendTelegram(`❌ Erro no bot: ${e.message}`);
      }
      break;
    }
    await new Promise(r => setTimeout(r, 5000));
  }

  await browser.close();
})();
