# Episode 15: Make the Contract Buyable

**Duration:** ~28 minutes
**Hosts:** Morgan & Kevin
**Podcast:** AP & Finance Mastery — Season 2: The CFO Spend Control Tower

[INTRO MUSIC]

### The First Purchase After the Award

**MORGAN:** Three days after Calder announced the MRO awards, a maintenance planner needed replacement bearings. He searched the purchasing system using the machine's old part description. The newly awarded equivalent did not appear. The national supplier's catalog was not loaded, the cross-reference lived in an engineer's spreadsheet, and the local incumbent still answered the phone. The planner bought from the incumbent at the old price, then asked for a purchase order after delivery so the invoice could be paid.

**KEVIN:** Procurement had a signed award, finance had a negotiated-value schedule, and the employee had no usable route to comply. The transaction was rational from his point of view. Production mattered more than hunting through our implementation debris.

**MORGAN:** That is the cold consequence from Episode Fourteen. Calder sourced the value but gave it nowhere to go. In field services, the problem was worse. A site manager called the familiar technician directly. The new contract described rates and response tiers, but the requisition form did not capture asset, site, certification, service window, or evidence of completion. A generic PO line could be created, but it could not govern or match the service.

**KEVIN:** So Calder proposed the classic cure: no PO, no pay. Mandatory purchase orders for everything.

**MORGAN:** Within two weeks, PO coverage appeared to improve. So did after-the-fact orders. Employees created POs from invoices, approvers clicked through because the work had already occurred, and negotiated prices were copied incorrectly. The policy added control theatre after the commercial decision was irreversible.

**KEVIN:** A retrospective PO is not authorization. It is an invoice transcription with an approval attached.

**MORGAN:** Exactly. At Month Six the CFO pack showed two point four million dollars of cumulative program spend, four hundred thousand dollars of finance-validated recurring benefit, three point four million negotiated in the two category waves, two point five million approved for staged implementation, contract compliance still at sixty-seven percent, and annual maverick spend still running near the ninety-two-million-dollar baseline. Six metrics, one conclusion: an award is not realized value.

**KEVIN:** Our question is how an awarded term survives into an employee's actual purchase.

[MUSIC STING]

### A Contract Is Not Yet a Control

**KEVIN:** I used to think implementation meant the contract was signed, stored, and communicated.

**MORGAN:** Those are necessary states, not sufficient ones. A contract creates obligations and rights. A buying control must translate the relevant obligations into the moment of choice. Who may buy? From which supplier? What item or service? At what price and term? Against which budget? With what evidence? Under what exception? Who owns receipt? What happens when the need does not fit the standard path?

**KEVIN:** If those answers remain inside a PDF, the employee is expected to interpret commercial language while trying to do a job.

**MORGAN:** And the invoice becomes the first machine-readable evidence that the business ignored the deal. At that point Calder can reject, dispute, or approve an exception, but it cannot recover all of the leverage procurement negotiated.

**KEVIN:** This is where Contract Management and Procurement have different jobs. Medius's current Contract Management materials describe templates, a central repository, DocuSign integration, permissions, version tracking, reporting, linked agreements, milestones, and renewal alerts. That preserves the authoritative agreement and its lifecycle.

**MORGAN:** Medius Procurement's current materials describe guided search, catalogs and supplier punchouts, requisitions, automated approval, budget limits, POs, receipts, dashboards, and connection to AP matching. That turns selected contract terms into a transaction path. A repository can tell you the right price. A guided channel can make the right price the default choice.

**KEVIN:** Neither product decides Calder's policy. We still need to determine which spend belongs in which channel and how an exception is authorized.

**MORGAN:** Correct. Shared technology helps, but the operating contract is ours.

### The Three Policy Choices

**MORGAN:** Calder faced three credible options. Option one was a PO for everything. It offered a simple message, broad pre-approval, and an apparent control metric. It also treated a catalog bearing, a regulated calibration service, a utility bill, and a tax payment as though they were the same transaction.

**KEVIN:** Option two was local freedom. Let sites use their existing processes and rely on budget accountability plus downstream AP review. That preserved speed and local knowledge, especially in emergencies. It also preserved fragmented suppliers, off-contract prices, weak commitment visibility, and inconsistent evidence.

**MORGAN:** Option three was guided channels by spend type and risk. Catalog or punchout for repeat goods. Requisition for noncatalog purchases. Blanket order and service entry for recurring services. Controlled card for low-value employee spend. Approved non-PO paths for defined obligations. Emergency bypass with retrospective review, not retrospective authorization disguised as a normal PO.

**KEVIN:** The third option is harder to design and easier for employees to use once designed. It accepts that control should vary with the transaction.

**MORGAN:** Pause before Calder's call. Choose one: universal PO, local freedom, or guided channels. For your choice, state which behavior you expect from an employee under time pressure and what evidence finance receives before commitment.

[PAUSE]

**KEVIN:** Guided channels. A universal control that produces workarounds is not strong. I want each material spend type to have a governed route whose friction is proportionate to risk. The compliant path should be the easiest path for normal work.

**MORGAN:** That became Calder's canonical call. Distinct governed paths for catalog, punchout, requisition, blanket order, service entry, card, and approved non-PO spend. No generic channel metric without testing whether price, supplier, budget, receipt, and approval were actually controlled.

### Build the Obligation Register

**KEVIN:** The first artifact was the contract-obligation register. Not a list of contracts—a list of operational obligations that must survive into transactions.

**MORGAN:** Each record included contract and supplier identity, entity and site scope, effective and expiry dates, item or service coverage, approved price or pricing formula, indexation, volume tier, freight treatment, payment term, discount, service level, evidence requirement, insurance or certification, renewal rule, obligation owner, buying channel, invoice-match rule, and exception authority.

**KEVIN:** We also tagged whether an obligation could be enforced automatically, monitored analytically, or required human judgment. A fixed catalog price can be checked automatically. A response-time commitment can be monitored from service events. Whether technical advice met an engineering need requires judgment.

**MORGAN:** Exactly. Do not translate prose into a false binary control. Some terms are deterministic. Some need measured performance. Some only become relevant under a specific event. The register makes that distinction explicit.

**KEVIN:** Calder discovered three uncomfortable contract gaps. Several awards had no named business owner after signature. Some rate cards lacked a stable service code. And freight terms were commercially agreed but not represented consistently in POs or invoice matching.

**MORGAN:** Which meant the contract was legally valid but not operationally buyable. The register created an implementation backlog. No contract was called live until its material obligations had an owner, channel, system representation, evidence route, and exception path.

**KEVIN:** That changes the implementation date. Signature is contract execution. Operational release is when the approved transaction path works.

**MORGAN:** Good. Finance then knows which portion of negotiated value is genuinely available for use. Procurement can stop treating a repository upload as value realization.

### Seven Channels, Seven Control Designs

**MORGAN:** Calder's buying-channel policy became artifact two. The catalog channel covered repeat, standardized goods with approved suppliers, items, prices, units, and delivery rules. The employee searched a familiar description, saw the approved equivalent, selected a quantity, and the system applied the contract.

**KEVIN:** Punchout handled supplier-hosted catalogs where assortment or configuration changed frequently. The user entered through Calder's procurement workflow, shopped on the supplier experience, and returned a controlled cart for budget and approval. The commercial guardrails remained Calder's even though the content lived with the supplier.

**MORGAN:** Requisition covered noncatalog goods and one-time services requiring competition, specification, or approval before order. The form asked for the evidence needed to route the decision rather than presenting one generic text box.

**KEVIN:** Blanket orders covered predictable recurring demand within a defined ceiling, supplier, period, and scope. They reduced repetitive approvals without granting unlimited discretion. Release consumption was monitored against value, quantity, and expiry.

**MORGAN:** Service entry handled work whose completion mattered more than physical receipt. The requester identified the asset, site, service code, date, outcome, certificate where required, and accepted quantity or milestone. The invoice could then match against a commercial line and evidence that the service occurred.

**KEVIN:** Controlled cards handled low-value, low-risk purchases where issuing a PO cost more than the control value. Merchant category, transaction amount, time, budget, and user limits were set before spend. Receipt and purpose evidence still reconciled afterward. A card was a channel with controls, not an exception from procurement.

**MORGAN:** Approved non-PO paths covered obligations where a PO added little: certain utilities, statutory payments, rent under a governed lease, and other enumerated cases. Supplier, account, approver, cadence, tolerance, and evidence were predefined. Anything outside the list entered an exception route.

**KEVIN:** And emergency spend?

**MORGAN:** A distinct emergency path. Named roles could commit within limits to protect safety, production, or customer service. They recorded reason and supplier at commitment, not after the invoice arrived. A rapid retrospective review tested whether the emergency was valid and whether repeated use indicated a missing normal channel. We never called the later review pre-approval.

### Design for the Employee's Real Job

**KEVIN:** Artifact three was the guided-buying journey. We mapped it from the employee's need, not from module navigation.

**MORGAN:** The planner did not wake up wanting a requisition. He wanted a bearing compatible with a machine before a planned shutdown. The site manager wanted a certified technician inside a response window. The interface had to recognize those jobs and ask only decision-relevant questions.

**KEVIN:** For MRO, Calder indexed old descriptions, manufacturer references, machine bills of material, and approved equivalents to the new catalog. Search returned the compliant item first, showed availability and delivery, and made the emergency route visible when the normal service could not meet the need.

**MORGAN:** For calibration, the guided request began with asset and site. That determined certification, service tier, available suppliers, pricing unit, and required completion evidence. The requester did not choose a vague free-text service and hope AP decoded it later.

**KEVIN:** We measured time to complete, abandonment, search failure, exception use, and support contacts. A process can be compliant on paper and unusable in practice.

**MORGAN:** We also interviewed people who bypassed it. Not to shame them—to learn where the policy failed. One local buyer used an incumbent because the approved supplier could not deliver to a remote site. That was a legitimate coverage gap. Another used free text because the catalog synonym was missing. That was product data. A third split an order to remain below approval. That was control circumvention.

**KEVIN:** Same observable outcome, different response. Fix coverage. Improve search. Investigate circumvention. If we simply report maverick spend, we hide the mechanism.

**MORGAN:** The canonical principle is not zero friction. It is intentional friction. Routine compliant purchases should be fast. High-risk commitments should earn scrutiny. Exceptions should reveal design gaps or misconduct rather than disappear into generic approval.

### Why the Mandatory-PO Metric Lied

**MORGAN:** Calder's mandatory-PO pilot initially reported eighty-one percent PO compliance in two plants. Transaction testing showed that eighteen percentage points were after-the-fact POs created after goods or services were received.

**KEVIN:** So only sixty-three percent represented a PO before commitment. Even that did not prove contracted price or approved supplier.

**MORGAN:** Correct. Another group of POs used a one-dollar placeholder or generic line, then changed value later. Some used the right supplier but the wrong item. Others were issued before invoice but after a verbal commitment. A simple PO-present flag rewarded the appearance of control.

**KEVIN:** We replaced it with a control sequence: approved supplier, valid channel, authorization before commitment, contract price or governed exception, receipt or service evidence, and invoice match within tolerance.

**MORGAN:** We kept PO-backed invoice lines as an operating metric because it remains useful, but we refused to treat it as the complete compliance outcome. By Month Eight, PO-backed invoice lines rose from forty-four to fifty-five percent. Contract compliance rose from sixty-seven to seventy-five percent. Those movements mattered because transaction samples showed more purchases using loaded terms before commitment.

**KEVIN:** Annual maverick-spend run rate fell from ninety-two million to seventy million dollars. That is a twenty-two-million reduction in off-path buying, not a twenty-two-million benefit.

**MORGAN:** Important. Redirected spend may capture contract value, improve control, or simply change the channel. The benefit is the evidenced price, demand, fee, or process change attributable to compliance. Spend brought under control is an input to value, not value itself.

### The Savings-Realization Waterfall

**KEVIN:** Artifact four was the savings-realization waterfall. We began with the three point four million dollars negotiated in the two sourcing waves.

**MORGAN:** Then each lever moved through states. Negotiated: the commercial agreement exists against a governed baseline. Implementable: the organization approves the change and funds any transition. Loaded: supplier, item, rate, term, budget, and channel are correctly represented. Available: the relevant users and sites can transact. Compliant: eligible demand actually uses the route. Realized: paid or accrued transactions show the expected change. Validated: finance accepts attribution, recurrence, and accounting treatment.

**KEVIN:** A lever could fall out at every stage. An awarded supplier failed qualification in one region. A service rate was loaded, but a site lacked the required service-entry role. A catalog was live, but search failures drove users to free text. Eligible volume came in below the bid assumption. Some price gains were offset by demand mix.

**MORGAN:** That is not administrative leakage. It is the economic distance between an award and enterprise value. The waterfall assigns each gap to an owner. Procurement owns commercial clarity. Contract owners own obligations. Procurement operations owns channel configuration. Business owners own adoption and demand. AP identifies invoice variance. Finance validates value.

**KEVIN:** By Month Eight, two point two million dollars of the two-wave negotiated value had been implemented into usable channels. The cumulative recurring-benefit ledger reached one point four million dollars: one hundred thousand from supplier-service capacity, nine hundred thousand from finance-validated sourcing and demand changes, and four hundred thousand from contract and guided-buying compliance.

**MORGAN:** Do not infer that the full two point two million was realized. Implementation made value available. The one point three million from the two sourcing and compliance lanes was the amount that had survived transaction evidence and finance review by that date.

**KEVIN:** And the final program bridge is still open. The season's Month Eighteen target for sourcing and demand is one point seven million, and contract plus guided-buying compliance is eight hundred thousand. We are not pulling future value forward.

**MORGAN:** Correct. Continuity is a control too.

**KEVIN:** We also had to decide what happened when the contract register, catalog, supplier punchout, requisition, and invoice disagreed. Without a precedence rule, every team could select the field that made its own dashboard look right.

**MORGAN:** Calder made the signed, effective agreement authoritative for the commercial obligation, but not automatically authoritative for every operational field. The supplier identity came from the governed supplier master. The approved item and current transactional price came from released procurement content traceable to that agreement. The budget and authority came from the current finance and identity records. Receipt came from the accountable business owner. Each system held a bounded truth and every critical field carried provenance.

**KEVIN:** A catalog price that differed from the contract was therefore not silently accepted because the catalog was convenient. The transaction stopped before commitment, the content owner received an exception, and the buyer saw an honest service message with the emergency alternative where appropriate.

**MORGAN:** That mattered because Calder's first instinct had been a nightly synchronization that would overwrite differences automatically. It would have created visual consistency while concealing which source was wrong. Reconciliation is not copying. It is comparing authoritative claims, resolving the conflict, recording the decision, and then propagating the corrected value.

**KEVIN:** The same discipline applied to amendments. A buyer could not upload a new rate card directly into a catalog and call it current. The amendment required effective dates, scope, approval, version linkage, implementation ownership, test transactions, and a rollback route. Future prices could be staged without affecting today's orders. Expired terms could not remain selectable merely because content operations missed a ticket.

**MORGAN:** We sampled the first fifty purchases across both category waves. Twelve found a contract-content conflict, seven exposed a missing site or service code, five entered an inappropriate channel, and four required a legitimate emergency path. That sample did not become a benefit claim. It became the implementation backlog and the evidence that broad communication alone would not have changed behavior.

**KEVIN:** It also changed governance. Contract owners met weekly with procurement operations, AP, finance, and the two category leads until failure rates fell inside tolerance. The meeting did not review slide status. It reviewed transactions that failed to carry the award into payment, named the broken obligation or channel, assigned a repair, and tested the next transaction.

**MORGAN:** That is the operating distinction. Contract lifecycle management protects the agreement. Guided procurement presents an approved choice. AP observes whether the choice survived. Finance determines whether the economic result is real. None of those controls can impersonate the others.

### The Decision Memo

**MORGAN:** Calder's Month Eight decision memo read as follows. Choice: govern spend through distinct catalog, punchout, requisition, blanket-order, service-entry, controlled-card, and approved non-PO channels. Retire the universal mandatory-PO pilot as the default design.

**KEVIN:** Owner: the procurement operations lead, with contract owners accountable for obligation translation, business budget owners accountable for adoption, and finance accountable for validation.

**MORGAN:** Spend: one point three million dollars of additional program investment, taking cumulative spend from two point four to three point seven million. It covered contract data, channel configuration, catalog and service content, integration, testing, enablement, and operating support.

**KEVIN:** Target: by Month Eight, contract compliance at seventy-five percent, PO-backed invoice lines at fifty-five percent, annual maverick-spend run rate at seventy million dollars, and cumulative finance-validated recurring benefit at one point four million.

**MORGAN:** Guardrail: no channel metric counts as compliance unless authorization precedes commitment and supplier, price or term, budget, and receipt evidence satisfy the applicable policy. Emergency and approved non-PO paths remain visible rather than being forced into false POs.

**KEVIN:** Stop condition: pause a channel rollout if employees cannot complete normal purchases within the agreed service level, if after-the-fact POs exceed tolerance, if contract data cannot support accurate buying, or if critical operations lack a viable exception route.

### Update the CFO Pack and Ledgers

**KEVIN:** Month Eight CFO pack, six metrics. Cumulative program spend: three point seven million dollars. Finance-validated recurring benefit: one point four million. Contract compliance: seventy-five percent. PO-backed invoice lines: fifty-five percent. Maverick-spend annual run rate: seventy million. Fully validated active suppliers remain at least the seventy-eight percent achieved at Month Four while expansion continues.

**MORGAN:** Program ledger: the additional one point three million advances sourcing and contract value capture, procurement and guided buying, and adoption. Total remains inside the fixed seven point five million envelope.

**KEVIN:** Benefits ledger: one point four million recurring, separated by lane. One hundred thousand supplier-service capacity, nine hundred thousand sourcing and demand reduction, four hundred thousand contract and guided-buying compliance. No working-capital release. No avoided fraud. No reclassification of the twenty-two-million reduction in maverick spend.

**MORGAN:** Operating ledger: contract compliance moved eight points from baseline to seventy-five. PO-backed lines moved eleven points to fifty-five. Maverick run rate fell twenty-two million to seventy million. These are drivers and control outcomes, not automatically P-and-L benefits.

**KEVIN:** The negotiated and implementation ledgers stay visible too. Three point four million negotiated from the first waves. Two point two million loaded and operationally available by Month Eight. One point three million from sourcing plus compliance accepted as recurring benefit so far.

**MORGAN:** That reconciliation tells the board what happened to the award instead of presenting one number at every stage.

### Operator Drill: Make One Contract Transactable

**MORGAN:** Your drill begins with one material contract that employees routinely bypass. Produce four artifacts. First, an obligation register. Extract every term that changes supplier eligibility, item or service choice, price, quantity, timing, approval, evidence, payment, performance, renewal, or risk.

**KEVIN:** For each obligation, name the owner and label the enforcement mode: automatic control, monitored signal, or human judgment. Then identify whether the term exists in the contract only, in master data, in the buying channel, in AP matching, or nowhere operational.

**MORGAN:** Second, write the buying-channel policy for that demand. Choose catalog, punchout, requisition, blanket order, service entry, controlled card, approved non-PO, or a combination. Define the normal path, emergency path, approval threshold, evidence, and exception owner.

**KEVIN:** Third, draw the guided-buying journey from the employee's job. Time a real user. Record search failures, unclear fields, abandoned requests, support calls, and bypass points. Make the compliant supplier, item, price, and service level visible at the decision moment.

**MORGAN:** Fourth, build the savings waterfall. Start with negotiated value and create gates for implementable, loaded, available, compliant, realized, and finance validated. Attach a transaction source, formula, owner, and failure reason to every movement.

**KEVIN:** Then run three tests. Can a normal user complete the purchase without reading the contract? Can finance prove authorization occurred before commitment? Can AP match the invoice without inventing missing commercial or receipt evidence?

**MORGAN:** If any answer is no, the contract is not buyable. Do not train around a broken design. Repair the obligation data, channel, or evidence route. Training is for a usable process, not compensation for product failure.

**KEVIN:** The durable output is a buying-channel policy, contract-obligation register, guided-buying journey, and savings-realization waterfall. It should remain useful when the next contract, supplier, or site is added.

### AP Sends the System's Error Report

**KEVIN:** By Month Eight, more employees used the new channels. The result was not immediate calm. AP began receiving a more informative class of exceptions. Catalog goods matched better, but service invoices waited for completion evidence. Some POs carried the right contract but the wrong tax treatment. Supplier records were governed, yet site-level remit and ordering details were incomplete. Approvals accumulated where authority rules did not reflect reorganized teams.

**MORGAN:** The reported touchless number still looked attractive because capture succeeded. End-to-end flow told a harder story. Every unresolved upstream design choice arrived in AP as a queue item, close risk, supplier inquiry, or payment delay.

**KEVIN:** The tempting response is to tune extraction and automate more approvals. That would move invoices faster.

**MORGAN:** Including repeatable bad data. Episode Sixteen asks whether Calder should optimize capture accuracy, its reported touchless number, or total exception economics. AP is about to become the learning loop for supplier, contract, PO, receipt, coding, tax, and approval design.

[OUTRO MUSIC]
