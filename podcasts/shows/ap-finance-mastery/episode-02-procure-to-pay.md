# Episode 2: The Procure-to-Pay Journey

**Duration:** ~17 minutes

## Introduction

**MORGAN:** Welcome back to AP and Finance Mastery. In our first episode, we covered the fundamentals of accounts payable, the invoice lifecycle, and why AP matters strategically. Today we're going to zoom out and look at the full procure-to-pay journey.

**KEVIN:** Right, because AP doesn't exist in isolation. It's the tail end of a much larger process that starts with someone in the company needing to buy something.

**MORGAN:** Exactly. And understanding this full journey is essential for building great AP software, because so many of the problems in AP actually originate upstream in procurement.

**KEVIN:** So let's map this out end to end. What is procure-to-pay?

**[MUSIC TRANSITION]**

## What is Procure-to-Pay?

**MORGAN:** Procure-to-pay, or P2P, is the end-to-end business process that covers everything from identifying a need for goods or services through to making the final payment to the supplier. It spans two major organizational functions: procurement, which handles the buying, and finance slash AP, which handles the paying.

**KEVIN:** And I'm guessing those two functions don't always work perfectly together?

**MORGAN:** That's an understatement. In many organizations, procurement and AP are like two ships passing in the night. Procurement cares about getting the best deal, managing supplier relationships, and ensuring the business gets what it needs. AP cares about processing invoices accurately, paying on time, and maintaining financial controls. Their incentives aren't always aligned.

**KEVIN:** How so?

**MORGAN:** Here's a classic example. Procurement negotiates payment terms of Net 60 with a supplier to optimize working capital. But AP has a policy of capturing early payment discounts at 2/10 Net 30. So procurement wants to pay later, AP wants to pay sooner to get the discount, and no one's coordinating.

**KEVIN:** That's a product opportunity right there. A platform that unifies both perspectives.

**MORGAN:** Exactly what the best AP automation platforms aim to do.

**[MUSIC TRANSITION]**

## The P2P Cycle Step by Step

**KEVIN:** Walk me through the full P2P cycle, step by step.

**MORGAN:** Let's use a concrete example. Say a marketing department needs new laptops for their team. Step one is need identification. Someone in marketing realizes they need ten new laptops for new hires starting next month.

**KEVIN:** Simple enough.

**MORGAN:** Step two is the purchase requisition. The marketing manager creates a formal request in the system specifying what they need: ten laptops, a particular model, the budget, the cost center to charge it to, and when they need them by. This requisition goes through an approval workflow, maybe their VP approves it because it's over a certain dollar threshold.

**KEVIN:** And this is different from a purchase order?

**MORGAN:** Yes, and this distinction trips people up. A purchase requisition is an internal document. It's the business asking for permission to spend money. A purchase order is an external document. It's the company committing to buy from a specific supplier at a specific price. The requisition says "we want to buy laptops." The PO says "we are buying ten Dell Latitude laptops from CDW at $1,200 each, delivered by March 15th."

**KEVIN:** Got it. So the requisition gets approved, then what?

**MORGAN:** Step three is sourcing. If there's an existing contract with a preferred laptop supplier, this might be automatic. The requisition gets fulfilled from a catalog. If not, procurement might need to get quotes from multiple suppliers, evaluate options, and select the best one.

**KEVIN:** Tell me about catalogs. I've heard the term punchout catalog.

**MORGAN:** Catalogs are pre-negotiated lists of items at agreed prices. Think of it like an internal Amazon for the company. Employees browse a catalog, find what they need at pre-approved prices, and add it to their cart. A punchout catalog is a specific integration where the user clicks from their procurement system to the supplier's website, shops there with their negotiated prices, and the cart transfers back into the procurement system. It's called punchout because you "punch out" to the supplier's site and come back.

**KEVIN:** That's clever. Keeps catalog maintenance on the supplier's side.

**MORGAN:** Exactly. The supplier manages their product listings, and your procurement system just provides the integration. Popular with big suppliers like Dell, Staples, Amazon Business, and others.

**[MUSIC TRANSITION]**

## Purchase Orders and Goods Receipt

**KEVIN:** Okay, so we've sourced our laptops. Now a purchase order gets created?

**MORGAN:** Right. Step four is PO creation. The purchase order is generated, either automatically from the catalog purchase or manually by a buyer. The PO includes the supplier details, line items with quantities and prices, delivery address, requested delivery date, payment terms, and GL coding. The PO gets sent to the supplier electronically or sometimes still by email or even fax.

**KEVIN:** People still fax purchase orders?

**MORGAN:** You'd be surprised. In manufacturing and some traditional industries, fax is still alive and well. But increasingly, POs are transmitted electronically through EDI, supplier portals, or e-procurement networks.

**KEVIN:** What happens when the laptops arrive?

**MORGAN:** Step five is goods receipt, sometimes called a receiving report or GRN, goods received note. When the laptops arrive at the company, someone in the receiving department or the requestor themselves confirms what was delivered. They create a goods receipt in the system that says we received ten laptops from CDW on this date.

**KEVIN:** And for services rather than physical goods?

**MORGAN:** Great question. For services, you have what's called a service entry sheet or SES. It's the equivalent of a goods receipt but for services. Someone confirms that the consulting hours were performed, the cleaning service was delivered, the software implementation milestone was completed. Service verification is actually harder than goods receipt because it's more subjective.

**KEVIN:** I can see that. You can count laptops, but how do you verify that twenty hours of consulting happened?

**MORGAN:** Exactly. And that subjectivity creates a lot of exceptions and disputes in the AP process downstream.

**[MUSIC TRANSITION]**

## Three-Way Matching in Detail

**KEVIN:** Now we get to the part we touched on last episode. Three-way matching.

**MORGAN:** Right. Step six is where AP enters the picture. The supplier sends their invoice, and now we need to match three documents. The purchase order says we agreed to buy ten laptops at $1,200 each, total $12,000. The goods receipt says we received ten laptops on March 10th. The invoice says the supplier is billing us $12,000 for ten laptops.

**KEVIN:** And when all three match perfectly?

**MORGAN:** The invoice sails through. No human touch needed. This is a touchless invoice. The matching engine confirms quantities match, prices match, totals match, and the invoice goes straight to the payment queue. In an ideal world, this happens in seconds.

**KEVIN:** But the real world isn't ideal.

**MORGAN:** Not even close. Let me give you some common scenarios. Scenario one: the supplier shipped eight laptops instead of ten because two were backordered. The goods receipt says eight, the PO says ten, the invoice says eight at $9,600. Now you need a partial match, and someone needs to decide whether to pay the $9,600 now and wait for the remaining two.

**KEVIN:** What about price discrepancies?

**MORGAN:** Scenario two: the supplier invoices at $1,250 per laptop instead of the agreed $1,200. Maybe their price went up, or maybe they added a surcharge. The matching engine flags a price variance of $500 on the total invoice. Does the company pay the higher amount? Push back? Split the difference?

**KEVIN:** And these are the exceptions that slow everything down?

**MORGAN:** Exactly. Companies handle this through tolerance thresholds and deviation management. You define rules like: accept quantity variances up to five percent, accept price variances up to two percent or ten dollars, whichever is less. Invoices within tolerance pass through automatically. Invoices outside tolerance get routed to the right person for review.

**KEVIN:** So the configuration of these tolerance rules is actually really important?

**MORGAN:** Critical. Too tight and you create a flood of exceptions that overwhelms the AP team. Too loose and you're overpaying suppliers or losing track of discrepancies. Finding the right balance is an art, and it's different for every company and even for different commodity categories within the same company.

**[MUSIC TRANSITION]**

## Non-PO Spend: The Hardest Problem

**KEVIN:** Let's talk about the invoices that don't have a PO. You said this is the hardest problem in AP.

**MORGAN:** Non-PO spend is the bane of every AP department. These are invoices where no purchase order was created before the goods or services were procured. They might be for utilities, subscriptions, one-off services, emergency purchases, or simply purchases where someone bypassed the procurement process.

**KEVIN:** Why is this so hard?

**MORGAN:** Because there's nothing to match against. With a PO invoice, the system knows what was ordered, at what price, from which supplier, and how to code it. With a non-PO invoice, the AP clerk gets an invoice and needs to figure out who ordered this, was it approved, what GL account should it be coded to, and who should approve the payment. Often they're chasing down the person who ordered the service, trying to get retroactive approval.

**KEVIN:** And what percentage of invoices are non-PO?

**MORGAN:** In many organizations, thirty to fifty percent. Some industries are even higher. Professional services firms, for example, might have seventy percent non-PO invoices because so much of their spending is ad hoc.

**KEVIN:** That's a huge portion. What does the workflow look like for non-PO invoices?

**MORGAN:** Typically, the invoice gets routed through a digital workflow where someone with budget authority reviews it, confirms the goods or services were received, assigns or validates the GL coding, and approves it for payment. The challenge is routing it to the right person in the first place. In a large organization with thousands of employees and hundreds of cost centers, figuring out who should approve a particular invoice can be a real puzzle.

**KEVIN:** This sounds like a perfect use case for AI, learning from historical patterns.

**MORGAN:** Absolutely. And that's exactly what the best AP automation platforms do. They use machine learning to predict the GL coding, suggest the right approver, and even flag unusual non-PO invoices that might be fraudulent.

**[MUSIC TRANSITION]**

## Maverick Spending

**KEVIN:** You mentioned people bypassing the procurement process. Tell me about maverick spending.

**MORGAN:** Maverick spend, also called rogue spend or off-contract spend, is purchasing that happens outside of established procurement channels. Instead of using the approved suppliers at negotiated prices, someone in the organization just goes and buys what they need from whoever they want.

**KEVIN:** Why does this happen?

**MORGAN:** Many reasons. The procurement process is too slow. The person doesn't know there's a preferred supplier. The catalog doesn't have what they need. They have a personal relationship with a different vendor. Or they just find it easier to use a credit card than to create a requisition.

**KEVIN:** And this is a problem because?

**MORGAN:** Multiple reasons. The company isn't leveraging its negotiated pricing, so it's paying more. Procurement loses visibility into what's being spent and with whom. Compliance and control frameworks are bypassed. And it creates those non-PO invoices that AP struggles to process.

**KEVIN:** What's the typical magnitude?

**MORGAN:** Studies suggest that maverick spend can represent twenty to forty percent of total procurement spend in organizations without strong controls. Reducing maverick spend by even a few percentage points can save millions in a large enterprise.

**KEVIN:** So procurement tools that make it easy to buy through approved channels can reduce maverick spending and simultaneously reduce AP headaches?

**MORGAN:** Exactly. It's a virtuous cycle. Better procurement tools lead to more PO-backed invoices, which lead to higher touchless processing rates in AP, which lead to faster payments and better supplier relationships.

**[MUSIC TRANSITION]**

## Source-to-Pay: The Bigger Picture

**KEVIN:** I've also heard the term source-to-pay, or S2P. How does that relate to P2P?

**MORGAN:** Source-to-pay extends the process even further upstream. P2P starts with a requisition. S2P starts with strategic sourcing, which includes supplier discovery, RFx processes like request for proposal and request for quote, contract negotiation, and contract management. Then it flows into the P2P process we've been discussing.

**KEVIN:** So S2P is basically sourcing plus P2P?

**MORGAN:** Right. The full S2P lifecycle is: identify a sourcing need, find potential suppliers, run a competitive bidding process, negotiate and award a contract, manage the contract, and then the P2P cycle of requisition, PO, receipt, invoice, and payment. Companies that manage this entire lifecycle on a unified platform have much better control over their spend.

**KEVIN:** And this is relevant to Medius because they offer sourcing and contract management in addition to AP?

**MORGAN:** Exactly. Medius positions itself as a spend management platform covering the full source-to-pay lifecycle. The more of that lifecycle you control, the more data you have, the better the automation, and the more value you deliver to customers.

**[MUSIC TRANSITION]**

## ERPs and P2P

**KEVIN:** Let's talk about ERPs. How do systems like SAP, Oracle, and Microsoft Dynamics handle P2P?

**MORGAN:** Every major ERP has P2P functionality built in. SAP has its MM module for materials management and FI for financial accounting. Oracle has its procurement and payables cloud modules. Microsoft Dynamics 365 has Finance and Supply Chain Management. These all handle the basic P2P workflow.

**KEVIN:** So if the ERP already handles P2P, why do companies buy separate AP automation software?

**MORGAN:** Fantastic question, and this is crucial for your role at Medius. ERPs are transaction systems. They're excellent at recording what happened: a PO was created, a goods receipt was posted, a payment was made. But they're not great at the process automation layer. The ERP can store an invoice, but it doesn't have intelligent data capture to extract data from a PDF. It can route an approval, but the workflow is usually rigid and hard to configure. It can match a PO, but its matching engine doesn't learn from patterns or handle complex exceptions well.

**KEVIN:** So AP automation software sits on top of the ERP?

**MORGAN:** Exactly. It's a layer of intelligence and automation that sits between the external world, where invoices come in all sorts of formats, and the ERP, where everything needs to be recorded as clean, structured transactions. Medius captures the invoice, extracts the data, matches it, routes approvals, handles exceptions, and then pushes the clean, validated data into the ERP.

**KEVIN:** And this is why ERP integration is so critical?

**MORGAN:** It's the number one technical requirement. If your AP automation platform can't seamlessly integrate with the customer's ERP, you're dead in the water. This is why Medius's deep integrations with Microsoft Dynamics are such a competitive advantage, and why expanding those integrations to SAP and other ERPs is strategically important.

**[MUSIC TRANSITION]**

## The P2P Automation Opportunity

**KEVIN:** Let's wrap up with the big picture. Why is P2P automation such a massive market?

**MORGAN:** Let me give you the numbers. The average company spends between fifty and seventy percent of its revenue through AP. For a billion-dollar company, that's five hundred to seven hundred million dollars flowing through the P2P process annually. Even small improvements in efficiency, compliance, and cost generate massive returns.

**KEVIN:** And the automation penetration is still low?

**MORGAN:** Very low. Despite decades of AP automation software being available, the majority of companies worldwide still rely heavily on manual processes. A 2023 survey found that forty-six percent of organizations were processing at least half their invoices manually. That's a staggering amount of manual work in a process that's highly automatable.

**KEVIN:** What's holding them back?

**MORGAN:** Several things. Integration complexity with existing ERPs. Change management challenges in getting people to adopt new processes. Budget constraints, particularly when AP is seen as a cost center rather than a strategic function. And the fragmented nature of the market, with too many point solutions that don't work well together.

**KEVIN:** So the companies that can offer a comprehensive, easy-to-integrate, easy-to-adopt platform have a huge advantage?

**MORGAN:** That's the winning formula. Broad functionality covering the full P2P or even S2P lifecycle. Deep ERP integration. Intelligent automation that actually works out of the box. And a user experience that makes adoption painless. That's the product vision that wins in this market.

**KEVIN:** This is incredibly helpful for framing how I think about product strategy at Medius.

**MORGAN:** That's exactly the goal. In our next episode, we're going to go deep on invoice processing, the core of what AP automation software does. We'll cover data capture, extraction, e-invoicing standards, and what makes the difference between good and great invoice processing technology.

**KEVIN:** Can't wait. Thanks Morgan.

**MORGAN:** See you next time.

*Next Episode: Invoice Processing Deep Dive*
