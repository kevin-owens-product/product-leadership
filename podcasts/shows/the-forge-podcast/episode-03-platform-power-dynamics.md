# Episode 3: Platform Power Dynamics and Data Moats
## "How B2B SaaS Companies Protect Their Value When Everyone Wants Their Data"

**Duration:** ~50 minutes
**Hosts:** Alex (Interviewer) & Kevin (Expert)

---

### INTRO (3 minutes)

**ALEX:** Welcome back to The Forge Podcast. In our last two episodes, we covered PE value creation and multi-agent architecture. Today we're tackling something that sits at the intersection of product strategy and competitive moats: platform power dynamics. Kevin, you've been dealing with this at GWI, a consumer insights company that serves some of the world's biggest agencies. Set up the problem for us.

**KEVIN:** Here's the strategic tension. GWI collects and curates one of the world's most comprehensive consumer datasets. Our data tells you what people think, what they buy, what media they consume, how their attitudes are shifting, across dozens of countries and thousands of data points. Agencies like WPP, Publicis, and Omnicom love our data. They use it to plan media strategies, build audience segments, and validate campaign ideas.

But here's the problem. These agencies are building centralized insights platforms that combine data from multiple suppliers. And when an agency builds a platform that pulls in data from GWI, from Nielsen, from Comscore, from social listening tools, and presents it all in a unified interface, something dangerous happens from GWI's perspective. The end client, the brand paying for the media plan, never sees GWI. They just see "the agency's platform." GWI becomes invisible, commoditized, and ultimately replaceable.

This is not unique to GWI. It's a pattern that plays out across every B2B data and software business. Your customers are also your channel, and the channel wants to aggregate your value into their own offering. If you let them, you lose the direct relationship, the pricing power, and eventually the business.

---

### SEGMENT 1: THE THREE LAYERS OF THE VALUE CHAIN (10 minutes)

**ALEX:** So what's the framework for thinking about this? How does a data company protect itself without alienating its biggest customers?

**KEVIN:** You need to understand the three layers of the value chain and where you sit in each one. Let me walk through them.

Layer one is the data layer. This is the raw material, the survey responses, the behavioral data, the panel data. This is expensive to produce, hard to replicate, and it's your fundamental asset. But raw data is also the most commoditizable layer, because once someone has access to it, they can repackage it however they want. If you're giving agencies raw data files or unrestricted API access, you're handing them the keys to your house.

Layer two is the intelligence layer. This is where raw data gets transformed into insights, segments, trends, and recommendations. This is where your domain expertise lives. You don't just have data about Gen Z; you have a methodology for defining what Gen Z means, how to segment them, how their behavior differs across markets, and what that means for a specific brand in a specific category. The intelligence layer is much harder to commoditize because it requires understanding the data deeply, not just accessing it.

Layer three is the delivery layer. This is how insights reach the end user. It could be your platform, your API, your reports, or your integration into someone else's platform. The delivery layer is where the power dynamics play out, because whoever controls the delivery layer controls the client relationship.

The strategic imperative is to never let yourself be pushed entirely into layer one. If you're just providing raw data for someone else's intelligence and delivery layers, you're a commodity supplier. You need to ensure that your intelligence layer is embedded in whatever delivery mechanism the client uses, and that your brand is visible at the point of insight delivery.

---

### SEGMENT 2: PRODUCT ARCHITECTURE AS STRATEGIC WEAPON (10 minutes)

**ALEX:** Practically speaking, how do you do that? The agencies want raw data or clean API access. They don't want your intelligence layer getting in the way of their platform.

**KEVIN:** Right, and this is where the product architecture becomes your strategic weapon. The answer is to shift from being a data supplier to being an embedded intelligence layer. Here's how.

The first move is to restructure your API. Instead of returning raw data rows, you return branded insight objects. When an agency queries "Gen Z media consumption in the UK," they don't get a CSV of data points. They get a structured insight object that includes the data, the methodology, the confidence interval, the trend direction, and, crucially, the provenance, meaning a clear attribution that says "this insight is powered by GWI."

This is a subtle but powerful architectural shift. The agency still gets the data they need, but it arrives pre-interpreted, pre-branded, and in a format that naturally carries GWI's attribution into whatever downstream platform or presentation the agency builds. If the agency tries to strip out the branding and present the insight as their own, they lose the methodology context and the confidence metrics, which makes the insight less valuable.

**ALEX:** That's clever, but can't the agency just extract the data from the insight object and discard the branding?

**KEVIN:** They can, and some will try. Which is why the second move is equally important: build a Certified Partner Programme with tiered access. The concept is that agencies can access GWI data at different levels depending on their commitment to attribution and data governance.

At the base tier, you get basic data access through the standard API with full branding and provenance requirements. At the mid tier, you get richer data, custom segments, and priority support, but you commit to visible GWI attribution in any client-facing deliverable. At the top tier, you get raw-level access, custom methodology, and dedicated support, but you commit to a contractual attribution framework and you participate in co-selling, meaning GWI maintains a direct relationship with the end client even when the agency is the primary point of contact.

The key insight is that you're making the commercially attractive option, the deeper data access, contingent on the strategically important behavior, the visible attribution and co-selling. Agencies that strip your branding don't get better data. Agencies that embrace the partnership get access to capabilities their competitors don't.

---

### SEGMENT 3: PRICING MODEL SHIFTS (7 minutes)

**ALEX:** What about the pricing model? How does this change how you charge?

**KEVIN:** The pricing shift is critical and it's one of the most underappreciated levers in platform power dynamics. Most data companies price on consumption: pay per query, pay per data point, pay per seat. This model is inherently vulnerable because it creates an incentive for the customer to minimize their usage of your product, and it makes you directly comparable to alternatives on a per-unit cost basis.

The better model for a data company that wants to be an embedded intelligence layer is annual platform fees with value-based tiers. Instead of charging per query, you charge for access to a capability. "Access to our consumer insights intelligence layer for the automotive vertical" is a very different commercial conversation than "5,000 API calls per month." The platform fee reflects the value of the insight, not the cost of the data delivery.

Within the platform fee, you can include unlimited reasonable usage, which removes the consumption anxiety that drives customers to seek cheaper alternatives. And you can tier the fees based on the value you're providing: more markets, more custom segmentation, more predictive capabilities, all of which are intelligence-layer features that are hard to replicate.

This also changes the conversation with agencies. Instead of the agency negotiating to reduce their per-query cost, they're negotiating to get access to higher-value tiers. The power dynamic shifts from "how cheaply can we get your data" to "what additional capabilities can we unlock."

---

### SEGMENT 4: FIVE PRINCIPLES FOR B2B PLATFORM STRATEGY (10 minutes)

**ALEX:** Let's zoom out from the GWI example. What are the general principles here for any B2B SaaS company thinking about platform power dynamics?

**KEVIN:** There are five principles I'd apply to any data or software business.

Principle one: Own the intelligence layer, not just the data layer. If all you provide is raw material that someone else transforms into value, you're a commodity. The intelligence you build on top of your data, the methodology, the models, the interpretive frameworks, that's your real moat.

Principle two: Embed, don't just integrate. There's a huge difference between having an integration that lets a partner pull data from your system and having your intelligence layer embedded in the partner's workflow. Embedding means your value is visible and structural. Integration means you're a pipe that can be replaced.

Principle three: Make attribution commercially incentivized, not just contractually required. Contracts are enforcement tools of last resort. You want your partners to actively promote your attribution because doing so gives them access to better capabilities, better support, and better data. The best partnerships are ones where both sides benefit from the other's visibility.

Principle four: Maintain direct client relationships even when selling through channels. This is the most contentious point in channel dynamics, because your partners don't want you talking directly to their clients. But if you lose the direct relationship entirely, you lose the ability to upsell, to gather feedback, to understand how your data is being used, and ultimately to defend your position if the partner decides to switch to a competitor.

The way to handle this diplomatically is through what I call the Data Room model. For strategic accounts, you create a shared environment where both the agency and the end client can access insights, with the agency maintaining their advisory role and GWI maintaining their data provider role. It's a three-party relationship, not a two-party one with GWI excluded.

Principle five: Build semantic capabilities that can't be replicated by data access alone. This is the forward-looking play. If you invest in building a semantic query layer on top of your data, so that users can ask natural language questions like "which audience segments are growing fastest in Southeast Asia for sustainable fashion" and get intelligent, contextualized answers, you've created a capability that's fundamentally different from raw data access. The agency can't replicate this by downloading your data and building their own query interface, because the intelligence is embedded in how the system interprets and responds to questions.

---

### SEGMENT 5: COMPETITIVE DYNAMICS AND MULTI-AGENT ECOSYSTEMS (5 minutes)

**ALEX:** Let's talk about the competitive dynamics. What happens when multiple data providers are all trying to be the embedded intelligence layer in the same agency platform?

**KEVIN:** This is where it gets really interesting, and it's where the multi-agent architecture concepts from our last episode come directly into play. Imagine an agency platform where the consumer insights come from an agent powered by GWI, the media measurement comes from an agent powered by Nielsen, and the social listening comes from an agent powered by Brandwatch. Each agent is a specialist that contributes its unique intelligence to the agency's overall platform.

In this model, the competitive question isn't "do they choose us or Nielsen?" It's "how much of the platform's intelligence flows through our agent versus someone else's?" You want your agent to be the one that gets invoked most frequently, that provides the most valuable insights, and that the end users most trust.

This reframes the competitive dynamic from a zero-sum replacement game to a contribution game. And the way you win the contribution game is by being the most intelligent, most responsive, most deeply integrated agent in the ecosystem. Which takes us back to the multi-agent architecture: your agent needs to be excellent at its specialty, seamlessly integrated with the orchestration layer, and constantly improving through the feedback loops we discussed in Episode 2.

---

### SEGMENT 6: DEFENDING AGAINST LLM DISRUPTION AND THE PE CONNECTION (5 minutes)

**ALEX:** What about the risk of disintermediation from the other direction? What if the LLM providers themselves, OpenAI, Anthropic, Google, start offering consumer insights directly by training on publicly available data?

**KEVIN:** This is the existential question for every data company, and the honest answer is that the risk is real but the timing and magnitude are uncertain.

Here's why I think specialized data companies still have a defensible position. First, the data itself is proprietary. GWI's consumer survey data doesn't exist on the public internet. An LLM trained on web data can tell you general things about Gen Z, but it can't tell you the specific, quantified, methodologically rigorous insights that come from a structured, representative survey panel across 50 markets. The data advantage is real and durable as long as you're investing in data collection and curation.

Second, the methodology matters. There's a massive difference between "the internet seems to think Gen Z cares about sustainability" and "47 percent of Gen Z consumers in the UK ranked sustainability as a top-3 purchase factor, up 6 points year-over-year, with statistically significant variation by income bracket." The latter requires survey design expertise, sampling methodology, weighting algorithms, and quality control processes that have been refined over years. This is institutional knowledge that can't be replicated by training on web data.

Third, and this connects back to the AI story, the companies that build the best intelligence layers on top of their proprietary data will be the ones that are most defensible against LLM commoditization. If your value is raw data, an LLM might be able to approximate it. If your value is a sophisticated intelligence layer that combines proprietary data with deep domain expertise and delivers contextualized, actionable insights, that's a much harder thing to replicate.

**ALEX:** Last question. How does all of this connect to the PE value creation framework we discussed in Episode 1?

**KEVIN:** Directly. Platform power dynamics are fundamentally about building and protecting competitive moats, which is one of the key drivers of multiple expansion at exit.

A PE firm evaluating a data company will look at exactly these dynamics. How dependent is the company on channel partners? How sticky are the end-client relationships? How defensible is the data asset? How sophisticated is the intelligence layer? Can the company maintain pricing power, or is it being commoditized by its own partners?

If you're a product leader at a PE-backed data company, your job is to systematically strengthen the company's position on each of these dimensions. Shift from data supplier to embedded intelligence layer. Build commercial incentives for attribution. Maintain direct client relationships. Invest in semantic capabilities that compound over time. Every one of these moves increases the exit multiple because it makes the business more defensible, more differentiated, and more valuable to a potential acquirer.

The companies that figure this out don't just protect their existing value. They expand it dramatically. Because an embedded intelligence layer that's deeply integrated into agency workflows, with strong attribution, direct client relationships, and AI-powered semantic capabilities, is worth significantly more than a data supplier selling CSV files through an API.

**ALEX:** Kevin, this has been a masterclass in platform strategy. In our next episode, we're diving into AI-native product management, how the role of the product manager is fundamentally changing when AI is embedded in every workflow. See you then.

---

*End of Episode 3*
