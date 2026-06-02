 There are two files in this project: 

1) `wixHome.js` - front-end code, run upon initialisation of the website's home page
2) `embeddedCode.html` - runs in a sandboxed iFrame whose id="embedCal" on home page (this iFrame component will be referred to as `#embedCal`)

## What Each File Does

### wixHome.js

The flow within the code is composed of 3 steps (though 4 steps were written in the comments in this file, they are essentially 3 steps): 

1) Fetch all services from Wix API, and pass them to the embedded component upon page initialisation.
2) Listen to `#embedCal` regarding service selection. Once a service is chosen, fetch its available slots and other relevant information (e.g. staff list, service variants, etc.) from APIs, then pass the data to `#embedCal`.
3) Listen to `#embedCal` regarding booking action. If a customer books a slot, use the slot information to form a URL and redirect to it. From there, the platform is going to handle customer information collection, slot validity verification, and finally, payment.

### embeddedCode.html

This file is responsible for rendering dropdown menu, calendar, slots and any error message, depending on the data passed from `wixHome.js`. A regular flow looks like this:

1) Listen to the parent window (where `wixHome.js` runs) regarding all services. Push them into the dropdown menu.
2) When a service is selected, post a message to the parent window, requesting available slots of the service.
3) Listen to the parent window regarding available slots, and render the slots once data arrives.
4) When a slot is booked, post a message to the parent window, providing its information.

## Cross-window Communication Protocol

The parent window and `#embedCal` communicate using the method `window.postMessage()`. This method allows transmitting a wide variety of data objects. The data objects used in this programme have the following structure:

```
{
  type: <type_of_this_message>, // the determinant of the protocol
  data: <actual data>
}
```
An examples of the actual data objects being passed: 
```
{
  type: 'REQ_BOOK_CLS',
  data: {
    serviceId: serviceId,
    startDate: startDate,
    endDate: endDate,
    timeZone: "Europe/London",
  }
}
```

### Types Used By Parent Window 

| Types           | Explanations    | Notes    |
| -------------   | ------------- | --- |
| `SET_SERVICES`  | To pass the complete service list to `#embedCal` |  |
| `SET_APPO_SLOTS`| To pass the available slots to `#embedCal` when the service category is "Appointment" (category defined by Wix) |  |
| `SET_CLS_SLOTS` | To pass the available slots to `#embedCal` when the service category is "Class" |  |
| `SET_APPO_SLOTS_VARIANTS` | To pass the available slots together with a booking link to `#embedCal` when the service category is "Appointment" and when there are variant options for this service (e.g. different durations) |  |
| `ERROR_GET_SERVICES` | To inform `#embedCal` there is an error when fetching the complete service list |  |
| `ERROR_GET_SLOTS` | To inform `#embedCal` there is an error when fetching the available slots for a service | Works for services in any category |
| `ERROR_BOOK_CLS` | To inform `#embedCal` there is an error when booking a slot for a class | Supposedly, there should not be any error to book a slot, because what parent window does is to form a link with the information passed by `#embedCal` and redirect to it. However, when booking a class, the parent window needs to retrieve an id from the API before the link formation. That part may cause error. So only the error message for booking classes is needed |

### Types Used By `#embedCal` 

| Types            | Explanations    |
| -------------    | ------------- |
| `GET_APPO_SLOTS` | To request available slots of a service whose category is "Appointment" from the parent window |
| `GET_CLS_SLOTS` | To request available slots of a service whose category is "Class" from the parent window |
| `REQ_BOOK_APPO` | To inform the parent window that a appointment slot is booked, passing relevant information |
| `REQ_BOOK_CLS` | To inform the parent window that a class slot is booked, passing relevant information |

### Preventing Message Loss

Since the communication happens between child and parent windows, the only possibility of message loss is the race condition where child posts message to parent prior to parent being fully initialised. 

However, in this case, the whole communication starts with the parent window sending a message typed `SET_SERVICES` with the services data to the `#embedCal`. If any issue causes failure for the parent to fetch the services data in the first place, it sends a message typed `ERROR_GET_SERVICES` instead. Since it is always the parent who talks first, there is no need to worry about the `#embedCal` sending message at the wrong time. 
