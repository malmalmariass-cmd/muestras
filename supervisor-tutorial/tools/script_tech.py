"""Chapters for the Technician app tutorial (single source recording)."""

CHAPTERS = [
    {"title": "Welcome", "card": True, "lines": [
        "Welcome to the Cher Services technician app.",
        "In this guide, you will learn how to sign in, manage your jobs, fill in service reports, request parts, and collect signatures."]},

    {"title": "1. Sign in", "src": 1, "ranges": [(8.0, 24.0)], "lines": [
        "Choose Technician, then type your employee ID.",
        "Enter your PIN with the keypad, and tap Sign in.",
        "You can switch the app between English and Spanish at any time."]},

    {"title": "2. My jobs", "src": 1, "ranges": [(24.0, 40.0)], "lines": [
        "Jobs shows the visits the office assigned to you.",
        "Tap a job to see the instructions from the office, the appointment time, the address with a map link, and the customer's contact.",
        "Tap Start report, or Equipment service, to open the report with the customer already filled in."]},
    {"title": "2. My jobs", "src": 1, "ranges": [(40.0, 62.0)], "lines": [
        "If you need more time, tap Postpone to choose a new time on the same day, or Reschedule to pick another date.",
        "Then tap Confirm. The office sees the change right away."]},
    {"title": "2. My jobs", "src": 1, "ranges": [(62.0, 70.0)], "lines": [
        "Tap WhatsApp reminder to send the customer a reminder about the visit."]},
    {"title": "2. My jobs", "src": 1, "ranges": [(70.0, 92.0)], "lines": [
        "If the customer cancels, tap Ask to cancel, write the reason, and tap Confirm.",
        "The request goes to your supervisor, who approves the cancellation."]},

    {"title": "3. Field service report", "src": 1, "ranges": [(92.0, 112.0)], "lines": [
        "To fill in a repair report, open Field Service Report.",
        "Choose the customer from the list. A report number is reserved for you automatically."]},
    {"title": "3. Field service report", "src": 1, "ranges": [(112.0, 128.0)], "lines": [
        "The customer's address, WhatsApp, and email fill in automatically.",
        "If the customer's data has changed, update it here. Your change goes with the report, so the supervisor can approve it."]},
    {"title": "3. Field service report", "src": 1, "ranges": [(128.0, 170.0)], "lines": [
        "In Related serial numbers, enter the machine's model, serial number, and make.",
        "Add the hour meter reading, the location, and the delivery date."]},
    {"title": "3. Field service report", "src": 1, "ranges": [(170.0, 212.0)], "lines": [
        "In Daily time record, enter the date, the time you left the shop, when you started, and when you completed the job, plus the mileage.",
        "Tap Add day for jobs that take more than one day."]},
    {"title": "3. Field service report", "src": 1, "ranges": [(212.0, 222.0)], "lines": [
        "In Faults, describe each problem you found. Tap Add correction to explain what you did to fix it."]},
    {"title": "3. Field service report", "src": 1, "ranges": [(222.0, 241.0)], "lines": [
        "Need parts? Tap Request parts.",
        "Choose In stock to take parts from the shop, or Order from vendor. Set the quantity, tap Add, and then tap Send to supervisor.",
        "The supervisor prepares the quote, and you will see the answer in the report."]},
    {"title": "3. Field service report", "src": 1, "ranges": [(241.0, 256.0)], "lines": [
        "Set the job status: job in progress, awaiting parts, follow-up repair, return to client, or complete.",
        "The customer can write a comment here. Tap Schedule follow-up check if the machine needs another visit."]},
    {"title": "3. Field service report", "src": 1, "ranges": [(256.0, 277.0)], "lines": [
        "In Signatures, tap a box to sign with your finger or a stylus. Then tap Accept signature.",
        "Ask the customer to sign too. The office copy is emailed automatically when the customer signs."]},
    {"title": "3. Field service report", "src": 1, "ranges": [(277.0, 286.0)], "lines": [
        "When you finish, tap Send PDF. The report goes to the office, and the invoice number is assigned."]},

    {"title": "4. History", "src": 1, "ranges": [(286.0, 306.0)], "lines": [
        "History shows all your reports. Search by invoice, customer, serial, or model.",
        "Tap Open to continue a report, PDF to view it, or Copy to start a new report with the same customer and machine.",
        "Reports are saved on the tablet, and sync with the office automatically when there is internet. Tap Sync now to send them right away."]},

    {"title": "5. Equipment service report", "src": 1, "ranges": [(306.0, 338.0)], "lines": [
        "For maintenance, open Equipment Service Report.",
        "Fill in the customer and the machine, then check every service you performed, for example change engine oil, or change hydraulic filter.",
        "Tap Other service to add anything that is not on the list."]},
    {"title": "5. Equipment service report", "src": 1, "ranges": [(338.0, 362.0)], "lines": [
        "To book the next visit, tap Schedule follow-up check.",
        "Choose the date and time, write what to check, mark if the customer agrees to a WhatsApp reminder, and tap Schedule visit.",
        "The visit appears in your Jobs, and in the office."]},
    {"title": "5. Equipment service report", "src": 1, "ranges": [(362.0, 382.0)], "lines": [
        "Collect the signatures, and tap Save, or Send PDF to send it to the office."]},

    {"title": "6. Parts requests", "src": 1, "ranges": [(382.0, 392.0)], "lines": [
        "Parts Requests shows every request you sent, and its status, for example waiting for supervisor.",
        "Tap Edit to change a request, or Ask to cancel. Tap New request to ask for parts without a report, and Vendors to see the supplier list."]},

    {"title": "You're ready!", "card": True, "lines": [
        "That's it. You are ready to use the technician app.",
        "Remember, tap Tips at the top of the screen any time you need help."]},
]
