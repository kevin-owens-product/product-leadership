# Episode 7: AP Automation Technology & The AI Revolution

**Duration:** ~14 minutes

## Introduction

**MORGAN:** Welcome back to AP and Finance Mastery. Today we're diving into the technology that makes modern AP possible, from the early days of OCR to the cutting edge of agentic AI.

**KEVIN:** As a product leader, this is my home turf. But I want to understand how the technology has evolved specifically in the AP context and where it's heading.

**MORGAN:** Let's map it out. The evolution of AP technology is a fascinating journey from paper to intelligence.

**[MUSIC TRANSITION]**

## The Evolution of AP Technology

**KEVIN:** Take me through the generations.

**MORGAN:** Generation one was manual AP. Paper invoices, filing cabinets, rubber stamps for approval, handwritten ledgers, and checks written by hand. This was the norm until the 1980s and 1990s, and honestly, many companies still operate closer to this than they'd admit.

**KEVIN:** Generation two?

**MORGAN:** Basic automation, roughly the 1990s to 2000s. ERPs like SAP and Oracle digitized the transaction recording. Invoices were still manually keyed in, but at least the data lived in a database. Workflows were basic. Reports could be generated. It was better than paper but still heavily manual.

**KEVIN:** Then what changed?

**MORGAN:** Generation three was intelligent automation, from about 2005 to 2020. This is where dedicated AP automation platforms emerged. They brought OCR for data capture, digital workflows for approvals, automated matching engines, and basic analytics. Companies like Basware, ReadSoft, which eventually became part of the Medius story, and others pioneered this space.

**KEVIN:** And generation four?

**MORGAN:** That's where we are now. AI-native AP automation. Machine learning for data extraction, natural language processing for understanding document context, predictive models for coding and fraud detection, and increasingly, large language models and agentic AI that can handle complex tasks autonomously.

**[MUSIC TRANSITION]**

## OCR: The Foundation

**KEVIN:** Let's start with OCR since it's the foundation of everything.

**MORGAN:** OCR, Optical Character Recognition, converts images of text into machine-readable text. In AP, it's used to extract text from scanned paper invoices or PDF files. The basic technology has been around since the 1970s, but it took decades to become reliable enough for production use.

**KEVIN:** What are OCR's limitations?

**MORGAN:** Traditional OCR just converts images to text. It doesn't understand what the text means. It can tell you there's a "12,500.00" on the page, but it doesn't know if that's the invoice total, a line item amount, or a PO number. That's why template-based OCR required pre-configured templates to tell the system where to look for each field.

**KEVIN:** And template-free approaches?

**MORGAN:** Template-free data capture uses machine learning models trained on millions of invoices to identify fields based on context, layout, and surrounding text. The model learns that a number in the bottom right corner near the word "Total" is likely the invoice total. This was the breakthrough that made AP automation scalable because you no longer needed a template for every supplier.

**[MUSIC TRANSITION]**

## Machine Learning in AP

**KEVIN:** How specifically is machine learning applied beyond data extraction?

**MORGAN:** ML is everywhere in modern AP. For extraction, as we discussed, it identifies and extracts fields without templates. For classification, it determines what type of document this is, an invoice, a credit note, a purchase order, a statement. For GL coding prediction, it suggests the correct accounts based on historical patterns.

**KEVIN:** What else?

**MORGAN:** For approval routing, ML can predict who should approve a particular invoice based on past routing decisions. For fraud detection, it identifies anomalous patterns that deviate from established baselines. For cash flow forecasting, it predicts when invoices will arrive and when they'll be paid based on historical patterns. And for supplier behavior modeling, it predicts which suppliers are likely to offer early payment discounts or which are at risk of delayed deliveries.

**KEVIN:** How much training data do you need for these models to work well?

**MORGAN:** This is a key question for product strategy. For extraction, the general models need millions of training documents, but they work reasonably well out of the box. For company-specific models like GL coding prediction, you typically need a few months of historical data, maybe a thousand transactions per GL code, before the predictions become reliable. This creates a cold-start problem for new customers.

**KEVIN:** How do you solve the cold-start problem?

**MORGAN:** Transfer learning. You train a base model on data from many customers, anonymized of course, and then fine-tune it for each specific customer. The base model provides reasonable predictions from day one, and they improve as the system processes more of that customer's specific invoices.

**[MUSIC TRANSITION]**

## NLP and Large Language Models

**KEVIN:** Where do NLP and LLMs fit in?

**MORGAN:** Natural Language Processing was initially used for things like parsing email content to extract invoice-related information, understanding unstructured text in invoice descriptions, and routing supplier inquiries to the right category.

**KEVIN:** And LLMs take this much further?

**MORGAN:** Yes. Large Language Models like the ones powering modern AI assistants can understand complex document layouts, interpret ambiguous field labels in any language, extract data from documents they've never seen before with remarkable accuracy, generate human-quality responses to supplier inquiries, and explain why a particular invoice was flagged, in natural language.

**KEVIN:** This is what Medius Copilot is built on?

**MORGAN:** Exactly. Medius Copilot is an AI assistant that helps invoice approvers understand what they're looking at. Instead of just showing an invoice and saying "approve or reject," the copilot can explain the context. For example: "This invoice from Acme Corp is twelve percent higher than their usual monthly invoice. The increase appears to be due to two additional line items for rush delivery charges. The PO authorized standard delivery. You may want to verify with the requestor."

**KEVIN:** That's incredibly powerful. It's not just automation, it's augmented intelligence.

**MORGAN:** Right. The human still makes the decision, but they have much better information to make it with.

**[MUSIC TRANSITION]**

## Agentic AI

**KEVIN:** I keep hearing about agentic AI. What does that mean in the AP context?

**MORGAN:** Agentic AI refers to AI systems that can take actions autonomously, not just analyze data and make recommendations. In AP, an agentic AI system might receive a supplier email about a missing payment, look up the invoice in the system, identify that it's stuck in an approval queue, send a reminder to the approver, and respond to the supplier with a status update. All without human intervention.

**KEVIN:** That's a fundamentally different value proposition. From "we help you process invoices" to "we handle your AP operations."

**MORGAN:** Exactly. And it's where the industry is heading. The vision is an AP department where the AI handles ninety-five percent of transactions end-to-end, and humans only get involved for genuinely complex exceptions and strategic decisions.

**KEVIN:** What are the barriers to getting there?

**MORGAN:** Trust is the biggest one. Finance teams are understandably cautious about letting AI make decisions that involve money. There are also accuracy requirements. A ninety-nine percent accuracy rate sounds great, but if you process a million invoices, that's ten thousand errors. Regulatory and audit concerns about AI decision-making. And the change management challenge of redesigning AP teams around AI-first workflows.

**[MUSIC TRANSITION]**

## Integration Patterns

**KEVIN:** Let's talk about integration. AP automation doesn't exist in a vacuum.

**MORGAN:** Integration is the lifeblood of AP automation. The platform needs to connect with ERPs to read PO and master data and write back validated invoices and payments. It needs to connect with banks for payment execution and reconciliation. It needs to connect with e-invoicing networks for structured invoice receipt. And increasingly, it needs to connect with other enterprise systems like contract management, expense management, and business intelligence.

**KEVIN:** What are the main integration approaches?

**MORGAN:** Point-to-point APIs are the most common for modern cloud platforms. Pre-built connectors for major ERPs like SAP, Oracle, and Dynamics reduce implementation time. Middleware platforms like MuleSoft or Dell Boomi can broker complex integrations. EDI for traditional supply chain integration. And file-based integration is still common for bank connections and some ERP scenarios.

**KEVIN:** How important is the ERP integration for Medius specifically?

**MORGAN:** It's existential. Medius's deep integration with Microsoft Dynamics is one of their strongest competitive advantages. They're a preferred solution in the Dynamics ecosystem. Expanding that same depth of integration to SAP and Oracle would significantly expand their addressable market.

**[MUSIC TRANSITION]**

## Cloud vs On-Premise

**KEVIN:** Is the cloud vs on-premise debate settled in AP?

**MORGAN:** Largely, yes. The market has moved decisively to cloud and SaaS. Cloud offers faster deployment, automatic updates, scalability, and lower total cost of ownership. Medius is cloud-native, built on Microsoft Azure, which is exactly the right architecture.

**KEVIN:** Are there holdouts?

**MORGAN:** Some large enterprises, particularly in regulated industries like banking and government, still have on-premise requirements or hybrid architectures. Some companies in countries with data residency requirements need assurance that their data stays in-country. But even these organizations are increasingly comfortable with cloud solutions that meet their compliance requirements.

**[MUSIC TRANSITION]**

## The Competitive Landscape

**KEVIN:** Let's talk about the AP automation vendor landscape. Who are the major players?

**MORGAN:** The market is fragmented but consolidating. At the top, you have the ERP vendors themselves, SAP with Ariba and Concur, Oracle with its procurement cloud, Coupa which was acquired by Thoma Bravo. Then you have the dedicated AP automation players like Medius, Basware, Tipalti, and Stampli.

**KEVIN:** How do they differentiate?

**MORGAN:** Tipalti is strong in global payments, particularly for companies with lots of cross-border payees like marketplaces and gig economy platforms. Stampli differentiates on user experience and speed of deployment, targeting the mid-market. Basware has a large e-invoicing network, particularly strong in Europe. Coupa goes broad as a full business spend management platform.

**KEVIN:** And where does Medius fit?

**MORGAN:** Medius positions as an AI-native, end-to-end spend management platform. Their strengths are deep Microsoft integration, strong European presence especially in the Nordics, a comprehensive suite from sourcing to payment, and increasingly their AI capabilities including Copilot and Supplier Conversations. They were named a Gartner Magic Quadrant Leader for AP Applications in 2025.

**KEVIN:** What's the competitive threat?

**MORGAN:** The biggest strategic threat is probably Coupa, which has scale and breadth. The tactical threats are specialists like Stampli who win on user experience in specific segments. And the sleeper threat is the ERPs themselves improving their native AP capabilities enough that the standalone case weakens.

**[MUSIC TRANSITION]**

## Build vs Buy

**KEVIN:** Do companies ever try to build their own AP automation?

**MORGAN:** Some do, usually large enterprises with strong IT teams. It almost always ends badly. The problem is that AP automation looks simpler than it is. Extracting data from invoices, handling multi-country tax rules, integrating with banks, maintaining e-invoicing compliance, these are deeply specialized capabilities that require continuous investment.

**KEVIN:** What happens to the build attempts?

**MORGAN:** They typically start well, handle the simple cases, and then stall when they hit the long tail of complexity. The ninety-five different PDF layouts from ninety-five different suppliers. The tax rule that changed in Germany last month. The bank file format quirk that causes payment failures. Companies end up spending more maintaining their custom solution than a commercial platform would cost.

**KEVIN:** That's a strong argument for best-of-breed platforms.

**MORGAN:** It is. And it's an argument that resonates when you can demonstrate the breadth of edge cases your platform handles that a custom solution would need to replicate.

**[MUSIC TRANSITION]**

## The Next Five Years

**KEVIN:** Where is AP technology heading?

**MORGAN:** Five key trends. First, autonomous AP where AI handles the vast majority of transactions without human intervention. Second, embedded payments becoming standard in every AP platform. Third, e-invoicing compliance becoming a must-have as mandates spread globally. Fourth, real-time analytics and predictive insights replacing retrospective reporting. And fifth, platform convergence where AP, procurement, expense, and treasury capabilities merge into unified spend management platforms.

**KEVIN:** That's a roadmap for Medius right there.

**MORGAN:** It is. And the winners will be the platforms that execute on these trends while maintaining the deep, reliable automation that customers depend on daily.

**[MUSIC TRANSITION]**

## Wrap Up

**KEVIN:** Morgan, this technology deep dive has been exactly what I needed. I can see the product strategy taking shape: AI-native automation, embedded payments, global compliance, and platform convergence.

**MORGAN:** Next episode is the one I'm most excited about. We're going to do a full deep dive on Medius itself. The product suite, the architecture, the competitive positioning, and where a CPO can make the biggest impact.

**KEVIN:** That's going to be the most directly relevant episode for me. Can't wait.

**MORGAN:** See you next time.

*Next Episode: Medius Deep Dive — The Platform & Product Suite*
