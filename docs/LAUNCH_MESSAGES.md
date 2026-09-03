# PopIntent public Beta launch messages

Use one message only where it directly fits the community rules. Replace bracketed context with a truthful sentence specific to the discussion. Do not mass-post, automate outreach, or contact people who did not ask about this problem.

## Microsoft Edge users

**Every click opens another tab? I built a narrow Edge extension for that pattern.**

PopIntent Beta compares the link you meant to open with the tab that actually appears, then closes a mismatched popup. It also catches high-confidence transparent click layers. It is free, open source, and local-first: no account, analytics, telemetry, or browsing-data upload.

You can install it or run a harmless test here: https://snncs.github.io/PopIntent/

It is a Beta, not a general ad blocker, and I am specifically looking for reproducible misses and incorrect blocks.

## Privacy and open-source communities

**[Why this community is relevant.] I am testing a local-first approach to click-hijacked popups.**

PopIntent keeps its decision process inside Chrome/Edge. Recent history contains domains only, expires after seven days, and private-window activity is excluded from persistent storage. There is no backend, remote ruleset, telemetry, or analytics SDK. The threat model and implementation are public.

Project, privacy notice, and harmless test: https://snncs.github.io/PopIntent/

I maintain the project and would value criticism of the privacy boundary or reproducible false positives more than generic promotion.

## Browser-extension developers and testers

**[Reference the technical discussion.] I have an MV3 Beta that correlates a trusted gesture with the child navigation it creates.**

PopIntent allows an intentional new-tab destination, closes a contradictory child destination, and uses a short tab-scoped DNR session rule only for its opt-in Strict same-tab guard. Version 0.1.1 also moves private-context classification entirely to browser-owned sender-tab metadata and fails closed when that context is unavailable.

Source and synthetic test cases: https://github.com/SNNCS/PopIntent
Harmless hosted test: https://snncs.github.io/PopIntent/test/

I am looking for public minimal fixtures that expose missed mechanisms or false positives; please do not share private URLs or browsing data.
