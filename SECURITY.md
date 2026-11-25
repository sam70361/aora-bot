# Security policy

## Supported versions

Fixes land in the latest minor release of the `@aora-bot/*` packages. Older versions
are not patched; upgrade to the latest release to get a fix.

## Reporting a vulnerability

Please do not open a public issue. Report it privately through GitHub instead:
[Report a vulnerability](https://github.com/sam70361/aora-bot/security/advisories/new)
on the Security tab of this repository. If that is not possible, email
1251579308@qq.com with "Aora Bot security" in the subject.

Include what is affected (a package and version, the avatar endpoint, or the docs
site), how to reproduce it, and what an attacker could do with it. You will get an
acknowledgement within 7 days. Once a fix is released, the advisory is published with
credit to you, unless you would rather stay anonymous.

## Scope

- The `@aora-bot/engine`, `@aora-bot/react`, `@aora-bot/surfaces` and
  `@aora-bot/element` packages, for example markup injection through rendered SVG or
  labels.
- The avatar endpoint (`api/avatar.ts`) and the documentation site at
  https://aora-bot.vercel.app.

The classic Emotion Ball in the `emotion-ball` branch is no longer maintained and is
out of scope.
