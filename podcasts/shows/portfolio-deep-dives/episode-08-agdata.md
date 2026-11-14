# Episode 8: AGDATA
## "Fifty-Six Million Receipts from the Farm Economy"

**Duration:** ~49 minutes
**Hosts:** Nora & James
**Podcast:** Portfolio Deep Dives

---

### Cold open

[INTRO MUSIC]

**NORA:** Here's a scene most of us never think about. A farmer in Iowa walks into a local farm supply store and buys seed and crop protection products for the season. He pays, he loads the truck, he drives home. Done, as far as he's concerned.

**JAMES:** But for the company that made those products, the story is just starting. Somewhere in that sale is a rebate owed to the store, maybe an incentive owed to the distributor, maybe a loyalty reward owed to the farmer. And the manufacturer needs to know who bought what, where, and whether every claim that comes in later is real.

**NORA:** Multiply that by millions of sales, thousands of stores and billions of dollars of incentive money, and you have a very large, very unglamorous data problem.

**JAMES:** And a company that has quietly made a business out of solving it for about forty years.

**NORA:** Welcome to Portfolio Deep Dives, the show where we take one company at a time and look at its business, its market, its challenges and where AI could take it next. I'm Nora.

**JAMES:** And I'm James. Our series follows the companies in the portfolio of Levine Leichtman Capital Partners, a private equity firm based in Beverly Hills, which we'll often call LLCP. Today it's AGDATA, a company in Charlotte, North Carolina, that manages sales data and rebate programmes for agricultural and animal health manufacturers.

**NORA:** The usual note before we begin. Everything we discuss comes from public sources as of November 2026: company pages, the private equity firm's announcements, trade press, and in one important case, a case study published by a vendor that worked with AGDATA. When a number comes from the company or a vendor, we'll flag it. When something is our opinion, we'll say so. And nothing here is investment advice.

**JAMES:** And as with a few companies in this series, AGDATA is private and fairly quiet in public. No published revenue from the company itself, no employee count, and very little dated news in the past two years. So we'll be clear about the gaps.

**NORA:** So, the one-sentence version. What is AGDATA?

**JAMES:** AGDATA collects sales transaction data from thousands of agricultural distributors and retailers, cleans it up, and uses it to run rebate and incentive programmes and provide market insight for the manufacturers who make crop inputs and animal health products.

**NORA:** And why is it interesting right now?

**JAMES:** Because, in my view, it has one of the clearest gaps we've seen in this series between the data a company holds and the products it has built on top of it. By its own figures it processes more than fifty-six million sales transactions a year and manages more than seven billion dollars of programme funds annually. Yet on its own website we found no AI product and no AI messaging at all. There is one interesting AI project in the background, though, and we'll get to it.

### Who AGDATA is and how it got here

**NORA:** Let's start with the basics. Where is AGDATA, and how big is it?

**JAMES:** It's headquartered in Charlotte, North Carolina. It was founded in 1985, so it's more than forty years old. The scale markers on its website are the most concrete numbers we have: more than fifty-six million sales transactions processed each year, more than eight thousand distributor and retailer data sources across North America, and more than seven billion dollars in programme funds managed each year. All of those are the company's own figures.

**NORA:** Revenue? People?

**JAMES:** Not disclosed by the company. There is one revenue reference, in a case study by an AI consultancy called KUNGFU.AI, which describes AGDATA as a seventy million dollar agricultural data firm. But that's a vendor's description, it's undated, and we couldn't verify it. So treat it as a rough indication at best. Employee count, we didn't find. Customer count, not stated.

**NORA:** Who are the customers?

**JAMES:** Manufacturers in two broad worlds. One is agribusiness, meaning crop inputs like seed, crop protection and specialty products. The other is animal health, both commercial livestock and companion animals like pets. AGDATA's website names two case studies: Corteva Agriscience, one of the large seed and crop protection companies, and Pet King Brands, which is in the pet health space.

**NORA:** And who runs it?

**JAMES:** When LLCP bought the company in October 2022, the announcement and press coverage named Heffy Provost as chief executive. We couldn't confirm that he's still in the role today, because the current website doesn't name any leaders. Before him, in 2016, Andy Zupsic was appointed chief executive, replacing Richard Bettison. And on the LLCP side, Josh Kaufman, a senior managing director, is named on the deal.

**NORA:** No leaders on the website. That's unusual.

**JAMES:** It's a bit unusual, and it's of a piece with the company's low profile. It also makes searching harder, because there are several unrelated companies with similar names, including one in the Czech Republic and one in Australia. If you go looking for AGDATA online, you'll trip over those.

**NORA:** Let's do the ownership history.

**JAMES:** It's a classic data-business story with three private equity owners. First, SFW Capital Partners owned AGDATA. We didn't find when they bought it. Then in July 2014, Vista Equity Partners, one of the best-known software investors, bought it from SFW. And in October 2022, LLCP bought it from Vista. Terms weren't disclosed. It was the second platform investment of LLCP's Lower Middle Market Fund Three.

**NORA:** So about eight years under Vista, and now four with LLCP.

**JAMES:** Right. LLCP's portfolio page gives September 2022 as the investment date, and the press release is dated the fourth of October, so call it autumn 2022. As of now, that's a little over four years.

**NORA:** What happened during the Vista years?

**JAMES:** One deal we found. In April 2016, AGDATA bought Focus Technology Group, which added animal health and specialty pet data. That's important, because it's likely a big part of how AGDATA became a player in animal health rather than only in crops. The same announcement named the new chief executive. And going back a bit further, in 2015 AGDATA appointed a president for Brazil, which tells you there was a push into Latin America at some point. We don't know how that went.

**NORA:** And any acquisitions under LLCP?

**JAMES:** None that we found, and the LLCP page lists none. That's notable, because buy-and-build is a common pattern across this portfolio. AGDATA appears to be growing on its own.

**NORA:** One more thing. Is there a theory about what a long Vista ownership might mean for the product?

**JAMES:** Only a theory, and I want to label it as one. Long private equity holds can be very good for profitability and discipline. Sometimes, though, they leave product modernisation for later. Given how quiet AGDATA is about new products, and how loud its competitors are, it's at least possible the platform has some catching up to do. That's an inference, not something we can prove from outside.

### The problem AGDATA solves

**NORA:** Let's get into the customer problem. Why does a seed company need someone else to tell it what it sold?

**JAMES:** Because, in agriculture, the manufacturer usually doesn't sell directly to the farmer. In general terms, the chain goes manufacturer to distributor, distributor to retailer, retailer to farmer. The manufacturer knows what it shipped to the distributor. What it often doesn't see clearly is what happened after that. Which store sold it, to which farm, in what quantity, and when.

**NORA:** And that matters because?

**JAMES:** Because so much money in this industry flows through incentives. Manufacturers run rebate programmes: sell this much of our product, hit these targets, and we'll pay you back a percentage. They run loyalty programmes for farmers. They fund marketing through the channel. AGDATA says it manages more than seven billion dollars of programme funds a year. To pay all of that out correctly, someone has to prove each sale happened, and match it to the right customer.

**NORA:** It sounds like accounting, but harder.

**JAMES:** It's accounting with very messy inputs. Every retailer and distributor has its own systems. One store writes "Smith Farms", another writes "J. Smith", a third uses a customer number. Product codes differ. Some send data weekly, some monthly, some in strange formats. AGDATA takes feeds from more than eight thousand sources and has to turn that into one clean, consistent picture.

**NORA:** So what happens if the data is wrong?

**JAMES:** Two kinds of pain. If a manufacturer overpays, money leaks out of the business. That might be an honest error, a duplicate claim, or occasionally something less honest. If a manufacturer underpays, or pays late, it damages relationships with the retailers and distributors it depends on. Retailers care a lot about getting paid promptly and correctly. So accuracy matters to both sides.

**NORA:** And beyond paying rebates?

**JAMES:** Insight. Once you have clean sales data across thousands of stores, you can answer questions that are commercially valuable. Where is our product gaining or losing share? Which regions are growing? Did that marketing programme actually move sales? AGDATA sells market intelligence on top of the data for exactly that reason. And a competitor's recent marketing talks about showing return on market funding, which tells you that question is on manufacturers' minds.

**NORA:** Let me push on the retailer's side for a moment. Why would a farm supply store bother sending its sales data to anyone?

**JAMES:** Good question, and it's central to the whole business. In general terms, the retailer sends data because that's how it gets paid. If a manufacturer's rebate programme says you earn money back when you sell our products, the manufacturer needs proof of the sales. The data feed is the proof. So the retailer has a strong reason to participate, as long as it's not too painful.

**NORA:** And painful how?

**JAMES:** Think about a family-run farm supply store with a small office. It may carry products from dozens of manufacturers, each with its own programmes, rules and deadlines. If every manufacturer wants data in a different format, through a different portal, that's a real burden. One of the values of a central data collector, in principle, is that the retailer sends its data once and it gets used for many programmes. That's our understanding of how this kind of model generally works, rather than a detail AGDATA publishes.

**NORA:** So AGDATA is serving two audiences. The manufacturer who pays, and the retailer who supplies the data.

**JAMES:** That's right, and it's a delicate balance. The manufacturer wants accuracy and control. The retailer wants simplicity and fast payment. If you lean too far towards the manufacturer, with lots of checks and delays, retailers get frustrated. If you lean too far the other way, the manufacturer worries about paying out money it shouldn't. A lot of the craft in this business is managing that tension.

**NORA:** And the farmer?

**JAMES:** Mostly invisible, but increasingly part of it through loyalty programmes. Manufacturers want to reward the growers who buy their products, and to know who those growers are. That's why matching sales to the right grower is so important. Get it wrong and the farmer misses a reward, or two farms get merged into one, which is the kind of mistake that loses trust quickly.

**NORA:** So two jobs. Pay incentives correctly, and understand the market.

**JAMES:** That's it. And both depend on the same foundation, which is matching messy records to the right real-world customers. Hold onto that, because it's where the AI story begins.

### Inside the platform

**NORA:** Walk me through how the platform actually works, as best we can tell.

**JAMES:** With a caveat that we're piecing it together from the website and the vendor case study. Step one is collecting data. Distributors and retailers send their sales transactions to AGDATA, more than fifty-six million a year by its count. Step two is cleaning and standardising: fixing product codes, formats and dates. Step three is matching: working out which grower, customer or distributor each record really refers to. Step four is applying the programme rules: given these sales, who has earned what rebate or incentive. And step five is reporting and payment, plus market insight for the manufacturer.

**NORA:** And the hardest step?

**JAMES:** Matching, almost certainly. That's what the AI case study was about. The case study describes the old process as a manual bottleneck, and its title talks about going from that bottleneck to eighty-seven percent automation.

**NORA:** Tell me about the case study.

**JAMES:** KUNGFU.AI, an AI consultancy, published two undated case studies about a project with AGDATA. They describe a grower-matching system: software that takes an incoming record and works out which known grower it belongs to. Technically, it uses what are called transformer embeddings, which is a way of representing text so that records that mean the same thing end up close together even when they're spelled differently. It has what they call tenant-aware constraints, meaning each manufacturer's data is kept within the right boundaries. And it uses tiered confidence, so high-confidence matches go straight through and uncertain ones go to a person.

**NORA:** And the results?

**JAMES:** According to the vendor, eighty-seven percent of assignments were automated at high confidence, and accuracy reached up to ninety-five percent on real-world test data. And it says the model was integrated into AGDATA's core data pipeline. I'll repeat the caveats: vendor-sourced, undated, and we couldn't verify it independently. But if it's broadly right, that's real AI doing real work in the heart of the business.

**NORA:** So AGDATA does use AI. It just doesn't talk about it.

**JAMES:** That's my read. The AI is inside the plumbing, not on the shop window. Customers benefit from faster, more accurate matching, but there's no AI product they can point to or pay extra for. In my view, that's both a strength and a missed opportunity.

**NORA:** What about security? That's a lot of sensitive commercial data.

**JAMES:** It is. The case study mentions the tenant-level permission controls. We also looked for a security certification on a primary company page and couldn't confirm one, so I won't claim it. For a business holding competitors' sales data side by side, strong security and clear boundaries between customers are fundamental.

### A rebate season, a hypothetical

**NORA:** Let's make it concrete. Invent a customer for me.

**JAMES:** Sure. A made-up mid-sized seed company. Let's call it Prairie Seed. It sells through about two hundred distributors and a couple of thousand retail locations. This season it runs a rebate programme: retailers who sell at least a set volume of its new soybean variety get a percentage back, and farmers who buy a bundle get a loyalty reward.

**NORA:** And the season starts.

**JAMES:** Retailers start selling. Each week or month, their systems send sales data to AGDATA. A store in Nebraska sends a file listing a sale to "Hansen Bros Farm". Another store, fifty miles away, lists a sale to "Hansen Brothers LLC". A third sends a customer number with no name. Are those the same farm? If yes, the farmer may have qualified for the loyalty reward across stores. If no, they're separate customers.

**NORA:** And in the old manual world?

**JAMES:** In the version the case study describes as a bottleneck, people review records like that, look things up and decide. Thousands upon thousands of them. It's slow, it's tedious, and every person makes judgment calls a little differently. During peak season, the backlog grows, and rebate payments wait.

**NORA:** And with the matching model?

**JAMES:** The model looks at the record, compares it with known growers, and says: this is Hansen Brothers, high confidence. Straight through. For the customer-number-only record, it might say: probably Hansen, medium confidence, send to a reviewer. The reviewer sees the suggestion and the reasons, confirms or corrects, and moves on. Instead of reviewing every record, people review the hard ones.

**NORA:** So then the rules run.

**JAMES:** Right. Once the sales are matched, the programme rules apply. This retailer sold enough to qualify; here's the rebate. This farmer bought the bundle; here's the reward. Prairie Seed's programme team sees a dashboard of what's owed and approves payment. Retailers get paid faster and more accurately. And Prairie Seed sees, across all its stores, which regions loved the new soybean variety and which didn't.

**NORA:** And where's the risk in that story?

**JAMES:** Two places. If the matching is wrong, money goes to the wrong place or a farmer misses a reward they earned, which is a customer service problem. And if a claim is inflated, deliberately or by mistake, and nobody catches it, Prairie Seed pays out money it shouldn't. That second one is the next big AI opportunity, and we'll come back to it.

### The market

**NORA:** Let's talk market. How big is this world?

**JAMES:** It depends which world you mean. For the specific market of agricultural rebate and channel data software, we didn't find a reliable size figure, so we won't give one. For animal health, which is one of AGDATA's end markets, there are figures, but they conflict wildly.

**NORA:** How wildly?

**JAMES:** One research firm, IMARC, puts the global animal health market at about forty billion dollars in 2025, rising to about fifty-two billion by 2034, which is under three percent growth a year. Another, Global Market Insights, puts the animal healthcare market at about two hundred and twenty-one billion dollars in 2025, growing at about six percent a year to 2035. That's roughly a five-fold difference, which almost certainly reflects different definitions of what's included.

**NORA:** So, big, and nobody agrees how big.

**JAMES:** Exactly. And it's the market AGDATA's customers operate in, not AGDATA's own market. What it tells you is that animal health is a large, steady industry. IMARC's split also says North America accounts for about forty-five percent of animal health revenue, and commercial animals, meaning livestock rather than pets, for about sixty-two percent. Those numbers come from that one research firm.

**NORA:** What drives demand for what AGDATA does?

**JAMES:** In general, three things. Manufacturers spend a lot on rebates and incentives, and that spend needs to be managed accurately. Manufacturers want cleaner data about their distribution channel, including who their end customers really are. And there's growing pressure to prove that incentive and marketing money actually works. If you spend hundreds of millions on channel programmes, your finance team will ask what you got for it.

**NORA:** And the buying behaviour?

**JAMES:** Our inference is that manufacturers buy on accuracy and visibility. Retailers and distributors, who are on the receiving end, care about speed of payment and how painful it is to submit data. And because the programmes are high-value, errors are costly, which means switching providers is a big, risky decision. That's good for an incumbent like AGDATA.

**NORA:** Is there a rhythm to this business? Farming is seasonal.

**JAMES:** In general, very much so, and it's worth thinking about. Crop input sales cluster around planting, and rebate programmes often settle after the season ends. So the data volume, the matching workload and the claims all tend to arrive in waves rather than evenly through the year. That's our inference about the industry, not a detail AGDATA publishes.

**NORA:** And waves are hard for a manual process.

**JAMES:** Exactly. If you staff for the peak, people are underused the rest of the year. If you staff for the average, the backlog builds at peak and payments slow down just when retailers are most anxious to be paid. Automation is especially valuable in seasonal businesses for that reason. Software doesn't mind if the volume triples for six weeks. It's one more reason the matching work matters so much.

**NORA:** So AI is as much about smoothing the peaks as cutting costs.

**JAMES:** That's a good way to put it. Faster, steadier service at the busiest time of year is something both manufacturers and retailers will notice.

### Competitors and the trend lines

**NORA:** Who does AGDATA compete with?

**JAMES:** We found a reasonably clear set. The most direct is Smartwyre, a venture-backed company with a ten and a half million dollar Series A, which sells a commercial data and incentive platform for agricultural inputs. It's very active. It launched products called Grower Compass in 2024, Demand Compass in 2025, and an insights platform called Compass in June 2026. In May 2026 it partnered with the Agricultural Retailers Association.

**NORA:** That's a lot of announcements.

**JAMES:** It is, and it's a contrast with AGDATA's quiet. Second is AgVend, which provides digital tools for agricultural retailers and claims to reach over thirty percent of North American ag retail, by its own count. In June 2025 it launched crop protection rebate tracking for retailers, which overlaps directly with AGDATA's retail-side tools.

**NORA:** And beyond the ag specialists?

**JAMES:** Enable, which is a general business-to-business rebate management software company working across manufacturers, distributors and retailers in many industries. In November 2023 it raised a one hundred and twenty million dollar Series D at a one billion dollar pre-money valuation. So it's well funded and horizontal, not an ag specialist. Then on the animal health data side, Kynetec, which does market research and sales data for animal health and agriculture. And S&P Global's commodity insights business, which publishes animal health market analysis and overlaps on analytics.

**NORA:** What are the big trend lines?

**JAMES:** I'd pull out four from the research. First, rebate and incentive management is moving from spreadsheets to software platforms, which is what AgVend and Smartwyre are pushing. Second, what you might call data health, cleaning and fixing channel data, is turning from a service into a product feature. Third, AI is entering this space not as chatbots but as matching and automation, and the clearest example we found is actually AGDATA's own grower-matching project. And fourth, competitors are using partnerships with industry associations to reach retailers directly.

**NORA:** So where does that leave AGDATA?

**JAMES:** In my view, with an incumbent's advantages, deep relationships with manufacturers, years of history and huge data volume, and an incumbent's risk, which is being out-marketed and out-shipped by younger, venture-funded rivals. The question is whether AGDATA turns its data and its quiet AI work into visible products before the competitors catch up on data.

### AI at AGDATA today

**NORA:** Let's do the reality check. Where is AGDATA with AI?

**JAMES:** Here's what we found. One substantial AI project, the grower-matching system described by KUNGFU.AI, with claimed results of eighty-seven percent automation and up to ninety-five percent accuracy, and described as integrated into the core pipeline. The case studies also suggest it began with an AI strategy assessment before the build. That's it for evidence.

**NORA:** And what didn't you find?

**JAMES:** No AI features or AI messaging on the AGDATA website, based on a crawl from June 2026. No AI hires that we could see. No AI partnerships announced by AGDATA itself, and no statements from the company about AI. And we couldn't date the KUNGFU work, so it may predate the current platform.

**NORA:** So how would you describe it?

**JAMES:** AI as infrastructure, not AI as product. AGDATA appears to have used AI to fix one of its hardest internal problems. That's genuinely more advanced than a lot of companies that talk about AI but haven't put it into a core workflow. But customers can't see it, buy it or point to it.

**NORA:** Can you explain the matching technology in plain terms? Embeddings, confidence tiers. What's actually going on?

**JAMES:** I'll try. Imagine every record, a name, an address, a customer number, a few product details, gets turned into a point on a giant map. The trick of embeddings is that records which mean the same thing end up close together on that map, even if the text is different. So "Hansen Bros Farm, Route 9" and "Hansen Brothers LLC, RR 9" land near each other, while a different Hansen two counties away lands further off.

**NORA:** And the model looks at the distance.

**JAMES:** Roughly, yes, plus other rules. If a new record lands very close to one known grower and far from everyone else, that's high confidence. If it lands between two known growers, that's low confidence, and a person should look. The confidence tiers are just a way of deciding, in advance, which bands go straight through and which go to a reviewer.

**NORA:** And tenant-aware?

**JAMES:** In software, a tenant is a customer whose data is kept separate from other customers'. AGDATA holds data for many manufacturers, some of them competitors. Tenant-aware constraints, as the case study describes them, mean the matching respects those boundaries. One manufacturer's programme data shouldn't leak into another's. In a business holding rival companies' sales data, that's not a nice-to-have. It's the foundation of trust.

**NORA:** Is ninety-five percent accuracy good enough?

**JAMES:** It depends what happens to the other five percent. If errors are caught by review, or are cheap to fix, it's very good. If errors flow straight into payments, you'd want the high-confidence band to be much more accurate than the average. That's exactly why the tiered design matters. The headline number from the vendor is up to ninety-five percent on test data, and I'd want to see the accuracy within the straight-through band before drawing conclusions.

**NORA:** Is that a problem? If the plumbing works, who cares?

**JAMES:** Fair challenge. For day-to-day operations, it's fine. It should make the business more efficient and more accurate. But there are three reasons I'd want more. One, competitors are marketing insight products, and customers compare. Two, a future buyer of AGDATA will pay more for a data business with products on top than for a data processor. And three, the data is unusually rich, and in my view it's underused.

**NORA:** Underused how?

**JAMES:** Think about it. Fifty-six million transactions a year, from eight thousand sources, across crops and animal health, over many years. That's a detailed picture of a whole slice of the farm economy. Manufacturers would love faster, sharper answers from that data. Right now, the public offer is market intelligence reports and programme management. An AI layer could make that data far more accessible.

### The challenges

**NORA:** Let's be specific about the challenges. What do you think AGDATA's leadership worries about?

**JAMES:** I'd name five. First, competition from better-funded and noisier rivals. Enable has raised large amounts, and Smartwyre and AgVend ship and announce constantly. Even if AGDATA's platform is strong, customers may perceive it as standing still.

**NORA:** Second?

**JAMES:** Second, data access. AGDATA's value depends on distributors and retailers sending it their data. If big retailers decide to share data directly with manufacturers, or a competitor offers retailers a better deal for their data, AGDATA's feeds could weaken. That's our inference, not something we've seen happening, but it's the structural risk in any business built on other people's data.

**NORA:** Third.

**JAMES:** Third, AI could cheapen the very thing AGDATA does. If cleaning and matching data becomes cheap with modern AI tools, then fees based on records processed or on services could come under pressure. Ironically, AGDATA's own success with matching shows how much automation is possible. The question is whether it captures the value or passes it on as lower prices.

**NORA:** Fourth.

**JAMES:** Visibility. No public leadership, no dated news in two years, no AI messaging. For a business selling to large manufacturers, a lot happens through relationships, so maybe it doesn't matter. But it makes the company harder to understand from outside, including for potential customers comparing vendors, potential hires, and eventually potential buyers.

**NORA:** And fifth?

**JAMES:** Customer concentration, which is an inference. In crop inputs, a handful of very large manufacturers account for a big share of the market, in general. If AGDATA's programme funds are concentrated in a few big customers, losing one would hurt. We don't have customer figures, so I'm flagging it as a question rather than a fact.

**NORA:** And the ownership clock?

**JAMES:** A little over four years into LLCP's ownership. In general terms that's the middle to later part of a typical private equity hold. So the next couple of years matter for the story any future buyer will hear.

### Opportunities

**NORA:** Let's get to opportunities. If you were on the board, where would you push?

**JAMES:** First, finish and extend the matching work. If grower matching is already largely automated, extend the same approach to customer and distributor records across every programme and every data source. The value is fewer hours on manual review, faster onboarding of new data sources, and faster payments. That's the foundation for everything else.

**NORA:** Second?

**JAMES:** Anomaly detection on rebate claims and payouts. That's software that spots claims that look unusual: a retailer whose volumes suddenly jump, a claim that duplicates another, a sale that doesn't fit the pattern. With more than seven billion dollars a year flowing through programmes, small improvements matter. Just as arithmetic, not a forecast: every tenth of a percent of leakage on seven billion dollars is about seven million dollars a year.

**NORA:** That's a powerful way to put it.

**JAMES:** It's the kind of number a manufacturer's finance team understands immediately. Though I want to be clear we have no evidence of how much leakage there actually is. It's an illustration of scale.

**NORA:** Third?

**JAMES:** An AI insight layer for manufacturers. Imagine a brand manager at a seed company asking in plain language: how did our new variety sell in the western corn belt compared with last year, and which retailers drove the difference? And getting an answer grounded in AGDATA's data, in seconds. That's where Smartwyre's Compass positioning is heading, so AGDATA would be answering a competitive move.

**NORA:** What would make that insight layer trustworthy? Brand managers aren't data scientists.

**JAMES:** Three things, in my view. First, it should show its working: which data it used, which period, which regions, and how many records. Second, it should say when the data is thin. If only a handful of retailers in a region send data, the answer should come with a warning. Third, it has to respect confidentiality between customers. A manufacturer should see insight about its own products and the market in aggregate, never a competitor's specific numbers.

**NORA:** And would it replace the market intelligence reports?

**JAMES:** I'd see it as making them interactive. Today, in general, a report answers the questions someone anticipated. An assistant answers the question the brand manager actually has on a Tuesday afternoon. Both have a place. But the second is far more likely to be used every week, and in software, usage is what drives renewal and upsell.

**NORA:** And commercially?

**JAMES:** Pricing is the fourth opportunity. Moving from data services and project-style pricing towards software tiers, priced per transaction or per programme, which is how competitors like Enable and Smartwyre tend to sell. That's an inference about AGDATA's current pricing, but the direction makes sense. Recurring software revenue is generally valued more highly than services.

**NORA:** Fifth?

**JAMES:** Cross-selling. Market intelligence to programme customers who don't have it. Animal health data to crop customers who also have animal health businesses, or the other way round. And geographic expansion, building on the earlier Brazil push and existing North American coverage into Canada and Latin America. And finally M&A: tuck-ins in data cleaning, retailer point-of-sale data feeds, or animal health data, following the precedent of the 2016 Focus Technology Group deal.

**NORA:** That's a long list. If you had to sequence it?

**JAMES:** Matching first, because it feeds everything. Anomaly detection second, because it's measurable in dollars. The insight layer third, because it's the visible product that changes perception. And pricing changes alongside the new products, not before them.

### The best AI bet and the first 100 days

**NORA:** So one AI bet for the next eighteen months. What is it?

**JAMES:** I'd frame it as one programme with two stages. Stage one is automated matching across all grower, customer and distributor records, with confidence tiers and human review for the exceptions. It's already proven at AGDATA for growers, according to the vendor. Stage two, on the same foundation, is anomaly detection on claims and payouts. Matching tells you who; anomaly detection tells you whether it looks right.

**NORA:** Why not lead with the shiny insight product?

**JAMES:** Because the insight product is only as good as the matching underneath. If you ask an AI assistant which retailers drove growth, and half the sales are matched to the wrong retailer, you get confident nonsense. Fix the foundation, then build the house.

**NORA:** Give me the first hundred days.

**JAMES:** Days one to thirty: measure where you are. How many records still go to manual review, by programme and by data source? How long does it take to onboard a new source? How long from sale to rebate payment? And pick two or three manufacturer customers as design partners for anomaly detection, ideally ones with large programmes and a history of disputes.

**NORA:** Days thirty to sixty?

**JAMES:** Extend matching to the next biggest category of records, probably distributor and retailer customer records, using the same confidence-tier design. In parallel, build a first anomaly model on historic claims for the design partners, looking for duplicates, sudden volume jumps and claims that don't match shipment patterns. Run it in shadow mode, flagging but not blocking, and have the programme teams review every flag.

**NORA:** And sixty to a hundred?

**JAMES:** Report results. For matching: percentage automated, accuracy, review hours saved, onboarding time. For anomaly detection: how many flags, how many turned out to be real issues, and the dollar value. If the numbers are good, decide how to package anomaly detection, ideally as a paid product tier. And at day one hundred, put a date on the insight layer, now that the foundation is measured.

**NORA:** Who owns it?

**JAMES:** One accountable leader with both data engineering and product authority. We didn't see a public AI or product leader, so this might mean a hire. And I'd keep a close line to the programme operations team, because they know where the errors really come from.

**NORA:** What about the retailers? They're not the paying customer, but they're the ones sending data.

**JAMES:** Really important point. If anomaly detection starts flagging retailers' claims, retailers will feel accused. So the design has to be fair and transparent: clear reasons for flags, fast resolution, and no automatic penalties without human review. The goal is accuracy, not suspicion.

### A suspicious claim, a hypothetical

**NORA:** Let's do a second walk-through, on anomaly detection. Same made-up company?

**JAMES:** Same Prairie Seed. It's the end of the season, and rebate claims are coming in. Among thousands of claims, there's one from a retailer we'll call Valley Farm Supply. Its sales of the new soybean variety in the last month of the programme are four times the previous months, just enough to cross the threshold for the top rebate tier.

**NORA:** Suspicious.

**JAMES:** Maybe. Maybe not. Maybe a big farm client switched to them. That's the point. In the old world, a claim like that might slip through in the crowd, or a sharp-eyed analyst might spot it by luck. With anomaly detection, the system flags it: unusual volume jump near a threshold, compared with this retailer's history and with similar retailers in the region.

**NORA:** And then?

**JAMES:** A reviewer at Prairie Seed sees the flag and the context. The matching layer shows that most of the new sales went to one farm, and that farm, matched across records, also bought from two other stores. Now there are two possibilities. Either the farm consolidated its buying, which is fine. Or sales are being shifted between stores to hit thresholds, which the programme rules might not allow.

**NORA:** So the AI doesn't decide. It points.

**JAMES:** Exactly. A person calls the retailer, asks, and resolves it. Most flags will have innocent explanations, and that's fine. What matters is that the expensive ones get looked at. And over time, the patterns teach Prairie Seed how to design better programme rules, for example smoothing thresholds so there's less incentive to game them.

**NORA:** That's a nice second-order benefit.

**JAMES:** It's one of the most valuable. Better data doesn't just catch problems; it improves the programmes themselves. And that brings us back to the insight layer. Once matching is clean and anomalies are understood, Prairie Seed's brand team can ask much richer questions about what their incentive money is actually buying.

**NORA:** And for the farmer at the start of our story?

**JAMES:** He probably never knows any of this happened. Except that his loyalty reward arrives on time and correct, because his three different spellings were all recognised as him. In this business, invisible is good.

### Lessons for other businesses

**NORA:** Let's step back. What can other businesses learn from AGDATA?

**JAMES:** Four lessons. First, the best first AI project is often the boring bottleneck. AGDATA, or at least the vendor's account of it, didn't start with a chatbot. It started with matching records, a tedious manual job at the centre of the business. That's where AI pays off quickly and reliably.

**NORA:** Second?

**JAMES:** Second, design for confidence, not perfection. The matching system works because it knows when it's sure and when it isn't. High confidence goes straight through; low confidence goes to a person. Lots of companies stall on AI because they wait for perfect accuracy. Tiered confidence lets you get value at ninety-something percent while keeping humans on the hard cases.

**NORA:** Third?

**JAMES:** Third, don't hide your AI. If you've built something that works, tell customers, and think about how it becomes part of what they buy. Quiet competence is admirable, but in a market where competitors are loud, it can look like standing still. And value that customers can't see is value they won't pay for.

**NORA:** And fourth?

**JAMES:** Fourth, data businesses should ask what decisions their data could support, not just what reports it could produce. AGDATA's data could help manufacturers decide how to design programmes, where to invest and which partners to back. Moving from reporting to decision support is where data businesses increase their value.

**NORA:** I'd add one: watch who controls your inputs.

**JAMES:** Very good. Any business built on data from third parties should know exactly why those third parties send it, and what would make them stop. For AGDATA, that means keeping distributors and retailers happy too, not just the manufacturers who pay.

**NORA:** Is there a lesson in the ownership story?

**JAMES:** Maybe this. When a company passes from one private equity owner to the next, the new owner inherits whatever product investment the previous one did or didn't make. Our guess is that part of the job in this hold is turning a solid data operation into a visible product company. That's a common pattern in mature data businesses.

### Risks and what to watch

**NORA:** Let's do the risks list.

**JAMES:** One, AI-native rebate and data platforms taking the retail and claims workflow, eroding AGDATA's fees. Two, data access, if retailers or manufacturers build their own data sharing or switch providers. Three, AI cheapening cleaning and matching, which compresses services-style fees. Four, customer concentration in a market dominated by a few big manufacturers. And five, being out-marketed by younger rivals even if the underlying platform is strong.

**NORA:** Let's go deeper on data access, because it seems like the existential one.

**JAMES:** I think it is the most fundamental. AGDATA's position rests on a network of more than eight thousand data sources. Each of those relationships exists because it's useful to the retailer or distributor. If a competitor like AgVend, which works directly with retailers, makes it easier for retailers to manage their own programme data, the centre of gravity could shift towards the retailer's own systems. Then the question becomes who the retailer sends data to, and on what terms.

**NORA:** So it's a battle for the retailer's attention.

**JAMES:** In part, yes. That's our inference from the competitors' strategies. Smartwyre partnering with the Agricultural Retailers Association, AgVend building tools for retailers, both point at the same thing: reaching the retail end of the chain directly. AGDATA's defence is its depth with manufacturers, who set the programme rules. But it would be wise, in my view, to make life easier for retailers too, for example faster payment, simpler submissions and a clear view of what they're owed.

**NORA:** Could AI help there?

**JAMES:** Definitely. The same matching technology that cleans data for manufacturers can make it easier for retailers to submit messy data without being rejected. If AGDATA becomes the easiest place for a retailer to get paid, that's a strong defence.

**NORA:** And for the owners?

**JAMES:** Showing a product story within the hold. A buyer will look at the data volume and say: impressive. Then ask: what do you build on it, and how fast is it growing? Having measurable AI results, like automation rates and dollars recovered from anomalies, would make that story much stronger.

**NORA:** What should listeners watch?

**JAMES:** Four things. First, whether AGDATA announces any AI product or feature publicly, especially anomaly detection or an insight assistant. Second, whether it makes its first acquisition under LLCP. Third, whether Smartwyre, AgVend or Enable win visible manufacturer customers in AGDATA's core segments. And fourth, any public sign of leadership, a named product or technology leader, which would suggest investment in the product side.

**NORA:** And Kynetec on the animal health side?

**JAMES:** Worth watching too. Animal health data is moving towards sales and veterinary transaction data, and Kynetec appears to be active there. If AGDATA wants to grow in animal health, that's the competitive front.

### Quick-fire round

**NORA:** Quick-fire round. Short answers.

**JAMES:** Go.

**NORA:** Is AGDATA a software company or a data company?

**JAMES:** A data company with software around it. The opportunity is to become more of a product company.

**NORA:** Most valuable asset?

**JAMES:** More than fifty-six million transactions a year from more than eight thousand sources, by its count.

**NORA:** Biggest weakness?

**JAMES:** Its AI and products are invisible from the outside.

**NORA:** Best AI evidence?

**JAMES:** The grower-matching system, eighty-seven percent automated, according to the vendor that built it.

**NORA:** Biggest AI bet?

**JAMES:** Matching everywhere, then anomaly detection on claims.

**NORA:** Biggest competitor?

**JAMES:** Smartwyre, for pace and positioning. Enable, for money.

**NORA:** One thing an ag manufacturer should do this quarter?

**JAMES:** Ask how much of your incentive spend you can actually trace to a verified sale and a real customer. If you don't know, start there.

**NORA:** Optimist or pessimist?

**JAMES:** Optimist on the asset, cautious on the pace. The data is there. The question is speed.

### Wrap-up

**NORA:** Let me try a summary. AGDATA is a Charlotte-based company, founded in 1985, that collects sales data from thousands of agricultural distributors and retailers and uses it to run rebate programmes and provide market intelligence for crop input and animal health manufacturers. By its own figures it handles more than fifty-six million transactions and more than seven billion dollars of programme funds a year. It has passed through three private equity owners, most recently LLCP since autumn 2022. It has at least one serious AI project behind the scenes, an automated grower-matching system that a vendor says handles eighty-seven percent of cases, but no visible AI product. Competitors like Smartwyre, AgVend and Enable are moving fast. Its best opportunity is to extend matching across all its data, add anomaly detection on billions in claims, and then build an insight layer customers can see and pay for.

**JAMES:** That's it. And the wider lesson is that a company can be good at AI and still not get credit for it. The work isn't finished until customers can see the value.

**NORA:** Next time on Portfolio Deep Dives, episode nine: Blue Ridge ESOP Associates, the company behind the paperwork of employee ownership, which has just hired its first chief technology officer to lead technology and AI.

**JAMES:** See you then.

[OUTRO MUSIC]
