// const puppeteer = require('puppeteer');
const chromium = require('chrome-aws-lambda');

const path = require('path');
const fs = require('fs');
// const downloadPath = path.resolve('./download'); // '~/Downloads/'; //

const months = 'January,February,March,April,May,June,July,August,September,October,November,December'.split(',');

const buildSuccessfullPath = (dowloadPath) => `${dowloadPath}/vix-futures-historical-p.csv`;

const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 
 * @param {string} inputDateStr 
 * @returns {string}
 */
 function buildDate(inputDateStr) {
  const [year, monthn, day] = inputDateStr.split('-');
  const newMonthn = Number(monthn) - 1;
  return `${months[newMonthn]} ${day.padStart(2, '0')}, ${year}`;
}

async function clearInputDate(page) {
  await page.evaluate(() => document.getElementById("date1").value = "")
}

/**
 * 
 * @param {string} dateStr 
 */
 async function init(dateStr) {
  const browser = await chromium.puppeteer.launch(); // { headless: false }
  const page = await browser.newPage();
  await page.goto('http://vixcentral.com/', {
    waitUntil: 'networkidle2',
  });
  await page.setViewport({
    width: 900,
    height: 900,
    deviceScaleFactor: 1,
  });

  const newDownloadPath = `./download_/` + Date.now().toString(36) + '_' + (Math.random() * 10).toFixed(0);

  await page._client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: path.resolve(newDownloadPath),
  });
  // 
  await page.click('#ui-id-10'); // historical prices tab
  console.log('dateStr', dateStr);
  const newDateFormated = buildDate(dateStr);
  console.log('newDateFormated', newDateFormated);
  await clearInputDate(page);
  await page.type('#date1', newDateFormated);
  await page.click('#b4');
  await timeout(1750);
  await page.mouse.click(801, 175, { button: 'left' });
  await page.mouse.click(662, 376, { button: 'left' });
  await timeout(2500);
  await browser.close();
  const successfullPath = buildSuccessfullPath(newDownloadPath)
  const data = await fs.promises.readFile(successfullPath, 'utf8');
  checkDate(data, newDateFormated);
  console.log('Fin');
  fs.promises.unlink(successfullPath).then(() =>{}, err => console.error('ignore', err));
  return data;
}

/**
 * 
 * @param {string} data 
 * @param {string} reqDate 
 */
function checkDate(data, reqDate) {
  const lines = data.split('\n');
  const [line0] = lines;
  const dateCol = line0.slice(line0.indexOf(',')+1).replace(/"/g, "");
  if (dateCol != reqDate) {
    throw Error(`Date '${reqDate}'not found.`);
  }
}


function onMaybeHandleSuccess(res, data) {
  res.end(data);
}

function onError(err, res) {
  res.status(400).end(err.message)
}

function endpoint(request, response) {
  // your code goes here
  const { date } = request.query;
  init(date)
      .then((data) => onMaybeHandleSuccess(response, data), err => onError(err, response))
}

export default endpoint;
