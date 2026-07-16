# Episode 1: AP Fundamentals & The Invoice Lifecycle

**Duration:** ~22 minutes

## Introduction

**MORGAN:** Welcome to AP and Finance Mastery, the podcast designed to take you from zero to expert on accounts payable, financial operations, and everything that makes the procure-to-pay world tick. I'm Morgan, and I've spent over twenty years in enterprise finance, from running AP departments to advising on finance transformation initiatives.

**KEVIN:** And I'm Kevin. I'm a product leader who's about to join Medius as Chief Product Officer, and I'll be honest, I need to get smart on this domain fast. I've spent my career building software products, but accounts payable is a new world for me. So Morgan, I'm going to be asking a lot of questions.

**MORGAN:** That's exactly what makes this series valuable, Kevin. You bring the product mindset, I bring the domain expertise, and together we're going to cover everything from the basics of what AP actually is, all the way through to where the industry is heading with AI and autonomous finance.

**KEVIN:** Let's start at the very beginning. What is accounts payable, and why should someone like me, a product leader, care deeply about understanding it?

**[MUSIC TRANSITION]**

## What is Accounts Payable?

**MORGAN:** At its simplest, accounts payable is the money a company owes to its suppliers and vendors for goods and services that have been received but not yet paid for. It's a liability on the balance sheet. But that definition barely scratches the surface of what AP actually does inside an organization.

**KEVIN:** So it's not just the department that pays bills?

**MORGAN:** That's the common misconception, and it's one that has held AP back for decades. Yes, AP processes invoices and makes payments. But it's also the gatekeeper of cash flow, the first line of defense against fraud, a critical compliance function, and increasingly a strategic lever for working capital optimization.

**KEVIN:** Walk me through this. When I think of a typical company, where does AP sit in the organization?

**MORGAN:** AP typically sits within the finance function, reporting up to a Controller or VP of Finance, who reports to the CFO. In larger companies, you might have a dedicated AP Manager or Director overseeing a team of AP clerks and specialists. In smaller companies, AP might be handled by one or two people who also do other accounting tasks.

**KEVIN:** And what's the scale we're talking about? How many invoices does a typical company process?

**MORGAN:** It varies enormously. A small business might process a few hundred invoices a month. A mid-market company, say five hundred million to a few billion in revenue, might process ten thousand to fifty thousand invoices a month. Large enterprises can process hundreds of thousands or even millions of invoices per month across their global operations.

**KEVIN:** Millions of invoices. That's a massive operational challenge.

**MORGAN:** Exactly. And every single one of those invoices needs to be received, validated, coded to the right general ledger account, approved by the right person, matched against a purchase order in many cases, and then paid on time. Any breakdown in that chain creates real problems: late payments damage supplier relationships, duplicate payments waste money, coding errors mess up financial reporting, and lack of visibility makes it impossible for the CFO to forecast cash flow accurately.

**[MUSIC TRANSITION]**

## AP on the Balance Sheet

**KEVIN:** You mentioned AP is a liability on the balance sheet. Let me make sure I understand the accounting side. How does this actually work?

**MORGAN:** Great question. When a company receives goods or services from a supplier, it incurs an obligation to pay. That obligation gets recorded as accounts payable, which is a current liability. Current meaning it's expected to be paid within one year, usually much sooner, like thirty or sixty days.

**KEVIN:** And this is different from long-term debt?

**MORGAN:** Right. Long-term debt is things like loans and bonds. AP is trade payables, the money you owe your suppliers for the normal course of doing business. On the balance sheet, it sits in current liabilities alongside things like accrued expenses and short-term debt.

**KEVIN:** How does AP affect working capital?

**MORGAN:** This is where it gets strategically interesting. Working capital is current assets minus current liabilities. The three big levers of working capital are accounts receivable, which is money owed to you, inventory, and accounts payable, money you owe to others. Here's the key insight: increasing AP, meaning taking longer to pay, actually improves your working capital position because you're holding onto cash longer.

**KEVIN:** So there's a tension there. The company wants to hold cash, but suppliers want to get paid quickly.

**MORGAN:** Exactly. That tension is at the heart of AP strategy. The metric that captures this is Days Payable Outstanding, or DPO. It measures the average number of days it takes a company to pay its suppliers. The average DPO across the S&P 1500 is about fifty-one days. But it varies hugely by industry and company strategy.

**KEVIN:** So a higher DPO means the company is holding onto cash longer, which is good for the company but potentially bad for suppliers?

**MORGAN:** Precisely. And this is why AP is strategic. The CFO cares deeply about DPO because it directly affects free cash flow. But push DPO too high and you damage supplier relationships, potentially lose early payment discounts, and might even face supply disruptions if critical suppliers get squeezed.

**[MUSIC TRANSITION]**

## The Invoice Lifecycle

**KEVIN:** Let's get into the mechanics. Walk me through the life of an invoice from start to finish.

**MORGAN:** Alright, let's follow a single invoice through its entire journey. Let's say a company has ordered office furniture from a supplier. The furniture gets delivered, and now the supplier wants to get paid.

**KEVIN:** Step one?

**MORGAN:** Step one is invoice receipt. The supplier sends an invoice to the company. Now, this is where things already get messy in many organizations. That invoice might arrive as a paper document in the mail, as a PDF attached to an email, through an electronic data interchange or EDI connection, through a supplier portal, or as a structured e-invoice in a format like Peppol or UBL.

**KEVIN:** And companies receive invoices through all of these channels simultaneously?

**MORGAN:** Yes, that's one of the fundamental challenges. A single company might receive invoices through five or six different channels. Each channel requires different handling. Paper needs to be scanned. Emails need to be monitored. EDI needs technical integration. Consolidating all of this into a single process is challenge number one.

**KEVIN:** Okay, the invoice has arrived. What happens next?

**MORGAN:** Step two is data capture and extraction. Someone or something needs to read that invoice and extract the key data: supplier name, invoice number, invoice date, due date, line items, quantities, unit prices, total amount, tax amounts, purchase order number if there is one, and payment terms.

**KEVIN:** That's a lot of data fields.

**MORGAN:** It is. And in a manual environment, a human being is keying all of that into the ERP system by hand. That's slow, expensive, and error-prone. This is where automation technology like OCR and AI-powered data extraction comes in, and it's a huge part of what Medius does.

**KEVIN:** So after the data is captured, what's next?

**MORGAN:** Step three is validation. The system checks: Is this a known supplier? Is the invoice number unique, or is it a potential duplicate? Do the math add up? Is the tax calculated correctly? Are the payment terms consistent with what we've agreed with this supplier?

**KEVIN:** And if something fails validation?

**MORGAN:** It gets flagged as an exception and routed to a human for review. One of the biggest metrics in AP is the percentage of invoices that can pass through without any human intervention, called touchless processing or straight-through processing. Top-performing AP departments achieve an eighty-five percent touchless rate. The average is closer to twenty-seven percent.

**KEVIN:** That's a massive gap. So the automation opportunity is enormous.

**MORGAN:** Exactly. And that gap is essentially the total addressable market for AP automation software.

**[MUSIC TRANSITION]**

## Coding, Matching, and Approval

**KEVIN:** What happens after validation?

**MORGAN:** Step four is GL coding. GL stands for General Ledger. Every invoice needs to be coded to the right account in the chart of accounts so it shows up correctly in financial reporting. Was this office furniture a capital expenditure or an operating expense? Which cost center should it be charged to? Which department? Which project?

**KEVIN:** And who makes that decision?

**MORGAN:** For PO-backed invoices, where a purchase order was created before the goods were ordered, the coding is usually inherited from the purchase order. The person who created the PO already specified the GL account and cost center. For non-PO invoices, which is a huge category, the AP clerk or the invoice approver needs to assign the correct coding. This is where mistakes happen frequently, and it's another area where AI can help by suggesting the right coding based on historical patterns.

**KEVIN:** You keep mentioning PO-backed versus non-PO invoices. Let me make sure I understand the difference.

**MORGAN:** A PO-backed invoice is one where someone in the company created a purchase order before the goods or services were ordered. The PO specifies what's being bought, from whom, at what price, and the GL coding. When the invoice arrives, it can be matched against the PO. A non-PO invoice has no corresponding purchase order. Think of things like utility bills, subscriptions, one-off consulting fees, or expenses that don't go through a formal procurement process.

**KEVIN:** And I'm guessing non-PO invoices are harder to process?

**MORGAN:** Much harder. There's nothing to match them against, so they need to be manually reviewed, coded, and approved. In many companies, non-PO invoices make up thirty to fifty percent of all invoices. They're the bane of every AP department's existence.

**KEVIN:** Okay, so for PO invoices, the next step is matching?

**MORGAN:** Right. Step five is matching, specifically three-way matching. This is a foundational control in AP. You compare three documents: the purchase order, which says what was ordered and at what price, the goods receipt or receiving report, which confirms what was actually delivered, and the invoice, which is what the supplier is billing for.

**KEVIN:** And all three should agree?

**MORGAN:** Ideally, yes. The quantities should match, the prices should match, and the total should match. When they do, the invoice can be approved automatically. When they don't, you have an exception. Maybe the supplier shipped ninety-five units but the PO was for a hundred. Maybe the price on the invoice is two percent higher than the PO price. These exceptions need to be investigated and resolved.

**KEVIN:** And that investigation takes time.

**MORGAN:** It does. And it's one of the biggest bottlenecks in invoice processing. Companies set tolerance thresholds to avoid getting bogged down in tiny discrepancies. For example, you might set a rule that says price variances under two percent or five dollars are automatically accepted. But larger variances require human review.

**KEVIN:** After matching, what's next?

**MORGAN:** Step six is approval. Even after matching, many organizations require one or more people to formally approve the invoice before it can be paid. Approval workflows can be simple, just one person signs off, or complex, with multiple levels based on the invoice amount, the department, the expense type, or other criteria.

**KEVIN:** And then payment?

**MORGAN:** Step seven is payment, but we'll cover that in depth in a later episode. In short, approved invoices go into a payment queue, they're batched into payment runs, and the payments are executed through various methods like checks, ACH, wire transfers, or virtual cards.

**KEVIN:** And the last step?

**MORGAN:** Step eight is reconciliation. After payment, the AP team needs to confirm that the payment was successfully received by the supplier, match the payment against the bank statement, and close out the invoice in the accounting system. Any discrepancies need to be investigated.

**[MUSIC TRANSITION]**

## Types of Invoices

**KEVIN:** You mentioned PO and non-PO invoices. Are there other types I should know about?

**MORGAN:** Absolutely. Let me walk through the main categories. Standard invoices are the most common. A supplier sends a bill for goods or services delivered. Credit notes are essentially negative invoices. The supplier is giving money back, maybe because goods were returned, there was a pricing error, or a volume discount kicked in. Credit notes need to be matched against the original invoice.

**KEVIN:** That sounds like it could get complicated.

**MORGAN:** It does. Debit notes are the opposite. The buyer issues a debit note to the supplier when there's an underpayment or overcharge that needs correcting. Then you have recurring invoices for subscriptions and regular services, like your monthly cloud hosting bill or office lease payment. These are often processed through automated schedules.

**KEVIN:** Any others?

**MORGAN:** Self-billing is an interesting one. Instead of the supplier sending an invoice, the buyer generates the invoice based on what they received. This is common in manufacturing and retail where deliveries happen frequently. The buyer says, we received this many units at this price, here's the invoice we're generating on your behalf. It actually eliminates a lot of matching issues.

**KEVIN:** That's clever. Any other types I should know about?

**MORGAN:** Pro-forma invoices, which are preliminary invoices sent before goods are shipped, usually for customs purposes. Interim invoices for long-term projects where the supplier bills periodically for work completed. And consolidated invoices where a supplier bundles multiple deliveries or services into a single invoice.

**[MUSIC TRANSITION]**

## Key AP Terminology

**KEVIN:** Let me make sure I have the key terminology down. Can we do a rapid-fire glossary?

**MORGAN:** Sure. General Ledger or GL: the master set of accounts used to record all financial transactions. Chart of Accounts: the complete listing of every account in the GL. Cost Center: a department, project, or organizational unit that costs are allocated to.

**KEVIN:** Got it. What about accruals?

**MORGAN:** Accruals are expenses that have been incurred but not yet invoiced or paid. At month-end, the finance team estimates these and records them so the financial statements are accurate. This is directly related to AP because uninvoiced receipts create accruals. Aging Reports show outstanding invoices broken down by how long they've been unpaid: current, thirty days, sixty days, ninety days, and beyond. This is a critical report for managing cash flow and supplier relationships.

**KEVIN:** And payment terms? I've seen things like Net 30 and 2/10 Net 30.

**MORGAN:** Net 30 means the full invoice amount is due within thirty days. Net 60 means sixty days. 2/10 Net 30 is an early payment discount. It means you get a two percent discount if you pay within ten days, otherwise the full amount is due in thirty days. That two percent discount annualized is actually a thirty-six percent return on your money, which is why capturing early payment discounts is such a big deal.

**KEVIN:** Thirty-six percent? That's a huge return.

**MORGAN:** It is. And yet, many companies fail to capture these discounts because their invoice processing is too slow. By the time the invoice is approved, the discount window has closed. This is one of the most compelling ROI arguments for AP automation.

**[MUSIC TRANSITION]**

## Pain Points in Manual AP

**KEVIN:** Let's talk about what goes wrong. What are the biggest pain points when AP is done manually?

**MORGAN:** Where do I start? Lost invoices are probably the most common problem. Paper invoices get misrouted, email invoices end up in the wrong inbox, and suddenly no one can find the invoice that's due next week. The supplier calls asking where their payment is, and the AP team scrambles.

**KEVIN:** What else?

**MORGAN:** Duplicate payments are a massive issue. Studies suggest that companies lose between point one and point five percent of their total disbursements to duplicate payments. For a company spending a billion dollars a year through AP, that's one to five million dollars in duplicate payments.

**KEVIN:** That's real money.

**MORGAN:** Late payments are another huge problem. The average AP department starts with an on-time payment rate of only thirty-five percent. That means two-thirds of invoices are paid late. That damages supplier relationships, can result in late fees, and you miss those early payment discounts we talked about.

**KEVIN:** What about visibility?

**MORGAN:** Lack of visibility is probably the most strategic pain point. When AP is manual, the CFO has no real-time view of outstanding liabilities. They can't accurately forecast cash needs. They don't know which invoices are stuck in approval queues. They can't see spending patterns across the organization. It's like flying blind.

**KEVIN:** And I imagine there's a labor cost issue too?

**MORGAN:** Absolutely. The cost per invoice is the key metric here. According to APQC benchmarking data, top-performing AP departments process an invoice for about two dollars. The median is about six to seven dollars. Bottom performers spend more than ten dollars per invoice. When you're processing tens of thousands of invoices a month, that cost difference is enormous.

**KEVIN:** What drives that cost difference?

**MORGAN:** Mostly labor. In a manual environment, you have people opening envelopes, keying data, chasing approvals, resolving exceptions, making phone calls to suppliers, and manually entering payment information. In an automated environment, software handles most of that, and the AP team focuses on exceptions and strategic tasks.

**[MUSIC TRANSITION]**

## Key AP Metrics and Benchmarks

**KEVIN:** Let's go deeper on metrics. As a product person, I want to understand what our customers measure and care about.

**MORGAN:** The big ones are: Days Payable Outstanding, which we covered, typically around fifty-one days for the S&P 1500. Cost per invoice, where the spread between two dollars and ten dollars tells you how automated your process is. Invoice processing time, measured from receipt to payment-ready. Top performers do it in under three days. Bottom performers take a week or more.

**KEVIN:** What about touchless processing rate?

**MORGAN:** That's increasingly the gold standard metric. It measures the percentage of invoices that flow from receipt all the way to payment-ready without any human intervention. Top performers hit eighty-five percent. The average is twenty-seven percent. Every percentage point improvement represents real savings.

**KEVIN:** Any other important metrics?

**MORGAN:** Invoices processed per full-time employee is a productivity metric. Top performers process three times more invoices per person than bottom performers. Exception rate matters too: what percentage of invoices require manual intervention and why? First-pass match rate tells you how often the three-way match succeeds on the first try. And early payment discount capture rate tells you how much money you're leaving on the table.

**KEVIN:** This is incredibly helpful for thinking about product metrics and value propositions.

**MORGAN:** Exactly. When you're building AP software, every feature should tie back to moving one of these metrics in the right direction.

**[MUSIC TRANSITION]**

## Why AP Automation Exists

**KEVIN:** So pulling it all together, why does AP automation exist as a software category?

**MORGAN:** Because the gap between manual AP and best-in-class AP is enormous, and it's all addressable with software. Think about it. Manual data entry can be replaced with AI-powered data extraction. Paper-based routing can be replaced with digital workflows. Three-way matching can be fully automated. Exception handling can be guided by intelligent rules. Payment execution can be embedded in the same platform. And analytics can give the CFO real-time visibility.

**KEVIN:** And the market size?

**MORGAN:** The AP automation market is estimated at around four to five billion dollars and growing at double-digit rates annually. But the real opportunity is much larger because penetration is still relatively low. Many companies, even large ones, are still running largely manual AP processes.

**KEVIN:** That's surprising to me. Why haven't they automated already?

**MORGAN:** Several reasons. Some companies have tried and failed with first-generation tools that were clunky and hard to integrate. Some are locked into ERP-centric processes and think their ERP handles AP well enough, even though it usually doesn't. Some face organizational inertia, where AP is seen as a back-office function not worth investing in. And some simply haven't quantified the cost of their current state.

**KEVIN:** So there's a massive education and awareness challenge alongside the technology challenge.

**MORGAN:** Exactly. And that's why a CPO at Medius needs to understand not just the technology, but the human and organizational dynamics of AP. Your customers aren't just buying software. They're buying a transformation of how their finance team works.

**[MUSIC TRANSITION]**

## Wrap Up

**KEVIN:** Morgan, this has been an incredible foundation. I feel like I've gone from knowing almost nothing about AP to having a solid framework for understanding the space.

**MORGAN:** And we've only scratched the surface. In the next episode, we're going to zoom out and look at the full procure-to-pay journey, from the moment someone in the company needs to buy something all the way through to the payment. That P2P perspective is essential for understanding where AP fits in the bigger picture.

**KEVIN:** I'm looking forward to it. For our listeners, if you're also new to this space or want a refresher, I'd encourage you to think about the metrics we discussed today. Cost per invoice, DPO, touchless rate. Those are the numbers that tell you how well an AP operation is running.

**MORGAN:** Great advice. See you in the next episode.

**KEVIN:** Thanks Morgan. See you next time.

*Next Episode: The Procure-to-Pay Journey*
