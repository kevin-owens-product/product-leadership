# Episode 9: API Design Best Practices
## "Building Interfaces Developers Love - The Art of API Design"

**Duration:** ~60 minutes
**Hosts:** Alex Chen (Technical Expert) & Sam Rivera (Product Leadership Perspective)

---

### INTRO

**[THEME MUSIC FADES]**

**SAM:** Welcome back to Tech Leadership Unpacked. I'm Sam Rivera. We're in the home stretch - episode nine. Today we're talking about API design, and I'll admit, this might seem deeply technical, but APIs are increasingly a product concern.

**ALEX:** I'm Alex Chen. Sam's right. If you have external developers, partners, or even internal teams consuming your services, your API is a product. A well-designed API creates leverage - people can build on your platform. A poorly designed API creates friction, support burden, and abandoned integrations.

**SAM:** So how do we build APIs that developers love?

**ALEX:** That's exactly what we'll cover. We'll talk principles that apply whether you're building REST, GraphQL, or internal services.

---

### SEGMENT 1: API DESIGN PRINCIPLES (12 minutes)

**SAM:** Let's start with principles. What makes a good API?

**ALEX:** Several qualities matter.

**Consistency** - the API behaves predictably. If one endpoint returns paginated results with `{data: [], pagination: {}}`, all endpoints do. If one uses camelCase, all do. Consistency reduces cognitive load.

**SAM:** That seems obvious. Why does it go wrong?

**ALEX:** Different teams building different endpoints. No style guide. Rushing to ship. You end up with `/users` returning `{users: []}` and `/products` returning `{items: []}`. Small inconsistencies multiply into confusion.

**ALEX:** **Intuitiveness** - developers can guess how things work. If you know how to list users, you can guess how to list products. Following conventions and patterns makes APIs learnable.

**SAM:** What conventions matter?

**ALEX:** Industry standards like REST conventions, HTTP verb semantics, status codes. If your API uses POST for everything and returns 200 for errors, you're fighting expectations.

**ALEX:** **Simplicity** - the API does what's needed without unnecessary complexity. Every optional parameter, every configuration flag, every edge case you support has a maintenance cost. Start simple, add complexity only when needed.

**SAM:** Isn't more flexibility better?

**ALEX:** Flexibility has costs. More ways to do things means more ways to do things wrong, more documentation needed, more support questions. Opinionated APIs that guide users toward the right path are often better.

**ALEX:** **Evolvability** - the API can change without breaking existing users. You'll always need to add features, fix mistakes, evolve the product. Good API design anticipates change.

**SAM:** How do you design for change?

**ALEX:** Versioning strategies, additive-only changes, deprecation policies. We'll dig into these.

**ALEX:** **Documentation** - this isn't really a property of the API itself, but it's inseparable. An undocumented API barely exists. Documentation is part of the product.

---

### SEGMENT 2: REST API DESIGN (15 minutes)

**SAM:** REST is still the most common API style, right? Let's go deep there.

**ALEX:** Yes, REST dominates. Let's cover how to do it well.

**Resources and URLs.** REST is resource-oriented. URLs identify resources, not actions. Nouns, not verbs.

Good: `/users/123` - the user resource
Bad: `/getUser?id=123` - RPC-style verb in URL

**SAM:** What about actions like "send email" or "archive"?

**ALEX:** This is where REST gets tricky. Options:

**Model as resource state change.** Archive a user = PATCH `/users/123` with `{archived: true}`.

**Model as sub-resource.** Send email = POST `/users/123/emails`.

**Accept non-RESTful actions** for truly action-oriented operations. POST `/users/123/send-reminder`. Not pure REST, but pragmatic.

**ALEX:** **HTTP Methods.** Use them correctly:

**GET** - retrieve data. Must be safe and idempotent - calling it twice shouldn't change anything.

**POST** - create new resources, or perform actions.

**PUT** - replace an entire resource.

**PATCH** - partial update to a resource.

**DELETE** - remove a resource.

**SAM:** What's the difference between PUT and PATCH in practice?

**ALEX:** PUT: "Here's the complete new state." You send all fields, missing fields might be set to null.

PATCH: "Update these specific fields." You send only what's changing.

PATCH is usually what you want for updates. PUT is for complete replacement.

**ALEX:** **Status Codes.** Use them meaningfully:

**2xx** - Success. 200 OK, 201 Created, 204 No Content.
**3xx** - Redirection. 301, 302 for moved resources.
**4xx** - Client errors. 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Validation Error.
**5xx** - Server errors. 500 Internal Error, 503 Service Unavailable.

**SAM:** I've seen APIs that return 200 with error messages in the body.

**ALEX:** That's an anti-pattern. Status codes exist for a reason. Clients and infrastructure (caches, load balancers, monitoring) rely on them. If you return 200 for errors, retries won't work correctly, caching breaks, and clients can't trust responses.

**ALEX:** **Request and Response Design.**

Use JSON - it's the standard. Design clear, predictable response structures.

Envelope or no envelope? Some APIs wrap everything: `{data: {}, meta: {}}`. Others return data directly. Both work; pick one and be consistent.

**SAM:** What about errors?

**ALEX:** Errors should be structured and helpful:
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Email is invalid",
    "details": [
      {"field": "email", "issue": "must be a valid email address"}
    ]
  }
}
```

Machine-readable codes for programmatic handling. Human-readable messages for debugging. Details for complex errors.

---

### SEGMENT 3: PAGINATION, FILTERING, SORTING (10 minutes)

**SAM:** List endpoints seem straightforward but can get complex. How do you handle pagination?

**ALEX:** Several patterns:

**Offset pagination.** `?offset=20&limit=10` - skip 20, get 10. Simple, but has problems: skipping millions of rows is expensive, and pages shift if items are added/removed.

**Page-based.** `?page=3&per_page=10` - similar issues to offset, just different parameters.

**Cursor-based.** `?cursor=abc123&limit=10` - the cursor is an opaque pointer to a position. Fast for any position, stable if items change. Preferred for large datasets or real-time data.

**SAM:** How do you implement cursor pagination?

**ALEX:** The cursor encodes position - often the ID or timestamp of the last item. "Give me 10 items after this one." The response includes the next cursor. Client uses it for the next page.

**SAM:** What about filtering?

**ALEX:** Several approaches:

**Query parameters.** `?status=active&type=admin` - simple key-value filters.

**Filter parameter.** `?filter[status]=active&filter[created_after]=2023-01-01` - namespaced filters.

**Query language.** `?filter=status:active AND created>2023-01-01` - powerful but complex.

Start simple. Elaborate query languages are rarely worth the complexity unless you're building a search API.

**SAM:** And sorting?

**ALEX:** Common patterns:

`?sort=created_at` - ascending by created_at
`?sort=-created_at` - descending (dash prefix)
`?sort=status,-created_at` - multiple fields

Be explicit about defaults. Document what's sortable - not everything should be.

**SAM:** What about including related data?

**ALEX:** This is a big topic. Options:

**Nested data.** Include related data in the response: user includes their posts.

**Links.** Provide URLs to related resources: `{"posts_url": "/users/123/posts"}`.

**Sparse fieldsets.** `?fields=id,name,email` - return only requested fields.

**Include parameter.** `?include=posts,comments` - embed related resources.

Trade-offs: nested data is convenient but can be huge. Separate requests add latency. Choose based on typical use cases.

---

### SEGMENT 4: GRAPHQL AND ALTERNATIVES (10 minutes)

**SAM:** REST isn't the only option. What about GraphQL?

**ALEX:** GraphQL is a query language for APIs. Instead of fixed endpoints returning fixed shapes, clients request exactly what they need.

**SAM:** Example?

**ALEX:** Client sends:
```graphql
query {
  user(id: "123") {
    name
    email
    posts(first: 5) {
      title
      publishedAt
    }
  }
}
```

Server returns exactly that shape. No over-fetching (getting data you don't need) or under-fetching (needing multiple requests).

**SAM:** When does GraphQL make sense?

**ALEX:** Strong use cases:

**Diverse clients with different needs.** Mobile wants minimal data, web wants more, admin wants everything.

**Complex, interconnected data.** Graph-like relationships where REST gets awkward.

**Rapid frontend iteration.** Frontend can change data requirements without backend changes.

**SAM:** What are the downsides?

**ALEX:** **Complexity.** Setting up a GraphQL server is more involved than REST. Schema definition, resolvers, tooling.

**Caching is harder.** HTTP caching works great with REST. GraphQL's variable queries make standard caching tricky.

**N+1 query problems.** Naive implementations can generate many database queries. Need dataloader patterns.

**Security concerns.** Clients can request deeply nested queries that overload the server. Need query complexity limits.

**SAM:** So when would you choose REST over GraphQL?

**ALEX:** Simple CRUD APIs. Public APIs where documentation and simplicity matter. Cases where HTTP caching is important. When the team doesn't have GraphQL expertise.

**SAM:** What about gRPC?

**ALEX:** gRPC is a high-performance RPC framework using Protocol Buffers. Binary format, schema-first, code generation, streaming support.

Good for: internal service-to-service communication, low-latency requirements, polyglot environments where generated clients help.

Less good for: browser clients (though possible with gRPC-web), public APIs where JSON is expected.

**SAM:** Any guidance on choosing?

**ALEX:** My defaults:

**Public APIs → REST.** Widest compatibility, simplest tooling.
**Client-driven needs, complex data → GraphQL.**
**Internal services, performance-critical → gRPC.**

But context matters. Use what your team knows and what fits the problem.

---

### SEGMENT 5: VERSIONING AND EVOLUTION (10 minutes)

**SAM:** How do you handle API changes over time?

**ALEX:** This is one of the hardest parts of API design. Once an API is in use, changing it is painful.

First principle: **Prefer additive, non-breaking changes.** Add new fields, new endpoints, new parameters. Don't remove or rename existing ones.

**SAM:** What counts as a breaking change?

**ALEX:** Removing or renaming fields. Changing field types. Changing required/optional status. Changing response structure. Removing endpoints. Changing error formats.

**SAM:** How do you handle breaking changes when you need them?

**ALEX:** **Versioning.** Common strategies:

**URL versioning.** `/v1/users`, `/v2/users`. Clear, cacheable, but ugly URLs and harder to migrate incrementally.

**Header versioning.** `Accept: application/vnd.api+json; version=2`. Cleaner URLs but less visible, harder to test.

**Query parameter.** `?api_version=2`. Simple but not RESTful.

**SAM:** Which do you prefer?

**ALEX:** URL versioning for clarity, especially for public APIs. Internal APIs can use headers or content negotiation.

**ALEX:** **Deprecation policies** are critical. When you version:

1. Announce deprecation with timeline
2. Add deprecation headers to old version responses
3. Provide migration guide
4. Monitor usage of old version
5. Sunset when usage is low enough

**SAM:** How long should you support old versions?

**ALEX:** Depends on your users. Internal APIs can move faster. Public APIs with enterprise customers might need years. Set expectations upfront and stick to them.

**ALEX:** **Compatibility strategies:**

**Request compatibility.** Accept old and new request formats. Convert internally.

**Response compatibility.** Return new fields alongside old ones. Clients can migrate gradually.

**SAM:** What about field defaults?

**ALEX:** Tricky area. If you add a required field to a creation request, that's breaking. Solutions: make new fields optional with defaults, or gate behind feature flags or versions.

---

### SEGMENT 6: AUTHENTICATION AND SECURITY (8 minutes)

**SAM:** We have a whole episode on security, but let's touch on API-specific concerns.

**ALEX:** Key considerations:

**Authentication patterns.**

**API Keys** - simple, good for server-to-server. Pass in header (not URL - URLs get logged). Easy to revoke.

**OAuth 2.0** - standard for delegated authorization. User grants app permission. Tokens have scopes. Refresh tokens for long-lived sessions.

**JWTs** - JSON Web Tokens. Self-contained tokens with claims. Verify signature, no database lookup needed. But revocation is tricky.

**SAM:** Which should we use?

**ALEX:** API keys for simple integrations, especially internal. OAuth for user authorization, especially if third parties access user data. JWTs often paired with OAuth as the token format.

**ALEX:** **Authorization** - who can do what:

**RBAC** - Role-Based Access Control. Users have roles, roles have permissions.

**ABAC** - Attribute-Based Access Control. Policies based on attributes of user, resource, environment.

**Resource-level permissions** - can this user access this specific resource?

Return 403 Forbidden for authorization failures, 401 Unauthorized for authentication failures.

**ALEX:** **Rate limiting** - prevent abuse:

- Limit by API key, user, IP
- Return 429 Too Many Requests
- Include retry-after headers
- Provide clear documentation of limits

**ALEX:** **HTTPS everywhere.** No exceptions. API keys and tokens over HTTP are exposed. HSTS headers to enforce.

**SAM:** What about input validation?

**ALEX:** Validate everything. Type checking, length limits, allowed values. Return clear validation errors. Never trust client input. This prevents security issues and improves developer experience.

---

### SEGMENT 7: DOCUMENTATION AND DX (8 minutes)

**SAM:** Let's talk about documentation. You said it's part of the product.

**ALEX:** Maybe the most important part for external APIs. Good docs = adoption. Bad docs = support tickets.

**What to document:**

**Getting started** - quick path to first successful call. Authentication, hello world example.

**Authentication** - how to get credentials, how to use them.

**Reference** - every endpoint, request format, response format.

**Guides** - how to accomplish common tasks, workflows.

**Examples** - code samples in multiple languages.

**Errors** - every error code, what causes it, how to fix.

**Changelog** - what changed in each version.

**SAM:** What tools are standard?

**ALEX:** **OpenAPI (Swagger)** - spec for describing REST APIs. Tools generate docs, SDKs, mocks from the spec.

**Redoc**, **Slate**, **ReadMe** - documentation platforms.

**Postman** - collections for interactive testing and documentation.

**SAM:** Should we generate SDKs?

**ALEX:** For major platforms - JavaScript, Python, Ruby, Go - SDKs dramatically improve developer experience. Generated from OpenAPI or hand-crafted for polish.

**ALEX:** **Interactive documentation** is powerful. Try-it-out features in docs let developers experiment without writing code. Reduces time to first successful call.

**SAM:** What makes documentation great?

**ALEX:** Clear, concise writing. Realistic examples. Good search. Up-to-date with the actual API. Version-matched. Quick path to solving real problems.

**ALEX:** **Developer experience (DX)** goes beyond docs:

- Sandbox environments for testing
- Webhook testing tools
- CLI tools for common operations
- Clear error messages that guide solutions
- Responsive support channels
- Status pages for API health

---

### SEGMENT 8: KEY TAKEAWAYS (7 minutes)

**SAM:** Let's summarize. What should product leaders know about API design?

**ALEX:** **APIs are products.** They have users, they need design, they need documentation, they need support. Treat them with the same rigor as your customer-facing product.

**SAM:** Who should own API design?

**ALEX:** Joint ownership between product (what capabilities to expose) and engineering (how to expose them well). For public APIs, consider a dedicated API product manager.

**ALEX:** **Consistency over perfection.** A consistent API is better than a perfect one. Establish patterns early, document them, enforce them in code review.

**ALEX:** **Plan for evolution.** You will make mistakes. You will need to add features. Design for change with versioning, deprecation policies, and additive changes.

**ALEX:** **Invest in developer experience.** Time spent on docs, SDKs, and examples pays back in adoption, reduced support, and developer goodwill.

**SAM:** Any anti-patterns to avoid?

**ALEX:** **Exposing internal implementation.** Your API should model the domain, not your database schema.

**Breaking changes without warning.** Erodes trust permanently.

**Inconsistent response formats.** Makes integration fragile.

**Missing error details.** "Something went wrong" is not helpful.

**No rate limiting.** Invites abuse and cascading failures.

**SAM:** One thing to remember?

**ALEX:** Think of your API from the consumer's perspective. Every design decision should make their life easier. If you wouldn't want to use your own API, redesign it.

**SAM:** Perfect. Final episode coming up: Security and Development Methodologies. How to build securely and deliver effectively.

**ALEX:** The grand finale.

**[OUTRO MUSIC]**

---

## Key Concepts Reference Sheet

| Term | Definition |
|------|-----------|
| REST | Representational State Transfer - resource-oriented API style |
| GraphQL | Query language letting clients request specific data |
| gRPC | High-performance RPC framework with Protocol Buffers |
| Cursor Pagination | Pagination using opaque pointers instead of offsets |
| Idempotent | Operation that has same effect regardless of repetition |
| OAuth 2.0 | Authorization standard for delegated access |
| JWT | JSON Web Token - self-contained signed token |
| OpenAPI | Specification for describing REST APIs |
| Rate Limiting | Restricting API calls to prevent abuse |
| Breaking Change | API change that breaks existing clients |
| Semantic Versioning | Version numbering: major.minor.patch |
| DX (Developer Experience) | Overall experience of developers using an API |
| HATEOAS | Hypermedia As The Engine Of Application State |

---

*Next Episode: "Security & Development Methodologies - The Grand Finale"*
