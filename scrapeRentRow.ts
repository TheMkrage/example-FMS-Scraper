
import { Prisma } from "@prisma/client";
import cheerio from 'cheerio';
import { extractNumber } from "../../../selfStorageClassicScrapers/base/extractors/extractPrice";
import { LimitedPartial, DiscountsAndNamePartial } from "../../../selfStorageClassicScrapers/base/model/models";
import { MonthlyRentPartial } from "../../../selfStorageClassicScrapers/base/model/monthlyRentPartial";
import { extractDimensions } from '../../../selfStorageClassicScrapers/base/extractors/extractDimension';

export function scrapeRentRow(element: cheerio.Element, url: string): Omit<Prisma.SelfStorageRentUncheckedCreateWithoutWebsiteScrapeAttemptInput, "propertyId"> {
  const $ = cheerio.load(element);

  const unitAmenities: string[] = scrapeUnitAmenities($);
  const monthlyRentPartial: MonthlyRentPartial = scrapeMonthlyRent($);
  const limitedPartial: LimitedPartial = scrapeLimited($);

  const discountsAndNamePartial: DiscountsAndNamePartial = scrapeDiscountsAndName($);

  const availability: boolean = scrapeAvailability($);

  return {
    date: new Date().toISOString(),
    unitAmenities,
    ...monthlyRentPartial,
    ...limitedPartial,
    ...discountsAndNamePartial,
    isAvailable: availability,

    source: url,
  };
}

export function scrapeUnitAmenities($: cheerio.Root): string[] {
  const unitAmenities: string[] = [];

  // Extract amenities from the unit-description elements
  $(".unit-description").each((_, element) => {
    const descriptions = $(element).text().split('\n');
    descriptions.forEach(desc => {
      if (desc) {
        unitAmenities.push(desc);
      }
    });
  });

  return unitAmenities;
}


export function scrapeMonthlyRent($: cheerio.Root): MonthlyRentPartial {
  const unitMenu = $('.unit-menu').first(); // Assuming we're dealing with the first unit-menu for this example
  const onlineRentElement = unitMenu.find('span').first();
  const strikedRentElement = unitMenu.find('s');

  let monthlyOnlineRent: number | null = null;

  if (strikedRentElement.length > 0) {
    monthlyOnlineRent = extractPrice(strikedRentElement);
  } else if (onlineRentElement.length > 0 && onlineRentElement.text().includes('$')) {
    monthlyOnlineRent = extractPrice(onlineRentElement);
  }

  return {
    "monthlyRentOnline": monthlyOnlineRent
  };
}

function extractPrice(priceElement: cheerio.Cheerio): number {
  const priceText = priceElement.text().trim();
  const price = parseFloat(priceText.replace(/[$,]/g, ''));
  return isNaN(price) ? 0 : price;
}
// 
// 
// The function `scrapeMonthlyRent` takes a Cheerio `$` object as input and returns a `MonthlyRentPartial` object. It first finds the price element using the selector `.price.primary-color`, then extracts the monthly rent and monthly rent in-person (if available) from the price element.
// 
// The `extractPrice` function is a helper function that takes a Cheerio element and extracts the price as a number. It removes the dollar sign and comma from the text and parses the resulting value as a float. If the value is not a valid number, it returns 0.
// 
// The `MonthlyRentPartial` object returned by `scrapeMonthlyRent` has the following properties:
// 
// - `monthlyRent`: the monthly rent value, or `null` if not available
// - `monthlyRentInPerson`: the monthly rent in-person value, or `null` if not available

export function scrapeLimited($: cheerio.Root): LimitedPartial {
  const limitedAvailabilityUnitsLeft = $('.available-unit-count') ? extractNumber($('.available-unit-count')) : undefined;

  return {
    limitedAvailability: $('.available-unit-count').length > 0,
    limitedAvailabilityText: $('.available-unit-count').length > 0 ? $('.available-unit-count').text() : undefined,
    limitedAvailabilityUnitsLeft
  };

}

export function scrapeDiscountsAndName($: cheerio.Root): DiscountsAndNamePartial {

  const discounts: string[] = [];

  const unitDescriptionShort = $('h4.primary-color').text().trim();
  const unitDescriptionLong = $('p.unit-description')
    .toArray()
    .map((el) => $(el).text().trim())
    .join('\n');

  const dimensions = extractDimensions(unitDescriptionShort);

  const discountElement = $('.alert-warning');
  if (discountElement.length > 0) {
    discounts.push(discountElement.first().text().trim());
  }

  return {
    discounts,
    unitDescriptionShort,
    unitDescriptionLong,
    ...dimensions
  };

}

export function scrapeAvailability($: cheerio.Root): boolean {
  const rentButton = $('button[data-kind="rent"]').text().trim();
  const isAvailable = rentButton.length > 0 && rentButton === 'Rent Now';
  return isAvailable;
}

// export function scrapeAvailability($: cheerio.Root): boolean {
//   const extractDimensions = ($: cheerio.Root): string => {
//     return $('h4.primary-color').text().trim();
//   };

//   const hasDiscount = ($: cheerio.Root): boolean => {
//     return $('div.alert.alert-warning').length > 0;
//   };

  
  // 
  // 
  // The key points of this implementation are:
  // 
  // 1. The `extractNumber` and `extractPrice` functions use regular expressions to extract the numeric values from the price text.
  // 2. The `extractDimensions` function simply gets the text of the `h4.primary-color` element.
  // 3. The `hasDiscount` function checks if there is a discount element (`.alert.alert-warning`) present.
  // 4. The `scrapeAvailability` function checks if the "Rent Now" button is present and not disabled, which indicates the unit is available.
  // 
  // The function returns a boolean value indicating whether the unit is available or not.
// }
