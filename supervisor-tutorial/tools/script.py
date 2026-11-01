"""Chapters for the Supervisor Panel tutorial.
Each chapter: title, src (1 = first recording, 2 = second recording),
list of (start, end) source ranges in seconds, and narration sentences."""

CHAPTERS = [
    {"title": "Welcome", "card": True, "lines": [
        "Welcome to the Cher Services Supervisor Panel.",
        "In this guide, you will learn how to review reports, schedule jobs, handle parts requests, create invoices, and manage your customers and your team.",
        "The main menu is always at the top of the screen."]},

    # ---------------- 1. Service reports
    {"title": "1. Service reports", "src": 1, "ranges": [(6.0, 11.5), (90.0, 95.5)], "lines": [
        "Open Reports and Jobs, then Service reports.",
        "Every report sent from the technicians' tablets appears here.",
        "The yellow box warns you about empty or duplicate reports. You can open them, keep them, or delete them.",
        "Use the search and the filters to find a report, or click Export CSV to download the list."]},
    {"title": "1. Service reports", "src": 2, "ranges": [(4.0, 30.0)], "lines": [
        "Click a report number to open it.",
        "You will see the customer, the daily time record, the services performed, the parts requested, the job status, and the signatures.",
        "At the top, you can download the PDF, email it, or delete it.",
        "At the bottom, you can email the office copy, or create an invoice from this report."]},
    {"title": "1. Service reports", "src": 2, "ranges": [(40.0, 62.0)], "lines": [
        "Sometimes the technician asks to change the customer's data, for example a new email.",
        "Review the change in the yellow box, and click Approve and update the customer.",
        "You can also open the full history of the machine by its serial number."]},
    {"title": "1. Service reports", "src": 2, "ranges": [(62.0, 110.0)], "lines": [
        "When the work is done, scroll down to Signatures and click Sign as supervisor.",
        "Sign with your mouse, your finger, or a pen. Click Clear to try again.",
        "Then click Accept signature. The report is signed, and the job is marked as complete."]},
    {"title": "1. Service reports", "src": 2, "ranges": [(124.0, 154.0)], "lines": [
        "To delete a report, open it and click Delete.",
        "Write the reason, and enter your supervisor PIN. Both are required.",
        "In-house parts go back to stock, and a copy of the report stays in the activity log."]},

    # ---------------- 2. Employees
    {"title": "2. Add an employee", "src": 1, "ranges": [(65.0, 90.0)], "lines": [
        "To add a team member, go to Employees and click Add employee.",
        "Type the full name and an employee ID.",
        "Choose the role, Technician or Supervisor, and set a PIN of four to eight digits.",
        "Keep Active checked so the person can sign in on the tablet. Then click Save."]},

    # ---------------- 3. Jobs
    {"title": "3. Schedule a job", "src": 1, "ranges": [(96.0, 118.0)], "lines": [
        "To schedule a visit, open Jobs and appointments, and click New job.",
        "Pick a saved customer, or type a new name, and assign a technician."]},
    {"title": "3. Schedule a job", "src": 1, "ranges": [(118.0, 128.0)], "lines": [
        "Check this box if the customer agrees to WhatsApp reminders."]},
    {"title": "3. Schedule a job", "src": 1, "ranges": [(128.0, 142.0)], "lines": [
        "Set the appointment date and time."]},
    {"title": "3. Schedule a job", "src": 1, "ranges": [(142.0, 152.0)], "lines": [
        "For regular maintenance, choose how often the job repeats. For example, every week."]},
    {"title": "3. Schedule a job", "src": 1, "ranges": [(152.0, 198.0)], "lines": [
        "Fill in the address, and the customer's WhatsApp and email.",
        "You can also add the machine's make, model, and serial number, the work order, and instructions for the technician."]},
    {"title": "3. Schedule a job", "src": 1, "ranges": [(198.0, 210.0)], "lines": [
        "Click Save job. The job appears in the list, and on the technician's tablet, with the customer and the equipment already filled in."]},
    {"title": "4. Manage jobs", "src": 2, "ranges": [(178.0, 194.0)], "lines": [
        "If a technician asks to cancel a job, it is highlighted in the list.",
        "Open it, read the request at the bottom, and click Approve to cancel the job, or Decline."]},
    {"title": "4. Manage jobs", "src": 2, "ranges": [(194.0, 230.0)], "lines": [
        "Open any job to change it.",
        "To move the visit, pick a new date and time, and click Reschedule.",
        "From here you can also send a WhatsApp reminder, cancel the job, or mark the follow-up visit as done.",
        "A cancelled job can be reopened, or deleted. Click Save job to keep your changes."]},
    {"title": "4. Manage jobs", "src": 2, "ranges": [(230.0, 248.0)], "lines": [
        "To give the job to another technician, just choose a new name and save.",
        "To remove a job completely, click Delete."]},

    # ---------------- 5. Invoices
    {"title": "5. Create an invoice", "src": 1, "ranges": [(210.0, 250.0)], "lines": [
        "To bill a customer, go to Invoices, and click New invoice.",
        "Choose who pays: the customer directly, or a person paying for a company you already serve.",
        "In the second case, pick the company from the list."]},
    {"title": "5. Create an invoice", "src": 1, "ranges": [(250.0, 276.0)], "lines": [
        "The address, phone, and email fill in automatically. You can correct them here.",
        "Keep the box checked to update the customer's information."]},
    {"title": "5. Create an invoice", "src": 1, "ranges": [(276.0, 300.0)], "lines": [
        "Now add what you are billing. Click Labor or service for hours of work, then enter the hours and the rate."]},
    {"title": "5. Create an invoice", "src": 1, "ranges": [(300.0, 336.0)], "lines": [
        "Click In-house part to add parts from your stock. Search the part number, and click Add.",
        "In-house parts come out of the inventory automatically. Parts from a vendor go to Orders.",
        "The subtotal, sales tax, and total are calculated for you."]},
    {"title": "5. Create an invoice", "src": 1, "ranges": [(336.0, 372.0)], "lines": [
        "When a company pays, write the name of the contact person. The invoice will say: attention, this person.",
        "Click Save invoice. If something is missing, a red message tells you what to fix."]},
    {"title": "5. Create an invoice", "src": 1, "ranges": [(372.0, 388.0)], "lines": [
        "Every invoice needs a work order. Choose the service report from the list, or choose Sale without a service report."]},
    {"title": "5. Create an invoice", "src": 1, "ranges": [(388.0, 402.0)], "lines": [
        "If you leave an invoice without saving, a yellow banner reminds you. Open it to finish, or delete it.",
        "Unsaved drafts are deleted after twenty-four hours."]},

    # ---------------- 6. Parts & Orders
    {"title": "6. Parts & Orders", "src": 1, "ranges": [(402.0, 420.0)], "lines": [
        "Parts and Orders shows the parts your technicians ask for.",
        "In-house parts are reserved for two hours, and vendor parts go to Orders to vendors."]},
    {"title": "6. Parts & Orders", "src": 3, "ranges": [(128.0, 166.0)], "lines": [
        "Orders to vendors lists the parts you need to buy from a supplier.",
        "To save a supplier, open Vendors and click Add vendor.",
        "Enter the company name, the contact person, phone, WhatsApp, and email, and your account number with that vendor. Then click Save vendor."]},
    {"title": "6. Parts & Orders", "src": 2, "ranges": [(252.0, 318.0)], "lines": [
        "Click a request to open it. You will see the technician, the customer, the machine, and the parts.",
        "Check the unit price and change it if needed. You can also add a line, or choose a vendor.",
        "Write a message for the technician. For example: available now, full payment required.",
        "Then click Send quote to technician. The technician shows the quote to the customer."]},
    {"title": "6. Parts & Orders", "src": 2, "ranges": [(356.0, 382.0)], "lines": [
        "When the customer accepts, open the request and click: Customer said yes, approve and reserve parts.",
        "The parts are reserved for two hours. Use the buttons to extend the time if you need more.",
        "When you are ready to bill, click Create invoice."]},
    {"title": "6. Parts & Orders", "src": 2, "ranges": [(382.0, 402.0)], "lines": [
        "The new invoice opens with the customer, the parts, and the prices already filled in.",
        "The reference shows the parts request number, so you can always trace it."]},
    {"title": "6. Parts & Orders", "src": 2, "ranges": [(402.0, 426.0)], "lines": [
        "In Work order, choose the service report that these parts belong to.",
        "If the parts were sold on their own, choose Sale without a service report. Then click Save invoice."]},
    {"title": "6. Parts & Orders", "src": 2, "ranges": [(426.0, 438.0)], "lines": [
        "The invoice is saved, and opens on screen. From here you can edit it, download the PDF, print it, or send it by email or WhatsApp.",
        "When the customer pays, enter the amount, the method, and the date, and click Record payment."]},

    # ---------------- 7. Manage invoices
    {"title": "7. Manage invoices", "src": 3, "ranges": [(24.0, 33.0)], "lines": [
        "If you leave changes to an invoice without saving, a yellow banner appears at the top of every page. Click Open to go back to it."]},
    {"title": "7. Manage invoices", "src": 3, "ranges": [(33.0, 52.0)], "lines": [
        "To change an invoice, open it and click Edit.",
        "In Work order, open the list and choose the service report this invoice belongs to. Each report shows its number, its date, and the machine.",
        "Then click Save invoice."]},
    {"title": "7. Manage invoices", "src": 3, "ranges": [(52.0, 64.0)], "lines": [
        "When the customer pays, go to Payments. Enter the amount, the method, the date, and a note, such as a check or reference number. Then click Record payment.",
        "Payments are not collected in the app. Here, you only record what the customer paid."]},
    {"title": "7. Manage invoices", "src": 3, "ranges": [(64.0, 88.0)], "lines": [
        "In Status, you can change the invoice status, for example to Paid, and add a note. Click Update status.",
        "Every change is saved in the status history, with the date and the person who made it."]},
    {"title": "7. Manage invoices", "src": 3, "ranges": [(88.0, 108.0)], "lines": [
        "To cancel an invoice, click Void invoice. In-house parts go back to stock, and the invoice is marked as void."]},
    {"title": "7. Manage invoices", "src": 3, "ranges": [(108.0, 124.0)], "lines": [
        "To remove an invoice completely, click Delete. Write the reason, and enter your supervisor PIN. A copy stays in the activity log."]},

    # ---------------- 8. Customers
    {"title": "8. Customers", "src": 1, "ranges": [(420.0, 448.0)], "lines": [
        "Customers lists everyone you work with, with their contacts, reports, and last service.",
        "Click Import Excel or Word to load a list from a file, or from a photo. You can download a template first.",
        "Click Add customer to create one by hand. You can add extra contacts, and mark frequent customers."]},
    {"title": "8. Customers", "src": 2, "ranges": [(320.0, 342.0)], "lines": [
        "To edit a customer, search the name, and click it.",
        "Update the details and click Save. From here you can also schedule a job, or create a new invoice for this customer."]},

    {"title": "8. Customers", "src": 3, "ranges": [(168.0, 196.0)], "lines": [
        "From a customer's card, click Schedule job to open a new job with the customer's details already filled in. Or click New invoice to bill them right away."]},

    # ---------------- 9-11
    {"title": "9. Inventory & Equipment", "src": 1, "ranges": [(448.0, 466.0)], "lines": [
        "Inventory shows every part in stock, with its price, its quantity, and the total stock value.",
        "Equipment history groups every machine by serial number, so you can see all the work done on it."]},
    {"title": "10. Statistics", "src": 1, "ranges": [(466.0, 500.0)], "lines": [
        "Statistics gives you a quick view of the business.",
        "Choose a period and a technician, to see reports, hours worked, top customers, and parts used."]},
    {"title": "11. Settings", "src": 1, "ranges": [(512.0, 526.0), (0.0, 5.0)], "lines": [
        "Finally, Settings lets you set the next invoice number, the default sales tax, and the labor rate per hour.",
        "From here you can also download a full backup, or export all your data to Excel."]},

    {"title": "You're ready!", "card": True, "lines": [
        "That's it. You are ready to use the Supervisor Panel.",
        "Remember, click Tips at the top of the screen any time you need help."]},
]
