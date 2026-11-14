# Episode 5: Supplier Management & Spend Analytics

**Duration:** ~13 minutes

### Introduction

**MORGAN:** Welcome back to AP and Finance Mastery. Today we're flipping the lens to look at the other side of every AP transaction: the supplier.

**KEVIN:** This is fascinating to me as a product person. In AP, you have two distinct user groups: the internal finance team and the external suppliers. Both matter enormously.

**MORGAN:** Exactly right. And too many AP platforms treat suppliers as an afterthought. The companies that get supplier management right create a competitive advantage that's hard to replicate.

**[MUSIC TRANSITION]**

### Supplier Master Data

**KEVIN:** Let's start with the basics. What is supplier master data?

**MORGAN:** Supplier master data is the central repository of information about every vendor a company does business with. It includes the supplier's legal name, tax identification number, addresses, banking details for payments, payment terms, contact information, and categorization data.

**KEVIN:** Sounds straightforward. What makes it challenging?

**MORGAN:** The mess. Most companies' supplier master data is in terrible shape. They have duplicate records for the same supplier under slightly different names. Acme Corp, Acme Corporation, ACME Inc, all the same company but three different records. They have outdated banking details, inactive suppliers that haven't been cleaned up, and inconsistent categorization.

**KEVIN:** What's the impact of messy master data?

**MORGAN:** It cascades into everything. Duplicate supplier records lead to duplicate payments. Outdated bank details mean failed payments. Inconsistent categorization makes spend analytics unreliable. And it creates fraud risk because it's easier to hide fictitious vendors in a messy master file.

**KEVIN:** How bad is the problem typically?

**MORGAN:** Studies suggest that five to ten percent of suppliers in a typical master file are duplicates. In companies that have grown through acquisitions or have decentralized operations, it can be much higher. I've seen companies with thirty to forty percent duplicate rates after merging supplier files from acquired entities.

**[MUSIC TRANSITION]**

### Supplier Onboarding

**KEVIN:** How do new suppliers get set up?

**MORGAN:** Supplier onboarding is the process of collecting all the necessary information from a new supplier before you can do business with them and pay them. This includes legal entity verification, tax documentation like W-9 in the US or equivalent in other countries, banking details for payment, insurance certificates if required, compliance questionnaires, and sometimes background checks.

**KEVIN:** That sounds like a lot of back and forth.

**MORGAN:** It is. In a manual process, onboarding a new supplier can take weeks. Emails going back and forth, forms being filled out incorrectly, missing documentation, and internal approvals. During this time, the business can't issue POs to the supplier, which means they can't get the goods or services they need.

**KEVIN:** And automation can streamline this?

**MORGAN:** Dramatically. A supplier portal where vendors self-register, upload documents, and provide their information in structured forms can reduce onboarding from weeks to days. The system validates tax IDs automatically, screens against sanctions lists, checks for duplicate records, and routes for internal approval. Medius has a Supplier Onboarding module that does exactly this.

**KEVIN:** What about KYC and compliance requirements?

**MORGAN:** Know Your Customer requirements apply to supplier onboarding as well. Companies need to verify that the supplier is a legitimate business entity, not on any sanctions or denied-party lists, and compliant with anti-money laundering regulations. For suppliers in certain high-risk categories or geographies, enhanced due diligence may be required.

**[MUSIC TRANSITION]**

### Supplier Portals and Self-Service

**KEVIN:** Tell me about supplier portals. What do they enable?

**MORGAN:** A supplier portal is a web-based interface where suppliers can interact with the buying company's AP and procurement systems. At minimum, it provides invoice submission, so suppliers can upload invoices directly rather than sending emails. Payment status visibility, so suppliers can see where their invoices are in the process and when payment is expected. And statement reconciliation, so suppliers can compare their records against the buyer's records.

**KEVIN:** That payment status piece seems huge. Isn't the number one supplier inquiry "where's my payment?"

**MORGAN:** Exactly. "Where's my payment?" accounts for the majority of supplier inquiries to AP departments. Every one of those calls or emails takes time from the AP team. If the supplier can log into a portal and see that their invoice was received on March 5th, approved on March 12th, and scheduled for payment on March 20th, they don't need to call.

**KEVIN:** And Medius has an AI solution for handling supplier inquiries?

**MORGAN:** Yes, Medius Supplier Conversations uses AI to automatically respond to supplier inquiries. The AI reads the incoming email, understands the question, looks up the relevant invoice or payment information, and generates a response. This can handle the vast majority of routine inquiries without any human involvement.

**KEVIN:** That's a great example of AI solving a real operational pain point.

**MORGAN:** It is. And it benefits both sides. The supplier gets a fast, accurate response. The AP team doesn't have to stop what they're doing to look up payment status for the hundredth time that week.

**[MUSIC TRANSITION]**

### Spend Analytics

**KEVIN:** Let's shift to spend analytics. Why is spend visibility so important?

**MORGAN:** You can't manage what you can't see. Spend analytics is the process of collecting, cleansing, classifying, and analyzing procurement data to understand what a company is spending, with whom, on what, and whether it's getting good value.

**KEVIN:** What does good spend analytics look like?

**MORGAN:** At a basic level, you want to answer questions like: How much are we spending with each supplier? What are our top spend categories? Are we using preferred suppliers or is there a lot of maverick spend? How does spending compare across departments, regions, and time periods? Are we capturing all available discounts?

**KEVIN:** And at a more advanced level?

**MORGAN:** Advanced analytics gets into predictive insights. Which suppliers are at risk of financial distress? Where are there opportunities to consolidate spend and negotiate better pricing? What's the trend in our spending, and does it align with budget? Are there anomalous spending patterns that might indicate fraud? And how does our AP performance compare to industry benchmarks?

**KEVIN:** This sounds like a BI and reporting play.

**MORGAN:** It is, and it's one of the highest-value features of an AP platform. CFOs and procurement leaders live in dashboards. They want real-time visibility into spend, not a report that takes three weeks to compile. Medius Analytics integrates with Power BI, which is smart given their Microsoft ecosystem focus.

**[MUSIC TRANSITION]**

### Spend Categorization

**KEVIN:** How does spend get categorized?

**MORGAN:** Spend categorization, also called spend classification, is the process of organizing purchases into a standardized taxonomy. The most common standard is UNSPSC, the United Nations Standard Products and Services Code, which provides a hierarchical classification with four levels.

**KEVIN:** But most companies don't use a standard taxonomy, do they?

**MORGAN:** Most don't, or they use it inconsistently. This is one of the hardest data challenges in procurement. When invoices are coded to GL accounts, you know the accounting category, like office supplies or professional services, but you don't know the detailed procurement category, like whether those office supplies are printer paper or ergonomic keyboards.

**KEVIN:** And AI can help with categorization?

**MORGAN:** It's one of the most impactful AI use cases in spend management. AI can analyze invoice line items, supplier information, and historical patterns to automatically categorize spend. This turns a manual data cleansing exercise that used to take months into an automated process that runs continuously.

**[MUSIC TRANSITION]**

### Tail Spend

**KEVIN:** What about tail spend? I've heard that term.

**MORGAN:** Tail spend is the long tail of low-value purchases from a large number of suppliers. Typically, the Pareto principle applies: eighty percent of spend is with twenty percent of suppliers, the strategic suppliers. The remaining twenty percent of spend, the tail, is spread across eighty percent of suppliers.

**KEVIN:** Why does tail spend matter?

**MORGAN:** Because it's where the inefficiency hides. Those thousands of small suppliers each generate invoices that need to be processed, payments that need to be made, and master data that needs to be maintained. The cost of managing a supplier with ten-thousand dollars in annual spend might be higher than the cost of managing a supplier with ten million, on a per-transaction basis.

**KEVIN:** So what's the solution?

**MORGAN:** Several approaches. Consolidate where possible by reducing the number of suppliers. Use purchasing cards or virtual cards for low-value transactions to bypass the traditional P2P process. Automate onboarding and self-service to reduce the cost of managing small suppliers. And use AI to handle the routine processing of tail spend invoices.

**[MUSIC TRANSITION]**

### Supplier Performance and Relationships

**KEVIN:** How do companies measure and manage supplier performance?

**MORGAN:** Supplier scorecards typically measure on-time delivery, quality metrics, pricing compliance meaning are they honoring contracted prices, responsiveness to issues, and invoice accuracy, meaning how often their invoices match POs without discrepancies.

**KEVIN:** And the relationship dynamic between buyers and suppliers? Is it typically adversarial or collaborative?

**MORGAN:** Traditionally, it's been more adversarial than it should be. Procurement squeezes suppliers on price. AP pushes out payment terms. Suppliers pad invoices to compensate. It's a lose-lose dynamic.

**KEVIN:** What does a better model look like?

**MORGAN:** The best buyer-supplier relationships are collaborative. The buyer pays on time or early, the supplier provides competitive pricing and priority service. Information flows freely in both directions. And technology enables this by providing transparency. When a supplier can see exactly where their invoice is in the process and when they'll get paid, it builds trust.

**KEVIN:** So the supplier experience is actually a competitive differentiator for AP platforms?

**MORGAN:** Absolutely. If Medius makes it easy and pleasant for suppliers to interact with their customers, those suppliers become advocates for the platform. They might even recommend Medius to the buyer company they work with. That's a powerful go-to-market motion.

**KEVIN:** I love that. The supplier network effect.

**MORGAN:** Exactly. And it's why companies like Coupa and Ariba invested heavily in supplier networks. The more suppliers on your network, the more value you provide to buyers, which attracts more buyers, which attracts more suppliers.

**[MUSIC TRANSITION]**

### Duplicate Supplier Detection

**KEVIN:** You mentioned duplicate suppliers earlier. How do you detect and clean those up?

**MORGAN:** Duplicate detection uses a combination of exact matching and fuzzy matching. Exact matching catches obvious duplicates with the same tax ID or same bank account. Fuzzy matching uses algorithms to identify probable duplicates based on similar names, addresses, and other attributes.

**KEVIN:** What's the process for cleanup?

**MORGAN:** It's typically a project. You run the detection algorithms, review the results with human oversight because false positives happen, merge the duplicate records, and then put controls in place to prevent new duplicates from being created. The prevention piece is key: requiring tax ID validation during onboarding, checking for existing records before creating new ones, and having governance over who can create supplier records.

**[MUSIC TRANSITION]**

### Early Payment Programs

**KEVIN:** Let's talk about early payment programs and their impact on suppliers.

**MORGAN:** Early payment programs, whether they're traditional discounts, dynamic discounting, or supply chain finance, can be transformative for suppliers. Many suppliers, especially small and medium businesses, struggle with cash flow. Getting paid in ten days instead of sixty days can mean the difference between making payroll and not.

**KEVIN:** So there's a social impact angle here too?

**MORGAN:** There is. Programs that provide early payment to small and diverse suppliers are increasingly part of corporate ESG and supplier diversity initiatives. An AP platform that facilitates early payment programs is creating real value in the supply chain, not just moving paper around.

**KEVIN:** This is a great product narrative. You're not just automating invoices, you're enabling healthier supply chains.

**MORGAN:** Exactly. And that narrative resonates with stakeholders beyond just the AP department. Procurement cares about supplier health. The CFO cares about working capital. The CEO cares about ESG. AP automation that enables early payment programs touches all of those priorities.

**[MUSIC TRANSITION]**

### Wrap Up

**KEVIN:** Morgan, this episode has completely changed how I think about the supplier side of AP. It's not just about processing invoices efficiently. It's about building relationships, enabling transparency, and creating value across the supply chain.

**MORGAN:** And that perspective is exactly what a CPO needs. The product isn't just a tool for AP clerks. It's a platform that sits at the intersection of buyers and suppliers and can create enormous value for both sides. Next episode, we're going to dive into a topic that every finance leader worries about: compliance, fraud prevention, and internal controls.

**KEVIN:** That sounds critical. See you next time.

**MORGAN:** See you next time.

*Next Episode: Compliance, Fraud Prevention & Internal Controls*
