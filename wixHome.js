// Doc: Single-service booking flow: https://dev.wix.com/docs/api-reference/business-solutions/bookings/flow-single-service-booking
// Never edit the following code unless you understand what you're doing. 

import { availabilityTimeSlots, eventTimeSlots, availabilityCalendar } from "@wix/bookings";
import wixLocation from "wix-location";
import wixData from "wix-data";

$w.onReady(async function () {
	console.log("Parent v2.0.7.2. Get session id for mat classes.");

	$w("#testButton").onClick(async () => {

		// const res = await getVariantsByServiceId("6428a612-bd72-426b-bbc4-d9116078c9f6");
	});

	// Step 1: fetch and display service list.
	const services = await getAllServices();
	if (services != -1) {
		$w("#embedCal").postMessage({
			type: "SET_SERVICES",
			data: services
		});
	} else {
		$w("#embedCal").postMessage({
			type: "ERROR_GET_SERVICES",
			data: {}
		});
	}
	
	$w("#embedCal").onMessage(async (event) => {
		const { type, data } = event.data;

		// Step 2: display slots. Relies on the embedded part.
		if (type == "GET_APPO_SLOTS") {
			
			const slots = await listAppoSlots(data.serviceId, data.startDate, data.endDate);
			
			if (slots != -1) {
				$w('#embedCal').postMessage({
					type: "SET_APPO_SLOTS",
					data: slots
				})
			} else {
				$w('#embedCal').postMessage({
					type: "ERROR_GET_SLOTS",
					data: {}
				})
			}
		}

		if (type == "GET_CLS_SLOTS") {
			const slots = await listClassSlots(data.serviceId, data.startDate, data.endDate);

			if (slots != -1) {
				$w('#embedCal').postMessage({
					type: "SET_CLS_SLOTS",
					data: slots
				})
			} else {
				$w('#embedCal').postMessage({
					type: "ERROR_GET_SLOTS",
					data: {}
				})
			}
		}

		// Step 4: jump to the booking form. Let wix handle the rest.
		if (type == "REQ_BOOK_APPO") {
			const queryParams = `?bookings_serviceId=${data.serviceId}&bookings_resourceId=${data.staffId}&bookings_startDate=${encodeURIComponent(data.startDate)}&bookings_endDate=${encodeURIComponent(data.endDate)}&bookings_timezone=${data.timeZone}`;
			const nextUrl = "/booking-form" + queryParams;
			wixLocation.to(nextUrl);
		}

		if (type == "REQ_BOOK_CLS") {
			const session = await getSessionId(data.serviceId, data.startDate, data.endDate);
			if (session != -1 && session.bookable == true) {
				const queryParams = `?bookings_sessionId=${session.sessionId}&bookings_timezone=${data.timeZone}`;
				const nextUrl = "/booking-form" + queryParams;
				wixLocation.to(nextUrl);
			} else {
				console.log("Unable to book.");
			}
		}
	});
})

/* Major functions */
/**
 * Retrieves all booking services from the Wix database,
 * excluding any services that are vouchers.
 *
 * @async
 * @returns {Promise<Array<{id: string, name: string, serviceType: string}>|number>}
 * Returns an array of service objects, or -1 if an error occurs.
 *
 */
async function getAllServices() {
	try {
		const allServiceResults = await wixData.query("Bookings/Services").find();
		const rawItems = allServiceResults.items;
		const services = [];

		rawItems.forEach((i) => {
			if (i.serviceName.includes("voucher")) return;

			const service = {
				id: i._id,
				name: i.serviceName, 
				serviceType: i.serviceType
			};
			services.push(service);
		})

		return services;
	} catch(err) {
		console.error(err);
		return -1;
	}
}

/**
 * List available slots for a given appointment and a time span, 
 * specified by the calendar header.
 *
 * @async
 * @returns {Promise<Array<{startDate: string, endDate: string, location: string,
 * staffList: Array}>|number>}
 * Returns an array of service objects, or -1 if an error occurs.
 *
 */
async function listAppoSlots(serviceId, startDate, endDate) {
	let options;

  options = {
    serviceId: serviceId,
    fromLocalDate: startDate, // "2025-09-15T00:00:00"
    toLocalDate: endDate,
    timeZone: "Europe/London",
    includeResourceTypeIds: ["1cd44cf8-756f-41c3-bd90-3e2ffcaf1155"],
    bookable: true,
    customerChoices: { durationInMinutes: durationInMinutes },
  };

	try {
		const response = await availabilityTimeSlots.listAvailabilityTimeSlots(options);
		const slots = response.timeSlots.map((s) => ({
            startDate: s.localStartDate,
            endDate: s.localEndDate,
            location: s.location.name,
            staffList: s.availableResources[0].resources, // data format: [{name, _id}, {name, _id}]
        }));
		return slots;
	} catch(err) {
		console.error(err);
		return -1;
	}
}

/**
 * List available slots for a given class and a time span, 
 * specified by the calendar header.
 *
 * @async
 * @returns {Promise<Array<{startDate: string, endDate: string, bookable: boolean,
 * bookableCapacity: int, staff: string, sessionId: string}>|number>}
 * Returns an array of service objects, or -1 if an error occurs.
 *
 */
async function listClassSlots(serviceId, startDate, endDate) {
    const options = {
		serviceId: serviceId,
		fromLocalDate: startDate, // "2025-09-15T00:00:00"
		toLocalDate: endDate,
		timeZone: "Europe/London",
      	includeNonBookable: true,
	};

	try {
    	const response = await eventTimeSlots.listEventTimeSlots(options);
		const slots = response.timeSlots.map((s) => ({
			startDate: s.localStartDate,
			endDate: s.localEndDate,
			bookable: s.bookable,
			bookableCapacity: s.bookableCapacity,
			staff: s.availableResources[0].resources[0].name,
			sessionId: s.eventInfo.eventId
		}));
		return slots;
	} catch(err) {
		console.error(err);
		return -1;
	}
}

/**
 * Return session id for a given class slot.
 *
 * @async
 * @param {string} serviceId - the service ID of the class
 * @param {Date} startDate - the starting datetime for the slot
 * @param {Date} endDate - the ending datetime for the slot
 * @returns {Promise<{sessionId: string, bookable: boolean}|number>}
 * Returns a session id, or -1 if an error occurs.
 *
 */
async function getSessionId(serviceId, startDate, endDate) {
	const query = {
		filter: {
			serviceId: serviceId,
			startDate: startDate.toISOString(),
			endDate: endDate.toISOString(),
		},
	};

	try {
		const { availabilityEntries } = await availabilityCalendar.queryAvailability(query);
		const session = { 
			sessionId: availabilityEntries[0].slot.sessionId, 
			bookable: availabilityEntries[0].bookable 
		};
		return session;
	} catch(err) {
		console.error(err);
		return -1;
	}
}
/* Helper functions */