
import { SelfStorageFacilityWebScrapeResult } from '../../../selfStorageClassicScrapers/base/model/selfStorageWebScrapeResult';
import puppeteer, { Page } from 'puppeteer';
import cheerio from 'cheerio';
import { scrapeRentRow } from './scrapeRentRow';
import { accessPageWithPuppeteer } from '../../../puppeteer/puppeteer';
import { extractAddress } from '../../../selfStorageClassicScrapers/base/extractors/extractAddress';
import { FullProperty } from '../../../../../src/model/prisma/prisma';
import { PropRisePrismaClient } from '@/api_helper/prisma/prisma';

export async function scrapeEasyStorageSolutions(page: Page, url: string, fullProperty?: FullProperty): Promise<SelfStorageFacilityWebScrapeResult | undefined> {
    // Extract the HTML content from the page
    const content = await page.content();

    // Load the HTML content into cheerio for parsing
    const $ = cheerio.load(content);

    const phone = $('p:nth-child(3) a').first().text().trim();
    const website = url;

    const footer = $('footer.widget-footer.primary-background');
    const addressText = footer.find('div.col-sm-4').first().find('p span').first().text().trim();

    let address, cityStateZip, city, stateZip, state, zip;

    try {
        [address, cityStateZip] = addressText.split('\n').map(line => line.trim());
        [city, stateZip] = cityStateZip.split(',').map(line => line.trim());
        [state, zip] = stateZip.split(' ').map(line => line.trim());
    } catch (error) {
        address = cityStateZip = city = stateZip = state = zip = '';
        if (!fullProperty) {
            console.error('Error breaking down address:', error);
            throw new Error('Failed to extract address and fullProperty is not provided' + error);
        }
    }
    const facilityName = footer.find('div.col-sm-4').first().find('p strong').text().trim();
    const result: SelfStorageFacilityWebScrapeResult = {
        rents: [],
        "address": fullProperty?.address ?? address,
        "city": fullProperty?.city ?? city,
        "state": fullProperty?.state ?? state,
        "zip": fullProperty?.zipCode ?? zip,
        name: facilityName,
        phone,
        website,
    };

    // Iterate through available unit panels and extract info
    $('.unit-type').each((_, el) => {
        result.rents.push(scrapeRentRow(el, url));
    });

    await page.close()

    // Return the result object with all extracted information
    return result;
}
