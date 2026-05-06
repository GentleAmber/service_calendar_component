import { Permissions, webMethod } from "wix-web-module";
import { httpClient } from "@wix/essentials";

/**
 * Receives a service id and fetches all of its variants including duration and price.
 * 
 * @return Returns an object constructing of: Promise<{variantType: string, variantList: array<{id: string, choices: array, price: object}>} | -1>.
 * 
 */
export const getVariantsByServiceId = webMethod(
  Permissions.Anyone,
  async (serviceId) => {
    const url = `https://www.wixapis.com/bookings/v1/serviceOptionsAndVariants/service_id/${serviceId}`;
    console.log("Url: " + url);
    try {
      const res = await httpClient.fetchWithAuth(url);
      const data = await res.json();
      const variantType = data.serviceVariants.options.values[0].type;
      const variantList = data.serviceVariants.variants.values;
      return {
        variantType: variantType,
        variantList: variantList,
      };
    } catch(err) {
      console.error(err);
      return -1;
    }
  }
);