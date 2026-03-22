# Episode 3: Invoice Processing Deep Dive

## Introduction

**MORGAN:** Welcome back to AP and Finance Mastery. We've covered AP fundamentals and the full procure-to-pay journey. Now it's time to go deep on the heart of AP automation: invoice processing.

**KEVIN:** This is the one I've been waiting for. As a product leader at an AP automation company, invoice processing is our bread and butter. I need to understand every detail.

**MORGAN:** Then let's get into it. Invoice processing is where the magic happens, where messy, unstructured documents from thousands of different suppliers get transformed into clean, validated, properly coded transactions in your ERP. It's also where the biggest automation gains are possible.

**[MUSIC TRANSITION]**

## Invoice Ingestion Channels

**KEVIN:** Let's start at the very beginning. How do invoices actually arrive at a company?

**MORGAN:** This is where reality gets messy fast. Invoices arrive through multiple channels simultaneously, and each channel has different characteristics. First, you still have paper mail. Physical invoices sent through the postal service. This is declining but far from dead, especially in certain industries and regions.

**KEVIN:** What percentage of invoices are still paper?

**MORGAN:** It varies enormously by region and industry. In the Nordics, paper is almost gone, maybe five percent. In the US, it's still thirty to forty percent for many mid-market companies. In some developing markets, it's even higher. The global trend is clearly toward electronic, but paper will persist for years.

**KEVIN:** What other channels?

**MORGAN:** Email is probably the most common channel globally. Suppliers send PDF invoices as email attachments. This is better than paper but still creates challenges because the data is locked inside a PDF that needs to be extracted. Then you have EDI, Electronic Data Interchange, which is structured data exchange between systems. It's been around since the 1970s and is still heavily used in manufacturing, retail, and automotive.

**KEVIN:** EDI seems old-school but effective.

**MORGAN:** It is. EDI invoices are already structured data, so there's no extraction needed. The challenge is that EDI is expensive to set up and maintain, and it's typically only used with high-volume suppliers. A company might have EDI connections with their top fifty suppliers but receive invoices from five thousand other suppliers via email and paper.

**KEVIN:** Any other channels?

**MORGAN:** Supplier portals, where suppliers log into a web portal and enter their invoice data directly. This shifts the data entry burden to the supplier. And increasingly, e-invoicing networks like Peppol, which we'll talk about in detail later. These are structured electronic invoices that follow a standard format and can be processed automatically.

**[MUSIC TRANSITION]**

## Data Capture and Extraction

**KEVIN:** This is the core technology challenge, right? Getting data out of invoices?

**MORGAN:** It's the foundation everything else is built on. If you can't accurately extract data from invoices, nothing downstream works. Let me walk you through the evolution of this technology. First generation was manual data entry. A human reads the invoice and types the data into the system. Slow, expensive, error-prone, but still how many companies operate.

**KEVIN:** What came next?

**MORGAN:** Second generation was template-based OCR, Optical Character Recognition. You scan the paper invoice or process the PDF, and the software uses pre-defined templates to know where to look for specific data. The supplier name is in the top left, the invoice number is here, the total is there. The problem is you need a separate template for every supplier, and if a supplier changes their invoice layout, the template breaks.

**KEVIN:** That sounds like a maintenance nightmare.

**MORGAN:** It was. Companies with thousands of suppliers would need thousands of templates. Third generation is intelligent data capture, sometimes called template-free extraction. This uses machine learning to understand invoice layouts without needing pre-defined templates. The AI has been trained on millions of invoices and can identify fields like invoice number, date, total, and line items regardless of the layout.

**KEVIN:** And that's where the industry is now?

**MORGAN:** The leading vendors are there, yes. But the state of the art is actually moving beyond that to what I'd call fourth generation: AI-powered extraction using large language models and computer vision. These systems don't just find fields on a page, they actually understand the document. They can handle handwritten annotations, interpret ambiguous layouts, cross-reference data across multiple pages, and even validate extracted data against business rules.

**KEVIN:** What accuracy rates are we talking about?

**MORGAN:** This is the critical metric. Template-based OCR typically achieves seventy to eighty-five percent accuracy at the field level. Intelligent capture gets to ninety to ninety-five percent. The best AI-powered systems claim ninety-seven to ninety-nine percent accuracy for header-level data. But accuracy varies significantly by field type and invoice complexity.

**[MUSIC TRANSITION]**

## Header vs Line-Level Data

**KEVIN:** You mentioned header-level data. What's the difference between header and line level?

**MORGAN:** Header-level data is the information that applies to the entire invoice: supplier name, invoice number, invoice date, due date, total amount, tax amount, PO number, and currency. Line-level data is the individual items on the invoice: item description, quantity, unit price, line total, item code, and potentially GL coding per line.

**KEVIN:** And line-level extraction is harder?

**MORGAN:** Significantly harder. Header data usually appears in consistent locations with clear labels. Line data is in tables that vary enormously in structure across suppliers. Some invoices have simple tables with four columns. Others have complex tables with subtotals, grouped items, multiple tax rates per line, and descriptions that span multiple rows.

**KEVIN:** Why does line-level data matter?

**MORGAN:** For three-way matching. If you only extract the header total, you can do a two-way match: does the total match the PO total? But for true three-way matching, you need line-level data so you can match individual line items against individual PO lines and goods receipt lines. This catches issues that header-level matching misses.

**KEVIN:** Like what?

**MORGAN:** Like the supplier billing for the right total amount but with different quantities and prices than agreed. Maybe the PO says one hundred units at ten dollars each. The invoice says eighty units at twelve fifty each. The total is the same, one thousand dollars, but the quantities and prices are wrong. Header matching would pass this. Line matching would catch it.

**[MUSIC TRANSITION]**

## Invoice Validation

**KEVIN:** After extraction, what validation happens?

**MORGAN:** Multiple layers of validation. First, mandatory field validation: does the invoice have all required fields? Missing an invoice number? Reject. No supplier identifier? Reject. Second, mathematical validation: do the line items add up to the subtotal? Does the subtotal plus tax equal the total? You'd be surprised how often suppliers' own math is wrong.

**KEVIN:** Really?

**MORGAN:** More often than you'd think. Tax calculations are especially error-prone, particularly with multiple tax rates. Third is duplicate detection. Is this invoice a duplicate of one we've already received? This is more complex than it sounds. Exact duplicates are easy, same invoice number, same amount, same supplier. But fuzzy duplicates are tricky, maybe the same invoice was sent twice with a slightly different format, or a credit note and re-issue created confusion.

**KEVIN:** What other validations?

**MORGAN:** Supplier validation: is this supplier in our master data? Are their bank details current and verified? Tax validation: is the tax ID valid? Is the tax rate correct for this type of goods in this jurisdiction? Date validation: is the invoice date reasonable? Is the due date consistent with our agreed payment terms? And increasingly, fraud detection: does this invoice look suspicious based on historical patterns?

**[MUSIC TRANSITION]**

## GL Coding and Cost Allocation

**KEVIN:** Let's talk about GL coding. How do invoices get coded to the right accounts?

**MORGAN:** For PO-backed invoices, the coding is usually inherited from the purchase order. When someone created the PO, they specified which GL account, cost center, and project to charge. The invoice simply inherits that coding. Easy.

**KEVIN:** And for non-PO invoices?

**MORGAN:** That's where it gets interesting. Historically, the AP clerk or the approver would manually assign GL codes. This requires knowledge of the chart of accounts, which in a large enterprise can have thousands of accounts. Getting it wrong means the expense shows up in the wrong place in the financial statements.

**KEVIN:** And AI can help here?

**MORGAN:** It's one of the most impactful applications of AI in AP. The system learns from historical coding patterns. If the last fifty invoices from this supplier were coded to GL account 61000 office supplies, there's a high probability the next one should be too. The AI suggests the coding, and the user just confirms or corrects. Over time, the suggestions get better and better.

**KEVIN:** What about split coding? An invoice that needs to be allocated across multiple cost centers?

**MORGAN:** Common and complex. A consulting invoice might need to be split sixty percent to marketing and forty percent to product development. Or an IT hardware invoice might need to be split across ten different departments. The system needs to support these splits and ideally learn the patterns for common split scenarios.

**[MUSIC TRANSITION]**

## Approval Workflows

**KEVIN:** Tell me about approval workflows.

**MORGAN:** Approval workflows are the rules that determine who needs to approve an invoice before it can be paid. They're typically based on a combination of factors: the invoice amount, who over five thousand dollars needs VP approval. The department or cost center being charged. The expense type, capital expenditures might require different approvers than operating expenses. And whether there's a PO, PO-backed invoices that match perfectly might need no additional approval.

**KEVIN:** How complex do these workflows get?

**MORGAN:** Very complex in large organizations. You might have rules like: invoices under one thousand dollars with a matching PO are auto-approved. Invoices between one thousand and ten thousand require department manager approval. Invoices over ten thousand require VP approval. Capital expenditures over fifty thousand require CFO approval. And if the original approver is on vacation, it escalates to their backup.

**KEVIN:** Delegation and escalation are key features then?

**MORGAN:** Essential. If an approver is out of office and doesn't have delegation set up, invoices pile up in their queue. Late payments follow. The best AP systems handle this elegantly with automatic delegation, escalation after configurable time periods, and mobile approval so people can approve on their phones.

**KEVIN:** Mobile approval seems critical. People aren't sitting at their desks all day.

**MORGAN:** It's become table stakes. An approver should be able to review an invoice, see the relevant context like the PO and goods receipt, and approve or reject with a single tap on their phone. Anything that adds friction to the approval process slows down the entire invoice lifecycle.

**[MUSIC TRANSITION]**

## Touchless Processing: The Holy Grail

**KEVIN:** Let's talk about the ultimate goal: touchless invoices.

**MORGAN:** Touchless processing, or straight-through processing, means an invoice goes from receipt to payment-ready with zero human intervention. The system captures the data, validates it, matches it against the PO and goods receipt, applies the correct coding, and queues it for payment. No one needs to look at it.

**KEVIN:** And you mentioned the benchmarks are eighty-five percent for top performers versus twenty-seven percent average?

**MORGAN:** Right. And that gap represents an enormous amount of manual labor. Think about it. If a company processes fifty thousand invoices a month and has a twenty-seven percent touchless rate, that means thirty-six thousand five hundred invoices need some form of human intervention. If they could get to eighty-five percent, only seven thousand five hundred would need human attention.

**KEVIN:** That's a massive reduction. What determines whether an invoice can be processed touchlessly?

**MORGAN:** Several factors. Does it have a PO? PO-backed invoices are much more likely to be touchless because they can be matched automatically. Is the data extraction accurate? Any field that the AI can't extract with high confidence requires human verification. Does it match within tolerance? Even small discrepancies require human review unless tolerance rules are configured. Is the supplier known and verified? New or unverified suppliers need additional checks.

**KEVIN:** So improving the touchless rate is really about systematically eliminating the reasons invoices need human attention?

**MORGAN:** Exactly. Better data capture reduces extraction exceptions. Better matching rules reduce false positives. Better tolerance configuration reduces unnecessary reviews. Better supplier onboarding reduces unknown supplier issues. It's a continuous improvement process.

**[MUSIC TRANSITION]**

## E-Invoicing Standards

**KEVIN:** Let's talk about e-invoicing. This seems like a game-changer.

**MORGAN:** E-invoicing is arguably the most important trend in the AP space right now. Instead of sending a PDF that needs to be interpreted by AI, the supplier sends a structured electronic document in a standardized format. The data is already clean, labeled, and machine-readable.

**KEVIN:** What are the main standards?

**MORGAN:** The dominant standard in Europe is Peppol, Pan-European Public Procurement Online. It defines both the document format and the network for transmitting e-invoices. Within Peppol, invoices use formats like UBL, Universal Business Language, or CII, Cross-Industry Invoice. Different European countries have their own localizations called CIUS, Core Invoice Usage Specifications.

**KEVIN:** And this is becoming mandatory?

**MORGAN:** Yes, that's the big news. The EU's VAT in the Digital Age directive, known as ViDA, is pushing mandatory e-invoicing across all EU member states. Italy already mandated e-invoicing in 2019. France is phasing it in starting 2026. Germany, Spain, Belgium, and others are following. Outside Europe, countries like India, Brazil, Saudi Arabia, and Mexico already have mandatory e-invoicing.

**KEVIN:** What does this mean for AP automation vendors?

**MORGAN:** It's both a threat and an opportunity. The threat is that if all invoices arrive as structured e-invoices, the data capture and extraction problem goes away, which has been a core value proposition of AP automation. The opportunity is that e-invoicing creates new needs: compliance with country-specific mandates, integration with e-invoicing networks, archival and audit requirements, and handling the transition period where companies receive both e-invoices and traditional invoices.

**KEVIN:** So the product strategy needs to evolve from "we extract data from messy invoices" to "we handle all invoice types and ensure compliance."

**MORGAN:** Precisely. And the companies that handle this transition well will win. The ones that only know how to do OCR will struggle.

**[MUSIC TRANSITION]**

## Invoice Processing Benchmarks

**KEVIN:** Let's talk metrics. What benchmarks should I know?

**MORGAN:** Cost per invoice is the headline metric. APQC data shows top performers at about two dollars per invoice, median around six to seven dollars, and bottom performers over ten dollars. Invoice cycle time, from receipt to payment-ready, top performers are under three days, average is around eight to ten days, worst performers take weeks.

**KEVIN:** What drives those differences?

**MORGAN:** Automation level is the biggest factor. But it's also about process design, exception handling efficiency, and organizational factors like how quickly approvers respond. A company can have great automation technology but still have slow cycle times if invoices sit in approval queues for days.

**KEVIN:** What about error rates?

**MORGAN:** The invoice error rate, meaning invoices processed with incorrect data, is typically one to three percent for automated processes and five to ten percent for manual processes. Each error has a downstream cost: incorrect financial reporting, overpayments, tax errors, and the cost of finding and correcting the mistake.

**[MUSIC TRANSITION]**

## The AP Clerk's Daily Life

**KEVIN:** I want to understand the human side. What does a typical AP clerk's day look like?

**MORGAN:** In a manual environment, it's genuinely tedious. They arrive and check for new invoices in the mail, the AP email inbox, and any portals. They open each invoice, key the data into the ERP, look up the PO number, check the three-way match manually, chase down approvers via email, resolve exceptions by calling suppliers, and manage a backlog that never seems to shrink.

**KEVIN:** And in an automated environment?

**MORGAN:** The day looks completely different. The system has already captured and matched most invoices overnight. The clerk's dashboard shows a list of exceptions that need their attention. They spend their time on high-value activities: investigating discrepancies, resolving supplier disputes, analyzing spend patterns, and handling the complex edge cases that the AI can't handle.

**KEVIN:** So the role evolves from data entry to exception management?

**MORGAN:** Exactly. And that's a much more engaging and valuable role. The best AP professionals today are problem solvers and analysts, not data entry operators. This is important for how you position the product, not as a replacement for people, but as a tool that elevates their work.

**KEVIN:** That's a powerful positioning.

**MORGAN:** It resonates with every AP leader I've worked with. No one went into accounting hoping to type invoice numbers into spreadsheets all day.

**[MUSIC TRANSITION]**

## Wrap Up

**KEVIN:** Morgan, this deep dive on invoice processing has been incredibly valuable. I feel like I understand the core technology challenge and the user experience we need to deliver.

**MORGAN:** And we've only covered the invoice processing piece. Next episode, we're going to tackle payment operations and cash management. That's where AP meets the bank account, and there's a whole other world of complexity around how companies actually move money.

**KEVIN:** Looking forward to it. See you next time.

**MORGAN:** See you next time.

*Next Episode: Payment Operations & Cash Management*
