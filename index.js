const puppeteer = require('puppeteer');
const fs = require('fs');
const gitAutoCommitAndPush = require('./autoCommitPush');



async function clickLoadMore(page, selector, times) {
  try {
    await page.waitForSelector(selector, { timeout: 4000 });
    const loadMoreButton = await page.$(selector);
    for (let i = 0; i < times; i++) {
      await loadMoreButton.click();
      await page.waitForTimeout(2000);
    }
  } catch (err) {
    console.error('Todas as ampulhetas foram escaneadas, iniciando conversão');
  }
}

async function scrapeProductData(page) {
  const productData = [];
  const productDivs = await page.$$('.css-rj8yxg');
  for (const div of productDivs) {
    const infoIcon = await div.$('img[aria-haspopup="dialog"]');
    if (infoIcon) {
      const textElement = await div.$('.chakra-text');
      if (textElement) {
        const textValue = await textElement.evaluate(el => el.textContent);
        const priceElement = await div.$('.chakra-heading');
        if (priceElement) {
          const precoDoItem = await priceElement.evaluate(el => el.textContent);
          const idDoItem = textValue.replace('#', '');
          if (!precoDoItem.includes(',')) { // Verifica se o preço não contém vírgula
            productData.push({
              id: idDoItem,
              price: precoDoItem,
            });
          }
        }
      }
    }
  }

  async function main() {

  }
  return productData;
}

async function scrapeTimeRemaining(browser, productData, poolSize) {
  const chunks = chunkArray(productData, poolSize);
  for (const chunk of chunks) {
    const promises = chunk.map(async (product) => {
      const link = `https://openloot.com/items/BT0/Hourglass_Common/issue/${product.id}`;
      const newPage = await browser.newPage();
      await newPage.goto(link);
      const tempo = await newPage.evaluate(() => {
        const timeRemainingElement = document.querySelector("#__next > div > main > div > div > div > section > div > div.css-pckl1t > div.css-1nlrkd1 > div.chakra-stack.css-1yq6kto > div.css-12n3wqh > div > div > p.chakra-text.css-10ycfue");
        if (timeRemainingElement) {
          return timeRemainingElement.textContent;
        }
        return '';
      });
      await newPage.close();
      if (tempo !== '0.00') {
        product.time = tempo;
      }
    });
    await Promise.all(promises);
  }
}

function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

async function main() {
  const browser = await puppeteer.launch({ headless: false });
  const poolSize = 10;

  for (let i = 0; i < 1; i++) { // Loop defasado
    const page = await browser.newPage();

    const LoadMoreSelector = '#__next > div > main > div > div > div > section > div > div.css-1pbv1x7 > div.css-o9757o > div.css-1pobvmq > div.css-ugaqnf > button';
    await page.goto('https://openloot.com/items/BT0/Hourglass_Common');
    await page.waitForNavigation({ waitUntil: 'load' });
    await page.waitForTimeout(5000);
    await clickLoadMore(page, LoadMoreSelector, 100); //<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

    const productData = await scrapeProductData(page);
    await page.close();




    await scrapeTimeRemaining(browser, productData, poolSize);
    const filteredProductData = productData.filter((product) => product.price && product.time && product.time !== '0.00');
    filteredProductData.sort((a, b) => parseFloat(a.time) - parseFloat(b.time));
    const dadosStr = filteredProductData.map((product) => `${product.id}\t${product.price}\tLink\t${product.time}`).join('\n');
    ordenarPorMelhorPrecoPorMinuto(dadosStr);
  }
  await browser.close();
}

function ordenarPorMelhorPrecoPorMinuto(dadosStr) {
  const linhas = dadosStr.split('\n');
  const dados = [];
  linhas.forEach(function (linha) {
    const partes = linha.split('\t');
    if (partes.length === 4) {
      const id = parseInt(partes[0]);
      const precoStr = partes[1];
      const tempoStr = partes[3];
      const preco = parseFloat(precoStr.replace('$', '').trim());
      const tempo = parseFloat(tempoStr.trim());
      const valorPorMinuto = preco / tempo;
      dados.push([id, preco, tempo, valorPorMinuto]);
    }
  });

  dados.sort(function (a, b) {
    return a[3].toString().localeCompare(b[3].toString());
  });
  const html = gerarHTML(dados);
  fs.writeFileSync('melhores.html', html);
  console.log(`Arquivo "melhores.html" gerado com sucesso.`);
}

function gerarHTML(dados) {
  const now = new Date(); // Obtém a data e hora atual
  const lastUpdate = `last update: ${now.getUTCHours()}:${String(now.getUTCMinutes()).padStart(2, '0')} (UTC)`;

  let html = `
    <html>
      <head>
        <title>SNIPE TIME</title>
        <link rel="stylesheet" href="a.css">
        <link rel="stylesheet" href="melhores.css">
        <link rel="shortcut icon" href="favicon.png" type="image/x-icon">
      </head>
      <body>
        <div class="imagem">
          <img src="SnipeTime_white.png" alt="SnipeTime">
        </div>
        <div>
          <p>Hey there!</p>
          <p>Just wanted to give you a heads up that this site will be taking a bow on November 20th.</p>
          <p>Big thanks to all you awesome users who've been part of the journey so far!</p>
          <p>On a different note, if you're on the lookout for a web developer, I've got your back. Hit me up at vinicipkt@live.com.</p>
        </div>
        <script src="s.js"></script>
        <table>
          <tr>
            <th>ID</th>
            <th>Price</th>
            <th>Time remaining</th>
            <th>Price per minute</th>
          </tr>`;

  dados.forEach(function (entrada) {
    const link = `https://openloot.com/items/BT0/Hourglass_Common/issue/${entrada[0]}`;
    html += `
          <tr>
            <td><a href="${link}" target="_blank">${entrada[0]}</a></td>
            <td>$ ${entrada[1]}</td>
            <td>${entrada[2]}    (${String(Math.floor(entrada[2] / 60)).padStart(2, '0')}h${String(Math.floor(entrada[2] % 60)).padStart(2, '0')}m)</td>
            <td>${entrada[3].toFixed(5)} ¢</td>
          </tr>`;
  });

  html += `
        </table>
      </body>
    </html>`;
  return html;
}




async function run() {
  const numIterations = 1000; // Número de vezes que irá rodar
  const delayBetweenIterations = 30000;

  for (let i = 0; i < numIterations; i++) {
    try {
      await main();
      gitAutoCommitAndPush('Meu commit automático');
    } catch (error) {
      console.error('Erro na iteração', i + 1);

      // Fecha o navegador em caso de erro e continua para a próxima iteração
      const browser = await puppeteer.launch();
      await browser.close();
      continue;
    }

    if (i < numIterations - 1) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenIterations));
    }
  }
}

run();
