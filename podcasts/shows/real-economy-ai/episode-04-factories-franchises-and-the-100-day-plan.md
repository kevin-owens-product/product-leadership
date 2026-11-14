# Episode 4: Factories, Franchises, and the 100-Day Plan
## "Industrial and Consumer AI, Data Rights, and a Plan a Fund Can Run"

**Duration:** ~50 minutes
**Hosts:** Maya & Grant
**Podcast:** AI in the Real Economy

---

### Cold open

[INTRO MUSIC]

**GRANT:** On a production line, a camera spots a hairline crack in a casting that a tired inspector would have missed at the end of a double shift. In a franchise system three hundred miles away, a forecasting model tells a store manager to prep fewer salads because rain is coming.

**MAYA:** Neither of those is a headline. Both of them are money. The crack that's caught on the line costs a few dollars of scrap. The same crack caught by a customer costs a warranty claim, a recall investigation, and maybe the customer. The salads that weren't made don't end up in the bin.

**GRANT:** Welcome to the season finale of AI in the Real Economy. I'm Grant.

**MAYA:** I'm Maya. Today we cover industrial and consumer businesses. The factory floor, from quality to maintenance to quoting. Then restaurants, retail and franchise systems, where the franchisor doesn't control the store. Then the data rights issue that can sink a deal. And then we pull the whole season together into a hundred-day plan that a fund could actually run.

**GRANT:** It's a long one, so let's get going.

---

### The factory floor: why the gap

**MAYA:** Manufacturing first. We mentioned the Parsec survey in episode one. Seventy two percent of manufacturers have adopted AI in some form, but only ten percent at scale. Why the gap?

**GRANT:** The survey's top barriers were implementation cost, data privacy and security, and integration with existing systems. On the floor, that usually means the data lives in a mix of machine controllers, spreadsheets and a twenty-year-old ERP, and nobody owns getting it into one place.

**MAYA:** Make that concrete for someone who's never been inside a mid-sized plant.

**GRANT:** Picture a company that makes precision metal parts for industrial customers. Two plants, a few hundred people. The machines on the floor come from different decades and different manufacturers. Some of them report data over a network. Some have a screen that an operator reads and writes down on a clipboard. Production schedules live in the ERP, but the real schedule lives in the plant manager's head and a whiteboard. Quality records are partly in a quality system and partly in spreadsheets. Maintenance logs are in a separate system, or on paper.

**MAYA:** So the first problem isn't AI at all.

**GRANT:** The first problem is visibility. You can't predict a machine failure if you can't see the machine. You can't optimize a schedule if the schedule isn't in a system. That's why so many manufacturing AI programs start as data projects. Connecting machines, putting sensors on the critical ones, and getting quality and maintenance records into a form that software can read.

**MAYA:** And that's expensive.

**GRANT:** It can be, which is why you don't do it everywhere at once. You pick the line or the machine where the money is, and connect that first. A bottleneck machine, where every hour of downtime costs the whole plant output. Or the line with the worst scrap rate. Or the product family with the most warranty claims.

**MAYA:** And the people side in a plant?

**GRANT:** Plants have a strong culture, and often a unionized workforce, and they've seen a lot of improvement programs come and go. Operators and maintenance technicians know things about the machines that no sensor does, like the sound a spindle makes before it fails. The programs that work treat those people as experts whose knowledge the system is trying to capture, not as people the system is replacing.

---

### Quality first

**MAYA:** And the use cases that work?

**GRANT:** Quality control was the top use case in that survey, and it's where I'd start too. Vision systems that inspect parts, flag defects and learn from the inspectors' decisions. The value is direct: less scrap, fewer returns, fewer warranty claims.

**MAYA:** How does a vision inspection project actually go?

**GRANT:** You start with one inspection point that's painful. Say, a final visual inspection where people look at every part for scratches, cracks or missing features. It's tiring, inconsistent across shifts, and it's a bottleneck. You install cameras and lighting, which matters more than people expect. You collect images of good parts and bad parts, labeled by your best inspectors. You train a model, often using a vendor's platform, so you're not building it from scratch. And then you run it alongside the human inspectors for weeks, comparing results, before anyone relies on it.

**MAYA:** Why so long alongside humans?

**GRANT:** Because the bad parts are rare. If one part in a thousand has a crack, you need a lot of production to see enough cracks to know the system catches them. And the cost of a missed defect is usually much higher than the cost of a false alarm. So you tune it to be cautious, flag anything suspicious for a person to check, and tighten it over time.

**MAYA:** And then the human inspectors do what?

**GRANT:** They become the second line. They check what the system flags, which is a much smaller pile. They handle new product variants that the system hasn't learned yet. And their decisions feed back into the training data. In good implementations, inspectors become the system's teachers, and that's a better job than staring at parts for eight hours.

**MAYA:** What's the measurable value?

**GRANT:** Scrap rate, rework rate, customer returns, warranty cost, and inspection labor per part. And one more that's easy to miss: the speed of finding the cause. When the vision system logs every defect with an image and a timestamp, you can see that cracks spike on second shift on one machine, and fix the root cause upstream. That's where the big savings are, because preventing defects is cheaper than catching them.

**MAYA:** And beyond vision?

**GRANT:** Process quality. Using data from the machines themselves, like temperatures, pressures and speeds, to predict when the process is drifting toward producing bad parts, before the bad parts appear. That's harder, because it needs connected machines and a good history, but in processes like plastics molding, chemicals or food production, it can be very valuable.

---

### Maintenance that's planned

**MAYA:** Next is maintenance.

**GRANT:** Predicting when a machine is about to fail from vibration, temperature and run-time data, so you fix it on a planned shutdown instead of an unplanned one. There's a whole industry of vendors, like Augury, that sell sensors and software for this, often on a subscription that includes the analysis.

**MAYA:** Why does planned versus unplanned matter so much?

**GRANT:** Because unplanned downtime is expensive in several ways at once. The machine stops, so the line stops, so you miss shipments or run overtime to catch up. The repair costs more, because you're paying for rush parts and an emergency call-out. Sometimes the failure damages other parts of the machine. And customers lose confidence if you're late. A planned repair at the weekend, with the part already in stock, avoids almost all of that.

**MAYA:** How would you size it?

**GRANT:** Pull a year of maintenance and production records. For the critical machines, how many hours of unplanned downtime, and what did each hour cost in lost output, overtime and expediting? Then ask how many of those failures gave warning signs, which you can often tell from the type of failure. Bearings, motors, pumps and gearboxes usually give warning signs in vibration and temperature. Software failures and operator errors usually don't. That's your addressable pool.

**MAYA:** And the trap?

**GRANT:** Putting sensors everywhere and alerts nobody acts on. The value of a prediction is zero unless someone schedules the repair. So the workflow matters more than the model. Who receives the alert, how it becomes a work order, whether the part is in stock, and whether the production schedule can make room for the repair. Start with a handful of critical machines, make the workflow work, then expand.

**MAYA:** What about the maintenance team's knowledge?

**GRANT:** That's the other big opportunity. A lot of plants rely on a few senior maintenance technicians who know every machine. When they retire, the knowledge leaves. AI assistants that let a technician ask questions of the machine manuals, the maintenance history and the notes from past repairs, by voice, standing next to the machine, can capture some of that knowledge. And the senior technicians can help build it before they go, which is a good way to honor what they know.

---

### Planning, supply chain and the quote

**MAYA:** And off the floor?

**GRANT:** Supply chain and planning, which was the third most common use case. Demand forecasting, inventory levels, supplier risk. For a mid-sized manufacturer, better forecasting means less money tied up in raw materials and finished goods, fewer stockouts, and fewer rush orders. That's the working capital lever from episode one, and finance teams love it.

**MAYA:** And supplier risk?

**GRANT:** The last few years taught manufacturers how fragile supply chains are. Tariffs, shipping disruptions, a single supplier going out of business. AI can monitor news, supplier financial signals and delivery performance, and flag risks early. It can also help with the very practical job of reading supplier contracts and finding which ones have price escalation clauses or tariff terms, which has become urgent for a lot of companies.

**MAYA:** And then the commercial side that people forget.

**GRANT:** Quoting. Many mid-sized manufacturers take days to quote a custom job because one engineer has to read the drawings, work out the materials, the machining steps and the time, and price it. That engineer is often the bottleneck for the whole sales process.

**MAYA:** And AI can do what, exactly?

**GRANT:** AI that drafts the quote from the drawing and past jobs can turn days into hours. It reads the drawing, finds similar parts the company has made before, pulls their actual costs and times, and proposes a price and a routing for the engineer to check. The engineer still owns the quote, but they're editing instead of starting from a blank page.

**MAYA:** Why is speed so valuable?

**GRANT:** Because the fastest quote often wins. A buyer who sends out a request to five suppliers will often go with a good-enough price that arrives first. And faster quoting means you can quote more jobs, including smaller ones you'd previously have declined because they weren't worth the engineer's time. Track quote turnaround time, quotes per engineer, win rate, and margin on won jobs, because you want to make sure faster quotes aren't cheaper quotes.

**MAYA:** Any other commercial use?

**GRANT:** Customer service in manufacturing looks a lot like business services. Order status questions, document requests like certificates of conformity, returns and complaints. AI can answer the routine ones from the ERP and route the rest. And sales teams can use AI to prepare for customer meetings, track opportunities and find customers who haven't ordered in a while.

---

### Safety and the rules for physical things

**MAYA:** Any caution specific to factories?

**GRANT:** Safety. Anything that touches a physical process needs the same engineering discipline as any other change on the line. Management of change procedures, risk assessments, testing, and sign-off by people qualified to sign off. If an AI system adjusts machine settings on its own, that's a control system change, and it should go through the same process as any other control system change.

**MAYA:** Most early uses don't touch the machine directly, though.

**GRANT:** Most don't, and that's a good reason to start there. Inspection that flags parts for a human, maintenance predictions that create work orders, and quoting are all advisory. A person acts on them. Closed-loop control, where the AI changes the process directly, can be valuable, but it's a later step and needs much more rigor.

**MAYA:** And the regulation?

**GRANT:** Under the EU AI Act, AI embedded in regulated products falls under the product rules, which now apply from August 2028 after this year's delay. For machinery specifically, this year's deal largely leaves AI to the EU's new Machinery Regulation, which applies from January 2027 and explicitly addresses machinery with self-evolving behavior and safety functions that rely on software. The deal also narrowed what counts as a safety component, so AI used only for something like quality inspection isn't high-risk just because it sits inside a regulated product, unless its failure could endanger health or safety. If your portfolio company sells equipment into Europe with AI features, that's a product roadmap and certification question, not just an IT one.

**MAYA:** And in the US?

**GRANT:** The usual product liability and workplace safety rules apply. There's no single federal AI law for machinery, but if an AI feature contributes to an injury, the questions will be familiar ones: was the product reasonably safe, were the risks assessed, were users warned and trained. Document your safety reasoning for AI features the same way you would for any other feature.

---

### Keystone Components: sizing a plant

**MAYA:** Let's do the math for a made-up manufacturer. Keystone Components, precision machined parts, two plants, a hundred and twenty million dollars in revenue, about five hundred people.

**GRANT:** Start with quality. Suppose Keystone's scrap and rework run at three percent of cost of goods, and its cost of goods is eighty million. That's two point four million dollars a year. Customer returns and warranty claims add another half a million. If vision inspection and better root-cause analysis cut scrap and rework by a quarter on the lines where it's deployed, and those lines are half the volume, that's around three hundred thousand dollars a year from the first phase, rising as it spreads. Plus the returns avoided, plus the customer goodwill.

**MAYA:** That's less dramatic than I expected.

**GRANT:** Good, because it's honest. Quality improvement in a well-run plant is incremental. The bigger number is often maintenance. Suppose the bottleneck machines in plant one had two hundred hours of unplanned downtime last year, and each hour of bottleneck downtime costs about five thousand dollars in lost contribution, overtime and expediting. That's a million dollars. If predictive maintenance on those machines prevents even a third of those hours, it's over three hundred thousand dollars, on a handful of machines.

**MAYA:** And quoting?

**GRANT:** Quoting might be the biggest. Suppose Keystone quotes two thousand jobs a year, wins twenty percent, and the average job is worth sixty thousand dollars. Quote turnaround is four days. If AI-assisted quoting cuts that to one day, and the faster response lifts the win rate from twenty to twenty two percent, that's forty more jobs, or two point four million dollars in revenue. At a contribution margin of thirty percent, that's over seven hundred thousand dollars of profit, from a two-point change in win rate.

**MAYA:** And you'd hold that one to account how?

**GRANT:** Carefully, because win rates move for many reasons. Track turnaround and win rate by customer segment, compare with the period before, and look at whether the jobs you're winning have the margins you expected. If faster quotes are winning because they're underpriced, that's not a win.

**MAYA:** And inventory?

**GRANT:** If Keystone carries twenty million dollars of inventory and better forecasting and planning cut that by ten percent, that's two million dollars of cash released. Not profit, but cash, which the fund will notice. So four workflows: quality, maintenance, quoting, inventory. Four ranges, four owners: the quality manager, the maintenance manager, the sales director and the supply chain manager.

---

### Consumer and franchise

**MAYA:** Consumer businesses next. Restaurants, retail, franchise systems, consumer services like fitness, car washes or personal care.

**GRANT:** The big levers are forecasting, labor scheduling, marketing and customer service. Forecasting demand by store and by day drives food waste, inventory and staffing. Scheduling labor to that forecast is often the single biggest controllable cost. Marketing gets cheaper and more personal with AI-generated campaigns. And customer service, from order issues to booking, follows the same pattern as the phone in episode two.

**MAYA:** Let's take forecasting and labor together.

**GRANT:** In a restaurant, a store manager decides each week how many people to schedule for each shift, and each morning how much food to prep. Usually from experience and last year's numbers. AI forecasting uses sales history, weather, local events, holidays, promotions and even school calendars to predict demand by hour, and turns that into a suggested schedule and prep list. Too many staff on a quiet afternoon is wasted labor. Too few on a busy evening means long waits, lost sales and stressed staff.

**MAYA:** And the big chains are investing heavily.

**GRANT:** They are. Yum Brands, which owns KFC, Taco Bell and Pizza Hut, has built a platform it calls Byte by Yum, covering online ordering, kitchen and delivery management, inventory and labor, and it announced a partnership with Nvidia last year to develop AI for its restaurants, including voice ordering and operations tools. Yum's scale lets it build. A mid-sized franchise system, the kind private equity often owns, will mostly buy, but the categories are the same.

**MAYA:** And voice ordering, after the eighteen thousand waters?

**GRANT:** It's still being rolled out across the industry, but more carefully. As we mentioned in episode one, Yum said on its latest earnings call that more than nine hundred Taco Bell restaurants now use voice AI in the drive-thru, so the company clearly decided the answer was to keep going and get it right, not to stop. The lesson from Taco Bell's experience, as reported, was to think about when AI takes the order and when a person does, especially at busy times. Voice ordering in a drive-thru is harder than a phone call, because of background noise, cars, kids in the back seat, and people who change their minds. It can work well, and it can upsell consistently, which humans often don't. But it needs limits, monitoring and an easy way for staff to take over.

**MAYA:** And marketing.

**GRANT:** Consumer businesses spend heavily on marketing, and AI makes two things cheaper: producing content and personalizing it. Instead of one email to every loyalty member, you can send offers based on what each customer actually buys and when. Instead of a photo shoot for every promotion, you can produce many variations of creative and test them. The cautions are brand consistency, honesty in advertising, and privacy, especially for loyalty data.

---

### The franchise twist

**MAYA:** Franchise systems have a twist, though.

**GRANT:** They do. The franchisor doesn't control the store. The franchisee owns the business, employs the staff and makes the day-to-day decisions. So AI value depends on whether franchisees adopt the tools. And franchisees are independent business owners who are skeptical of anything that costs them money and was designed at headquarters.

**MAYA:** So how do you get adoption?

**GRANT:** The best approach I've seen is to treat AI as part of the franchise offer. Build it into the system the franchisor already provides, like the point of sale, the ordering platform or the operations app, so it's not a separate tool to buy and learn. Show franchisees the results from a few early stores, ideally stores run by respected franchisees, with real numbers on food cost and labor. And make it easier to use than not. If the AI schedule shows up already built and the manager just has to approve it, adoption follows.

**MAYA:** What about mandating it?

**GRANT:** Mandating it rarely works, and depending on the franchise agreement, the franchisor may not be able to. Even when it can, a mandated tool that franchisees resent will be used badly. Better to make it the obvious choice and let the results spread through the franchisee network, which is a powerful word-of-mouth channel.

**MAYA:** And who pays?

**GRANT:** That's often the real negotiation. Technology fees are a sensitive topic with franchisees. The cleanest model is when the tool pays for itself visibly in the franchisee's own profit and loss, like reduced food waste or labor hours, and the fee is a fraction of that saving. If the franchisor can show that clearly, the fee conversation gets much easier.

**MAYA:** And the data?

**GRANT:** Franchise systems have a data advantage that independents don't. Hundreds of stores, all on the same systems, generating comparable data. That lets the franchisor build better forecasts and benchmarks than any single store could. The franchise agreement should be clear about who owns that data and how it can be used, which brings us to our next topic.

---

### Retail and consumer services

**MAYA:** We've talked restaurants. What about retail and consumer services?

**GRANT:** Retail's big levers are inventory and pricing. Inventory, because the wrong stock in the wrong store is either a lost sale or a markdown. AI forecasting by item and by store, combined with smarter replenishment, can reduce both. For a specialty retailer with hundreds of stores, a small improvement in in-stock rates on bestsellers and a small reduction in end-of-season markdowns adds up to real margin.

**MAYA:** And pricing?

**GRANT:** Pricing is powerful and sensitive. Markdown optimization, meaning deciding when and how much to discount slow-moving stock, is a well-established use and fairly safe. Personalized pricing, where different customers see different prices for the same thing, is a different matter. It can damage trust quickly, and regulators and state lawmakers have been paying attention to what's sometimes called surveillance pricing. My advice for a consumer business is to be very cautious with individualized prices, and to be able to explain any pricing logic in plain language.

**MAYA:** And consumer services, like gyms, car washes, salons?

**GRANT:** Many of those are membership businesses now, which private equity loves for the recurring revenue. The AI levers are booking, retention and labor. Booking, because a lot of appointments still come by phone, with the same missed-call problem as home services. Retention, because models can spot members who are about to cancel, from declining visits for example, so the business can reach out before they leave. And labor scheduling to demand, same as restaurants.

**MAYA:** Any caution on retention?

**GRANT:** One big one. Making it hard to cancel is not a retention strategy, and it's increasingly a legal problem. Regulators in the US have taken action against subscription businesses with difficult cancellation processes, and several states have rules requiring easy online cancellation. Use AI to give people a reason to stay, not an obstacle course to leave.

---

### The store manager's day

**MAYA:** Let's make the franchise side concrete. What does the store manager's day look like when this works?

**GRANT:** Before opening, the manager opens the operations app and sees today's forecast by hour, already adjusted for the rain and the high school football game. The prep list is built from the forecast. The labor schedule for next week is drafted, and it flags two shifts where the manager's usual pattern would leave the store short. The manager moves one person and approves it in five minutes, instead of spending an hour on Sunday night with a spreadsheet.

**MAYA:** And during the day?

**GRANT:** Inventory counts are quicker, because the system knows what should be on the shelf and only asks the manager to count the items where the numbers look off. Orders to the distributor are suggested automatically. If a refrigerator's temperature drifts, a sensor alert reaches the manager's phone before the food is lost. And customer complaints from the app or the website arrive already summarized, with a suggested response and a refund within the manager's authority.

**MAYA:** None of that is dramatic.

**GRANT:** None of it is dramatic, and that's the point. It's an hour or two of a manager's time each day moved from paperwork to running the floor, coaching staff and looking after customers. In a business where manager turnover is high and good managers are the difference between a great store and a bad one, that matters a lot.

**MAYA:** And how does the franchisor know it's working?

**GRANT:** Compare stores that adopted the tools with similar stores that haven't yet, on food cost as a share of sales, labor as a share of sales, speed of service, customer complaints and manager turnover. If the adopters are clearly better after six months, that comparison becomes the best sales tool for the rest of the franchisees.

---

### Brand risk

**MAYA:** And there's a brand risk.

**GRANT:** Every customer-facing AI speaks for the brand. A wrong answer about allergens or a refund policy is a brand problem, and in some cases a legal one. There's a well-known case from Canada in 2024. Air Canada's website chatbot gave a customer wrong information about bereavement fares. The customer relied on it, and a tribunal held the airline responsible for what its chatbot said, rejecting the argument that the chatbot was somehow separate from the company.

**MAYA:** That's the principle, isn't it. The bot is the company.

**GRANT:** The bot is the company. So keep those answers tied to approved source content, like the official allergen guide and the published refund policy, rather than letting the AI improvise. Test it with the hard questions before launch. And keep a person reachable.

**MAYA:** Allergens especially.

**GRANT:** Allergens especially, because a wrong answer can hurt someone. My rule would be that an AI assistant can point customers to the official allergen information and tell them to speak to staff, but should not make its own judgments about whether a dish is safe for someone's allergy. In franchise systems, recipes and suppliers can vary by region, which makes improvised answers even riskier.

---

### Data rights: the deal killer

**MAYA:** Let's talk about the issue that a lot of operating teams miss until diligence. Data rights.

**GRANT:** Foley's piece had a sharp example. A target had trained an internal model on third-party content whose license terms barred training. The deal was repapered and the seller took a price reduction. That's the kind of thing a buyer's lawyers will find.

**MAYA:** What should an owner check now, before a buyer does?

**GRANT:** Four things. Which data each AI system was trained or tuned on, and whether you had the right to use it that way. What your vendor contracts say about your data being used to train their models. Who owns the outputs. And what your customer contracts allow you to do with their data. In services businesses, customer data is often the most valuable asset and the least documented.

**MAYA:** Take them one at a time. Training data.

**GRANT:** Most real-economy companies aren't training their own models from scratch. But many are tuning models or building systems that use their own documents, plus things like industry databases, purchased data, scraped web content or partner data. Each of those has terms. A parts catalog licensed from a distributor might prohibit use in AI. A data set bought for marketing might not allow other uses. List what went in, and check the terms.

**MAYA:** Vendor contracts.

**GRANT:** Read the data clauses in every AI vendor contract. Does the vendor use your data to improve its models for other customers? Can you opt out? Where is your data stored, and for how long? Many enterprise terms now protect customer data well, but free and low-cost tiers often don't. And remember the shadow AI problem from episode one: staff using consumer tools under consumer terms.

**MAYA:** Outputs.

**GRANT:** Who owns what the AI produces, and can you use it freely? For most business uses, like quotes, reports and notes, this is straightforward under enterprise terms. It matters more for creative and marketing content, and for anything you want to treat as proprietary. And in some places, purely AI-generated content may not be protected by copyright at all, which matters if your business sells content.

**MAYA:** And customer contracts.

**GRANT:** This is the big one for services and industrial businesses. Your customers' data, like their drawings, their maintenance records, their employees' details or their patients' records, came to you under a contract. Does that contract let you use it to build AI tools? To train a model that also serves other customers? To create benchmarks? Often the contract is silent, or old, or restrictive. If your AI strategy depends on pooling customer data, the contracts need to support it, and new contracts should be written with that in mind.

**MAYA:** And consumer data?

**GRANT:** For consumer businesses, loyalty data, online orders and customer service records are covered by privacy laws, including a growing number of US state privacy laws and the GDPR in Europe. Using that data for AI personalization is usually possible, but the privacy notice has to cover it, opt-outs have to work, and sensitive categories need extra care.

**MAYA:** And insurance.

**GRANT:** As we said last episode, representations and warranties insurers are starting to exclude AI-specific risks. Clean documentation of your data rights and controls is how you keep those exclusions narrow. If the insurer can see a clear inventory and clean contracts, it has less reason to carve out AI broadly.

**MAYA:** So what's the practical deliverable?

**GRANT:** A data rights register. For each AI system: the data it uses, where that data came from, the terms that apply, who approved it, and any open issues. It's maybe a few days of work for a mid-sized company, with legal help. And it turns a possible price chip at exit into a non-event.

---

### The 100-day plan

**MAYA:** Let's pull it together. A fund has just closed on a non-software business. What does the first hundred days of AI look like?

**GRANT:** Before day one, during diligence, you should already have a hypothesis. Two or three workflows where you think the money is, based on what you saw in the data room and the management meetings. The hundred days test and refine that hypothesis. They don't start from scratch.

**MAYA:** Days one to thirty.

**GRANT:** Days one to thirty are about finding the money. Map the five or six workflows with the most labor or the most leakage: the phone, scheduling, billing, quoting, documentation, quality. For each, put a dollar range on the opportunity using the company's own data. Missed calls times average ticket. Denied claims times average value. Scrap rate times cost. Overtime as a share of labor. Days to invoice.

**MAYA:** Who does that work?

**GRANT:** A small team. One person from the fund's operating group or a trusted advisor who has done it before, working with the company's finance lead and the owners of each workflow. The workflow owners have to agree that the numbers are plausible, because they'll be accountable for them later. And check the data rights and vendor contracts while you're at it, and take an inventory of the AI tools already in use, including the unofficial ones.

**MAYA:** What's the output at day thirty?

**GRANT:** A one-page opportunity map. Six workflows, each with a low, middle and high dollar range, a rough cost, a time to value, a difficulty rating and a proposed owner. Plus a short list of risks: data quality, integration, people, legal. That page goes to the CEO and the board.

**MAYA:** Days thirty to sixty.

**GRANT:** Pick two workflows. One quick win, usually revenue capture, like after-hours calls or claim scrubbing. And one bigger bet tied to the investment thesis, like centralized dispatch in a roll-up or vision inspection in a plant. Each one gets a named business owner, a baseline, a target, and a budget. Not a pilot. A deployment with a measurement plan.

**MAYA:** Why not a pilot?

**GRANT:** Because pilots are designed to be safe, and safety means they can drift forever without consequence. A deployment with a measurement plan is designed to scale from the start. You still start small, at one site or one shift, but the plan says when and how it goes everywhere, and what result would make you stop.

**MAYA:** What happens in those thirty days, practically?

**GRANT:** Vendor selection from a short list, ideally the fund's vetted list. Contracts, with the data terms we discussed. Integration work. Configuration with the front-line experts, like the customer service reps or the inspectors. Training for the first group of users. And the baseline measurement, taken properly, before anything changes.

**MAYA:** And days sixty to a hundred.

**GRANT:** Ship the quick win across the whole business, not one site. Get the bigger bet live in its first location. Report results to the board in dollars: revenue captured, hours returned, cash released, defects avoided. And set up the operating rhythm: a monthly review, a short list of what's next, and controls that a buyer could audit.

**MAYA:** What does the monthly review look like?

**GRANT:** An hour, chaired by the CEO or COO. Each live workflow reports its outcome metrics against baseline and target, its adoption, and its issues. The next workflows on the list report their readiness. Decisions get made: expand, fix, or stop. It's boring, and boring is good. It's how AI becomes part of how the company runs instead of a special project.

**MAYA:** And the controls?

**GRANT:** A short AI policy. An inventory of AI systems with owners. The data rights register. For each customer-facing or regulated workflow, a record of how it's monitored and reviewed. And a simple process for approving new tools. None of that needs to be heavy for a mid-sized company. It needs to exist and be followed.

**MAYA:** And at day one hundred?

**GRANT:** At day one hundred, the board should see one workflow delivering measured results across the business, one bigger bet live and measured at its first site, a ranked list of what's next, and the controls in place. That's a company that's started, not a company that's planning to start.

---

### Where hundred-day plans stall

**MAYA:** That sounds clean on paper. Where do hundred-day plans actually stall?

**GRANT:** Four places, in my experience. The first is the baseline. Teams are eager to launch, and nobody measures the before state properly. Three months later the numbers look better, but nobody can prove how much is the AI and how much is seasonality, a price increase or a new manager. Take the baseline seriously, even if it delays launch by two weeks.

**MAYA:** Second.

**GRANT:** Integration surprises. The vendor said it integrates with your field service system or your ERP, and it does, but only with the current version, and you're two versions behind. Or the integration needs an API license you don't have. Ask these questions in the first week of vendor selection, not after the contract is signed, and get your own systems people on the call.

**MAYA:** Third.

**GRANT:** The owner is too busy. You named the head of operations as owner of the dispatch project, and the head of operations is also running the integration of two acquisitions and covering for a vacant plant manager role. AI projects don't fail because people don't care. They fail because the owner has no time. If the owner is overloaded, give them someone full-time to run it day to day, or pick a different workflow.

**MAYA:** And fourth.

**GRANT:** The new management team. Many deals come with leadership changes in the first months. A new CFO or COO arrives with their own priorities, and the AI plan gets deprioritized. The fix is to make the plan part of the value creation plan the new leaders inherit and are measured on, not a side project of the deal team.

**MAYA:** Any sign that a plan is in trouble by day sixty?

**GRANT:** If, by day sixty, the quick win doesn't have a vendor signed, a baseline measured and a launch date, it's in trouble. That's the moment for the operating partner to step in, not day one hundred.

---

### Questions we keep hearing

**MAYA:** Let's do a few quick questions from industrial and consumer operators. Do we need a data lake before we can do any of this?

**GRANT:** No. You need the data for the specific workflow you're improving, connected well enough for that workflow. A grand data platform project that has to finish before any AI starts is a common way to spend two years and show nothing. Build the data foundation one valuable workflow at a time.

**MAYA:** Should a plant hire data scientists?

**GRANT:** A mid-sized manufacturer usually needs one or two people who understand both the process and the data, more than it needs a team of data scientists. Often that's a process engineer who's curious and gets trained. Pair them with good vendors and the fund's experts.

**MAYA:** What about the union?

**GRANT:** Involve them early, especially where AI changes how work is monitored or measured. Camera systems for inspection, for example, can raise worries about surveillance of workers. Be clear about what the cameras look at and what the data is used for, and in many cases, agree it in writing. Where there's a collective agreement, changes to working conditions may need to be bargained.

**MAYA:** Is it worth the franchisor building its own tools?

**GRANT:** Only at real scale. The largest restaurant groups can build platforms, as Yum has. A mid-sized franchisor is usually better off choosing strong vendors, integrating them into its system, and focusing its own effort on adoption and data.

**MAYA:** And the one thing you'd tell an industrial CEO?

**GRANT:** Go stand at the bottleneck. Whatever limits your output or your sales, whether it's a machine, an inspection station or an engineer who writes every quote, that's where AI is worth the most. Everything else can wait.

---

### The fund's role

**MAYA:** What role does the fund play?

**GRANT:** The fund's job is to make the decision easy and the follow-through unavoidable. Shared playbooks from other portfolio companies, a short list of vetted vendors, a few experienced operators who've done it before, and a clear expectation in the value creation plan. The company's job is to own it.

**MAYA:** What does "unavoidable" mean in practice?

**GRANT:** It means AI is a line in the value creation plan with dollar targets, reviewed at every board meeting alongside pricing, procurement and the other initiatives. It means the CEO's incentive plan reflects it where it's material. And it means the fund's operating partners ask about outcomes, not activity, every time.

**MAYA:** And across the portfolio?

**GRANT:** A portfolio view. Which companies have which workflows live, what results they're getting, and what they've learned. When one company makes something work, the next one should be able to copy it in half the time. That's the real advantage a fund has over any single company: it gets to learn the same lesson many times, and only pay for it once.

**MAYA:** And when it doesn't work?

**GRANT:** Then stop, and write down why. A fund that only shares successes teaches its portfolio to hide failures. The most useful playbooks I've seen include the projects that were killed, and the reasons.

---

### Season wrap

**MAYA:** So the season in a few lines.

**GRANT:** Most of the AI value in a typical portfolio lives outside software. Start where money leaks, especially the phone and billing. Put AI inside the core workflow and make the workflow owner accountable. Decide in advance where the saved time goes.

**MAYA:** In services?

**GRANT:** The phone is the revenue system. After hours first, write into the system of record, and listen to the calls every week. In roll-ups, the platform comes before the AI.

**MAYA:** In healthcare and regulated work?

**GRANT:** AI drafts and a qualified person signs. Aim for accuracy, never aggression, and watch the distributions.

**MAYA:** In factories and franchises?

**GRANT:** In factories, start with quality and make maintenance predictions turn into work orders. In franchises, make adoption the easy choice, and remember that the bot is the brand.

**MAYA:** And everywhere?

**GRANT:** Check your data rights before a buyer does. Run a hundred-day plan that ends with results, not a strategy deck. And measure everything in dollars.

**MAYA:** Thanks for listening to season one of AI in the Real Economy. If you want to go deeper, our sister shows pick up where this one leaves off: the AI Diligence Room on buying, The Rulebook on regulation, and Talking AI to the Board and LPs on telling the story.

[OUTRO MUSIC]

**GRANT:** I'm Grant.

**MAYA:** And I'm Maya. See you next season.
