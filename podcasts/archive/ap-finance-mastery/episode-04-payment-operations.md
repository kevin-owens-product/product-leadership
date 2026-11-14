# Episode 4: Payment Operations & Cash Management

**Duration:** ~14 minutes

### Introduction

**MORGAN:** Welcome back. We've covered AP fundamentals, procure-to-pay, and invoice processing. Today we're talking about what happens after the invoice is approved: payment operations and cash management.

**KEVIN:** This is where the money actually moves. And I know Medius recently launched Medius Payments, so understanding the payment landscape is critical for me.

**MORGAN:** Payments are the new frontier for AP automation. For years, AP platforms handled everything up to the point of approval, then handed off to the ERP or bank for payment. Now the smartest vendors are embedding payments directly into their platforms. Let's explore why.

**[MUSIC TRANSITION]**

### Payment Methods Overview

**KEVIN:** Let's start with the basics. How do companies actually pay their suppliers?

**MORGAN:** There are more payment methods than most people realize, and the mix varies dramatically by region. In the US, checks are still surprisingly common. They've been declining for years but still represent about twenty to thirty percent of B2B payments. ACH, Automated Clearing House, is the dominant electronic payment method in the US. It's a batch-based system that processes payments through the Federal Reserve.

**KEVIN:** What about outside the US?

**MORGAN:** Europe has SEPA, the Single Euro Payments Area, which provides standardized credit transfers and direct debits across the eurozone. The UK has BACS for batch payments and Faster Payments for real-time. The Nordics are largely cashless with highly efficient payment infrastructure. Asia has a mix of domestic systems. Wire transfers are used globally for high-value or urgent payments, but they're expensive, typically fifteen to forty-five dollars per transaction.

**KEVIN:** And virtual cards? I keep hearing about those.

**MORGAN:** Virtual cards are one of the most interesting developments in B2B payments. The buying company generates a single-use virtual credit card number for a specific payment. The supplier charges that virtual card. The buying company gets all the benefits of credit card float and typically earns a rebate of one to two percent on the transaction.

**KEVIN:** Wait, the buyer actually earns money by paying suppliers?

**MORGAN:** Yes. Virtual card rebates can generate significant revenue for large companies. If a company pays a hundred million dollars a year via virtual card with a one-and-a-half percent rebate, that's one-and-a-half million dollars in annual rebate revenue. Some companies fund their entire AP department with virtual card rebates.

**KEVIN:** That's a compelling value proposition.

**MORGAN:** It is. But there's a catch. Suppliers pay a card interchange fee of two to three percent. So while the buyer benefits, the supplier's margin gets squeezed. Not every supplier will accept virtual card payments, especially those with thin margins.

**[MUSIC TRANSITION]**

### Payment Runs and Batch Processing

**KEVIN:** How does the actual payment process work operationally?

**MORGAN:** Most companies run payments in batches, called payment runs. Typically, the AP team schedules payment runs on a set cadence, maybe twice a week or weekly. During a payment run, the system gathers all approved invoices that are due for payment, groups them by supplier and payment method, and creates a payment batch.

**KEVIN:** Why batch rather than pay in real-time?

**MORGAN:** Several reasons. Bank fees often have per-batch components rather than per-transaction, so batching is cheaper. It gives the treasury team control over cash outflows. It allows for netting, where you offset credits against debits for the same supplier. And it provides a natural checkpoint for review before large amounts of money leave the company.

**KEVIN:** What does the payment approval process look like?

**MORGAN:** This varies by company but usually involves segregation of duties. The person who approves invoices shouldn't be the same person who executes payments. Typically, AP prepares the payment batch, a manager reviews and approves it, and then treasury or a senior finance person releases the batch to the bank.

**KEVIN:** And the bank files?

**MORGAN:** The payment batch needs to be transmitted to the bank in a specific format. In the US, NACHA format for ACH payments. In Europe, ISO 20022 XML format for SEPA payments. These are standardized file formats that tell the bank who to pay, how much, and to which account. Getting these formats right is critical because a malformed file means failed payments.

**[MUSIC TRANSITION]**

### Payment Terms Strategy

**KEVIN:** Let's go deeper on payment terms. You mentioned Net 30 and early payment discounts last episode.

**MORGAN:** Payment terms are one of the most strategically important aspects of AP. The most common terms are Net 30, meaning payment due in thirty days, and Net 60. But there's an enormous range. Some industries operate on Net 90 or even Net 120. And then there are discount terms.

**KEVIN:** Tell me more about early payment discounts.

**MORGAN:** The classic is 2/10 Net 30. Pay within ten days and get two percent off, otherwise pay in full within thirty days. The math on this is compelling. Two percent for paying twenty days early annualizes to about thirty-six percent. That's a better return than almost any investment a company can make with its cash.

**KEVIN:** So why doesn't every company take advantage of these discounts?

**MORGAN:** Because many companies can't process invoices fast enough to capture them. If it takes your AP team fifteen days to receive, capture, validate, match, and approve an invoice, the ten-day discount window has already closed. This is one of the most powerful ROI arguments for AP automation. Faster processing means you can capture discounts that were previously unattainable.

**KEVIN:** How much money are we talking about?

**MORGAN:** For a large company with a billion dollars in addressable spend, capturing just one percent more in early payment discounts is ten million dollars straight to the bottom line. And it's not just 2/10 Net 30. Dynamic discounting allows buyers and suppliers to negotiate custom discount rates based on when the payment is made. Pay in five days and get two-and-a-half percent. Pay in fifteen days and get one percent. The earlier the payment, the bigger the discount.

**[MUSIC TRANSITION]**

### DPO and Working Capital

**KEVIN:** Let's revisit DPO in the context of cash management.

**MORGAN:** Days Payable Outstanding is the single most important metric that treasury and the CFO care about in AP. As we discussed, the S&P 1500 average is about fifty-one days. But the range is enormous. Tech companies often have DPO in the sixties or seventies. Retailers might be in the forties. And there are famous examples of companies pushing DPO to extreme levels.

**KEVIN:** What's the tension here?

**MORGAN:** It's a three-way tension. Finance wants high DPO to conserve cash. Procurement wants to pay on time to maintain good supplier relationships and negotiate better terms. And AP is caught in the middle trying to execute whatever strategy has been decided while keeping the lights on operationally.

**KEVIN:** How does this connect to working capital?

**MORGAN:** Working capital optimization is the holy grail for CFOs. The Cash Conversion Cycle is the key formula: Days Sales Outstanding plus Days Inventory Outstanding minus Days Payable Outstanding. A lower CCC means less cash is tied up in operations. Increasing DPO reduces the CCC, freeing up cash. For a large company, improving DPO by even five days can free up tens or hundreds of millions in cash.

**KEVIN:** That's a boardroom-level impact from an AP metric.

**MORGAN:** Absolutely. Which is why the best CPOs at AP automation companies understand that their software directly impacts CFO-level metrics. You're not selling invoice processing. You're selling working capital optimization.

**[MUSIC TRANSITION]**

### Cross-Border Payments

**KEVIN:** What about international payments? That must add complexity.

**MORGAN:** Cross-border payments are orders of magnitude more complex. You're dealing with multiple currencies, fluctuating exchange rates, correspondent banking networks, different regulatory regimes, and SWIFT messaging.

**KEVIN:** Walk me through how a cross-border payment works.

**MORGAN:** Say a US company needs to pay a German supplier in euros. The US company instructs their bank to send a payment. The bank converts dollars to euros at an exchange rate that includes a spread. The payment travels through the SWIFT network, potentially through one or more correspondent banks, each of which may take a fee. The payment arrives at the German supplier's bank, maybe two to five days later.

**KEVIN:** And the exchange rate risk?

**MORGAN:** FX risk is real. Between the time the invoice is received and the time the payment is made, the exchange rate can move significantly. A company paying a hundred-million-euro annual spend from the US could see millions of dollars in FX variance. Sophisticated treasury teams use hedging strategies, forward contracts, and payment timing to manage this risk.

**KEVIN:** This is why Medius Payments supporting multiple payment methods and currencies is so important.

**MORGAN:** Exactly. A platform that can handle ACH in the US, SEPA in Europe, BACS in the UK, and wire transfers globally, all from a single interface, is enormously valuable to companies with international operations.

**[MUSIC TRANSITION]**

### Payment Reconciliation

**KEVIN:** What happens after the payment is sent?

**MORGAN:** Payment reconciliation. The AP team needs to confirm that each payment was successfully executed. This means matching the payment confirmation from the bank against the invoices that were included in the payment batch. Then matching the bank statement entries against the payments in the accounting system.

**KEVIN:** Sounds straightforward?

**MORGAN:** In theory. In practice, it's messy. Banks may consolidate multiple payments into a single statement entry. Payment amounts may differ slightly from invoice amounts due to bank fees, FX differences, or partial payments. Suppliers may apply payments to different invoices than intended. And timing differences between when you send a payment and when it clears create reconciliation headaches.

**KEVIN:** How often does reconciliation happen?

**MORGAN:** Daily bank reconciliation is best practice, though many companies do it weekly or even monthly. The longer you wait, the harder it is to resolve discrepancies. Automated bank reconciliation is a key feature of modern AP platforms.

**[MUSIC TRANSITION]**

### Embedded Payments: The New Frontier

**KEVIN:** Let's talk about why AP automation vendors are moving into payments. This is directly relevant to Medius Payments.

**MORGAN:** Historically, AP automation handled everything up to the point of approval. The approved invoice was then pushed to the ERP, which generated a payment file for the bank. This handoff created a gap. The AP platform had visibility into invoices but lost visibility once the payment was handed off.

**KEVIN:** And embedded payments close that gap?

**MORGAN:** Exactly. With embedded payments, the entire flow from invoice receipt to payment execution happens within a single platform. Medius launched Medius Payments in June 2025 with exactly this vision. They call it Straight Through Payments: payment batches are built and executed directly from Medius without needing to upload files to the ERP or bank separately.

**KEVIN:** What are the benefits?

**MORGAN:** Several. Complete visibility from invoice to payment in one system. Simplified workflow since there's no handoff between systems. Better fraud protection because approval rules and fraud detection are embedded in the payment flow. Faster payment execution. And better supplier experience because you can provide real-time payment status.

**KEVIN:** And the competitive angle?

**MORGAN:** This is becoming the new battleground in AP automation. Tipalti has been strong in payments for years. Coupa has payment capabilities. Bill dot com is payments-first. Medius entering this space signals that a complete AP platform must include embedded payments to remain competitive.

**KEVIN:** What makes embedded payments hard?

**MORGAN:** The regulatory complexity is enormous. Payment processors need to comply with banking regulations in every country they operate in. You need partnerships with banks and payment networks. You need to handle FX, sanctions screening, and anti-money laundering requirements. It's a fundamentally different business from software, and it requires significant investment and expertise.

**[MUSIC TRANSITION]**

### Supply Chain Finance and Dynamic Discounting

**KEVIN:** Before we wrap up, tell me about supply chain finance.

**MORGAN:** Supply chain finance, sometimes called reverse factoring, is a financing arrangement where a bank or financial institution pays the supplier early on behalf of the buyer. The supplier gets paid quickly, the buyer extends their DPO, and the bank earns a small fee. Everyone wins.

**KEVIN:** How does it work in practice?

**MORGAN:** The buyer approves an invoice and tells the supply chain finance provider that this invoice is good. The provider pays the supplier immediately, minus a small discount. The buyer pays the provider at the original due date. The discount rate is based on the buyer's credit rating, which is usually much better than the supplier's, so the cost of financing is lower than if the supplier tried to get early payment on their own.

**KEVIN:** And dynamic discounting?

**MORGAN:** Dynamic discounting is a simpler version where the buyer uses their own cash to pay early in exchange for a discount. No bank involved. The discount rate is calculated on a sliding scale based on how many days early the payment is made. It's essentially the buyer earning a return on their excess cash by paying suppliers early.

**KEVIN:** Both of these require a platform that can facilitate the transactions?

**MORGAN:** Exactly. And having payments embedded in the AP platform makes this much easier to implement. It's another reason why the payments play is strategically important.

**[MUSIC TRANSITION]**

### Wrap Up

**KEVIN:** Morgan, the payments landscape is much deeper than I expected. There's real product strategy here around embedded payments, virtual cards, and supply chain finance.

**MORGAN:** And we've barely scratched the surface of things like real-time payments, open banking APIs, and cryptocurrency in B2B. Payments is a space that's evolving rapidly. Next episode, we're going to shift to the supplier side of the equation. Supplier management, spend analytics, and why the supplier experience matters more than most AP teams realize.

**KEVIN:** Can't wait. Thanks Morgan.

**MORGAN:** See you next time.

*Next Episode: Supplier Management & Spend Analytics*
