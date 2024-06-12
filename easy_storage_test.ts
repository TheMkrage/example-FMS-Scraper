import { PropRisePrismaClient } from "@/api_helper/prisma/prisma"
import { accessPageWithPuppeteer } from "../../../puppeteer/puppeteer"
import { checkIfThisIsFmsPowered } from "../../checkIfThisIsFmsPowered"
import { scrapeEasyStorageSolutions } from "./scrapeFacilityPage"
import { FullPropertyInclude } from "@/model/prisma/prisma"


async function main() {
	const urls = [
		"https://www.wildcatselfstorageok.com/",
		"https://storagesolutionssiteclearlake.storageunitsoftware.com/pages/rent",
		"https://www.scstoragesolutions.com/pages/rent"
	]
	for (const url of urls) {
		const fullProperty = await PropRisePrismaClient.property.findUnique({
			where: {
				id: 166674
			},
			...FullPropertyInclude
		})
		if (!fullProperty) {
			throw new Error("Failed to find property with id 166674")
		}
		const page = await accessPageWithPuppeteer(url)
		const supportedFms = await checkIfThisIsFmsPowered(page, console.log)
		const r = await scrapeEasyStorageSolutions(page, url, fullProperty)
		console.log(url)
		console.dir(r, { depth: null })
		console.log(url)
	}
}

main().then(() => {
	console.log("Done");
})