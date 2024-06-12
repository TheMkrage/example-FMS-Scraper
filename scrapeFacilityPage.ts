
import { Page, TimeoutError } from 'puppeteer';

import { SelfStorageFacilityWebScrapeResult } from '../../../selfStorageClassicScrapers/base/model/selfStorageWebScrapeResult';
import cheerio from 'cheerio';
import { SmartScraperError } from '../../run';
import { delay } from '@/model/generic/generic';

export async function scrapeTenant(page: Page, url: string): Promise<SelfStorageFacilityWebScrapeResult | undefined> {
	// this should timeout after some time if it does not resolve?
	try {
		// set up network listeners and then refresh the page. 
		await page.setRequestInterception(true);

		// Create a promise to capture the response data
		let resolvePromise: (value: string | PromiseLike<string>) => void;
		let rejectPromise: (reason?: any) => void;

		const promiseRawJsonFromDataFacInfo = new Promise<string>(async (resolve, reject) => {
			resolvePromise = resolve;
			rejectPromise = reject;

			// Response listener for network requests
			page.on('response', async (response) => {
				try {
					const url = response.url();
					if (url.includes('space-types')) {
						const data = await response.text();

						if (data) {
							resolvePromise(data);
						} else {
							rejectPromise("Could not find data-fac-info");
						}
					}
				} catch (error) {
					console.error("Error reading Tenant response:", error);
					rejectPromise("Error reading Tenant response: " + error);
				}
			});

			// Request listener for network requests
			page.on('request', (request) => {
				try {
					request.continue();
				} catch (error) {
					console.error("Error handling Tenant request:", error);
					rejectPromise("Error handling Tenant request: " + error);
				}
			});



			try {
				await page.reload({ waitUntil: 'networkidle0' });
				// Wait for some time to allow network requests to complete
				await delay(5000)
			} catch (error) {
				console.error("Error reloading page in Tenant: ", error);
				rejectPromise("Error reloading page in Tenant: " + error)
			}
		});

		const timeoutPromise = new Promise<string>((_, reject) => {
			setTimeout(() => reject(new TimeoutError('Tenant Wait for network timed out after 60 seconds, likely not a rent page')), 60000);
		});

		// Wait for the promise to resolve or reject
		const rawJson = await Promise.race([promiseRawJsonFromDataFacInfo, timeoutPromise]);

		// Parse JSON and turn it into a storage rent object
		const storageInfo = JSON.parse(rawJson) as any;
		const applicationData = Object.values(storageInfo.applicationData) as any[][];

		const toReturn: SelfStorageFacilityWebScrapeResult = {
			name: storageInfo.facility_name,
			address: storageInfo.facility_address,
			zip: storageInfo.facility_zipcode,
			city: storageInfo.facility_city,
			state: storageInfo.facility_state,
			website: url,
			rents: applicationData[0][0].data.map((rental: any) => ({
				date: new Date(),
				monthlyRentOnline: rental.price ? parseFloat(rental.price.web) : null,
				monthlyRentInPerson: rental.price ? parseFloat(rental.price.instore) : null,
				unitDescriptionShort: rental.size_category.label.en,
				unitDescriptionLong: rental.description.en,
				unitDimensionsLengthInFeet: rental.width, // backwards because of how they store it is opposite us
				unitDimensionsWidthInFeet: rental.length,
				isAvailable: rental.available_count > 0,
				discounts: rental.promos ? rental.promos.map((promo: any) => promo?.description?.en) : [],
				unitAmenities: rental.amenities ? rental.amenities.map((f: any) => f.value) : [],
				source: url,
				limitedAvailability: rental.available_count < 5,
				limitedAvailabilityUnitsLeft: (rental.available_count || rental.available_count === 0) ? parseInt(rental.available_count) : null,
				unitDimensionsHeightInFeet: rental.height || null
			}))
		};

		return toReturn;
	} catch (error: any) {
		console.error("Tenant:", error);
		throw new SmartScraperError("Tenant: " + error, "", "Tenant", error)
	} finally {
		// Clean up: remove listeners to prevent memory leaks
		page.removeAllListeners('request');
		page.removeAllListeners('response');
	}

	// parse json and turn into a storage rent object
}
