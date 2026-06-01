There are two files in this project: 

1) `wixHome.js` - front-end code, run upon initialisation of the website's home page
2) `embeddedCode.html` - runs in a sandboxed iFrame whose id="embedCal" on home page (will be referred to as `#embedCal`)

## What Each File Does

### wixHome.js

The flow within the code is composed of 3 steps (though 4 steps were written in the comments in this file, they are essentially 3 steps): 

1) Fetch all services and pass them to the embedded component upon page initialisation.
2) Listen to `#embedCal` regarding service selection. Once a service is chosen, fetch its available slots and other relevant information (e.g. staff list, service variants, etc.) from APIs, then pass the data to `#embedCal`.
3) Listen to `#embedCal` regarding booking action. If a customer books a slot, use the slot information to form a URL and redirect to it. From there, the platform is going to handle contact information collection, slot validity verification, and finally, payment.

### embeddedCode.html

This file is responsible for rendering dropdown menu, calendar, slots and any error message, depending on the data passed from `wixHome.js`. A regular flow looks like this:

1) Listen to the parent window (where `wixHome.js` runs) regarding all services. Push them into the dropdown menu.
2) When a service is selected, post a message to the parent window, requesting available slots of the service.
3) Listen to the parent window regarding available slots, and render the slots once data arrives.
4) When a slot is booked, post a message to the parent window, providing its information.

## Cross-window Communication Protocol

The parent window and the embedded component `#embedCal` communicate with the method `window.postMessage()`.

