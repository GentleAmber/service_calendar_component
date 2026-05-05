// Doc: Single-service booking flow: https://dev.wix.com/docs/api-reference/business-solutions/bookings/flow-single-service-booking
// Never edit the following code unless you understand what you're doing. 

import { availabilityTimeSlots, serviceOptionsAndVariants, eventTimeSlots, services } from "@wix/bookings";
import { forms } from "@wix/forms";
import wixLocation from "wix-location";
import wixData from "wix-data";

$w.onReady(async function () {
	console.log("Parent v2.0.2. Test everything before step 5. Debugging service slots.");

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
	
	// Step 2: display service variant.
	// To be developed for appointments

	
	$w("#embedCal").onMessage(async (event) => {
		const { type, data } = event.data;

		// Step 3: display slots. Relies on the embedded part.
		if (type == "GET_APPO_SLOTS") {
			const slots = await listAppoSlots(data.serviceId, data.startDate, data.endDate);
			
			if (slots != -1) {
				$w('#embedCal').postMessage({
					type: "SET_APPO_SLOTS",
					data: slots
				})
				console.log("Parent: SET_APPO_SLOTS is fired."); // for test
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

		// Step 4: display booking form. Relies on the embedded part.
		if (type == "REQ_BOOK_APPO") {
			const formId = await getFormId(data.serviceId);
			let res = -1;

			if (formId != -1) {
				res = await getFormSummary(formId);
			} else {
				console.log("Failed to get the form id for service: " + data.serviceId + ".");
			}

			if (res != -1) {
				console.log(res);
			} else {
				console.log("Failed to get response for the form.");
			}
		}

		if (type == "REQ_BOOK_CLS") {
			const formId = await getFormId(data.serviceId);
			let res = -1;

			if (formId != -1) {
				res = await getFormSummary(formId);
			} else {
				console.log("Failed to get the form id for service: " + data.serviceId + ".");
			}

			if (res != -1) {
				console.log(res);
			} else {
				console.log("Failed to get response for the form.");
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
	const options = {
		serviceId: serviceId,
		fromLocalDate: startDate, // "2025-09-15T00:00:00"
		toLocalDate: endDate,
		timeZone: "Europe/London",
		includeResourceTypeIds: ["1cd44cf8-756f-41c3-bd90-3e2ffcaf1155"],
		bookable: true,
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
 * Get form summary for a given formId (bound to a service)
 *
 * @async
 * @returns {Promise<Object|number>}
 * Returns the raw response from API, or -1 if an error occurs.
 *
 */
async function getFormSummary(formId) {
	try {
		const response = await forms.getFormSummary(formId);
		return response;
  	} catch(err) {
		console.error(err);
		return -1;
	}
}

/* Helper functions */
/**
 * Get the form id for a given service id.
 *
 * @async
 * @returns {Promise<string|number>} The form ID string, or -1 if an error occurs.
 *
 */
async function getFormId(serviceId) {
	try {
		const service = await services.getService(serviceId);
  		const formId = service.form.id;
		return formId; 
	} catch(err) {
		console.error(err);
		return -1;
	}	
}