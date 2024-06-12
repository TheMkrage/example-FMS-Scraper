import { accessPageWithPuppeteer } from "../../../puppeteer/puppeteer"
import { checkIfThisIsFmsPowered } from "../../checkIfThisIsFmsPowered"
import { scrapeTenant } from "./scrapeFacilityPage"


async function main() {
	const urls = [
		"https://www.lockaway-storage.com/storage-units/texas/conroe/little-egypt-411000/",
		"https://www.lockaway-storage.com/storage-units/texas/conroe/little-egypt-411000/",
		"https://www.lockaway-storage.com/storage-units/texas/conroe/little-egypt-411000/",
		"https://www.lockaway-storage.com/storage-units/texas/conroe/little-egypt-411000/",
	]
	for (const url of urls) {
		const page = await accessPageWithPuppeteer(url)
		const supportedFms = await checkIfThisIsFmsPowered(page, console.log)
		console.log(supportedFms)
		const r = await scrapeTenant(page, url)
		console.dir(r, { depth: null })
	}
}

main().then(() => {
	console.log("Done");
})