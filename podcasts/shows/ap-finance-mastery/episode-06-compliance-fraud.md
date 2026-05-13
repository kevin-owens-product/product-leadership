# Episode 6: Compliance, Fraud Prevention & Internal Controls

## Introduction

**MORGAN:** Welcome back. Today's topic is one that keeps CFOs and Controllers up at night: compliance, fraud prevention, and internal controls in accounts payable.

**KEVIN:** This feels like a topic where getting it wrong has serious consequences.

**MORGAN:** It does. AP fraud costs companies billions of dollars annually. Compliance failures can result in regulatory penalties, restatements, and reputational damage. And weak internal controls can enable both. The good news is that AP automation, when done right, is one of the most powerful tools for strengthening controls.

**[MUSIC TRANSITION]**

## Types of AP Fraud

**KEVIN:** Let's start with the threat landscape. What kinds of fraud target AP?

**MORGAN:** AP is a prime target because it's where money leaves the organization. The main types are: duplicate payments, which we touched on earlier. This is paying the same invoice twice. It can be accidental due to process failures or intentional where someone submits the same invoice in different formats hoping it gets paid twice.

**KEVIN:** How common is this?

**MORGAN:** More common than anyone wants to admit. Studies suggest companies lose point-one to point-five percent of total disbursements to duplicate payments. For a company spending a billion through AP, that's one to five million dollars annually.

**KEVIN:** What other types of fraud?

**MORGAN:** Fictitious vendor fraud. Someone creates a fake supplier in the system, submits invoices from that fake supplier, and approves the payments themselves. This is why segregation of duties is so important. Invoice manipulation involves a real supplier's invoice being altered, perhaps the bank account number is changed so the payment goes to a fraudulent account. This often ties to business email compromise.

**KEVIN:** Tell me about business email compromise. I've been hearing more about that.

**MORGAN:** BEC is one of the fastest-growing fraud types. A criminal compromises or spoofs a supplier's email address and sends a message to the AP department saying something like "we've changed our bank account, please update your records and send future payments to this new account." The AP clerk, thinking it's legitimate, updates the bank details, and the next payment goes to the criminal's account.

**KEVIN:** That's terrifyingly simple.

**MORGAN:** It is. The FBI's Internet Crime Complaint Center reported over two-and-a-half billion dollars in BEC losses in a single year. And those are just the reported cases. Many companies don't report it due to embarrassment.

**KEVIN:** What other fraud types should I know about?

**MORGAN:** Kickback schemes where an employee colludes with a supplier to inflate invoices and split the overpayment. Ghost employees on vendor rolls. Expense fraud where employees submit personal expenses as business expenses. And shell company fraud where an employee sets up a company and routes business to it.

**[MUSIC TRANSITION]**

## The Scale of the Problem

**KEVIN:** What does the data say about how widespread AP fraud is?

**MORGAN:** The Association for Financial Professionals' annual survey consistently shows that over eighty percent of organizations experienced payment fraud attempts. The Association of Certified Fraud Examiners' reports indicate that the median loss from occupational fraud is over a hundred thousand dollars, and schemes typically run for twelve to eighteen months before detection.

**KEVIN:** Twelve to eighteen months? Why so long?

**MORGAN:** Because in manual environments, the controls that would catch fraud are weak or non-existent. No one's systematically checking for duplicate payments. No one's monitoring for bank detail changes. No one's cross-referencing employee addresses with supplier addresses. The fraudster has plenty of time to operate before someone accidentally notices something off.

**KEVIN:** And automation changes that?

**MORGAN:** Dramatically. Automated systems can check every single transaction against every rule, every time. They never get tired, never skip a step, and never look the other way. A good AP automation platform is performing hundreds of fraud checks on every invoice in real-time.

**[MUSIC TRANSITION]**

## Internal Controls Framework

**KEVIN:** Let's talk about internal controls. What's the framework?

**MORGAN:** The foundational principle is segregation of duties, also called separation of duties. No single person should control all aspects of a financial transaction. In AP, this means the person who creates a supplier record shouldn't be the same person who approves invoices from that supplier. The person who approves an invoice shouldn't be the same person who executes the payment. And the person who reconciles the bank statement shouldn't be the same person who initiated the payments.

**KEVIN:** Makes sense. What other controls?

**MORGAN:** Authorization limits are critical. Every employee has a maximum dollar amount they can approve. Dual authorization for high-value payments means two people must approve. Mandatory documentation means every transaction needs supporting evidence. And systematic logging means every action is recorded with who did it, what they did, and when.

**KEVIN:** How does AP automation enforce these controls?

**MORGAN:** The software enforces controls that humans might skip. You literally cannot approve an invoice above your authorization limit. The system won't let you. You can't approve your own expense claim. You can't change bank details without a verification workflow. And every single action is logged in an immutable audit trail.

**[MUSIC TRANSITION]**

## SOX Compliance

**KEVIN:** Tell me about SOX compliance and AP.

**MORGAN:** Sarbanes-Oxley, or SOX, was enacted in 2002 after the Enron and WorldCom scandals. It requires public companies to maintain effective internal controls over financial reporting. AP is directly in scope because accounts payable is a significant balance sheet item that flows into the financial statements.

**KEVIN:** What specifically does SOX require for AP?

**MORGAN:** SOX requires documented controls and evidence that they're operating effectively. For AP, this means documented approval workflows with evidence of who approved what. Three-way matching procedures with evidence of matching. Segregation of duties with evidence that conflicts don't exist. Timely recording of liabilities for accurate financial reporting. And regular reconciliation of AP balances.

**KEVIN:** And auditors test these controls?

**MORGAN:** Every year. External auditors test AP controls as part of the annual audit. They'll sample transactions and verify that controls operated as designed. If they find control deficiencies, those get reported, and material weaknesses can result in adverse audit opinions, which is extremely damaging for a public company.

**KEVIN:** So AP automation systems need to produce audit-ready documentation?

**MORGAN:** Exactly. The audit trail is one of the most valuable features of AP automation. Every action, every approval, every system decision is logged with timestamps. When the auditor asks to see evidence of three-way matching for a sample of invoices, you can produce it in seconds instead of digging through filing cabinets.

**[MUSIC TRANSITION]**

## Tax Compliance

**KEVIN:** What about tax compliance in AP?

**MORGAN:** Tax is enormously complex, especially for multinational companies. In the US, you need to track payments to vendors for 1099 reporting. If you pay an independent contractor more than six hundred dollars in a year, you need to file a 1099 with the IRS. This requires accurate supplier classification and tax ID collection.

**KEVIN:** What about VAT?

**MORGAN:** VAT, or Value Added Tax, is where things get really complex. In Europe, every invoice must include the correct VAT treatment. The buyer needs to verify that the VAT amount is calculated correctly, that the supplier's VAT number is valid, and that the correct reverse charge or intra-community rules are applied for cross-border transactions.

**KEVIN:** And withholding tax?

**MORGAN:** In many countries, the buyer is required to withhold tax from payments to certain types of suppliers and remit it to the tax authority. The rules vary by country, by supplier type, and by the nature of the goods or services. Getting this wrong means either the company is liable for the withheld amount or the supplier is overtaxed.

**KEVIN:** So an AP platform needs to handle tax rules for potentially dozens of countries?

**MORGAN:** Yes. And these rules change frequently. A good AP platform maintains a tax engine that stays current with regulatory changes. This is one of the areas where the complexity creates a real moat for established vendors. Building and maintaining a multi-country tax engine is not trivial.

**[MUSIC TRANSITION]**

## AI-Powered Fraud Detection

**KEVIN:** How does AI help with fraud detection specifically?

**MORGAN:** AI and machine learning are transforming fraud detection in AP. Traditional fraud detection was rule-based: flag any invoice over a certain amount, flag any new bank account, flag any duplicate invoice number. These rules catch some fraud but miss sophisticated schemes.

**KEVIN:** And AI goes beyond rules?

**MORGAN:** AI uses pattern recognition and anomaly detection. It learns what "normal" looks like for each supplier, each department, each expense category, and flags deviations. For example, if a supplier typically sends invoices of five thousand to fifteen thousand dollars and suddenly submits one for fifty thousand, the AI flags it. Not because a rule said "flag invoices over X," but because it's anomalous for that specific supplier.

**KEVIN:** What specific patterns does it look for?

**MORGAN:** Bank detail changes, especially when they come through email rather than the portal. Unusual invoice amounts compared to historical patterns. Invoices from new suppliers that match the address or bank account of an employee. Round-number invoices which are more common in fraud than in legitimate transactions. Invoices submitted just below approval thresholds. And clusters of invoices from the same supplier in a short period.

**KEVIN:** And Medius has this capability?

**MORGAN:** Yes, Medius has a Fraud and Risk Detection module that uses machine learning to identify anomalies and potential fraud. It's one of their differentiators because it's integrated directly into the invoice processing workflow, not bolted on as an afterthought.

**[MUSIC TRANSITION]**

## Duplicate Payment Detection

**KEVIN:** Let's go deeper on duplicate payments specifically.

**MORGAN:** Duplicate payment detection is both simpler and more complex than people think. Exact duplicate detection is straightforward: same supplier, same invoice number, same amount. Any decent system catches those. The hard part is fuzzy duplicates.

**KEVIN:** What makes a duplicate "fuzzy"?

**MORGAN:** The same invoice submitted in different formats. A PDF sent by email and the same invoice entered manually from the paper copy. The same supplier under two different supplier records. An invoice that was reversed, corrected, and resubmitted but the original payment wasn't canceled. Credit notes that weren't applied correctly, causing the original invoice to be paid in full plus the credit.

**KEVIN:** What techniques detect fuzzy duplicates?

**MORGAN:** Fuzzy matching algorithms compare invoices based on multiple weighted factors: similar amounts within a tolerance, similar dates, same or similar supplier, similar line items. The system assigns a confidence score. High confidence duplicates get blocked automatically. Medium confidence gets flagged for human review. Low confidence gets logged for audit purposes.

**[MUSIC TRANSITION]**

## Building a Culture of Compliance

**KEVIN:** Beyond technology, how do you build a culture of compliance?

**MORGAN:** Technology is necessary but not sufficient. Culture matters enormously. It starts with tone at the top. When the CFO and CEO take compliance seriously, the organization follows. Training is essential. AP staff need regular training on fraud recognition, compliance requirements, and the company's policies.

**KEVIN:** What about whistleblower programs?

**MORGAN:** Critical. The ACFE reports that forty-two percent of fraud is detected through tips. Having a confidential reporting mechanism, and making sure employees know about it and trust it, is one of the most effective fraud prevention measures.

**KEVIN:** Any other cultural elements?

**MORGAN:** Regular rotation of duties so no one person controls a process for too long. Mandatory vacations, because fraud schemes often unravel when the perpetrator is away and someone else handles their work. And regular audits, both internal and external, that are taken seriously and whose findings are acted on.

**KEVIN:** As a product builder, I'm thinking about how the software can enable and reinforce these cultural elements.

**MORGAN:** That's the right mindset. The best AP software doesn't just automate controls. It makes compliance the path of least resistance. When following the rules is easier than breaking them, compliance becomes the default behavior.

**[MUSIC TRANSITION]**

## Real-World Fraud Cases

**KEVIN:** Can you share some real-world examples to bring this to life?

**MORGAN:** There are many public cases. One classic was a senior AP manager at a large company who created over a dozen fictitious vendors over a period of six years. She submitted invoices from these vendors, approved the payments herself, and diverted millions of dollars. She was caught when she went on maternity leave and her replacement noticed unusual patterns.

**KEVIN:** That ties to the mandatory vacation point you made.

**MORGAN:** Exactly. Another major case involved a business email compromise where criminals impersonated a company's CEO via email and instructed the finance team to wire forty-seven million dollars to a bank account in China. The finance team complied because the email appeared to come from the CEO and the request seemed urgent.

**KEVIN:** Forty-seven million dollars. That's staggering.

**MORGAN:** It is. And it highlights why dual authorization for high-value payments is non-negotiable. If a second person had to approve that wire transfer, they might have picked up the phone to verify with the CEO.

**[MUSIC TRANSITION]**

## Wrap Up

**KEVIN:** Morgan, this episode has been eye-opening. I knew fraud and compliance were important, but the scale of the problem and the sophistication of the solutions are both greater than I expected.

**MORGAN:** And here's the key insight for your product role: every control you build into the platform is a selling point. CFOs and Controllers don't buy AP software just for efficiency. They buy it for control. When you can demonstrate that your platform reduces fraud risk, ensures SOX compliance, and provides audit-ready documentation, you're speaking directly to their deepest concerns.

**KEVIN:** That's a powerful reframe. We're not just an automation vendor. We're a controls and compliance platform.

**MORGAN:** Now you're thinking like a CPO. Next episode, we're going to explore the technology landscape in depth. AP automation, AI, and what's driving the next wave of innovation.

**KEVIN:** Looking forward to it.

**MORGAN:** See you next time.

*Next Episode: AP Automation Technology & The AI Revolution*
