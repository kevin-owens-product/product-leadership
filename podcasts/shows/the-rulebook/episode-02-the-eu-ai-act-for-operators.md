# Episode 2: The EU AI Act for Operators
## "Roles, Risk Tiers, Deadlines, and What the Omnibus Changed"

**Duration:** ~59 minutes
**Hosts:** Hana & Theo
**Podcast:** The Rulebook

---

### Cold open

[INTRO MUSIC]

**THEO:** The second of February 2025 was a quiet Sunday in most of Europe. And on that day, for the first time anywhere, a set of AI practices became illegal across a whole economic bloc. Manipulating people with AI in harmful ways. Social scoring. Reading the emotions of employees at work.

**HANA:** And most companies didn't notice, because most companies don't do those things. Which is exactly how the EU AI Act is designed. A small number of uses are banned. A larger number are tightly regulated. A wider set need some transparency. And most AI isn't touched at all.

**THEO:** The trick is knowing which bucket your uses fall into. And for a lot of operators, there's at least one use in a bucket they didn't expect.

**HANA:** Welcome back to The Rulebook. I'm Hana.

**THEO:** I'm Theo. Today is the EU AI Act, for operators. Not for lawyers, and not for the frontier AI labs, but for companies that build AI features into their products or use AI in their operations, and for the investors and boards who oversee them.

**HANA:** We'll cover who the Act applies to, the roles that decide your obligations, the four risk tiers, what each tier asks, what changed with this year's Digital Omnibus, and a practical plan.

**THEO:** As always, not legal advice. The Act is long, the guidance is still coming, and details matter. This episode is a map to help you have a better conversation with your counsel.

---

### Does it apply to us?

**THEO:** Start with scope. Who does the AI Act apply to?

**HANA:** More companies than you'd think, including many outside Europe. It applies to providers who place AI systems on the EU market or put them into service in the EU, wherever those providers are based. It applies to deployers of AI systems who are established or located in the EU. And it applies to providers and deployers outside the EU where the output of the AI system is used in the EU.

**THEO:** That last one is broad.

**HANA:** It's deliberately broad, like the GDPR's reach. A US software company selling an AI-powered product to European customers is a provider placing a system on the EU market. A US company with a German subsidiary that uses an AI hiring tool for its German staff is, through that subsidiary, a deployer in the EU. And a US company whose AI produces outputs that are used in the EU can be caught even without a European presence.

**THEO:** And what counts as an AI system?

**HANA:** The Act defines it as a machine-based system designed to operate with varying levels of autonomy, that may show adaptiveness after deployment, and that, from the input it receives, infers how to generate outputs like predictions, content, recommendations or decisions that can influence physical or virtual environments. The European Commission published guidelines on that definition in February 2025.

**THEO:** In plain language?

**HANA:** In plain language, systems that learn or infer rather than just follow rules a human wrote. A simple spreadsheet formula or a fixed set of if-then rules isn't an AI system. A machine learning model is. A large language model is. The guidelines give examples at the edges, and there's a gray zone, but for most modern AI tools, the answer is clearly yes.

**THEO:** Are there exclusions?

**HANA:** A few. Military and national security uses. Scientific research and development before a system is placed on the market. Purely personal, non-professional use. And some limited exemptions for free and open-source AI, though those don't apply to high-risk or prohibited uses or to the transparency rules. For a commercial operator, the exclusions rarely help.

---

### Roles: provider, deployer and the rest

**THEO:** You said roles decide obligations. Explain the roles.

**HANA:** The two that matter most are provider and deployer. A provider is the person or company that develops an AI system, or has it developed, and places it on the market or puts it into service under its own name or trademark. A deployer is a person or company that uses an AI system under its authority in a professional context. There are also importers and distributors, which matter for supply chains, and product manufacturers, which matter when AI is built into products.

**THEO:** So for a software company selling an AI feature?

**HANA:** It's the provider of that feature. Its customers are deployers. For a company that buys an AI tool and uses it, say an HR tool, it's a deployer. Most companies are deployers of many systems, and some are also providers of a few.

**THEO:** Can a deployer become a provider?

**HANA:** Yes, and this catches people out. Under Article 25, a deployer, distributor or importer becomes the provider of a high-risk system if it puts its own name or trademark on a high-risk system already on the market, if it makes a substantial modification to a high-risk system, or if it changes the intended purpose of a system so that it becomes high-risk. For example, if a company takes a general-purpose AI tool, which isn't high-risk, and configures it to screen job applicants, it may become the provider of a high-risk system, with all the provider obligations.

**THEO:** That's a significant point.

**HANA:** It's one of the most important for operators. Building your own AI solution on top of a general-purpose model, for a high-risk purpose, can make you the provider. That's increasingly common, because building on top of general models is so easy now. So when a team builds an internal AI tool, the question "what is it for?" matters a lot.

---

### Tier one: prohibited practices

**THEO:** Let's go through the tiers. Start with what's banned.

**HANA:** Article 5 lists the prohibited practices. They've applied since February 2025. I'll go through them in plain terms. First, AI that uses subliminal, manipulative or deceptive techniques to distort people's behavior in ways that cause or are likely to cause significant harm. Second, AI that exploits vulnerabilities due to age, disability or a social or economic situation, again to distort behavior harmfully.

**THEO:** Third.

**HANA:** Social scoring: evaluating or classifying people based on their social behavior or personal characteristics, where the score leads to unjustified or disproportionate detrimental treatment, or treatment in unrelated contexts. Fourth, predicting the risk that a person will commit a crime based solely on profiling or personality traits. Fifth, creating or expanding facial recognition databases through untargeted scraping of images from the internet or CCTV.

**THEO:** And the ones more likely to affect businesses?

**HANA:** Sixth, emotion recognition in the workplace and in education, except for medical or safety reasons. Seventh, biometric categorization to infer sensitive characteristics like race, political opinions, trade union membership, religious beliefs or sexual orientation. And eighth, real-time remote biometric identification in public spaces for law enforcement, with narrow exceptions.

**THEO:** Emotion recognition in the workplace. That's interesting for call centers.

**HANA:** It's one of the most practically important prohibitions for ordinary businesses. Some call center and workforce analytics tools have offered features that infer employees' emotions from their voice, facial expressions or typing. Under the Act, using AI to infer the emotions of employees at work is prohibited, unless it's for medical or safety reasons. A call center that uses such a feature to monitor agents' emotional states in the EU is likely breaking the law.

**THEO:** What about analyzing the customer's emotions on the call?

**HANA:** That's not covered by the workplace prohibition, because the customer isn't at their workplace. But emotion recognition systems generally have transparency obligations, meaning people must be told, and the Commission's guidelines on prohibited practices, published in February 2025, go into the boundaries in some detail. If you use sentiment or emotion analysis anywhere, have counsel look at exactly what it does and to whom.

**THEO:** Did the Omnibus add anything to the list?

**HANA:** It did. This year's agreement added a prohibition on AI systems that generate non-consensual intimate images, often called nudification apps, and child sexual abuse material, including systems where such output is reasonably foreseeable and the system lacks reasonable safeguards. There's a transition period until December 2026. That's aimed at a specific category of harmful products, and most operators won't be affected, but generative image tools need safeguards.

**THEO:** And the penalties for prohibited practices?

**HANA:** The highest tier: up to thirty five million euros or seven percent of worldwide annual turnover, whichever is higher.

---

### Tier two: high-risk systems

**THEO:** Now the big one. High-risk.

**HANA:** There are two routes to being high-risk. The first is through products. If an AI system is a product, or a safety component of a product, covered by certain EU product safety laws listed in Annex I, like medical devices, toys, lifts, vehicles or radio equipment, and that product requires a third-party conformity assessment, then the AI is high-risk.

**THEO:** And the second route?

**HANA:** The second is the list in Annex III, which covers stand-alone systems used in particular areas. Biometrics, including remote identification and emotion recognition where allowed. Critical infrastructure, like safety components in managing road traffic or utilities. Education and vocational training, like systems that decide admission, assess students or monitor cheating. Employment and worker management, like systems for recruitment, screening applications, evaluating candidates, making decisions on promotion or termination, allocating tasks based on behavior, or monitoring performance.

**THEO:** Keep going.

**HANA:** Access to essential private and public services, like systems that assess eligibility for public benefits, evaluate creditworthiness or establish credit scores, except for detecting fraud, and systems for risk assessment and pricing in life and health insurance, and for dispatching emergency services. Then law enforcement, migration and border control, and the administration of justice and democratic processes, which mostly apply to public bodies.

**THEO:** So for a typical operator, the relevant ones are employment, credit and insurance.

**HANA:** And education, if you're in that sector, and critical infrastructure for utilities. Employment is the one that catches the most private companies, because almost every company hires, and many now use AI in recruitment or workforce management. If you use AI to screen CVs, rank candidates, analyze video interviews, or assign shifts based on performance data, in the EU, you're in high-risk territory.

**THEO:** Is everything in those areas automatically high-risk?

**HANA:** Not quite. Article 6(3) provides a filter. A system listed in Annex III isn't high-risk if it doesn't pose a significant risk of harm, for example if it performs a narrow procedural task, improves the result of a previously completed human activity, detects decision-making patterns without replacing or influencing human assessment without proper review, or performs a preparatory task. But a system that profiles people is always high-risk. And if a provider relies on the filter, it has to document its assessment and register the system.

**THEO:** So a tool that just formats CVs into a standard template might not be high-risk.

**HANA:** It might not, if it's genuinely just formatting. A tool that scores or ranks candidates almost certainly is. The line can be fine, and companies should document their reasoning either way.

---

### What providers of high-risk systems must do

**THEO:** What does a provider of a high-risk system have to do?

**HANA:** A lot. Articles 8 to 15 set out the requirements for the system, and Articles 16 and onwards set out the provider's obligations. Let me list them in plain terms. A risk management system, running throughout the system's life, to identify, assess and reduce risks. Data governance: training, validation and testing data that are relevant, sufficiently representative, and as free of errors as possible, with attention to possible biases.

**THEO:** Keep going.

**HANA:** Technical documentation, detailed enough for authorities to assess compliance. Record-keeping, meaning the system automatically logs events over its life. Transparency to deployers, meaning clear instructions for use, including the system's capabilities, limitations and the human oversight measures needed. Human oversight designed into the system, so people can understand, monitor and override it. And appropriate accuracy, robustness and cybersecurity.

**THEO:** And the organizational obligations?

**HANA:** A quality management system covering all of that. A conformity assessment before placing the system on the market, which for most Annex III systems is a self-assessment based on internal control, though biometric systems can require a third party. An EU declaration of conformity and the CE marking. Registration in an EU database. Post-market monitoring. And reporting serious incidents to the authorities.

**THEO:** That's a serious compliance program.

**HANA:** It is, and it's why the delay matters. For a mid-sized software company that sells, say, an AI recruiting product into Europe, this is many months of work across product, engineering, data science, legal and quality. The harmonized technical standards that will spell out how to meet these requirements in practice are being developed by the European standards bodies, and their delay was one of the reasons for the Omnibus.

**THEO:** And a company that's already ISO 42001 certified?

**HANA:** Has a head start. ISO 42001 covers a lot of the management system elements: risk management, documentation, roles, monitoring. It's not the same as AI Act compliance, and it doesn't create a presumption of conformity on its own, but much of the work carries over.

---

### What deployers of high-risk systems must do

**THEO:** Now deployers. Most of our listeners will be deployers of high-risk systems, if they're anything. What are their obligations?

**HANA:** Lighter than providers', but real. Article 26 is the main one. Deployers must use the system in line with the provider's instructions. They must assign human oversight to people who have the necessary competence, training and authority. Where they control the input data, they must make sure it's relevant and sufficiently representative for the system's purpose. They must monitor the system's operation and inform the provider, and in some cases the authorities, about risks and serious incidents.

**THEO:** And records?

**HANA:** They must keep the logs the system generates, to the extent those logs are under their control, for at least six months, unless other law requires otherwise. And there are two obligations that often surprise employers.

**THEO:** Go on.

**HANA:** First, before putting a high-risk AI system into use at the workplace, employers must inform workers' representatives and the affected workers that they'll be subject to it. Second, deployers that use high-risk systems to make or assist decisions about people must inform those people that they're subject to the use of a high-risk system. And under Article 86, people affected by certain decisions based on high-risk systems have a right to a clear and meaningful explanation of the role of the AI in the decision.

**THEO:** So a candidate rejected with help from an AI screening tool can ask why.

**HANA:** Can ask for an explanation of the AI's role and the main elements of the decision. That's a practical burden for employers, because they need to be able to answer, which means understanding the tool well enough to explain it.

**THEO:** And the fundamental rights impact assessment?

**HANA:** Article 27 requires certain deployers to carry out a fundamental rights impact assessment before using a high-risk system. That applies to public bodies, to private entities providing public services, and to deployers using AI for creditworthiness and credit scoring, or for risk assessment and pricing in life and health insurance. So a bank or an insurer using those systems in the EU needs to do one. Most other private deployers don't, though doing something similar is good practice.

**THEO:** And the vendor relationship?

**HANA:** Becomes crucial. To meet its obligations, a deployer needs good instructions for use, documentation, and logs from the provider. When buying a high-risk AI system, ask for those as part of procurement, and build them into the contract. A vendor that can't explain how its system should be overseen and what its limitations are is a compliance risk for you.

---

### Tier three: transparency obligations

**THEO:** The third tier is transparency. What does Article 50 require?

**HANA:** Four main things, which have applied since August 2026. First, providers must design AI systems that interact directly with people, like chatbots and voice agents, so that people are informed they're interacting with AI, unless it's obvious from the context. Second, providers of systems that generate synthetic audio, image, video or text must mark the outputs in a machine-readable format so they can be detected as AI-generated. There's a grace period until December 2026 for the marking obligation for systems already on the market before August 2026.

**THEO:** And deployers?

**HANA:** Third, deployers of emotion recognition or biometric categorization systems must inform the people exposed to them. And fourth, deployers that create deepfakes, meaning AI-generated or manipulated image, audio or video content that resembles real people, objects, places or events and would falsely appear authentic, must disclose that it's artificially generated. Similarly, deployers that publish AI-generated text to inform the public on matters of public interest must disclose it, unless the text has gone through human review and someone holds editorial responsibility.

**THEO:** So for a company's marketing team?

**HANA:** If marketing creates realistic AI-generated video of a person, disclose it. For clearly creative or satirical work, the disclosure can be done in a way that doesn't spoil the work. For AI-assisted marketing copy, the public interest text rule doesn't usually apply, but consumer protection and advertising rules still do. And the Commission has been developing a code of practice on marking and labeling AI-generated content to help with the details.

**THEO:** And for a company with a customer service chatbot?

**HANA:** The chatbot must tell people it's an AI. The provider of the chatbot product has the design obligation, but if you've built your own on top of a general model, you may be the provider. Simplest approach: make sure every chatbot and voice agent says it's an AI at the start of the interaction. It's cheap, it's good practice, and it's legally required.

---

### General-purpose AI models

**THEO:** And the general-purpose AI rules. Do they matter to operators?

**HANA:** Mostly indirectly. Since August 2025, providers of general-purpose AI models, like the big foundation models, have obligations: technical documentation, information for downstream providers who build on their models, a copyright policy, and a public summary of training content. Providers of models with systemic risk, meaning the most capable ones, have additional obligations around evaluation, risk mitigation, incident reporting and cybersecurity. The Commission published a code of practice in July 2025 to help providers comply, and many major providers signed it.

**THEO:** So for an operator using those models?

**HANA:** The benefit is that the model providers have to give you information that helps you build compliant systems on top. The risk is if you modify a model so substantially that you become its provider. The Commission's guidelines suggest that's only when the modification uses a significant amount of computing power relative to the original training, which very few operators will reach by fine-tuning. For most operators, the general-purpose model rules are someone else's problem, but useful to understand.

**THEO:** And the AI Office?

**HANA:** The European Commission's AI Office supervises general-purpose AI models. And under the Omnibus, it got exclusive competence over AI systems built on a general-purpose model when the same provider develops both, and over AI systems integrated into the very large online platforms and search engines covered by the Digital Services Act. National authorities supervise most other systems.

---

### What the Omnibus changed

**THEO:** Let's be precise about the Omnibus. What did it change?

**HANA:** The provisional political agreement was reached in early May, confirmed by member states shortly after, and the regulation entered into force in late July, just before the original August 2026 deadline. The headline changes are the dates. Stand-alone high-risk systems in Annex III move from August 2026 to the second of December 2027. High-risk AI in products under Annex I moves to the second of August 2028. Those are fixed dates, replacing an earlier idea of linking the start to the availability of standards.

**THEO:** And beyond the dates?

**HANA:** Several other changes. The AI literacy obligation in Article 4 was softened, so that providers and deployers must support the development of AI literacy among their staff, rather than ensure a specific level. The legal basis for processing sensitive personal data to detect and correct bias was extended beyond high-risk providers to all AI systems and general-purpose models, under a strict necessity test. That's helpful for companies trying to test their systems for bias.

**THEO:** And for products?

**HANA:** Two changes worth knowing. AI in products covered by the new Machinery Regulation is largely exempted from the AI Act's high-risk rules, because the Machinery Regulation addresses it. And the definition of a safety component was narrowed, so that AI used only for non-safety purposes, like convenience features or quality control, isn't high-risk just because it's embedded in a regulated product, unless its failure would endanger health or safety. Plus the Commission can limit specific requirements where sector laws already impose equivalent ones.

**THEO:** And the transparency timeline?

**HANA:** Stayed on August 2026, with the marking grace period to December 2026 for existing systems. And the deadline for member states to set up regulatory sandboxes moved to August 2027.

**THEO:** So what's the practical message?

**HANA:** Most operators got about sixteen more months for high-risk employment, credit and insurance uses, and two more years for regulated products. The transparency rules and prohibitions are already live. Don't read the delay as a sign the rules will go away. The political deal kept the structure intact.

---

### Guidance still on the way

**THEO:** You said guidance is still coming. What should operators watch for?

**HANA:** Four things. Harmonized standards from the European standards bodies, which will set out technical ways to meet the high-risk requirements. Once published and referenced, following them gives a presumption of conformity, which is valuable. Commission guidelines on high-risk classification, including practical examples of what is and isn't high-risk, which the Act requires. Codes of practice, including on marking and labeling AI-generated content. And national implementation, like which authority enforces in each country and any national rules on sandboxes and penalties.

**THEO:** That's a lot of moving parts for something with a fixed deadline.

**HANA:** It is, which is why the practical advice is to start with the requirements in the Act itself, which are clear enough to plan around, and adjust as standards and guidance arrive. Waiting for every document before starting is how companies end up rushing in the final months.

---

### Enforcement and penalties

**THEO:** Who enforces, and how hard?

**HANA:** Each member state designates national market surveillance authorities, which are often existing regulators, like data protection authorities or product safety agencies, depending on the country. They can investigate, require corrective action, order systems withdrawn, and impose fines. The AI Office handles general-purpose models and the categories we mentioned.

**THEO:** And the fines?

**HANA:** Three tiers. Up to thirty five million euros or seven percent of global turnover for prohibited practices. Up to fifteen million euros or three percent for most other obligations, including high-risk requirements and transparency. And up to seven and a half million euros or one percent for supplying incorrect or misleading information to authorities. For small and medium-sized enterprises, including start-ups, the lower of the two amounts applies in each tier.

**THEO:** How hard will they enforce?

**HANA:** Unknown, and it will vary by country. The GDPR experience suggests enforcement starts slowly, becomes uneven across countries, and eventually produces some large cases that set the tone. Companies that are visibly making a good-faith effort, with documentation, are generally in a much better position than those that ignored the rules.

**THEO:** And private claims?

**HANA:** The AI Act itself is mostly public enforcement. But the EU's updated Product Liability Directive, adopted in 2024, explicitly covers software, including AI, and makes it easier for people harmed by defective products to claim compensation. Member states have until December 2026 to implement it. So the liability picture is changing alongside the AI Act.

---

### Sector notes: finance and health

**THEO:** Let's do quick sector notes. Financial services first.

**HANA:** Financial services firms are some of the most affected, because creditworthiness assessment and credit scoring for individuals, and risk assessment and pricing in life and health insurance, are explicitly high-risk. Banks, lenders, buy-now-pay-later providers and insurers using AI for those purposes in the EU are either providers or deployers of high-risk systems, and the deployers among them need fundamental rights impact assessments.

**THEO:** And who supervises them?

**HANA:** For financial institutions, the Act generally lets the existing financial supervisors act as the AI Act authorities, and the Omnibus confirmed that national authorities keep competence for financial institutions. The Act also allows financial firms to integrate some AI Act obligations, like the quality management system and monitoring, into their existing governance requirements under financial services law. So a bank's model risk management framework becomes the home for much of its AI Act compliance.

**THEO:** What about fraud detection?

**HANA:** AI used to detect financial fraud is specifically carved out of the credit scoring category. That's important, because fraud detection is one of the most common uses of AI in financial services. It still raises data protection questions, and if it leads to decisions that significantly affect people, like blocking accounts, the GDPR's automated decision rules can apply.

**THEO:** And healthcare?

**HANA:** AI that's a medical device, or a safety component of one, and that needs a notified body assessment under the Medical Device Regulation or the In Vitro Diagnostic Regulation, is high-risk under Annex I, with the date now August 2028. The intention is that the conformity assessment is done together, through the notified body, rather than twice. Medical device companies should plan for one integrated process.

**THEO:** And healthcare AI that isn't a medical device?

**HANA:** Administrative AI in healthcare, like scheduling, documentation drafting, coding assistance or patient communication, usually isn't high-risk under the Act, unless it's used to decide access to essential services or emergency dispatch, which are in Annex III. But chatbots must disclose they're AI, patient data is special category data under the GDPR, and national health regulators may have their own expectations. Our sister show, AI in the Real Economy, has a full episode on healthcare services.

---

### Worked example: a recruiting platform

**THEO:** Let's walk through an example. A made-up company, TalentLoop, based in the US, sells recruiting software to employers in the US and Europe. Its product includes an AI feature that ranks applicants for each job.

**HANA:** Step one: is it an AI system? The ranking uses a machine learning model that infers scores from applications. Yes. Step two: does the Act apply? TalentLoop places it on the EU market by selling to European employers. Yes, as a provider. Step three: which tier? Ranking candidates for recruitment is in Annex III, employment. And ranking candidates is profiling, so the Article 6(3) filter doesn't help. It's high-risk.

**THEO:** And the deadline?

**HANA:** The second of December 2027, under the Omnibus. By then, TalentLoop needs a risk management system, data governance including bias testing, technical documentation, logging, instructions for use for its customers, human oversight design, accuracy and robustness testing, a quality management system, a conformity assessment, a declaration of conformity, CE marking and registration.

**THEO:** And its chatbot?

**HANA:** TalentLoop also has a candidate-facing chatbot that answers questions about job openings. That's a transparency tier system. It must tell candidates it's an AI. That applies already, since August 2026.

**THEO:** And TalentLoop's customers?

**HANA:** They're deployers of a high-risk system. From December 2027, they must use it per the instructions, assign competent human oversight, keep logs, inform workers' representatives before using it on their own staff, inform candidates that a high-risk system is used, and be ready to explain decisions on request. TalentLoop's instructions for use, logs and explanation features will make or break its customers' ability to comply, which makes compliance a selling point.

**THEO:** And the plan?

**HANA:** Start now. Map the gaps against the requirements. Build bias testing and logging into the product roadmap. Write the technical documentation as the system evolves, not at the end. Prepare customer-facing materials on human oversight and explanations. Consider ISO 42001 as the backbone of the quality management system. And budget for it, because it's a meaningful cost, and a meaningful barrier to smaller competitors.

---

### Worked example: a manufacturer and a services firm

**THEO:** Let's do two quicker ones. A manufacturer that uses AI vision for quality inspection on its own production line.

**HANA:** Internal use, not placed on the market, so the company is a deployer, or arguably a provider putting into service for its own use if it built it. Is it high-risk? Quality inspection of parts isn't in Annex III. It's not a safety component of a product under Annex I, especially after the Omnibus narrowed that definition to exclude quality control. So probably not high-risk. No specific AI Act obligations beyond literacy. Normal workplace safety and product rules still apply.

**THEO:** And if the manufacturer sells machines with AI features?

**HANA:** Then it's a product question. Machinery with AI is mainly addressed by the Machinery Regulation from January 2027, which the Omnibus left as the primary rulebook. If the AI performs a safety function, there are specific requirements there. Counsel and the certification team need to be involved.

**THEO:** And a business services firm that uses general-purpose AI assistants for drafting documents and an AI tool to allocate shifts to its cleaning staff based on performance scores.

**HANA:** The drafting assistant: deployer of a general-purpose tool for a low-risk purpose. Literacy, data protection, and that's about it. The shift allocation tool: allocating tasks based on individual behavior or traits, and monitoring performance, is in Annex III under employment. Likely high-risk, so deployer obligations from December 2027, including informing workers' representatives. And if the firm built that tool itself on a general model, it may be the provider. That's the one to look at carefully.

---

### Contracts up and down the chain

**THEO:** You mentioned vendor contracts. How should the AI Act show up in contracts?

**HANA:** In both directions. If you buy a high-risk system, your contract with the provider should cover what you need to meet your deployer obligations: the instructions for use, documentation of capabilities and limitations, access to logs, cooperation if a regulator asks questions, notification of serious incidents or significant changes, and a commitment that the system will comply with the Act by the relevant date. Some companies also ask for support with explanations to affected individuals.

**THEO:** And if you sell one?

**HANA:** Then your customers will ask you for all of that. Expect procurement questionnaires that ask about your AI Act classification, your conformity plans, your bias testing and your logging. Having a clear, standard package of answers and documents saves a lot of sales time, and it's a competitive advantage against vendors who can't answer.

**THEO:** And for general-purpose tools?

**HANA:** For general-purpose AI tools used in low-risk ways, the contract questions are mostly about data protection and confidentiality: whether your data trains the model, where it's processed, and how long it's kept. But add a clause on intended use. If your staff might use a general tool for something that becomes high-risk, you want to know whether the vendor's terms allow it and what support they give.

**THEO:** And in M and A?

**HANA:** AI Act compliance has become a standard diligence topic for targets with EU exposure, and purchase agreements increasingly include representations about compliance with AI laws. Our sister show, The AI Diligence Room, covers that in detail.

---

### Interplay with the GDPR

**THEO:** How does the AI Act fit with the GDPR?

**HANA:** They apply side by side. The AI Act doesn't replace the GDPR. If an AI system processes personal data, which most do, the GDPR applies in full: lawful basis, purpose limitation, data minimization, transparency, individuals' rights, data protection impact assessments for high-risk processing, and rules on international transfers. And Article 22 of the GDPR gives people rights around solely automated decisions with legal or similarly significant effects.

**THEO:** So a high-risk AI hiring tool triggers both.

**HANA:** Both. A data protection impact assessment under the GDPR, and deployer obligations under the AI Act. Companies can combine the work, and the Act explicitly allows deployers to build on their data protection impact assessment when doing a fundamental rights impact assessment. In practice, data protection teams often end up owning AI Act compliance for deployers, because they already have the processes and the relationships with regulators.

**THEO:** And the data protection authorities are active on AI.

**HANA:** Very active. They've investigated and fined AI providers, issued guidance on training models on personal data, and in several countries they'll be among the AI Act authorities too. For many companies, the data protection regulator is the AI regulator they'll actually meet first.

---

### Common misreadings

**THEO:** What do companies most often get wrong when they read the AI Act?

**HANA:** Five misreadings. First, "we're not in Europe, so it doesn't apply." As we covered, it can, through the market or the output. Second, "we only use AI from big vendors, so the vendor is responsible." Deployers have their own obligations, and you can become a provider without meaning to.

**THEO:** Third.

**HANA:** "All AI is regulated." The opposite misreading. Most AI uses, like drafting, summarizing, coding assistance, internal analytics, recommendations and quality inspection, fall outside the prohibited, high-risk and transparency tiers. Over-applying high-risk controls to everything wastes effort and frustrates staff.

**THEO:** Fourth.

**HANA:** "The deadline moved, so we can relax." Prohibitions and transparency are live, and high-risk compliance is a long project. Sixteen extra months is helpful, but for a provider building a quality management system from scratch, it's not a lot.

**THEO:** And fifth?

**HANA:** "Human in the loop solves everything." Human oversight is a requirement, not an exemption. A high-risk system with a human reviewer is still high-risk. And a human who rubber-stamps every AI recommendation isn't meaningful oversight. The Act expects the people overseeing the system to understand it, to be able to spot problems, and to have the authority to override it.

---

### Questions we keep hearing

**THEO:** Some quick questions. Is using a general AI assistant to help write job descriptions high-risk?

**HANA:** No. Writing job descriptions isn't screening, evaluating or deciding about candidates. Use good judgment about bias in the wording, but it's not in the high-risk list.

**THEO:** What about using AI to summarize interview notes for the hiring manager?

**HANA:** That's closer to the line. If the summary just condenses what interviewers wrote, it might fall under the preparatory task filter, with documented reasoning. If it scores or ranks candidates, or recommends who to hire, it's high-risk. The more the output shapes the decision, the more likely it's in scope.

**THEO:** Do we need to tell customers our marketing images are AI-generated?

**HANA:** If they're deepfakes, meaning realistic depictions of real people, places or events that would falsely appear authentic, yes. For obviously artificial or illustrative images, the deepfake rule doesn't bite, but advertising rules about misleading consumers still apply. And the providers of the image tools must mark outputs in a machine-readable way, which your tools may already do.

**THEO:** Is there any help for small companies?

**HANA:** Some. Lower fine caps for small and medium-sized enterprises, simplified documentation for smaller providers in some cases, priority access to regulatory sandboxes, and the Commission and member states are expected to provide guidance and templates aimed at smaller companies. It doesn't remove the obligations, but it reduces the burden.

---

### A practical plan

**THEO:** Let's finish with a plan. What should an operator do now, in late 2026?

**HANA:** Six steps. One, confirm your inventory includes EU touchpoints: which AI systems you provide or deploy in the EU, or whose outputs are used there. Two, classify each one: prohibited, high-risk, transparency, or minimal. Pay special attention to employment, credit, insurance, education, and anything involving emotion recognition or biometrics.

**THEO:** Three.

**HANA:** Three, fix anything prohibited immediately. Emotion recognition of employees is the most likely culprit. Four, check transparency now, because it's already in force: chatbots and voice agents disclose they're AI, deepfakes are labeled, and if you provide generative systems, outputs are marked or will be by the grace period's end.

**THEO:** Five.

**HANA:** Five, for high-risk systems, start the gap analysis and plan the work to December 2027 or August 2028. If you're a deployer, talk to your vendors about their compliance plans and the documentation you'll need. If you're a provider, build the requirements into the product roadmap. And six, keep records of everything: classifications, assessments, training, decisions. Documentation is your best defense.

**THEO:** And for investors?

**HANA:** Ask portfolio companies with EU exposure whether they've done the classification, and specifically whether any are providers of high-risk systems. Those companies need a budget and a plan. And in diligence, a target that's a provider of a high-risk system without a compliance plan has a cost the buyer will bear.

---

### Takeaways

**THEO:** Sum it up.

**HANA:** The AI Act reaches companies outside Europe if they sell into the EU or their AI outputs are used there. Your role, provider or deployer, decides your obligations, and building your own tool on a general model for a high-risk purpose can make you a provider.

**THEO:** The tiers.

**HANA:** Prohibitions since February 2025, including emotion recognition of employees, plus a new ban on nudification tools from the Omnibus. Transparency since August 2026: chatbots disclose, deepfakes are labeled, outputs are marked. High-risk rules from December 2027 for Annex III uses like recruitment, credit and insurance, and August 2028 for AI in regulated products, with machinery largely left to the Machinery Regulation.

**THEO:** And the practical side?

**HANA:** Inventory, classify, fix prohibited uses, check transparency now, plan for high-risk, and document everything. Work it alongside the GDPR, because your data protection team is probably best placed to lead. And treat the delay as time to prepare, not time to wait.

**THEO:** Next time: the American patchwork. Federal agencies, state laws, and how to run one compliance program across fifty states.

[OUTRO MUSIC]

**HANA:** Thanks for listening to The Rulebook. I'm Hana.

**THEO:** And I'm Theo. See you next time.
