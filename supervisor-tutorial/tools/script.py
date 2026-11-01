"""Chapters for the Supervisor Panel tutorial.
Each chapter: title, list of (start, end) source ranges in seconds, narration sentences."""

CHAPTERS = [
    {
        "title": "Welcome",
        "card": True,
        "lines": [
            "Welcome to the Supervisor Panel.",
            "In this short guide you will learn how to manage reports, jobs, invoices, customers, inventory and your team.",
            "The main menu is always at the top of the screen.",
        ],
    },
    {"title": "1. Service reports", "ranges": [(6.0, 11.5), (90.0, 95.5)], "lines": [
        "Open Reports and Jobs, then Service reports.",
        "Every report sent from the technicians' tablets appears here.",
        "The yellow box warns you about empty or duplicate reports. You can open, keep, or delete them.",
        "Use the search and filters to find a report, or export the list with Export C S V."]},
    {"title": "2. Add an employee", "ranges": [(65.0, 90.0)], "lines": [
        "To add a team member, go to Employees and click Add employee.",
        "Type the full name and an Employee I D.",
        "Choose the role: Technician or Supervisor, and set a P I N of four to eight digits.",
        "Keep Active checked so the person can sign in on the tablet, then click Save."]},
    {"title": "3. Schedule a job", "ranges": [(96.0, 118.0)], "lines": [
        "To schedule a visit, open Jobs and appointments and click New job.",
        "Pick a saved customer, or type a new name, and assign a technician."]},
    {"title": "3. Schedule a job", "ranges": [(118.0, 128.0)], "lines": [
        "Check the box if the customer agrees to WhatsApp reminders."]},
    {"title": "3. Schedule a job", "ranges": [(128.0, 142.0)], "lines": [
        "Set the appointment date and time."]},
    {"title": "3. Schedule a job", "ranges": [(142.0, 152.0)], "lines": [
        "For regular maintenance, choose how often the job repeats, for example every week."]},
    {"title": "3. Schedule a job", "ranges": [(152.0, 198.0)], "lines": [
        "Fill in the address, the customer's WhatsApp and email.",
        "You can also add the machine make, model, serial number, work order and instructions for the technician."]},
    {"title": "3. Schedule a job", "ranges": [(198.0, 210.0)], "lines": [
        "Click Save job. The job appears in the list and on the technician's tablet, with the customer and equipment already filled in."]},
    {"title": "4. Create an invoice", "ranges": [(210.0, 250.0)], "lines": [
        "To bill a customer, go to Invoices and click New invoice.",
        "Choose who pays: the customer directly, or a person paying for a company you already serve.",
        "In the second case, pick the company from the list."]},
    {"title": "4. Create an invoice", "ranges": [(250.0, 276.0)], "lines": [
        "Address, phone and email fill in automatically. You can correct them here.",
        "Keep the box checked to update the customer's information."]},
    {"title": "4. Create an invoice", "ranges": [(276.0, 300.0)], "lines": [
        "Now add what you are billing. Click Labor or service for hours of work, then enter the hours and the rate."]},
    {"title": "4. Create an invoice", "ranges": [(300.0, 336.0)], "lines": [
        "Click In house part to add parts from your stock. Search the part number and click Add.",
        "In house parts come out of the inventory automatically. Parts from a vendor go to Orders.",
        "The subtotal, sales tax and total are calculated for you."]},
    {"title": "4. Create an invoice", "ranges": [(336.0, 372.0)], "lines": [
        "When a company pays, write the name of the contact person. The invoice will say Attention, this person.",
        "Click Save invoice. If something is missing, a red message tells you what to fix."]},
    {"title": "4. Create an invoice", "ranges": [(372.0, 388.0)], "lines": [
        "Every invoice needs a work order. If there is no service report, choose Sale without a service report."]},
    {"title": "4. Create an invoice", "ranges": [(388.0, 402.0)], "lines": [
        "If you leave an invoice without saving, a yellow banner reminds you. Open it to finish, or delete it.",
        "Unsaved drafts are deleted after twenty four hours."]},
    {
        "title": "5. Parts & Orders",
        "ranges": [(402.0, 420.0)],
        "lines": [
            "Parts and Orders shows the parts your technicians ask for.",
            "Set the prices and send the quote. When the customer says yes, approve it.",
            "In house parts are reserved for two hours, and vendor parts go to Orders to vendors.",
        ],
    },
    {
        "title": "6. Customers",
        "ranges": [(420.0, 448.0)],
        "lines": [
            "Customers lists everyone you work with, with their contacts, reports and last service.",
            "Click Import Excel or Word to load a list from a file or a photo. You can download a template first.",
            "Click Add customer to create one by hand. You can add extra contacts and mark frequent customers.",
        ],
    },
    {
        "title": "7. Inventory & Equipment",
        "ranges": [(448.0, 466.0)],
        "lines": [
            "Inventory shows every part in stock, its price, quantity and total stock value.",
            "Equipment history groups every machine by serial number, so you can see all the work done on it.",
        ],
    },
    {
        "title": "8. Statistics",
        "ranges": [(466.0, 500.0)],
        "lines": [
            "Statistics gives you a quick view of the business.",
            "Choose a period and a technician to see reports, hours worked, top customers and parts used.",
        ],
    },
    {
        "title": "9. Settings",
        "ranges": [(512.0, 526.0), (0.0, 5.0)],
        "lines": [
            "Finally, Settings lets you set the next invoice number, the default sales tax and the labor rate per hour.",
            "From here you can also download a full backup or export all data to Excel.",
        ],
    },
    {
        "title": "You're ready!",
        "card": True,
        "lines": [
            "That's it. You are ready to use the Supervisor Panel.",
            "Remember: click Tips at the top of the screen any time you need help.",
        ],
    },
]
