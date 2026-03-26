# {{ title }}

- **Student:** {{ student }}{% if student_id %} ({{ student_id }}){% endif %}
- **Course:** {{ course }}
{% if instructor %}- **Instructor:** {{ instructor }}{% endif %}
{% if university %}- **University:** {{ university }}{% endif %}
- **Date:** {{ date }}
- **Target:** {{ domain }} ({{ target }})

---

## 1. Introduction

The purpose of this report is to present the results of a passive Open Source Intelligence (OSINT) reconnaissance performed against the target domain **{{ domain }}**. Passive reconnaissance involves gathering publicly available information about a target without directly interacting with it in ways that could be detected. All techniques used in this exercise rely exclusively on publicly accessible data sources and do not involve any active scanning, exploitation, or intrusion attempts.

The reconnaissance was executed on **{{ date }}** and completed in **{{ duration_seconds }}s**. The following sections document the methodology, findings, and analysis for each phase of the investigation.

---

## 2. Methodology

The reconnaissance was performed using an automated OSINT pipeline that executes independent probes in parallel. Each probe queries a different public data source to build a comprehensive profile of the target. The probes used in this assessment include:

{% for probe in probes %}- **{{ probe.name }}**{% if probe.error %} (failed){% endif %}
{% endfor %}

All data was collected passively — no packets were sent to the target beyond standard HTTP requests and DNS lookups that any regular visitor would perform. Tools and data sources include DNS resolvers, WHOIS databases, certificate transparency logs, the Wayback Machine, and search engine APIs.

---

{% for probe in probes %}
{% if probe.name == "DNS Records" %}
## 3. DNS Enumeration

DNS (Domain Name System) records reveal the fundamental network infrastructure of a domain. By querying public DNS resolvers, we can identify IP addresses, mail servers, nameservers, and other critical configuration details without any intrusive scanning.

### 3.1 Findings

{% if probe.error %}
> **Error:** {{ probe.error }}
{% else %}
{% if probe.data.A %}**IPv4 Addresses (A Records):**
{% for ip in probe.data.A %}- `{{ ip }}`
{% endfor %}{% endif %}

{% if probe.data.AAAA %}**IPv6 Addresses (AAAA Records):**
{% for ip in probe.data.AAAA %}- `{{ ip }}`
{% endfor %}{% endif %}

{% if probe.data.MX %}**Mail Exchangers (MX Records):**
{% for mx in probe.data.MX %}- `{{ mx.exchange }}` (priority: {{ mx.priority }})
{% endfor %}{% endif %}

{% if probe.data.NS %}**Nameservers (NS Records):**
{% for ns in probe.data.NS %}- `{{ ns }}`
{% endfor %}{% endif %}

{% if probe.data.TXT %}**TXT Records:**
{% for txt in probe.data.TXT %}- `{{ txt }}`
{% endfor %}{% endif %}

{% if probe.data.SOA %}**SOA Record:**
- Primary nameserver: `{{ probe.data.SOA.nsname }}`
- Hostmaster: `{{ probe.data.SOA.hostmaster }}`
- Serial: {{ probe.data.SOA.serial }}
- Refresh: {{ probe.data.SOA.refresh }}s / Retry: {{ probe.data.SOA.retry }}s / Expire: {{ probe.data.SOA.expire }}s
{% endif %}

{% if probe.data.CNAME %}**CNAME Records:**
{% for cname in probe.data.CNAME %}- `{{ cname }}`
{% endfor %}{% endif %}

### 3.2 Analysis

The DNS enumeration reveals that **{{ domain }}** resolves to {% if probe.data.A %}{{ probe.data.A | size }} IPv4{% endif %}{% if probe.data.AAAA %} and {{ probe.data.AAAA | size }} IPv6{% endif %} address(es), indicating {% if probe.data.AAAA %}dual-stack (IPv4+IPv6) network support{% else %}IPv4-only connectivity{% endif %}. {% if probe.data.MX %}The domain has {{ probe.data.MX | size }} mail exchanger(s) configured, which confirms active email infrastructure.{% endif %} {% if probe.data.NS %}The {{ probe.data.NS | size }} nameservers suggest {% if probe.data.NS.size > 1 %}redundant DNS configuration for high availability{% else %}a single-point DNS setup{% endif %}.{% endif %}
{% endif %}

{% elsif probe.name == "WHOIS" %}
## 4. WHOIS Lookup

WHOIS is a protocol for querying databases that store registration information about domain names. This data can reveal the registrar, registration dates, and administrative details about a domain.

### 4.1 Findings

{% if probe.error %}
> **Error:** {{ probe.error }}
{% else %}
| Field | Value |
|-------|-------|
{% if probe.data.domainName %}| Domain Name | {{ probe.data.domainName }} |
{% endif %}{% if probe.data.registrar %}| Registrar | {{ probe.data.registrar }} |
{% endif %}{% if probe.data.registrantType %}| Registrant Type | {{ probe.data.registrantType }} |
{% endif %}{% if probe.data.created %}| Created | {{ probe.data.created }} |
{% endif %}{% if probe.data.lastModified %}| Last Modified | {{ probe.data.lastModified }} |
{% endif %}{% if probe.data.renewalDate %}| Renewal Date | {{ probe.data.renewalDate }} |
{% endif %}{% if probe.data.dnssec %}| DNSSEC | {{ probe.data.dnssec }} |
{% endif %}{% if probe.data.nameservers %}| Nameservers | {{ probe.data.nameservers }} |
{% endif %}

### 4.2 Analysis

The WHOIS data shows the domain is registered as an **{{ probe.data.registrantType }}** through **{{ probe.data.registrar }}**. {% if probe.data.created %}The domain was originally created on **{{ probe.data.created }}**, indicating a long-standing online presence.{% endif %} {% if probe.data.dnssec %}DNSSEC status is **{{ probe.data.dnssec }}**{% if probe.data.dnssec == "Unsigned" %}, which means DNS responses are not cryptographically signed — a potential vector for DNS spoofing attacks{% endif %}.{% endif %}
{% endif %}

{% elsif probe.name == "SSL/TLS Certificate" %}
## 5. SSL/TLS Certificate Analysis

SSL/TLS certificates are used to encrypt communications between clients and servers. Analyzing a domain's certificate reveals information about the encryption strength, certificate authority, validity period, and potential misconfigurations.

### 5.1 Findings

{% if probe.error %}
> **Error:** {{ probe.error }}
{% else %}
| Field | Value |
|-------|-------|
| Subject | {{ probe.data.subject.CN }} |
| Issuer | {{ probe.data.issuer.O }} ({{ probe.data.issuer.CN }}) |
| Valid From | {{ probe.data.validFrom }} |
| Valid To | {{ probe.data.validTo }} |
| Protocol | {{ probe.data.protocol }} |
| Key Size | {{ probe.data.bits }} bits |
| SANs | {{ probe.data.subjectAltNames }} |
| Fingerprint | `{{ probe.data.fingerprint }}` |

### 5.2 Analysis

The certificate is issued by **{{ probe.data.issuer.O }}**, a widely trusted certificate authority. The connection uses **{{ probe.data.protocol }}** with **{{ probe.data.bits }}-bit** encryption. The certificate covers the Subject Alternative Names: **{{ probe.data.subjectAltNames }}**. {% if probe.data.protocol == "TLSv1.2" %}While TLSv1.2 is still considered secure, upgrading to TLSv1.3 would provide improved performance and stronger security guarantees.{% elsif probe.data.protocol == "TLSv1.3" %}TLSv1.3 is the latest and most secure version of the protocol.{% endif %}
{% endif %}

{% elsif probe.name == "HTTP Headers" %}
## 6. HTTP Headers & Security Audit

HTTP response headers provide critical information about the server configuration and implemented security policies. Missing security headers can expose the application to various client-side attacks such as cross-site scripting (XSS), clickjacking, and MIME-type confusion.

### 6.1 Server Information

{% if probe.error %}
> **Error:** {{ probe.error }}
{% else %}
- **Status Code:** {{ probe.data.statusCode }}
- **Server:** {{ probe.data.server | default: "Not disclosed" }}
- **X-Powered-By:** {{ probe.data.poweredBy | default: "Not disclosed" }}

### 6.2 Security Headers Audit

| Header | Status |
|--------|--------|
{% for pair in probe.data.securityHeaders %}| {{ pair[0] }} | {% if pair[1] %}{{ pair[1] }}{% else %}**MISSING**{% endif %} |
{% endfor %}

### 6.3 Analysis

{% if probe.data.missingSecurityHeaders.size > 0 %}The audit identified **{{ probe.data.missingSecurityHeaders | size }} missing security headers**: {% for h in probe.data.missingSecurityHeaders %}`{{ h }}`{% unless forloop.last %}, {% endunless %}{% endfor %}. Each missing header represents a potential attack surface:

{% for h in probe.data.missingSecurityHeaders %}- **{{ h }}**: {% if h == "content-security-policy" %}Without CSP, the application is more vulnerable to XSS attacks as the browser has no restrictions on which scripts can execute.{% elsif h == "x-xss-protection" %}Although deprecated in modern browsers, this header provides a fallback XSS filter for older clients.{% elsif h == "referrer-policy" %}Without this header, the full URL (including sensitive query parameters) may be leaked to third-party sites through the Referer header.{% elsif h == "permissions-policy" %}This header restricts access to browser features (camera, microphone, geolocation) and should be configured to minimize the attack surface.{% elsif h == "cross-origin-opener-policy" %}Missing COOP may leave the application vulnerable to cross-origin attacks such as Spectre-type side-channel exploits.{% elsif h == "cross-origin-embedder-policy" %}Without COEP, the page cannot opt into cross-origin isolation, limiting its security posture.{% elsif h == "cross-origin-resource-policy" %}Missing CORP may allow other origins to embed or read this application's resources.{% else %}This header should be configured according to security best practices.{% endif %}
{% endfor %}{% else %}All critical security headers are present. The server demonstrates a strong security posture.{% endif %}
{% endif %}

{% elsif probe.name == "Tech Stack" %}
## 7. Technology Stack Detection

Identifying the technologies used by a web application is a key step in OSINT reconnaissance. Knowledge of the CMS, frameworks, and server software allows an attacker (or auditor) to search for known vulnerabilities specific to those versions.

### 7.1 Findings

{% if probe.error %}
> **Error:** {{ probe.error }}
{% else %}
{% if probe.data.generator %}**Generator:** {{ probe.data.generator }}{% endif %}

{% if probe.data.detected.size > 0 %}| Technology | Category |
|------------|----------|
{% for tech in probe.data.detected %}| {{ tech.name }} | {{ tech.category }} |
{% endfor %}{% else %}
*No technologies were detected from page signatures.*
{% endif %}

### 7.2 Analysis

{% if probe.data.detected.size > 0 %}The target application is built on {% for tech in probe.data.detected %}**{{ tech.name }}** ({{ tech.category }}){% unless forloop.last %}, {% endunless %}{% endfor %}. {% if probe.data.generator %}The HTML meta generator tag explicitly declares **{{ probe.data.generator }}**, which reveals the exact CMS version — this information disclosure makes it easier for attackers to find matching CVEs.{% endif %}{% endif %}
{% endif %}

{% elsif probe.name == "robots.txt" %}
## 8. robots.txt Analysis

The `robots.txt` file is used to instruct web crawlers which paths should or should not be indexed. From a security perspective, this file often inadvertently reveals internal paths, admin panels, and other sensitive directories.

### 8.1 Findings

{% if probe.error %}
> **Error:** {{ probe.error }}
{% elsif probe.data.exists == false %}
The target does not have a `robots.txt` file.
{% else %}
{% if probe.data.sitemaps.size > 0 %}**Sitemaps:** {% for s in probe.data.sitemaps %}`{{ s }}`{% unless forloop.last %}, {% endunless %}{% endfor %}{% endif %}

**Disallowed paths (excerpt from raw file):**

```
{{ probe.data.raw }}
```

### 8.2 Analysis

The presence of `robots.txt` confirms the site actively manages crawler access. The disallowed paths reveal several interesting directories — notably administrative endpoints (`/admin/`), user-facing authentication routes (`/user/login`, `/user/register`, `/user/password`), and internal framework paths. While `robots.txt` does not enforce access control, it serves as a roadmap for directory enumeration.
{% endif %}

{% elsif probe.name == "Subdomains (crt.sh)" %}
## 9. Subdomain Enumeration

Certificate Transparency (CT) logs are public, append-only logs of all SSL/TLS certificates issued by participating Certificate Authorities. Querying CT logs (via crt.sh) reveals subdomains that have had certificates issued, effectively mapping the target's subdomain landscape without active scanning.

### 9.1 Findings

{% if probe.error %}
> **Error:** {{ probe.error }}
{% else %}
**Total unique subdomains found:** {{ probe.data.total }}

**Sample subdomains** (first 50):

{% assign limited = probe.data.subdomains | slice: 0, 50 %}{% for sub in limited %}- `{{ sub }}`
{% endfor %}
{% if probe.data.total > 50 %}*... and {{ probe.data.total | minus: 50 }} more (see full JSON report)*{% endif %}

### 9.2 Analysis

The CT log query returned **{{ probe.data.total }}** unique subdomains, revealing a large organizational infrastructure. A high number of subdomains increases the attack surface, as each subdomain potentially represents a separate application, server, or service that may have its own vulnerabilities. Wildcard certificates (e.g., `*.{{ domain }}`) indicate broad subdomain usage.
{% endif %}

{% elsif probe.name == "Puppeteer Browser Analysis" %}
## 10. Browser-Based Analysis

This phase uses a headless browser to load the target page and observe runtime behavior — including JavaScript execution, network requests, console output, and page metadata. This reveals client-side technologies and third-party integrations not visible in static HTML analysis.

### 10.1 Page Metadata

{% if probe.error %}
> **Error:** {{ probe.error }}
{% else %}
{% for pair in probe.data.metadata %}{% if pair[1] %}- **{{ pair[0] }}:** {{ pair[1] }}
{% endif %}{% endfor %}

### 10.2 JavaScript Libraries Detected

{% if probe.data.jsLibraries.size > 0 %}| Library | Version / Info |
|---------|----------------|
{% for lib in probe.data.jsLibraries %}| {{ lib[0] }} | {{ lib[1] }} |
{% endfor %}{% else %}*No JavaScript libraries detected via window object inspection.*{% endif %}

### 10.3 Network Activity

**Total requests:** {{ probe.data.totalRequests }}

| Request Type | Count |
|-------------|-------|
{% for type in probe.data.requestsByType %}| {{ type[0] }} | {{ type[1] }} |
{% endfor %}

{% if probe.data.externalDomains.size > 0 %}**External domains contacted:**
{% for dom in probe.data.externalDomains %}- `{{ dom }}`
{% endfor %}{% endif %}

{% if probe.data.consoleLogs.size > 0 %}### 10.4 Console Output

The browser console captured {{ probe.data.consoleLogs | size }} message(s) during page load:

{% for log in probe.data.consoleLogs %}- [{{ log.type }}] {{ log.text }}
{% endfor %}{% endif %}

### 10.5 Analysis

The page generated **{{ probe.data.totalRequests }}** network requests during loading. {% if probe.data.externalDomains.size > 0 %}The page communicates with **{{ probe.data.externalDomains | size }}** external domain(s), which may include analytics services, CDNs, or third-party integrations — each representing a potential supply-chain trust relationship.{% endif %}
{% endif %}

{% elsif probe.name == "Wayback Machine" %}
## 11. Wayback Machine History

The Wayback Machine (Internet Archive) stores historical snapshots of web pages. Analyzing a domain's archive history reveals how long the site has been active, how frequently it changes, and can expose previously public content that has since been removed.

### 11.1 Findings

{% if probe.error %}
> **Error:** {{ probe.error }}
{% else %}
| Field | Value |
|-------|-------|
{% if probe.data.firstSnapshot %}| First Snapshot | {{ probe.data.firstSnapshot }} |{% endif %}
{% if probe.data.lastSnapshot %}| Last Snapshot | {{ probe.data.lastSnapshot }} |{% endif %}
{% if probe.data.createdAt %}| Created At | {{ probe.data.createdAt }} |{% endif %}
{% if probe.data.lastUpdatedAt %}| Last Updated At | {{ probe.data.lastUpdatedAt }} |{% endif %}

### 11.2 Analysis

{% if probe.data.firstSnapshot %}The Wayback Machine has been archiving **{{ domain }}** since **{{ probe.data.firstSnapshot }}**, demonstrating a long-lived web presence. Historical snapshots can be valuable for identifying removed pages, old configurations, and prior technology stacks that may still leave residual attack vectors.{% endif %}
{% endif %}

{% elsif probe.name == "Search Engine Dorks" %}
## 12. Search Engine Dorking

Search engine dorking (Google hacking) uses advanced search operators to discover indexed content that may reveal sensitive information — such as exposed configuration files, login portals, error pages, and documents that should not be publicly accessible.

### 12.1 Findings

{% if probe.error %}
> **Error:** {{ probe.error }}
{% else %}
{% for dork in probe.data %}
#### {{ dork[0] }}

**Query:** `{{ dork[1].query }}`

{% if dork[1].error %}> Error: {{ dork[1].error }}
{% elsif dork[1].results.size == 0 %}*No results found.*
{% else %}{% for r in dork[1].results %}- [{{ r.title }}]({{ r.url }})
{% endfor %}{% endif %}

{% endfor %}

### 12.2 Analysis

Search engine dorking provides insight into what content search engines have indexed for the target domain. Results revealing documents, configuration files, or login pages suggest areas where access control or indexing policies should be reviewed. The absence of results for certain dork categories is a positive indicator of proper security hygiene.
{% endif %}

{% elsif probe.name == "Common Paths" %}
## 13. Common Paths Discovery

This probe checks for the existence of common sensitive paths — such as `.git/HEAD`, `.env`, `wp-admin`, and other files that are frequently left exposed due to misconfiguration. Detection is performed using HTTP HEAD requests, which is minimally intrusive.

### 13.1 Findings

{% if probe.error %}
> **Error:** {{ probe.error }}
{% else %}
**Accessible paths (found):**

{% if probe.data.found.size > 0 %}| Path | HTTP Status |
|------|-------------|
{% for p in probe.data.found %}| `{{ p.path }}` | {{ p.status }} |
{% endfor %}{% else %}*None of the checked paths were found accessible.*{% endif %}

**Paths not found:** {{ probe.data.notFound | size }} paths returned 404 or were inaccessible.

### 13.2 Analysis

{% if probe.data.found.size > 0 %}The scan identified **{{ probe.data.found | size }}** accessible path(s). Each exposed path should be evaluated to determine if it discloses sensitive information or provides unauthorized access. {% else %}No common sensitive paths were found, indicating good server-side access control and configuration.{% endif %}
{% endif %}

{% elsif probe.name == "HTTP → HTTPS Redirect" %}
## 14. HTTP to HTTPS Redirect Analysis

Proper HTTP-to-HTTPS redirection is a fundamental security requirement. Without it, users connecting via plain HTTP may transmit data unencrypted, and attackers can perform man-in-the-middle attacks or SSL stripping.

### 14.1 Findings

{% if probe.error %}
> **Error:** {{ probe.error }}
{% else %}
{% if probe.data.redirects %}**Redirect chain:**

{% for step in probe.data.redirects %}- {{ step.status }} → `{{ step.location }}`
{% endfor %}{% endif %}

{% if probe.data.finalUrl %}**Final URL:** {{ probe.data.finalUrl }}{% endif %}

### 14.2 Analysis

{% if probe.data.redirectsToHttps %}The server correctly redirects HTTP traffic to HTTPS, enforcing encrypted communication.{% else %}The server does **not** properly redirect HTTP to HTTPS, which leaves users vulnerable to man-in-the-middle attacks and SSL stripping.{% endif %}
{% endif %}

{% endif %}
{% endfor %}

---

## Conclusions

This passive OSINT reconnaissance of **{{ domain }}** has provided a comprehensive overview of the target's publicly visible infrastructure and security posture. The key findings are summarized below:

1. **Infrastructure:** The domain's DNS configuration, SSL/TLS certificates, and server headers reveal the underlying technology stack and hosting infrastructure.
2. **Security Posture:** The HTTP security headers audit identifies specific areas where the server configuration could be hardened.
3. **Attack Surface:** Subdomain enumeration and common paths discovery help map the extent of the target's publicly exposed services.
4. **Information Exposure:** Search engine dorking and robots.txt analysis reveal what information is publicly indexed or inadvertently disclosed.

All data was collected through passive means only. No exploitation or active vulnerability scanning was performed during this assessment.
