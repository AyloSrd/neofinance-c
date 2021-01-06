//Fare anche per B, >= 14%, <= 60 months

const puppeteer = require('puppeteer')
const nodemailer = require('nodemailer')
require('dotenv').config()
const CronJob = require('cron').CronJob
const url = 'https://www.neofinance.com/en/loans'

let count = 1

let loansArr = [
	{
		ID: 'Cojuhokngjh',
		Loanpurpose: 'Consumer loan',
		Createdat: '2020-07-01',
		Amount: '3000 €',
		Interest: '10 %',
		Maturity: '56 months',
		Availableamount: '1422.67 €'
	  },
	  {
		ID: 'Gppn64925216',
		Loanpurpose: 'Consumer loan',
		Createdat: '2020-07-01',
		Amount: '3000 €',
		Interest: '10 %',
		Maturity: '56 months',
		Availableamount: '1422.67 €'
	  }
]


async function getLoansData() {
	const browser = await puppeteer.launch(/*{
		headless: false
	}*/)
	const page = await browser.newPage()
	await page.setRequestInterception(true)
	page.on('request', (request) => {
		if (['image', 'stylesheet', 'font', 'script'].indexOf(request.resourceType()) !== -1) {
			request.abort()
		} else {
			request.continue()
		}
	})
	
	await page.goto(url)
	
	await page.setViewport({ width: 1280, height: 881 })
	
	await page.waitForSelector('#front_loan_requests > table > tbody')
	const listOfLoans = await page.evaluate(() => {
		const loansTab = document.querySelector('#front_loan_requests > table > tbody')
		const loansRows = loansTab.querySelectorAll('tr')
		const colCategories = []

		for(let i = 1; i < 8; i++){
			colCategories.push(loansRows[0].querySelector(`th:nth-child(${i})`).innerText)//#front_loan_requests > table > tbody > tr:nth-child(1) > th:nth-child(1)
		}

		const loansData = []
		
		try {
			
			for(let i = 1; i < loansRows.length; i++){
				let loan ={}				
				for(let k = 0; k < colCategories.length; k++){
					loan[colCategories[k]] = loansRows[i].querySelector(`td:nth-child(${k + 1})`).innerText
				}
				loansData.push(loan)	
			}

		} catch (error) {
			console.error(error)
		}
		
		return loansData
	})
	await browser.close()
	return listOfLoans
}

const textGen = rawText => {
	let emailText = `Yo coloc! <br> Des nouvelles demandes de prêt: <br>
  `
	for (let i = 0; i < rawText.length; i++) {
    emailText += `classe: ${rawText[i].ID[0]}${rawText[i].ID[1] == '+'? rawText[i].ID[1] : ''}, Interest: ${rawText[i].Interest}, Maturity: ${rawText[i].Maturity}<br>`
  }
	return emailText
}


async function sendEmailToSteve(arr) {
	let transporter = nodemailer.createTransport({
		service: 'gmail',
		auth: {
		  user: process.env.EMAIL,
		  pass: process.env.PASSWORD
		},
		tls: {
			rejectUnauthorized: false
		}
	  });
	
	  let textToSend = textGen(arr)
	  let htmlText = `<p>${textGen(arr)}</p>
	  <a href=\"${url}\">Link</a>`
	
	  let info = await transporter.sendMail({
		from: '"Loan Tracker" <test.ketilmedia@gmail.com>',
		to: process.env.RECIPIENTS,
		subject: 'Nouveau prêts intéressants', 
		text: textToSend,
		html: htmlText
	  });

	  console.log("Message sent: %s", info.messageId)
}

async function checkAndSend() {
	const tempLoansArr = await getLoansData()
	let tempLoansArrA = tempLoansArr.filter(loan => loan.ID[0] == 'A').length === 0 ? '' : tempLoansArr.filter(loan => loan.ID[0] == 'A' && parseFloat(loan.Interest) >= 11.0)

	if (tempLoansArrA.length !== 0 && tempLoansArrA[0].ID !== loansArr[0].ID) {
		loansArr = tempLoansArrA
		console.log(loansArr)
		sendEmailToSteve(loansArr).catch(console.error)
	} 	

	let hour = new Date
	console.log(loansArr)
	console.log(hour.toLocaleTimeString())
	console.log(count)
	count++
}

async function dailyTracking() {
  
    let job = new CronJob(' */5 * * * *', await checkAndSend, null, true, null, null, true);
    job.start();
}

dailyTracking()