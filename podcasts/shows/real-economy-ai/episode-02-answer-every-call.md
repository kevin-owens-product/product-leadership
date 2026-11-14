# Episode 2: Answer Every Call
## "Field Services, Business Services, and the AI-Enabled Roll-Up"

**Duration:** ~48 minutes
**Hosts:** Maya & Grant
**Podcast:** AI in the Real Economy

---

### Cold open

[INTRO MUSIC]

**GRANT:** It's nine at night in January. A homeowner's furnace stops working. She calls the first HVAC company on her search results. It goes to voicemail. She hangs up without leaving a message and calls the next one.

**MAYA:** And that first company just lost an emergency job, and maybe a customer for the next ten years. Because the company that answers tonight is the one that gets the replacement quote next spring, and the maintenance agreement after that.

**GRANT:** And here's the part that should bother an owner. Nobody at the first company will ever know. There's no record of a lost sale. There's a missed call in a phone log that nobody reads.

**MAYA:** Welcome back to AI in the Real Economy. I'm Maya.

**GRANT:** I'm Grant. Today is services. Field and home services, like HVAC, plumbing, electrical, pest control, landscaping and restoration. And the business services companies that run on phones, email and paperwork: staffing firms, inspection and testing companies, outsourced back offices, facilities services.

**MAYA:** It's the sector where AI value is easiest to see.

**GRANT:** And, I'd argue, easiest to get wrong. Because the same phone call that's your biggest opportunity is also your customer's first impression of your brand. Get it right and you capture revenue you never knew you were losing. Get it wrong and you've automated a bad experience at scale.

**MAYA:** We'll spend the first half on the phone and the field: how voice agents work now, how to roll them out, what to measure, and the rules on calls. Then dispatch, the technician's day and the back office. Then business services. And then the thesis a lot of funds are chasing, the AI-enabled roll-up, with both the bull case and the bear case.

**GRANT:** Same ground rules as last time. Public sources only. When a number comes from a vendor, we'll say so. And when we walk through the math, we'll use made-up companies.

---

### The economics of a missed call

**MAYA:** Start with the phone. Why does it matter so much?

**GRANT:** Because in home services, the phone is the revenue system. Almost every job starts with a call. The website, the search ads, the truck wraps, the reviews, all of that marketing spend exists to make the phone ring. And then, at the moment of truth, a surprising share of those calls go unanswered.

**MAYA:** How surprising?

**GRANT:** ServiceTitan, which sells software to contractors, cites Invoca research that home service businesses miss about twenty seven percent of inbound calls. It also says that around seventy eight percent of callers who reach voicemail don't leave a message. And from its own data on more than twelve hundred contractors, it estimates that an average HVAC company loses somewhere between forty five thousand and a hundred and twenty thousand dollars a year to unanswered calls.

**MAYA:** Those are vendor numbers.

**GRANT:** They are, and a vendor that sells call handling has a reason to make missed calls sound expensive. So don't take the number. Take the method. The shape of the problem is easy to check in any business, and I'd do it in the first week of ownership.

**MAYA:** Walk me through it.

**GRANT:** Pull three months of phone logs from the phone system. Every phone system keeps them. Count inbound calls by hour of day and day of week, and mark which ones were answered by a person, which went to voicemail, and which were abandoned in a queue. Then take out the obvious non-customers: vendors, spam, staff calling in. What's left is your missed-demand curve.

**MAYA:** And then you put a dollar value on it.

**GRANT:** You need three more numbers, all of which the company has. The share of answered calls that turn into a booked job, which is your booking rate. The average ticket for those jobs. And the share of missed callers who call back, which you can estimate by matching missed numbers against calls from the same number in the next day. Missed calls, times one minus the callback rate, times the booking rate, times the average ticket. That's your annual leak, before you even count the lifetime value of a customer you never got.

**MAYA:** Let's make it concrete.

**GRANT:** A made-up HVAC company. Call it Northstar Comfort. Forty technicians, about twelve million dollars of revenue, two locations. They get about three thousand customer calls a month. Their logs show eighteen percent unanswered, which is better than the vendor average, mostly at lunch, after five, and on Saturday mornings. That's five hundred and forty missed calls a month. Say a third of those call back. That leaves three hundred and sixty. Their booking rate on answered calls is fifty percent, and their average ticket is four hundred and fifty dollars. That's about eighty thousand dollars a month, or close to a million dollars a year.

**MAYA:** For a twelve-million-dollar business.

**GRANT:** And that's before replacement equipment, which is where the big tickets are, and before maintenance agreements. Now, you won't capture all of it. Some of those callers wanted a price and would never have booked. Some are calling about a job you couldn't schedule anyway. But even if you capture a third, it's a meaningful number, and it's a number your own data produced.

**MAYA:** And when the peak season hits?

**GRANT:** It gets worse, and that's the cruel part. The first heatwave of summer or the first cold snap of winter, the phones light up exactly when the business is most valuable to customers, and the call center is most overwhelmed. Your missed-call rate is highest on your most profitable days. That's the case for AI on the phone in one sentence.

---

### What a voice agent actually does now

**MAYA:** So this is where AI voice agents come in. What can they actually do in late 2026?

**GRANT:** A lot more than two years ago. The current generation can answer around the clock with a natural voice and low enough latency that a conversation doesn't feel like a phone tree. It can look up the caller in the CRM by phone number, greet them by name and see their equipment and service history. It can book or reschedule into the live dispatch board, offering real slots that respect technician skills and service areas. It can recognize an emergency, like no heat with a baby in the house, or a gas smell, and follow the emergency protocol, which might mean telling the caller to leave the house and call the gas company, then paging the on-call technician.

**MAYA:** And it hands off to a person.

**GRANT:** It hands off to a person when the call gets complicated, the caller is upset, or they just ask. And that last capability matters more than all the others. A voice agent that traps people is worse than voicemail. The ones that work well hand off early, warm, and with context, so the human picks up already knowing who's calling and why.

**MAYA:** What can't they do well?

**GRANT:** A few things. Diagnosing over the phone, beyond the basic triage questions. Pricing complex work. Handling a genuinely angry customer who wants to be heard by a human. Understanding very noisy lines, strong accents in some cases, or a caller who keeps changing their mind. And anything that requires judgment the business hasn't written down.

**MAYA:** That last one is interesting.

**GRANT:** It's the one that surprises owners. To configure an agent well, you have to write down how your business actually works. What counts as an emergency. Which jobs you don't do. Which zip codes you serve. Whether you charge a trip fee on weekends. What a maintenance agreement member gets. A lot of that lives in the head of a twenty-year customer service rep. Writing it down is valuable in itself, even before the AI uses it.

**MAYA:** Is there a good public example of how these go wrong?

**GRANT:** The one everyone in restaurants remembers is from last year. Taco Bell had rolled out voice AI in hundreds of drive-thrus, and the Wall Street Journal reported in August 2025 that the company was rethinking where to use it, after viral videos of customers trolling the system. The most famous one ordered eighteen thousand cups of water.

**MAYA:** Which is funny, but there's a real lesson in it.

**GRANT:** Two lessons. One, put sensible limits on what the agent can accept. Nobody needs eighteen thousand of anything at a drive-thru, and no homeowner needs to book nine emergency visits on one night. Rules like that are cheap to write. Two, the company's own conclusion, as reported, was about when to use AI and when to use people, including handing over to staff at busy times. That's the right question. Not "AI or humans," but which calls, at which times, go to which.

---

### How to roll it out

**MAYA:** If I'm the operating partner, how do I roll this out without upsetting customers?

**GRANT:** Start after hours. It's the lowest-risk slot because today those calls go to voicemail or an expensive answering service that takes a message and can't book anything. Any booking the agent makes after hours is pure upside, and any mistake it makes is compared with a voicemail box, not with your best rep.

**MAYA:** And then?

**GRANT:** Then weekends and holidays. Then overflow during peak season, so when all the humans are busy, the call goes to the agent instead of a hold queue. Then lunch hours and the first hour of the morning, when calls spike. And only then think about the daytime queue as a whole, and even then I'd usually keep humans as the first answer for some call types, like existing customers with open jobs or anything about a complaint.

**MAYA:** How long does each stage take?

**GRANT:** A few weeks each, if things go well. The first two weeks after hours are about tuning. You listen to every single call, or a large sample, and you fix what's wrong. Wrong service area answers. Awkward phrasing. Emergencies that weren't recognized. Bookings into the wrong slot type. By week three or four, you're listening to a sample and tracking the metrics.

**MAYA:** What has to be true for it to work at all?

**GRANT:** Three things. First, it has to write directly into the system of record. An agent that books into a separate calendar creates phantom appointments and double bookings, and then a dispatcher has to reconcile everything by hand the next morning. That's worse than voicemail, because now you've made promises you can't keep.

**MAYA:** Second.

**GRANT:** It has to know the trade. What counts as an emergency, which jobs need which skills or licenses, which parts of town you serve, what a maintenance agreement covers, what you charge for a diagnostic visit. That's the configuration work we just talked about, and it's where the best implementations spend most of their effort.

**MAYA:** And third.

**GRANT:** It has to be honest. Tell callers they're talking to an AI assistant, in the first sentence. Make it easy to reach a human, and mean it. Some owners worry that disclosure will make people hang up. In my experience, what makes people hang up is an agent that pretends to be human and then fails a simple question. Honest and useful beats clever and evasive.

**MAYA:** Who should own the rollout inside the company?

**GRANT:** The head of customer service or the call center manager, with the general manager's backing. Not IT, and not the vendor. The call center manager knows which calls are hard, which customers are sensitive, and which reps will champion it. And involve the reps from the start. Let them listen to the AI calls. They'll spot problems faster than anyone, and when they see the agent taking the two in the morning calls they used to get paged for, they become allies.

**MAYA:** What about the answering service the company uses today?

**GRANT:** Run them in parallel for a short period, then cut over, and negotiate the notice period in advance. Many after-hours answering services charge per minute or per call, so the AI often pays for itself just by replacing that cost, before you count a single extra booking.

---

### Measuring it

**MAYA:** And measure what?

**GRANT:** Six numbers. Answer rate: the share of calls answered by someone or something within a few rings. Booking rate on AI-handled calls compared with human-handled calls of the same type. Escalation rate: how often calls go to a person, and why. Cancellation and no-show rate on AI-booked jobs. Revenue per call. And customer satisfaction, from a short text survey after the call or after the job.

**MAYA:** Why compare by call type?

**GRANT:** Because the mix is different. After-hours calls skew toward emergencies, which book at high rates. Daytime calls include more price shoppers. If you compare the AI's after-hours booking rate with your humans' daytime rate, you'll flatter the AI. Compare like with like, and compare AI-handled hours with the same hours last year.

**MAYA:** What's the warning sign in the numbers?

**GRANT:** The classic one is a good booking rate with a high cancellation rate. That means the agent is booking things that shouldn't be booked: jobs outside your service area, jobs you don't do, customers who just wanted a price. Another is a falling escalation rate that isn't matched by rising satisfaction. That can mean the agent has gotten better, or it can mean people are giving up. Listen to the calls to find out which.

**MAYA:** And how often should someone listen to calls?

**GRANT:** Forever. Not every call, but a weekly sample, reviewed by the customer service manager, with a short log of issues and fixes. It's the single best control you have, and it's the thing a buyer will ask about in diligence. "How do you know your AI agent is saying the right things?" The answer should be "we listen every week, and here's the log."

---

### Outbound calls and the rules

**MAYA:** So far it's all inbound. What about outbound, where the AI calls customers?

**GRANT:** It's very tempting. Appointment reminders. Calls to customers whose maintenance agreements are about to lapse. Follow-ups on quotes that weren't accepted. Reactivation calls to customers who haven't booked in two years. All of that is revenue, and much of it isn't happening today because nobody has time.

**MAYA:** But the rules are different for outbound.

**GRANT:** Very different, and this is where I'd get counsel involved before launch. In the US, the Telephone Consumer Protection Act governs calls using artificial or prerecorded voices. In February 2024, the Federal Communications Commission issued a ruling that AI-generated voices count as artificial under that law. In practice, that means an AI voice calling a consumer generally needs the same prior express consent as a prerecorded robocall, and the penalties for getting it wrong are set per call, which adds up fast.

**MAYA:** So the AI reminder call to every customer in the database is a problem.

**GRANT:** It can be, depending on what consent you have, whether it's a mobile number, and whether the call is informational or marketing. Text messages raise similar questions. The practical answer is to treat outbound AI as a legal project first. Clean up consent records, separate transactional messages from marketing, honor opt-outs immediately, and keep records of all of it.

**MAYA:** And call recording?

**GRANT:** Most AI voice systems record and transcribe every call, because that's how they work and how you review them. Federal law and most states allow recording when one party consents. But around a dozen states, including California, Florida, Pennsylvania and Washington, require the consent of everyone on the call. If you take calls from those states, and almost every multi-state business does, the safe approach is a clear notice at the start of every call that it may be recorded. Most companies already do this for human calls. Make sure the AI does it too.

**MAYA:** And disclosure that it's AI?

**GRANT:** Some states have rules requiring bots to disclose they're bots in certain commercial contexts, and more rules are coming. But I'd do it regardless of the law, because it's the right customer experience. We'll go deep on the regulatory map in our other show, The Rulebook. For this episode, the rule of thumb is simple: inbound is relatively easy, outbound needs a lawyer, and everything needs a clear notice.

**MAYA:** What about pricing and financing?

**GRANT:** That's the other sensitive area. A lot of home services companies offer financing on big-ticket jobs, like a new system. If an AI is deciding who gets which financing offer, or what price someone sees, you're in territory that consumer finance law and several states' automated decision-making rules care about. California's privacy regulator, for example, has finalized rules on automated decision-making technology, with obligations phasing in from 2027. Keep a human in the loop on anything that looks like a credit or pricing decision about an individual, and keep records of how those decisions are made.

---

### Dispatch and scheduling

**MAYA:** The phone's the obvious one. What's next?

**GRANT:** Dispatch and scheduling. Once the job is booked, someone has to decide which technician goes, when, and in what order. Matching jobs to technicians by skill, license, location, traffic, parts on the truck, customer preferences and job length is a genuinely hard optimization problem. Most companies solve it with a whiteboard, a dispatch board on a screen, and one very tired dispatcher who has been doing it for fifteen years.

**MAYA:** And who is irreplaceable.

**GRANT:** Who is irreplaceable, and who is also a single point of failure. When that person goes on vacation, the business gets noticeably worse. That's a risk a buyer will spot too.

**MAYA:** What does AI add here?

**GRANT:** Three things. First, better initial schedules: routing and assignment software has existed for years, but the newer tools are better at handling messy real-world constraints and at learning job durations from history instead of using one standard estimate for every job. Second, fast re-planning. When a technician calls in sick at seven in the morning, or a job runs three hours over, the system can propose a new plan for the rest of the day in seconds, and the dispatcher approves it.

**MAYA:** And the third?

**GRANT:** Customer communication. When the plan changes, the customer gets a text with an updated arrival window, automatically, instead of waiting at home wondering. That alone reduces inbound "where's my technician" calls, which in some businesses are a big share of daytime call volume.

**MAYA:** So the dispatcher's job changes.

**GRANT:** From building the schedule to supervising it. The dispatcher handles exceptions, priorities and relationships, like knowing that one commercial customer must always get their favorite technician. That's a better job, and it means one dispatcher can handle more technicians, which matters in a roll-up where you want to centralize dispatch across locations.

**MAYA:** How do you measure it?

**GRANT:** Jobs per technician per day, drive time as a share of the working day, first-time fix rate, on-time arrival rate, and overtime. Drive time is a good one, because it's pure cost. A technician who drives forty minutes less a day either completes more jobs or gets home on time, and both are worth something.

---

### The technician's day

**MAYA:** Let's go out in the truck. What changes for the technician?

**GRANT:** The paperwork, mostly. Technicians hate paperwork, and they're often bad at it, not because they're careless but because they're tired and standing in someone's basement. Job notes get written in five words. Parts don't get logged. Photos don't get taken. And every one of those gaps costs money later: an under-billed invoice, a warranty claim that can't be supported, a callback where the next technician doesn't know what was done.

**MAYA:** And the AI fix is?

**GRANT:** Voice. The technician talks for thirty seconds into their phone at the end of the job. "Replaced the capacitor, cleaned the coil, noticed rust on the drain pan, recommended replacement within a year." The AI turns that into a proper job note, picks the right parts and labor codes for the invoice, flags the drain pan as a sales opportunity, and drafts the customer summary. The technician checks it and taps approve.

**MAYA:** That's also a revenue lever.

**GRANT:** It's a big one. Recommendations that technicians make verbally and never write down are lost sales. Captured properly, they become a follow-up list for the sales team or an automated quote. And the second piece is on-site quoting. For replacement work, AI can help the technician build a good, better, best proposal from the equipment data and photos while they're still in the house, which is when the customer is most likely to say yes.

**MAYA:** What about helping the technician fix things?

**GRANT:** That's emerging. Tools that let a technician ask a question about a specific model of equipment and get an answer from the manufacturer's manuals and the company's own past jobs. It's useful for less experienced technicians, and the industry has a serious shortage of experienced ones. But I'd treat it as a helper, not an authority. If the answer involves gas, electricity or refrigerants, the technician's training and the code book win.

**MAYA:** And adoption?

**GRANT:** Make it faster than the old way, or it won't happen. If the voice note takes thirty seconds and the old form took five minutes, technicians will adopt it in a week. If it takes longer, or the app is slow on a bad cell connection in a basement, they'll stop. Test it in the worst conditions, not in the office.

---

### The back office: turning work into cash

**MAYA:** And the back office.

**GRANT:** Invoicing the same day the job closes. Chasing unpaid invoices politely and persistently. Renewing maintenance agreements before they lapse. Following up on quotes that never converted. Reconciling payments. Handling warranty claims with manufacturers. None of that is glamorous, and all of it is cash.

**MAYA:** Let's take them one at a time. Same-day invoicing.

**GRANT:** In a lot of field service businesses, the invoice goes out days after the job, because someone in the office has to check the technician's notes, fix the parts, and apply the right pricing. If the job notes are good, because of the voice capture we just talked about, the invoice can be drafted automatically, checked against the price book and the work order, and sent the same day. The customer is still happy with the work, so they pay faster.

**MAYA:** Collections.

**GRANT:** For residential customers, most payment happens on site now. But commercial work, property managers, builders and facilities customers often pay on thirty or sixty day terms, and they're slow. AI can send reminders, answer simple questions about the invoice, attach the job photos and signed work order, and escalate to a person when it's a real dispute. A lot of slow payment is just friction: the invoice went to the wrong person, or the customer needs a purchase order number that's missing.

**MAYA:** And maintenance agreements.

**GRANT:** This is my favorite in home services, because a maintenance agreement is recurring revenue, and recurring revenue is what buyers pay a premium for. Agreements lapse mostly through neglect. Nobody called, the card expired, the customer forgot. A system that tracks every agreement, reaches out before it expires, books the maintenance visit, and updates the card is a direct contributor to the quality of earnings. Track renewal rate, and you'll see it move.

**MAYA:** And unconverted quotes.

**GRANT:** In many businesses, a large share of replacement quotes are never followed up after the technician leaves. A follow-up sequence, a call or a text a few days later answering questions and offering financing information, recovers some of those. Here the outbound rules we discussed apply, so do it within your consent framework.

---

### Business services

**MAYA:** What about business services? Staffing firms, outsourced back offices, inspection companies, that kind of thing.

**GRANT:** Same pattern, different workflow. Business services companies sell expert time, or at least skilled time. So the question is how much of that time goes into the parts customers don't value. Intake, document review, report drafting, scheduling, data entry, quality checks. Those are exactly the tasks AI is getting good at.

**MAYA:** Give me some examples by type.

**GRANT:** Staffing first. A staffing firm's core workflow is matching candidates to roles, fast. AI can screen and summarize applications, draft outreach, schedule interviews, check credentials and handle routine questions from candidates and clients. Speed matters enormously, because the first firm to present a good candidate often wins the placement. But be careful, because hiring is the area where automated decision-making rules are strictest, from New York City's rules on automated employment decision tools to the EU, where recruitment AI is in the high-risk category. AI can assist with screening. A person should own the decision.

**MAYA:** Inspection and testing.

**GRANT:** Inspection companies, like building inspection, fire and life safety, environmental testing or elevator inspection, have a field visit followed by a report. The report is where the time goes, and it's also where the liability sits. AI can draft the report from the inspector's notes, photos and readings, check it against the standard, flag missing items, and format it. The inspector reviews and signs. Turnaround time drops, which customers value, and inspectors spend more time inspecting.

**MAYA:** Outsourced back offices and business process outsourcing.

**GRANT:** This is the sector where AI is most directly a threat as well as an opportunity. If your business is processing invoices or answering customer emails for other companies, and AI can do a large share of that work, your customers will eventually ask why they're paying per hour or per transaction at the old rate. The winners will move first: use AI internally, pass on some of the savings, and shift pricing toward outcomes before a competitor or the customer forces the issue.

**MAYA:** That's a pricing model question.

**GRANT:** It's the big strategic question in business services. If you bill by the hour and AI makes your people twice as fast, you've just halved your revenue for the same work, unless you change how you price. Fixed-fee pricing, per-outcome pricing, or subscription models let you keep the productivity gain. Every business services portfolio company should be asking which of its contracts would get worse with AI and which would get better, and renegotiating accordingly.

**MAYA:** Permira had an example from legal services.

**GRANT:** They did. Permira described work in its portfolio on matching lawyers to projects and giving them specialized tools for contract analysis. The pattern is the same as everywhere else. The expert still does the expert work. AI takes the intake, the first pass and the formatting. And the business model shifts toward selling outcomes and capacity, not just hours.

**MAYA:** And facilities services?

**GRANT:** Facilities, like our made-up Ridgeline from episode one, looks a lot like field services. Scheduling, inspection, quality audits, client communication and bidding. The bid process is a good target, because bids are long documents built from site walks and past contracts, and faster, better bids win work.

---

### The AI-enabled roll-up

**MAYA:** Let's talk about the thesis a lot of funds are chasing. Buy fragmented service businesses, put them on one platform, and use AI to run the back office centrally.

**GRANT:** The roll-up isn't new. Private equity has been consolidating HVAC, plumbing, dental, veterinary, accounting and many other sectors for years. The new part is the claim that AI makes the platform much more efficient than before, so the margin gap between the platform and a standalone business gets wider.

**MAYA:** Give me the bull case.

**GRANT:** The bull case is simple. Plenty of these businesses run at single-digit EBITDA margins with manual scheduling, paper estimates and overloaded phones. They're often owned by a founder approaching retirement with no succession plan. You buy them at a modest multiple, put them on a common platform with central call handling, dispatch, billing and collections, all heavily AI-assisted, and the margin goes up while the local brand and technicians stay the same. One widely shared write-up modeled twenty to thirty percent margin expansion from cost savings alone in an AI-enabled home services roll-up.

**MAYA:** You said "modeled."

**GRANT:** It's one author's model, not a result, and I'd treat it that way. But you can see why it's attractive. And there's a second-order effect. If the platform is genuinely better at answering calls, dispatching and collecting, each new acquisition improves faster after it joins. The integration playbook becomes the asset.

**MAYA:** And the bear case?

**GRANT:** Integration is the whole game, and integration is where roll-ups go to die. Every acquired business has its own software, its own price book, its own way of dispatching, and a founder who built it that way for a reason. Some of them are on a modern field service platform. Some are on a twenty-year-old desktop system. Some are on spreadsheets and a paper calendar. If you can't get them onto one system of record, the AI has nothing to work with.

**MAYA:** And there's the brand.

**GRANT:** Local reputation is the asset you bought. In home services, customers choose the company their neighbor recommended, the one with the good reviews, the one whose technician fixed their parents' furnace. A clumsy AI phone experience, or a central call center that doesn't know the town, can damage a brand that took twenty years to build. And the founder, who might be staying on for an earn-out, is often the most skeptical person in the building.

**MAYA:** So the sequencing matters.

**GRANT:** Hugely. I'd say: platform first. Get everyone onto one field service system, one price book structure, one set of financial reports. Then centralize the functions customers don't see, like billing, collections, purchasing, payroll and reporting. Then the ones they do, like the phone and dispatch. And keep the local brand, local phone numbers and local technicians front and center throughout.

**MAYA:** How long does that take per acquisition?

**GRANT:** It varies a lot, but plan for months, not weeks, for the system migration of each business, and more for the bigger ones. The roll-ups that do it well have a dedicated integration team with a repeatable playbook, and they say no to acquisitions that would be too hard to integrate, even if the price is attractive.

**MAYA:** What would you ask in diligence on a roll-up that claims AI is its edge?

**GRANT:** Four questions. What share of revenue is on the common platform today, not planned. What the margin and booking rate look like for acquisitions that joined the platform more than a year ago, compared with when they joined. Which central functions are actually running, and on how much of the volume. And what the customer and employee retention look like after integration. If the AI story is real, those numbers will show it. If the answer to the first question is twenty percent, the AI story is a plan, not a result. We'll go much deeper on this kind of diligence in our sister show, the AI Diligence Room.

---

### Reviews, reputation and the local brand

**MAYA:** You keep coming back to local reputation. Is there an AI angle on reputation itself?

**GRANT:** There is, and it's one of the cheapest wins in the sector. In home services, online reviews drive a huge share of new customers, and most companies manage them badly. Nobody asks happy customers for a review at the right moment. Negative reviews sit unanswered for weeks. And the owner reads them at eleven at night and replies angrily.

**MAYA:** We've all seen that reply.

**GRANT:** We have. So the AI workflow is simple. When a job closes with a good outcome, the customer gets a short, personal text asking for a review, ideally naming the technician. When a review comes in, the system drafts a reply in the company's voice, thanking the customer by name for a good one, or for a bad one acknowledging the problem and offering a direct way to fix it. A manager approves the reply before it goes out, especially for the negative ones.

**MAYA:** Why the approval step?

**GRANT:** Because a reply to a bad review is a public statement by the company, and it can create legal and privacy problems. You must never confirm details of someone's job or their home in a public reply, and you must never argue. The AI's draft is a good starting point, and the human makes sure it's right. The other rule is just as important. Never write fake reviews, never have AI generate reviews, and never pay for them. Regulators have been explicit that fake reviews are deceptive, and in the US the Federal Trade Commission adopted a rule banning fake reviews and testimonials, including AI-generated ones, with real penalties.

**MAYA:** What about the reviews themselves as data?

**GRANT:** That's the underused part. Hundreds of reviews, plus call transcripts and job notes, tell you what customers actually value and what makes them angry. AI is very good at reading all of that and summarizing the themes by location, by technician and by month. "Customers at the north location keep mentioning that technicians arrive outside the window." That's an operations insight that was sitting in plain sight.

**MAYA:** And in a roll-up, it's a way to see the acquired businesses.

**GRANT:** Exactly. Before and after integration, you can watch the sentiment at each acquired business. If customers start complaining about the new central phone experience, you'll see it in the reviews within weeks, long before it shows in the revenue. It's an early warning system for the brand risk we just talked about.

---

### People and risk

**MAYA:** There's a workforce question we have to address.

**GRANT:** There is. In most of these businesses, the honest story is that AI absorbs growth rather than replacing people. You add revenue without adding call center seats or dispatchers. Labor shortages in the trades are real and long-running, so the field workforce isn't the target. If anything, giving technicians back an hour a day is a recruiting and retention advantage.

**MAYA:** But some plans do reduce headcount.

**GRANT:** Some do, especially in central functions after a roll-up, or in business process outsourcing. Where a plan does reduce headcount, the legal side is real. Foley's piece pointed to WARN Act notices, plant-closing rules, severance and union bargaining. Under the federal WARN Act, employers of a certain size generally owe sixty days' notice before a mass layoff or a site closing, and several states have their own versions with different thresholds. Get employment counsel involved before the plan is announced, not after.

**MAYA:** And the communication?

**GRANT:** Be straight with people. If a call center will shrink over two years through attrition and redeployment, say so, and offer the people affected a path, like training for dispatch, sales or field roles. Rumors are worse than the truth, and your best people, who have options, will leave first if they're left guessing.

**MAYA:** And customer data?

**GRANT:** Every call recording, transcript and job note is customer data, and some of it is sensitive: people's home addresses, when they're away, their payment details, sometimes health information if a technician notes a medical device. Know where your vendor stores it, how long, and who can see it. And make sure payment card details never end up in a transcript. Most good voice systems have a way to take payments that keeps card numbers out of the recording. Use it.

---

### Northstar, year one

**MAYA:** Let's bring it together with our made-up company. Northstar Comfort, forty technicians, twelve million in revenue, newly acquired as the platform for an HVAC roll-up. What does year one look like?

**GRANT:** Quarter one: measure and fix the basics. The phone log analysis shows the missed-call leak. The team picks an AI voice agent that integrates with their field service system, and launches it after hours in week six, with the customer service manager listening to every call for two weeks. They also start same-day invoicing using technician voice notes on a pilot crew.

**MAYA:** Quarter two.

**GRANT:** Weekends and peak overflow on the phone, just before summer. Voice notes go to all technicians. Maintenance agreement renewal outreach starts, within the consent rules. The first add-on acquisition closes, a six-technician plumbing company, and the integration team starts moving it onto the platform.

**MAYA:** Quarter three.

**GRANT:** AI-assisted dispatch with the lead dispatcher supervising, starting with one location. The second add-on closes. Central billing and collections are set up for both acquisitions. Board reporting shows answer rate, booking rate on AI calls, revenue from after-hours bookings, days to invoice and agreement renewal rate.

**MAYA:** And quarter four.

**GRANT:** Dispatch across both original locations. The first add-on's phones move to the central system, keeping its local number and brand greeting. The team writes up the integration playbook, including what went wrong, so the next acquisition goes faster. And the board sees a clean before and after for each workflow.

**MAYA:** What went wrong in our imaginary year?

**GRANT:** In an honest version, a few things. The voice agent mishandled a set of commercial calls in month two, because commercial customers have different processes, so those were routed back to humans. The first add-on's price book took twice as long to migrate as planned. And one location's technicians resisted voice notes until the operations manager started using the job summaries in their weekly reviews. None of that is fatal. All of it is normal.

---

### Takeaways

**MAYA:** Sum it up.

**GRANT:** In services, the phone is the revenue system. Measure the missed-call leak with your own data before you talk to any vendor. Start AI on the phone after hours, then weekends and peak overflow, and listen to the calls every week, forever.

**MAYA:** Two.

**GRANT:** Write into the system of record or don't bother. An agent that books into a side calendar creates more work than it saves.

**MAYA:** Three.

**GRANT:** Inbound is relatively easy. Outbound needs a lawyer, because the FCC treats AI voices as artificial voices under the TCPA. And every call needs a clear recording and AI notice.

**MAYA:** Four.

**GRANT:** Then move to dispatch, the technician's paperwork and the back office, where the cash is: same-day invoicing, collections, maintenance agreement renewals and quote follow-up.

**MAYA:** Five.

**GRANT:** In business services, the biggest AI question is the pricing model. If you bill by the hour, AI can shrink your revenue unless you move toward fixed-fee or outcome pricing.

**MAYA:** And six.

**GRANT:** If you're running a roll-up, the platform comes before the AI. Customers-don't-see functions before customers-do-see functions. Protect the local brand. And tell people, both customers and staff, what the AI is doing.

**MAYA:** Next episode: healthcare services and other regulated work, where the paperwork is the product, the rules are strict, and the best evidence on AI is more modest, and more interesting, than the marketing.

[OUTRO MUSIC]

**GRANT:** Thanks for listening to AI in the Real Economy. I'm Grant.

**MAYA:** And I'm Maya. See you next time.
